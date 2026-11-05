package payment

import (
	"context"
	"database/sql"
	_ "github.com/lib/pq"
	urlpkg "net/url"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func testDB(t *testing.T) *sql.DB {
	t.Helper()
	url := os.Getenv("PHASE1_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("isolated PostgreSQL integration database required")
	}
	parsed, parseErr := urlpkg.Parse(url)
	if parseErr != nil || parsed.Path != "/phase1_test" {
		t.Fatal("refusing to modify a non-test database")
	}
	db, err := sql.Open("postgres", url)
	if err != nil {
		t.Fatal(err)
	}
	if err = db.Ping(); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}
func TestTransactionalPayments(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	// Prove the optional legacy-default migration changes metadata, not existing birth data.
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS astronomical_birth_data(city_name TEXT DEFAULT 'Kolkata');CREATE TABLE IF NOT EXISTS calculated_pillar_vectors(conflict_resolved BOOLEAN DEFAULT true);`); err != nil {
		t.Fatal(err)
	}
	hardening, err := os.ReadFile("../../../database/migrations/002_remove_unsafe_legacy_defaults.sql")
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		if _, err := db.Exec(string(hardening)); err != nil {
			t.Fatal(err)
		}
	}
	var remaining int
	if err := db.QueryRow(`SELECT count(*) FROM information_schema.columns WHERE (table_name='astronomical_birth_data' AND column_name='city_name' OR table_name='calculated_pillar_vectors' AND column_name='conflict_resolved') AND column_default IS NOT NULL`).Scan(&remaining); err != nil || remaining != 0 {
		t.Fatal("unsafe defaults remain", err)
	}

	schema, err := os.ReadFile("../../../database/migrations/001_secure_payments.sql")
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 2; i++ {
		for _, file := range []string{"001_secure_payments.sql", "003_payment_application.sql", "005_provider_sandbox.sql"} {
			data, e := os.ReadFile("../../../database/migrations/" + file)
			if e != nil {
				t.Fatal(e)
			}
			if _, e = db.ExecContext(ctx, string(data)); e != nil {
				t.Fatal(e)
			}
		}
	}
	_ = schema
	if _, err = db.Exec(`TRUNCATE phase1_payment_audit,phase1_entitlements,phase1_payment_events,phase1_orders`); err != nil {
		t.Fatal(err)
	}
	s := &Store{DB: db, Provider: "isolated-test-provider", Catalog: map[string]Product{"test-product": {ID: "test-product", AmountMinor: 12345, Currency: "INR", OwnerApproved: true}}}
	makeOrder := func(id string) Event {
		t.Helper()
		if err := s.CreateOrder(ctx, id, "customer-a", "test-product", "provider-"+id); err != nil {
			t.Fatal(err)
		}
		return Event{Provider: s.Provider, EventID: "event-" + id, OrderID: id, ProviderOrderID: "provider-" + id, PaymentID: "payment-" + id, CustomerID: "customer-a", Currency: "INR", Status: "COMPLETED", AmountMinor: 12345, Revision: 1, OccurredAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC), EventType: "test"}
	}
	t.Run("no entitlement before verified event", func(t *testing.T) {
		makeOrder("pending")
		var n int
		db.QueryRow(`SELECT count(*) FROM phase1_entitlements`).Scan(&n)
		if n != 0 {
			t.Fatal("premature fulfillment")
		}
	})
	t.Run("server catalog rejects unapproved or invalid pricing", func(t *testing.T) {
		for _, p := range []Product{{ID: "bad", AmountMinor: 12345, Currency: "INR"}, {ID: "bad", AmountMinor: 0, Currency: "INR", OwnerApproved: true}, {ID: "bad", AmountMinor: -1, Currency: "INR", OwnerApproved: true}, {ID: "bad", AmountMinor: 100, Currency: "inr", OwnerApproved: true}} {
			s.Catalog["bad"] = p
			if err := s.CreateOrder(ctx, "bad-order", "customer-a", "bad", "bad-provider-order"); err == nil {
				t.Fatal("invalid catalog accepted")
			}
		}
	})
	t.Run("unknown order", func(t *testing.T) {
		e := Event{Provider: s.Provider, EventID: "unknown", OrderID: "unknown", ProviderOrderID: "unknown", PaymentID: "unknown", CustomerID: "a", Currency: "INR", Status: "COMPLETED", AmountMinor: 1, Revision: 1, OccurredAt: time.Now(), EventType: "test"}
		if grant, err := s.ApplyVerifiedEvent(ctx, seal(e)); grant || err == nil {
			t.Fatal("unknown order fulfilled")
		}
	})
	t.Run("amount currency customer and provider order mismatches", func(t *testing.T) {
		e := makeOrder("mismatch")
		for _, change := range []func(*Event){func(e *Event) { e.AmountMinor++ }, func(e *Event) { e.Currency = "USD" }, func(e *Event) { e.CustomerID = "customer-b" }, func(e *Event) { e.ProviderOrderID = "other" }, func(e *Event) { e.Status = "UNSUPPORTED" }, func(e *Event) { e.EventID = "" }} {
			bad := e
			change(&bad)
			if granted, err := s.ApplyVerifiedEvent(ctx, seal(bad)); granted || err == nil {
				t.Fatal("tampering accepted")
			}
		}
	})
	t.Run("concurrent duplicate granted once", func(t *testing.T) {
		e := makeOrder("concurrent")
		var n atomic.Int32
		var wg sync.WaitGroup
		for i := 0; i < 20; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				grant, err := s.ApplyVerifiedEvent(ctx, seal(e))
				if err != nil {
					t.Error(err)
				}
				if grant {
					n.Add(1)
				}
			}()
		}
		wg.Wait()
		if n.Load() != 1 {
			t.Fatalf("granted %d times", n.Load())
		}
		var count int
		db.QueryRow(`SELECT count(*) FROM phase1_payment_events WHERE order_id='concurrent'`).Scan(&count)
		if count != 1 {
			t.Fatal("duplicate durable event")
		}
	})
	t.Run("payment IDs cannot fulfill another order", func(t *testing.T) {
		a := makeOrder("id-a")
		b := makeOrder("id-b")
		if _, err := s.ApplyVerifiedEvent(ctx, seal(a)); err != nil {
			t.Fatal(err)
		}
		b.PaymentID = a.PaymentID
		if grant, err := s.ApplyVerifiedEvent(ctx, seal(b)); grant || err == nil {
			t.Fatal("reused provider payment accepted")
		}
	})
	t.Run("failed then successful payment and refund", func(t *testing.T) {
		e := makeOrder("refund")
		e.Status = "FAILED"
		if grant, err := s.ApplyVerifiedEvent(ctx, seal(e)); grant || err != nil {
			t.Fatalf("failed event: %v", err)
		}
		e.Status = "COMPLETED"
		e.Revision++
		e.EventID = "success-refund"
		if grant, err := s.ApplyVerifiedEvent(ctx, seal(e)); !grant || err != nil {
			t.Fatalf("success: %v", err)
		}
		completed := e
		e.EventID = "refund-event"
		e.Status = "REFUNDED"
		e.Revision++
		if grant, err := s.ApplyVerifiedEvent(ctx, seal(e)); grant || err != nil {
			t.Fatalf("refund: %v", err)
		}
		if grant, err := s.ApplyVerifiedEvent(ctx, seal(completed)); grant || err != nil {
			t.Fatalf("duplicate after refund: %v", err)
		}
		var active bool
		db.QueryRow(`SELECT active FROM phase1_entitlements WHERE order_id='refund'`).Scan(&active)
		if active {
			t.Fatal("refund reactivated access")
		}
		e.Status = "COMPLETED"
		e.EventID = "late-success"
		e.Revision++
		if grant, err := s.ApplyVerifiedEvent(ctx, seal(e)); grant || err == nil {
			t.Fatal("terminal state regressed")
		}
	})
	t.Run("missing provider and storage fail closed", func(t *testing.T) {
		e := makeOrder("storage")
		for _, bad := range []*Store{{}, {DB: db}} {
			if grant, err := bad.ApplyVerifiedEvent(ctx, seal(e)); grant || err == nil {
				t.Fatal("missing dependency granted access")
			}
		}
		closed, err := sql.Open("postgres", os.Getenv("PHASE1_TEST_DATABASE_URL"))
		if err != nil {
			t.Fatal(err)
		}
		closed.Close()
		bad := *s
		bad.DB = closed
		if grant, err := bad.ApplyVerifiedEvent(ctx, seal(e)); grant || err == nil {
			t.Fatal("closed storage granted access")
		}
	})
	t.Run("reversal removes entitlement", func(t *testing.T) {
		e := makeOrder("reverse")
		if _, err := s.ApplyVerifiedEvent(ctx, seal(e)); err != nil {
			t.Fatal(err)
		}
		e.Status = "REVERSED"
		e.Revision++
		e.EventID = "reversed-event"
		if granted, err := s.ApplyVerifiedEvent(ctx, seal(e)); granted || err != nil {
			t.Fatal(err)
		}
		var active bool
		db.QueryRow(`SELECT active FROM phase1_entitlements WHERE order_id='reverse'`).Scan(&active)
		if active {
			t.Fatal("reversal retained entitlement")
		}
	})
	t.Run("restart marker persisted", func(t *testing.T) {
		app, provider := fixture(t)
		appEvent := newOrder(t, app)
		provider.set(appEvent)
		if err := provider.deliver(ctx, app, appEvent); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`INSERT INTO phase1_payment_audit(order_id,action,outcome) VALUES($1,'RESTART_APP_PROOF','ACTIVE')`, appEvent.OrderID); err != nil {
			t.Fatal(err)
		}
		revoked := newOrder(t, app)
		revoked.Status = "REFUNDED"
		revoked.Revision = 2
		provider.set(revoked)
		if err := provider.deliver(ctx, app, revoked); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`INSERT INTO phase1_payment_audit(order_id,action,outcome) VALUES($1,'RESTART_APP_PROOF','REVOKED')`, revoked.OrderID); err != nil {
			t.Fatal(err)
		}
		e := makeOrder("restart-proof")
		if grant, err := s.ApplyVerifiedEvent(ctx, seal(e)); !grant || err != nil {
			t.Fatal(err)
		}
	})
}
func TestRecoveryAfterRestart(t *testing.T) {
	if os.Getenv("PHASE1_TEST_RESTART_CHECK") != "1" {
		t.Skip("executed only after external database restart")
	}
	db := testDB(t)
	var count int
	if err := db.QueryRow(`SELECT count(*) FROM phase1_payment_audit a JOIN phase1_orders o USING(order_id) WHERE a.action='RESTART_APP_PROOF' AND ((a.outcome='ACTIVE' AND o.status='COMPLETED' AND EXISTS(SELECT 1 FROM phase1_entitlements e WHERE e.order_id=o.order_id AND e.active)) OR (a.outcome='REVOKED' AND o.status='REFUNDED' AND NOT EXISTS(SELECT 1 FROM phase1_entitlements e WHERE e.order_id=o.order_id AND e.active)))`).Scan(&count); err != nil || count != 2 {
		t.Fatal("application restart recovery", count, err)
	}
	var state string
	var active bool
	if err := db.QueryRow(`SELECT o.status,e.active FROM phase1_orders o JOIN phase1_entitlements e USING(order_id) WHERE o.order_id='restart-proof'`).Scan(&state, &active); err != nil || state != "COMPLETED" || !active {
		t.Fatalf("restart recovery failed: %s %v %v", state, active, err)
	}
}
