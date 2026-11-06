// Package payment is the sole durable payment authority. Public adapters are disabled by default.
package payment

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"regexp"
	"time"

	"github.com/lib/pq"
)

type Product struct {
	ID             string            `json:"id"`
	Version        string            `json:"version"`
	Capability     string            `json:"capability"`
	AmountMinor    int64             `json:"amount_minor"`
	Currency       string            `json:"currency"`
	OwnerApproved  bool              `json:"-"`
	AccessDuration time.Duration     `json:"-"`
	Commercial     *CommercialPolicy `json:"commercial_policy,omitempty"`
}
type Store struct {
	Telemetry *Telemetry
	DB        *sql.DB
	// Provider is a namespace, not a brand: provider/account/environment.
	Provider      string
	Catalog       map[string]Product
	EvidenceModel string
	failpoint     func(string, *sql.Tx) error // only set in same-package tests; no runtime injection/configuration.
}

// Event is untrusted until a configured Provider verifies it AND authoritative state is retrieved.
// Revision must be a stable, strictly ordered provider-state revision, never local arrival order.
type Event struct {
	Provider, EventID, EventType, OrderID, ProviderOrderID, PaymentID, CustomerID, Currency, Status string
	AmountMinor                                                                                     int64
	Revision                                                                                        int64
	OccurredAt                                                                                      time.Time
	EvidenceModel                                                                                   string `json:",omitempty"`
	NotificationOnly                                                                                bool   `json:",omitempty"`
	PayloadDigest                                                                                   string `json:",omitempty"`
	RiskHold                                                                                        bool   `json:",omitempty"`
}

// VerifiedEvent is opaque outside this package. JSON decoding cannot construct the seal or evidence.
type VerifiedEvent struct {
	evidence Event
	verified bool
}

func seal(e Event) VerifiedEvent { return VerifiedEvent{e, true} }

var currency = regexp.MustCompile(`^[A-Z]{3}$`)
var opaque = regexp.MustCompile(`^[A-Za-z0-9_.:/-]{1,200}$`)

func problem(code string) error { return errors.New(code) }
func storageError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return problem("PAYMENT_TIMEOUT")
	}
	var p *pq.Error
	if errors.As(err, &p) {
		switch p.Code {
		case "23505":
			return problem("PAYMENT_CONFLICT")
		case "40001", "40P01":
			return problem("PAYMENT_RETRY_REQUIRED")
		case "23514", "23503", "22001":
			return problem("PAYMENT_CONSTRAINT")
		}
	}
	return problem("PAYMENT_STORAGE_UNAVAILABLE")
}
func (s *Store) checkpoint(stage string, tx *sql.Tx) error {
	if s.failpoint != nil {
		return s.failpoint(stage, tx)
	}
	return nil
}
func (s *Store) product(id string) (Product, error) {
	p, ok := s.Catalog[id]
	if !ok || p.ID != id || !p.OwnerApproved || p.AmountMinor <= 0 || !currency.MatchString(p.Currency) {
		return p, problem("PRODUCT_UNAVAILABLE")
	}
	return p, nil
}

// CreateOrder is retained for the legacy isolated-domain fixtures, never used by HTTP.
// The application uses reserveOrder before making any provider call.
func (s *Store) CreateOrder(ctx context.Context, id, customer, productID, providerOrder string) error {
	if s.DB == nil {
		return problem("PAYMENT_STORAGE_UNAVAILABLE")
	}
	if s.Provider == "" {
		return problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	p, err := s.product(productID)
	if err != nil {
		return err
	}
	if id == "" || customer == "" || providerOrder == "" {
		return problem("INVALID_ORDER")
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	_, err = s.DB.ExecContext(ctx, `INSERT INTO phase1_orders(order_id,customer_id,product_id,provider,provider_order_id,amount_minor,currency,status,product_version,capability_id) VALUES($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$9)`, id, customer, p.ID, s.Provider, providerOrder, p.AmountMinor, p.Currency, p.Version, p.Capability)
	return storageError(err)
}
func validEvent(e Event) bool {
	return opaque.MatchString(e.EventID) && opaque.MatchString(e.OrderID) && (opaque.MatchString(e.PaymentID) || e.PaymentID == "" && (e.Status == "PENDING" || e.Status == "FAILED" || e.Status == "CANCELLED" || e.Status == "EXPIRED")) && opaque.MatchString(e.ProviderOrderID) && opaque.MatchString(e.CustomerID) && e.AmountMinor > 0 && currency.MatchString(e.Currency) && (e.Revision > 0 && (e.EvidenceModel == "" || e.EvidenceModel == "ORDERED_REVISION") || e.Revision == 0 && e.EvidenceModel == "CAPTURE_REFUND_LATTICE_V1") && !e.OccurredAt.IsZero() && len(e.EventType) > 0 && len(e.EventType) <= 100
}
func fingerprint(e Event) (string, []byte) {
	b, _ := json.Marshal(e)
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:]), b
}

