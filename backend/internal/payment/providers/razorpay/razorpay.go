// Package razorpay implements a provisional TEST-MODE-ONLY Razorpay Orders adapter.
// No network request is permitted until explicit provider approval and sandbox credentials exist.
package razorpay

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"astroengine-core/backend/internal/payment"
)

const SnapshotModel = "CAPTURE_REFUND_LATTICE_V1"

type Binding struct {
	OrderID, CustomerID, ProviderOrderID, Currency string
	AmountMinor                                    int64
}
type Lookup func(context.Context, string) (Binding, error)
type Config struct {
	Approved                                   bool
	KeyID, KeySecret, WebhookSecret, AccountID string
}
type Adapter struct {
	config  Config
	lookup  Lookup
	client  *http.Client
	baseURL string
}

var identifier = regexp.MustCompile(`^[A-Za-z0-9_-]{1,100}$`)

func errCode(s string) error { return errors.New(s) }
func New(c Config, lookup Lookup) (*Adapter, error) {
	if !c.Approved {
		return nil, errCode("PROVIDER_APPROVAL_REQUIRED")
	}
	if !strings.HasPrefix(c.KeyID, "rzp_test_") || !identifier.MatchString(c.KeyID) || len(c.KeySecret) < 16 || len(c.WebhookSecret) < 16 || !strings.HasPrefix(c.AccountID, "acc_") || !identifier.MatchString(c.AccountID) || lookup == nil {
		return nil, errCode("RAZORPAY_SANDBOX_CONFIGURATION_INVALID")
	}
	return &Adapter{c, lookup, &http.Client{Timeout: 4 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}, "https://api.razorpay.com/v1"}, nil
}
func (a *Adapter) Namespace() string          { return "razorpay/" + a.config.AccountID + "/sandbox" }
func (a *Adapter) ProductionReady() bool      { return false }
func (a *Adapter) SandboxReady() bool         { return a.config.Approved }
func (a *Adapter) SnapshotModel() string      { return SnapshotModel }
func (a *Adapter) RequiresCreateIntent() bool { return true }
func (a *Adapter) PublicKey() string          { return a.config.KeyID }
func Receipt(id string) string {
	h := sha256.Sum256([]byte("mymomentoclock/" + id))
	return hex.EncodeToString(h[:20])
}

// Only GET is retried. A POST timeout is ambiguous, never permission to issue another order.
func (a *Adapter) request(ctx context.Context, method, path string, body any, out any) error {
	var data []byte
	var err error
	if body != nil {
		data, err = json.Marshal(body)
		if err != nil {
			return errCode("PROVIDER_REQUEST_INVALID")
		}
	}
	attempts := 1
	if method == "GET" {
		attempts = 2
	}
	for attempt := 0; attempt < attempts; attempt++ {
		req, err := http.NewRequestWithContext(ctx, method, a.baseURL+path, bytes.NewReader(data))
		if err != nil {
			return errCode("PROVIDER_REQUEST_INVALID")
		}
		req.SetBasicAuth(a.config.KeyID, a.config.KeySecret)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		res, err := a.client.Do(req)
		retry := false
		if err != nil {
			retry = true
		} else {
			b, readErr := io.ReadAll(io.LimitReader(res.Body, (1<<20)+1))
			res.Body.Close()
			if res.StatusCode >= 200 && res.StatusCode < 300 {
				if readErr != nil || len(b) > 1<<20 || json.Unmarshal(b, out) != nil {
					return errCode("PROVIDER_RESPONSE_INVALID")
				}
				return nil
			}
			retry = res.StatusCode == 429 || res.StatusCode >= 500
			if !retry {
				return errCode("PROVIDER_REQUEST_REJECTED")
			}
		}
		if !retry || attempt+1 == attempts {
			if method == "POST" {
				return errCode("PROVIDER_CREATE_AMBIGUOUS")
			}
			return errCode("PROVIDER_TEMPORARY_FAILURE")
		}
		timer := time.NewTimer(100 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return errCode("PROVIDER_TIMEOUT")
		case <-timer.C:
		}
	}
	return errCode("PROVIDER_TEMPORARY_FAILURE")
}

type order struct {
	ID, Entity, Currency, Receipt, Status string
	Amount                                int64
	CreatedAt                             int64 `json:"created_at"`
	PartialPayment                        bool  `json:"partial_payment"`
}

