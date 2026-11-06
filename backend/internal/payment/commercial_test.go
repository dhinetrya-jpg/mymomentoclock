package payment

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func commercialFixtureProduct(t *testing.T) Product {
	t.Helper()
	raw, _ := json.Marshal(map[string]any{"schema_version": 2, "approval_reference": "fixture-only-policy", "products": []any{map[string]any{"id": "commercial-fixture", "version": "v1", "capability_id": "fixture-commercial-access", "currency": "INR", "amount_minor": 12345, "policy": map[string]any{"description": "Fixture product only", "access_disclosure": "Fixture lifetime access", "access_seconds": 0, "lifetime": true, "billing_model": "one_time", "tax_policy_reference": "fixture-tax-review", "tax_disclosure": "Fixture total charge policy", "refund_policy_reference": "fixture-refund-review", "refund_disclosure": "Fixture refund policy only", "available": true, "effective_from": time.Now().Add(-time.Hour), "effective_until": time.Now().Add(time.Hour), "eligible_countries": []string{"IN"}, "approval_reference": "fixture-owner-approval"}}}})
	catalog, err := LoadCommercialCatalog(raw)
	if err != nil {
		t.Fatal(err)
	}
	return catalog["commercial-fixture"]
}
func TestCommercialCatalogValidation(t *testing.T) {
	p := commercialFixtureProduct(t)
	if p.AmountMinor != 12345 || p.Commercial == nil || p.Commercial.BillingModel != "one_time" {
		t.Fatal("catalog")
	}
	if _, err := LoadCommercialCatalog([]byte(`{"schema_version":2,"products":[]}`)); err == nil {
		t.Fatal("unapproved catalog")
	}
	if _, err := LoadCapabilityPolicies([]byte(`{"schema_version":1,"approval_reference":"fixture-review","capabilities":[{"id":"unsupported-real-feature","approval_reference":"fixture-review","delivery_reference":"fixture-delivery"}]}`), map[string]bool{}); err != nil {
		t.Fatal(err)
	}
	for _, raw := range []string{`{"schema_version":1,"approval_reference":"fixture-review","capabilities":[{"id":"cap","approval_reference":"","delivery_reference":"delivery"}]}`, `{"schema_version":1,"approval_reference":"fixture-review","capabilities":[],"delivered":true}`} {
		if _, err := LoadCapabilityPolicies([]byte(raw), map[string]bool{}); err == nil {
			t.Fatal("capability policy bypass")
		}
	}
}
func TestCommercialOrdersAndProtection(t *testing.T) {
	s, _ := fixture(t)
	p := commercialFixtureProduct(t)
	s.store.Catalog[p.ID] = p
	ctx := context.WithValue(context.Background(), countryContextKey{}, "IN")
	if _, err := s.createOrder(ctx, "customer-a", p.ID, randomID(), "fixture"); err == nil {
		t.Fatal("undelivered capability charged")
	}
	policy := CapabilityPolicy{ID: p.Capability, ApprovalReference: "fixture-policy", Delivered: true}
	s.capabilities[p.Capability] = policy
	if _, err := s.createOrder(context.Background(), "customer-a", p.ID, randomID(), "fixture"); err == nil {
		t.Fatal("unverified country")
	}
	key := randomID()
	o, err := s.createOrder(ctx, "customer-a", p.ID, key, "fixture")
	if err != nil {
		t.Fatal(err)
	}
	if o.Commercial == nil || o.Commercial.PurchaseCountry != "IN" || o.AmountMinor != 12345 {
		t.Fatal("snapshot absent")
	}
	changed := p
	changed.AmountMinor = 999
	changed.Commercial = &CommercialPolicy{}
	s.store.Catalog[p.ID] = changed
	retry, err := s.createOrder(ctx, "customer-a", p.ID, key, "fixture")
	if err != nil || retry.AmountMinor != 12345 || retry.Commercial.Description != p.Commercial.Description {
		t.Fatal("mutable order snapshot", err)
	}
	s.store.Catalog[p.ID] = p
	// Different retry keys cannot create concurrent pending commercial charges for the same capability.
	if _, err = s.createOrder(ctx, "customer-a", p.ID, randomID(), "fixture"); err == nil {
		t.Fatal("duplicate pending commercial reservation")
	}
	e := Event{Provider: s.store.Provider, EventID: randomID(), EventType: "fixture", OrderID: o.ID, ProviderOrderID: o.providerOrder, PaymentID: "fixture-payment-" + o.ID, CustomerID: "customer-a", Currency: o.Currency, AmountMinor: o.AmountMinor, Status: "COMPLETED", Revision: 1, OccurredAt: time.Now()}
	if _, err = s.store.ApplyVerifiedEvent(ctx, seal(e)); err != nil {
		t.Fatal(err)
	}
	if _, err = s.createOrder(ctx, "customer-a", p.ID, randomID(), "fixture"); err == nil || err.Error() != "ALREADY_PURCHASED" {
		t.Fatal("existing access not checked", err)
	}
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("fixture-only-content")) })
	guard := s.Protect(policy, next)
	call := func(token string) int {
		r := httptest.NewRequest("GET", "/fixture", nil)
		r.Header.Set("Authorization", "Bearer "+token)
		r.Header.Set("X-User-ID", "customer-a")
		w := httptest.NewRecorder()
		guard.ServeHTTP(w, r)
		return w.Code
	}
	if call("customer-a-session") != 200 || call("customer-b-session") != 403 || call("forged") != 401 {
		t.Fatal("protected ownership")
	}
	e.Status = "REFUNDED"
	e.Revision++
	e.EventID = randomID()
	if _, err = s.store.ApplyVerifiedEvent(ctx, seal(e)); err != nil {
		t.Fatal(err)
	}
	if call("customer-a-session") != 403 {
		t.Fatal("stale access after refund")
	}
}
func TestWorkerLimitsAndDeadLetter(t *testing.T) {
	s, provider := fixture(t)
	e := newOrder(t, s)
	provider.set(e)
	ctx := context.Background()
	if _, err := s.store.DB.Exec(`UPDATE phase1_orders SET created_at=now()-interval '1 hour',next_reconcile_at=now() WHERE order_id=$1`, e.OrderID); err != nil {
		t.Fatal(err)
	}
	provider.unavailable = true
	p := DefaultWorkerPolicy()
	p.MaxAttempts = 1
	p.Batch = 1
	r, err := s.ReconcileWithPolicy(ctx, p)
	provider.unavailable = false
	if err != nil || r.Failed != 1 {
		t.Fatal(r, err)
	}
	var state string
	s.store.DB.QueryRow(`SELECT reconcile_state FROM phase1_orders WHERE order_id=$1`, e.OrderID).Scan(&state)
	if state != "DEAD_LETTER" {
		t.Fatal("retry not bounded")
	}
	if activeCount(t, s, e.OrderID) != 0 {
		t.Fatal("outage grant")
	}
	for _, attempt := range []int{1, 5, 20} {
		delay, err := backoff(p, attempt)
		if err != nil || delay <= 0 || delay > p.MaxDelay {
			t.Fatal(delay, err)
		}
	}
	if _, err = s.ReconcileWithPolicy(ctx, WorkerPolicy{}); err == nil {
		t.Fatal("unsafe worker policy")
	}
	cancelled, cancel := context.WithCancel(ctx)
	cancel()
	if err = s.RunWorker(cancelled, DefaultWorkerPolicy()); err != nil {
		t.Fatal(err)
	}
}
func TestWorkerConcurrentClaims(t *testing.T) {
	s, provider := fixture(t)
	e := newOrder(t, s)
	provider.set(e)
	if _, err := s.store.DB.Exec(`UPDATE phase1_orders SET created_at=now()-interval '1 hour',next_reconcile_at=now() WHERE order_id=$1`, e.OrderID); err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := s.ReconcileWithPolicy(context.Background(), DefaultWorkerPolicy()); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if activeCount(t, s, e.OrderID) != 1 {
		t.Fatal("worker duplicate/lost fulfillment")
	}
	var n int
	s.store.DB.QueryRow(`SELECT count(*) FROM phase1_payment_audit WHERE order_id=$1 AND action='RECONCILE'`, e.OrderID).Scan(&n)
	if n != 1 {
		t.Fatal("concurrent claim", n)
	}
}
func TestFixedTelemetryNoIdentifiers(t *testing.T) {
	metrics := &Telemetry{}
	metrics.Observe("order_attempt", time.Millisecond)
	metrics.Observe("customer-secret-id", time.Second)
	var out strings.Builder
	metrics.WritePrometheus(&out)
	if strings.Contains(out.String(), "customer-secret-id") || !strings.Contains(out.String(), "order_attempt_total 1") {
		t.Fatal("metric cardinality")
	}
}

