// Package payment is an inactive provider-independent transaction domain.
// No public route calls it: a real authenticated order service and provider verifier are prerequisites.
package payment

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"time"
)

type Product struct {
	ID            string
	AmountMinor   int64
	Currency      string
	OwnerApproved bool
}
type Store struct {
	DB       *sql.DB
	Provider string
	Catalog  map[string]Product
}

// VerifiedEvent must be constructed only by a future provider-specific raw-body signature adapter.
// A JSON body from a network client is NOT a VerifiedEvent.
type VerifiedEvent struct {
	Provider, EventID, OrderID, ProviderOrderID, PaymentID, CustomerID, Currency, Status string
	AmountMinor                                                                          int64
}

var currency = regexp.MustCompile(`^[A-Z]{3}$`)

func (s *Store) CreateOrder(ctx context.Context, id, authenticatedCustomer, productID, providerOrderID string) error {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if s.DB == nil {
		return errors.New("PAYMENT_STORAGE_UNAVAILABLE")
	}
	if s.Provider == "" {
		return errors.New("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	p, ok := s.Catalog[productID]
	if !ok || p.ID != productID || !p.OwnerApproved || p.AmountMinor <= 0 || !currency.MatchString(p.Currency) {
		return errors.New("PRODUCT_UNAVAILABLE")
	}
	if id == "" || authenticatedCustomer == "" || providerOrderID == "" {
		return errors.New("INVALID_ORDER")
	}
	_, err := s.DB.ExecContext(ctx, `INSERT INTO phase1_orders(order_id,customer_id,product_id,provider,provider_order_id,amount_minor,currency,status) VALUES($1,$2,$3,$4,$5,$6,$7,'PENDING')`, id, authenticatedCustomer, productID, s.Provider, providerOrderID, p.AmountMinor, p.Currency)
	if err != nil {
		return errors.New("ORDER_STORAGE_FAILED")
	}
	return nil
}
func (s *Store) ApplyVerifiedEvent(ctx context.Context, e VerifiedEvent) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if s.DB == nil {
		return false, errors.New("PAYMENT_STORAGE_UNAVAILABLE")
	}
	if s.Provider == "" || e.Provider != s.Provider {
		return false, errors.New("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	if e.EventID == "" || e.OrderID == "" || e.PaymentID == "" || e.ProviderOrderID == "" || e.CustomerID == "" || e.AmountMinor <= 0 || !currency.MatchString(e.Currency) {
		return false, errors.New("INVALID_PAYMENT_EVENT")
	}
	if e.Status != "COMPLETED" && e.Status != "FAILED" && e.Status != "REFUNDED" && e.Status != "REVERSED" {
		return false, errors.New("UNSUPPORTED_PAYMENT_EVENT")
	}
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return false, errors.New("PAYMENT_STORAGE_UNAVAILABLE")
	}
	defer tx.Rollback()
	var customer, provider, providerOrder, curr, state string
	var amount int64
	var paymentID sql.NullString
	err = tx.QueryRowContext(ctx, `SELECT customer_id,provider,provider_order_id,amount_minor,currency,status,provider_payment_id FROM phase1_orders WHERE order_id=$1 FOR UPDATE`, e.OrderID).Scan(&customer, &provider, &providerOrder, &amount, &curr, &state, &paymentID)
	if err == sql.ErrNoRows {
		return false, errors.New("UNKNOWN_ORDER")
	}
	if err != nil {
		return false, errors.New("PAYMENT_STORAGE_UNAVAILABLE")
	}
	if (state == "COMPLETED" || state == "REFUNDED" || state == "REVERSED") && paymentID.Valid && paymentID.String != e.PaymentID {
		return false, errors.New("PAYMENT_MISMATCH")
	}
	if customer != e.CustomerID || provider != e.Provider || providerOrder != e.ProviderOrderID || amount != e.AmountMinor || curr != e.Currency {
		return false, errors.New("PAYMENT_MISMATCH")
	}
	canonical, _ := json.Marshal(e)
	hash := sha256.Sum256(canonical)
	fingerprint := hex.EncodeToString(hash[:])
	var existing string
	err = tx.QueryRowContext(ctx, `SELECT fingerprint FROM phase1_payment_events WHERE provider=$1 AND event_id=$2`, e.Provider, e.EventID).Scan(&existing)
	if err == nil {
		if existing != fingerprint {
			return false, errors.New("PAYMENT_REPLAY_CONFLICT")
		}
		return false, tx.Commit()
	}
	if err != sql.ErrNoRows {
		return false, errors.New("PAYMENT_STORAGE_UNAVAILABLE")
	}
	if state == "REFUNDED" || state == "REVERSED" || state == "COMPLETED" && e.Status == "FAILED" {
		return false, errors.New("INVALID_PAYMENT_TRANSITION")
	}
	if (e.Status == "REFUNDED" || e.Status == "REVERSED") && state != "COMPLETED" {
		return false, errors.New("INVALID_PAYMENT_TRANSITION")
	}
	// A payment ID is bound to one order by a database uniqueness constraint.
	if _, err = tx.ExecContext(ctx, `INSERT INTO phase1_payment_events(provider,event_id,order_id,fingerprint) VALUES($1,$2,$3,$4)`, e.Provider, e.EventID, e.OrderID, fingerprint); err != nil {
		return false, fmt.Errorf("PAYMENT_EVENT_CONFLICT")
	}
	if _, err = tx.ExecContext(ctx, `UPDATE phase1_orders SET status=$2,provider_payment_id=$3,updated_at=now() WHERE order_id=$1`, e.OrderID, e.Status, e.PaymentID); err != nil {
		return false, fmt.Errorf("PAYMENT_ID_CONFLICT")
	}
	granted := false
	if e.Status == "COMPLETED" {
		result, err := tx.ExecContext(ctx, `INSERT INTO phase1_entitlements(order_id,customer_id,active) VALUES($1,$2,true) ON CONFLICT(order_id) DO NOTHING`, e.OrderID, e.CustomerID)
		if err != nil {
			return false, err
		}
		n, err := result.RowsAffected()
		if err != nil {
			return false, err
		}
		granted = n == 1
	} else if e.Status == "REFUNDED" || e.Status == "REVERSED" {
		if _, err := tx.ExecContext(ctx, `UPDATE phase1_entitlements SET active=false,updated_at=now() WHERE order_id=$1`, e.OrderID); err != nil {
			return false, err
		}
	}
	if err = tx.Commit(); err != nil {
		return false, errors.New("PAYMENT_COMMIT_FAILED")
	}
	return granted, nil
}