func (a *Adapter) CreateOrder(ctx context.Context, r payment.ProviderOrderRequest) (payment.ProviderOrder, error) {
	empty := payment.ProviderOrder{}
	if r.Product.AmountMinor <= 0 || r.Product.Currency != "INR" || r.OrderID == "" || r.IdempotencyKey != r.OrderID {
		return empty, errCode("PROVIDER_REQUEST_INVALID")
	}
	receipt := Receipt(r.OrderID)
	var found struct {
		Count int
		Items []order
	}
	if err := a.request(ctx, "GET", "/orders?receipt="+url.QueryEscape(receipt)+"&count=2", nil, &found); err != nil {
		return empty, err
	}
	if found.Count != len(found.Items) {
		return empty, errCode("PROVIDER_ORDER_AMBIGUOUS")
	}
	var o order
	switch len(found.Items) {
	case 1:
		o = found.Items[0]
	case 0:
		if r.RecoveryOnly {
			return empty, errCode("PROVIDER_CREATE_AMBIGUOUS")
		}
		if err := a.request(ctx, "POST", "/orders", map[string]any{"amount": r.Product.AmountMinor, "currency": "INR", "receipt": receipt, "partial_payment": false}, &o); err != nil {
			return empty, err
		}
	default:
		return empty, errCode("PROVIDER_ORDER_AMBIGUOUS")
	}
	if !strings.HasPrefix(o.ID, "order_") || !identifier.MatchString(o.ID) || o.Entity != "order" || o.Receipt != receipt || o.Amount != r.Product.AmountMinor || o.Currency != r.Product.Currency || o.PartialPayment {
		return empty, errCode("PROVIDER_ORDER_MISMATCH")
	}
	return payment.ProviderOrder{ID: o.ID, OrderID: r.OrderID, CustomerID: r.CustomerID, AmountMinor: o.Amount, Currency: o.Currency}, nil
}

type providerPayment struct {
	ID, Entity, Status, Currency string
	OrderID                      string `json:"order_id"`
	Amount                       int64
	AmountRefunded               int64 `json:"amount_refunded"`
	Captured                     bool
	CreatedAt                    int64 `json:"created_at"`
}