// Transition applies authoritative snapshots. Stale evidence cannot regress a newer revision.
// Revoked/expired/cancelled orders are terminal. Full refunds may precede local completion.
func transition(from, to string) bool {
	switch to {
	case "PENDING", "COMPLETED", "FAILED", "REFUNDED", "REVERSED", "CANCELLED", "EXPIRED":
	default:
		return false
	}
	switch from {
	case "PENDING":
		return true
	case "FAILED":
		return to != "PENDING"
	case "COMPLETED":
		return to == "COMPLETED" || to == "REFUNDED" || to == "REVERSED"
	case "REFUNDED", "REVERSED", "CANCELLED", "EXPIRED":
		return to == from
	}
	return false
}

// Queue stores only verified minimal business evidence, never raw card data or signed bodies.
func (s *Store) queue(ctx context.Context, v VerifiedEvent) error {
	if !v.verified {
		return problem("UNVERIFIED_PAYMENT_EVENT")
	}
	e := v.evidence
	if !validEvent(e) {
		return problem("INVALID_PAYMENT_EVENT")
	}
	if e.Provider != s.Provider || s.Provider == "" {
		return problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	if s.DB == nil {
		return problem("PAYMENT_STORAGE_UNAVAILABLE")
	}
	if e.EvidenceModel != "" && e.EvidenceModel != s.model() {
		return problem("UNSUPPORTED_EVIDENCE_MODEL")
	}
	h, b := fingerprint(e)
	_, err := s.DB.ExecContext(ctx, `INSERT INTO phase1_payment_events(provider,event_id,order_id,fingerprint,event_type,provider_order_id,provider_payment_id,verified_at,occurred_at,processing_status,safe_evidence) VALUES($1,$2,$3,$4,$5,$6,$7,now(),$8,'PENDING',$9) ON CONFLICT(provider,event_id) DO NOTHING`, e.Provider, e.EventID, e.OrderID, h, e.EventType, e.ProviderOrderID, e.PaymentID, e.OccurredAt, string(b))
	if err != nil {
		return storageError(err)
	}
	var stored string
	err = s.DB.QueryRowContext(ctx, `SELECT fingerprint FROM phase1_payment_events WHERE provider=$1 AND event_id=$2`, e.Provider, e.EventID).Scan(&stored)
	if err != nil {
		return storageError(err)
	}
	if stored != h {
		return problem("PAYMENT_REPLAY_CONFLICT")
	}
	return nil
}
func (s *Store) ApplyVerifiedEvent(ctx context.Context, v VerifiedEvent) (bool, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := s.checkpoint("before_event_insert", nil); err != nil {
		return false, err
	}
	if err := s.queue(ctx, v); err != nil {
		return false, err
	}
	e := v.evidence
	granted, err := s.apply(ctx, e)
	if err != nil {
		// Independent bounded context records retry classification even if the caller disconnects.
		auditCtx, done := context.WithTimeout(context.Background(), time.Second)
		defer done()
		_, _ = s.DB.ExecContext(auditCtx, `UPDATE phase1_payment_events SET processing_status=CASE WHEN $3 IN ('PAYMENT_MISMATCH','INVALID_PAYMENT_TRANSITION','PAYMENT_REVISION_CONFLICT') THEN 'REJECTED' ELSE 'RETRY' END,failure_class=$3 WHERE provider=$1 AND event_id=$2 AND processing_status IN ('PENDING','RETRY')`, e.Provider, e.EventID, err.Error())
	}
	return granted, err
}
func (s *Store) apply(ctx context.Context, e Event) (bool, error) {
	tx, err := s.DB.BeginTx(ctx, nil)
	if err != nil {
		return false, storageError(err)
	}
	defer tx.Rollback()
	var customer, provider, providerOrder, curr, state, capability, model string
	var amount, revision int64
	var paymentID sql.NullString
	var expiration sql.NullTime
	var createdAt time.Time
	err = tx.QueryRowContext(ctx, `SELECT customer_id,provider,coalesce(provider_order_id,''),amount_minor,currency,CASE WHEN provider_review_required THEN 'PAYMENT_REVIEW' ELSE status END,provider_payment_id,provider_revision,capability_id,access_expires_at,evidence_model,created_at FROM phase1_orders WHERE order_id=$1 FOR UPDATE`, e.OrderID).Scan(&customer, &provider, &providerOrder, &amount, &curr, &state, &paymentID, &revision, &capability, &expiration, &model, &createdAt)
	if err == sql.ErrNoRows {
		return false, problem("UNKNOWN_ORDER")
	}
	if err != nil {
		return false, storageError(err)
	}
	var processing string
	if err = tx.QueryRowContext(ctx, `SELECT processing_status FROM phase1_payment_events WHERE provider=$1 AND event_id=$2 FOR UPDATE`, e.Provider, e.EventID).Scan(&processing); err != nil {
		return false, storageError(err)
	}
	if processing == "PROCESSED" || processing == "IGNORED" {
		s.Telemetry.Observe("duplicate_event", 0)
		return false, storageError(tx.Commit())
	}
	if processing == "REJECTED" {
		return false, problem("PAYMENT_EVENT_REJECTED")
	}
	if err = s.checkpoint("after_event_insert", tx); err != nil {
		return false, err
	}
	if customer != e.CustomerID || provider != e.Provider || providerOrder != e.ProviderOrderID || amount != e.AmountMinor || curr != e.Currency || (paymentID.Valid && paymentID.String != e.PaymentID) {
		return false, problem("PAYMENT_MISMATCH")
	}
	if model != s.model() || (e.EvidenceModel != "" && e.EvidenceModel != model) {
		return false, problem("UNSUPPORTED_EVIDENCE_MODEL")
	}
	if model == "CAPTURE_REFUND_LATTICE_V1" {
		if e.NotificationOnly {
			return false, problem("NOTIFICATION_NOT_FULFILLMENT")
		}
		if !latticeTransition(state, e.Status) {
			return false, problem("INVALID_PAYMENT_TRANSITION")
		}
	} else if e.Revision < revision {
		_, err = tx.ExecContext(ctx, `UPDATE phase1_payment_events SET processing_status='IGNORED',processing_attempts=processing_attempts+1,failure_class='STALE_REVISION' WHERE provider=$1 AND event_id=$2`, e.Provider, e.EventID)
		if err != nil {
			return false, storageError(err)
		}
		return false, storageError(tx.Commit())
	}
	if model != "CAPTURE_REFUND_LATTICE_V1" && e.Revision == revision && state != e.Status {
		return false, problem("PAYMENT_REVISION_CONFLICT")
	}
	if model != "CAPTURE_REFUND_LATTICE_V1" && !transition(state, e.Status) {
		return false, problem("INVALID_PAYMENT_TRANSITION")
	}
	if _, err = tx.ExecContext(ctx, `UPDATE phase1_orders SET status=CASE WHEN $2='PAYMENT_REVIEW' THEN status ELSE $2 END,provider_review_required=($2='PAYMENT_REVIEW'),provider_payment_id=NULLIF($3,''),provider_revision=$4,updated_at=now() WHERE order_id=$1`, e.OrderID, e.Status, e.PaymentID, e.Revision); err != nil {
		return false, storageError(err)
	}
	if err = s.checkpoint("after_order_update", tx); err != nil {
		return false, err
	}
	granted := false
	if e.Status == "COMPLETED" {
		result, err := tx.ExecContext(ctx, `INSERT INTO phase1_entitlements(order_id,customer_id,capability_id,active,expires_at) SELECT $1,$2,$3,true,$4 WHERE NOT EXISTS(SELECT 1 FROM payment_customers c WHERE c.customer_id=$2 AND c.deleted_at IS NOT NULL) ON CONFLICT(order_id) DO NOTHING`, e.OrderID, e.CustomerID, capability, expiration)
		if err != nil {
			return false, storageError(err)
		}
		n, err := result.RowsAffected()
		if err != nil {
			return false, storageError(err)
		}
		granted = n == 1
	} else if e.Status == "REFUNDED" || e.Status == "REVERSED" || e.Status == "PAYMENT_REVIEW" {
		if _, err = tx.ExecContext(ctx, `UPDATE phase1_entitlements SET active=false,revoked_at=coalesce(revoked_at,now()),revocation_reason=$2,revision=revision+CASE WHEN active THEN 1 ELSE 0 END,updated_at=now() WHERE order_id=$1`, e.OrderID, e.Status); err != nil {
			return false, storageError(err)
		}
	}
	if _, err = tx.ExecContext(ctx, `UPDATE phase1_payment_events SET processing_status='PROCESSED',processing_attempts=processing_attempts+1,failure_class='' WHERE provider=$1 AND event_id=$2`, e.Provider, e.EventID); err != nil {
		return false, storageError(err)
	}
	if _, err = tx.ExecContext(ctx, `INSERT INTO phase1_payment_audit(order_id,action,outcome) VALUES($1,'APPLY_EVENT',$2)`, e.OrderID, e.Status); err != nil {
		return false, storageError(err)
	}
	if err = s.checkpoint("before_commit", tx); err != nil {
		return false, err
	}
	if err = tx.Commit(); err != nil {
		return false, problem("PAYMENT_COMMIT_UNKNOWN")
	}
	if granted {
		s.Telemetry.Observe("payment_confirmation", time.Since(createdAt))
	}
	if err = s.checkpoint("after_commit", nil); err != nil {
		return false, err
	}
	return granted, nil
}

func (s *Store) model() string {
	if s.EvidenceModel == "" {
		return "ORDERED_REVISION"
	}
	return s.EvidenceModel
}
func latticeTransition(from, to string) bool {
	switch from {
	case "PENDING":
		return to == "PENDING" || to == "COMPLETED" || to == "REFUNDED" || to == "PAYMENT_REVIEW"
	case "COMPLETED":
		return to == "COMPLETED" || to == "REFUNDED" || to == "PAYMENT_REVIEW"
	case "PAYMENT_REVIEW":
		return to == "PAYMENT_REVIEW" || to == "REFUNDED"
	case "REFUNDED":
		return to == "REFUNDED"
	}
	return false
}