func TestPendingRiskNotificationCannotGrantBeforeReview(t *testing.T) {
	s, provider := fixture(t)
	s.store.EvidenceModel = "CAPTURE_REFUND_LATTICE_V1"
	e := newOrder(t, s)
	e.EvidenceModel = s.store.EvidenceModel
	e.Revision = 0
	provider.set(e)
	notification := e
	notification.EventID = randomID()
	notification.Status = "PENDING"
	notification.NotificationOnly = true
	notification.RiskHold = true
	notification.PayloadDigest = strings.Repeat("a", 64)
	if err := s.store.queue(context.Background(), seal(notification)); err != nil {
		t.Fatal(err)
	}
	if _, err := s.store.DB.Exec(`UPDATE phase1_orders SET created_at=now()-interval '1 hour',next_reconcile_at=now() WHERE order_id=$1`, e.OrderID); err != nil {
		t.Fatal(err)
	}
	r, err := s.ReconcileWithPolicy(context.Background(), DefaultWorkerPolicy())
	if err != nil || r.Repaired < 1 {
		t.Fatal(r, err)
	}
	var held bool
	s.store.DB.QueryRow(`SELECT provider_review_required FROM phase1_orders WHERE order_id=$1`, e.OrderID).Scan(&held)
	if !held || activeCount(t, s, e.OrderID) != 0 {
		t.Fatal("risk notification granted or failed to hold")
	}
}