func (a *Adapter) GetPaymentStatus(ctx context.Context, internalID, providerID string) (payment.Event, error) {
	empty := payment.Event{}
	if !identifier.MatchString(providerID) || !strings.HasPrefix(providerID, "order_") {
		return empty, errCode("PROVIDER_ORDER_MISMATCH")
	}
	binding, err := a.lookup(ctx, providerID)
	if err != nil || binding.OrderID != internalID || binding.ProviderOrderID != providerID {
		return empty, errCode("PROVIDER_ORDER_MISMATCH")
	}
	var o order
	if err = a.request(ctx, "GET", "/orders/"+providerID, nil, &o); err != nil {
		return empty, err
	}
	if o.ID != providerID || o.Entity != "order" || o.Receipt != Receipt(internalID) || o.Amount != binding.AmountMinor || o.Currency != binding.Currency || o.PartialPayment {
		return empty, errCode("PROVIDER_ORDER_MISMATCH")
	}
	var list struct {
		Count int
		Items []providerPayment
	}
	if err = a.request(ctx, "GET", "/orders/"+providerID+"/payments?count=100", nil, &list); err != nil {
		return empty, err
	}
	// Multiple captured payments or truncated lists are contradictory; do not pick a winner.
	if len(list.Items) >= 100 || list.Count != len(list.Items) {
		return empty, errCode("PROVIDER_STATE_AMBIGUOUS")
	}
	state, paymentID, stamp := "PENDING", "", o.CreatedAt
	captures := 0
	for _, p := range list.Items {
		if !strings.HasPrefix(p.ID, "pay_") || !identifier.MatchString(p.ID) || p.Entity != "payment" || p.OrderID != providerID || p.Amount != binding.AmountMinor || p.Currency != binding.Currency {
			return empty, errCode("PROVIDER_PAYMENT_MISMATCH")
		}
		switch p.Status {
		case "created", "authorized", "failed":
			if p.Captured || p.AmountRefunded != 0 {
				return empty, errCode("PROVIDER_STATE_AMBIGUOUS")
			}
		case "captured", "refunded":
			captures++
			if captures > 1 || !p.Captured || p.AmountRefunded < 0 || p.AmountRefunded > p.Amount {
				return empty, errCode("PROVIDER_STATE_AMBIGUOUS")
			}
			paymentID = p.ID
			stamp = p.CreatedAt
			state = "COMPLETED"
			if p.AmountRefunded > 0 {
				var refunds struct {
					Count int
					Items []struct {
						ID, Entity, Status string
						PaymentID          string `json:"payment_id"`
						Amount             int64
					}
				}
				if err = a.request(ctx, "GET", "/payments/"+p.ID+"/refunds?count=100", nil, &refunds); err != nil {
					return empty, err
				}
				if refunds.Count != len(refunds.Items) || len(refunds.Items) >= 100 {
					return empty, errCode("PROVIDER_STATE_AMBIGUOUS")
				}
				var processed int64
				seen := map[string]bool{}
				for _, r := range refunds.Items {
					if !strings.HasPrefix(r.ID, "rfnd_") || !identifier.MatchString(r.ID) || seen[r.ID] || r.Entity != "refund" || r.PaymentID != p.ID || r.Amount <= 0 || r.Amount > p.Amount {
						return empty, errCode("PROVIDER_REFUND_MISMATCH")
					}
					seen[r.ID] = true
					switch r.Status {
					case "processed":
						processed += r.Amount
					case "pending", "failed":
					default:
						return empty, errCode("PROVIDER_STATE_AMBIGUOUS")
					}
				}
				if processed == p.Amount {
					state = "REFUNDED"
				} else if processed > p.Amount {
					return empty, errCode("PROVIDER_REFUND_MISMATCH")
				} else {
					state = "PAYMENT_REVIEW"
				}
			} else if p.Status == "refunded" {
				return empty, errCode("PROVIDER_STATE_AMBIGUOUS")
			}
		default:
			return empty, errCode("PROVIDER_STATE_UNSUPPORTED")
		}
	}
	if stamp <= 0 || time.Unix(stamp, 0).After(time.Now().Add(5*time.Minute)) {
		return empty, errCode("PROVIDER_TIMESTAMP_INVALID")
	}
	if state == "COMPLETED" && o.Status != "paid" {
		return empty, errCode("PROVIDER_STATE_AMBIGUOUS")
	}
	return payment.Event{Provider: a.Namespace(), EventID: "snapshot", EventType: "RAZORPAY_AUTHORITATIVE_SNAPSHOT", OrderID: binding.OrderID, ProviderOrderID: providerID, PaymentID: paymentID, CustomerID: binding.CustomerID, Currency: binding.Currency, AmountMinor: binding.AmountMinor, Status: state, OccurredAt: time.Unix(stamp, 0).UTC(), EvidenceModel: SnapshotModel}, nil
}
func (a *Adapter) VerifyAndParseWebhook(ctx context.Context, raw []byte, headers http.Header) (payment.Event, error) {
	empty := payment.Event{}
	signature := headers.Get("X-Razorpay-Signature")
	decoded, err := hex.DecodeString(signature)
	if err != nil || len(decoded) != sha256.Size || len(signature) != 64 || len(raw) == 0 || len(raw) > 64<<10 {
		return empty, errCode("WEBHOOK_SIGNATURE_INVALID")
	}
	mac := hmac.New(sha256.New, []byte(a.config.WebhookSecret))
	mac.Write(raw)
	if !hmac.Equal(decoded, mac.Sum(nil)) {
		return empty, errCode("WEBHOOK_SIGNATURE_INVALID")
	}
	var event struct {
		Entity  string
		Account string `json:"account_id"`
		Event   string
		Created int64 `json:"created_at"`
		Payload struct {
			Payment struct{ Entity providerPayment }
			Refund  struct {
				Entity struct {
					ID, Status string
					PaymentID  string `json:"payment_id"`
					Amount     int64
				}
			}
		}
	}
	if json.Unmarshal(raw, &event) != nil || event.Entity != "event" || event.Account != a.config.AccountID || event.Created <= 0 || time.Unix(event.Created, 0).After(time.Now().Add(5*time.Minute)) {
		return empty, errCode("WEBHOOK_EVENT_INVALID")
	}
	id := headers.Get("X-Razorpay-Event-Id")
	if !identifier.MatchString(id) {
		return empty, errCode("WEBHOOK_EVENT_INVALID")
	}
	p := event.Payload.Payment.Entity
	switch event.Event {
	case "payment.captured":
		if p.Status != "captured" || !p.Captured {
			return empty, errCode("WEBHOOK_EVENT_INVALID")
		}
	case "payment.authorized":
		if p.Status != "authorized" || p.Captured {
			return empty, errCode("WEBHOOK_EVENT_INVALID")
		}
	case "payment.failed":
		if p.Status != "failed" || p.Captured {
			return empty, errCode("WEBHOOK_EVENT_INVALID")
		}
	case "refund.processed":
		refund := event.Payload.Refund.Entity
		if refund.Status != "processed" || refund.Amount <= 0 || !identifier.MatchString(refund.PaymentID) {
			return empty, errCode("WEBHOOK_EVENT_INVALID")
		}
		if err = a.request(ctx, "GET", "/payments/"+refund.PaymentID, nil, &p); err != nil {
			return empty, err
		}
		if p.ID != refund.PaymentID || p.AmountRefunded < refund.Amount {
			return empty, errCode("WEBHOOK_EVENT_INVALID")
		}
	default:
		return empty, errCode("WEBHOOK_EVENT_UNSUPPORTED")
	}
	if p.Entity != "payment" || !strings.HasPrefix(p.ID, "pay_") {
		return empty, errCode("WEBHOOK_EVENT_INVALID")
	}
	binding, err := a.lookup(ctx, p.OrderID)
	if err != nil || binding.ProviderOrderID != p.OrderID || p.Amount != binding.AmountMinor || p.Currency != binding.Currency || !identifier.MatchString(p.ID) {
		return empty, errCode("WEBHOOK_PAYMENT_MISMATCH")
	}
	digest := sha256.Sum256(raw)
	// Callback is a notification, never grant evidence. The service retrieves authoritative state.
	return payment.Event{Provider: a.Namespace(), EventID: id, EventType: event.Event, OrderID: binding.OrderID, ProviderOrderID: p.OrderID, PaymentID: p.ID, CustomerID: binding.CustomerID, Currency: binding.Currency, AmountMinor: binding.AmountMinor, Status: "PENDING", OccurredAt: time.Unix(event.Created, 0).UTC(), EvidenceModel: SnapshotModel, NotificationOnly: true, PayloadDigest: hex.EncodeToString(digest[:])}, nil
}
