package payment

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"io"
	"math/big"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// All identity/provider doubles live in _test.go, excluded from executable builds.
type fixtureIdentity struct{}

func (fixtureIdentity) ProductionReady() bool { return false }
func (fixtureIdentity) Authenticate(_ context.Context, r *http.Request) (string, error) {
	switch r.Header.Get("Authorization") {
	case "Bearer customer-a-session":
		return "customer-a", nil
	case "Bearer customer-b-session":
		return "customer-b", nil
	}
	return "", problem("UNAUTHENTICATED")
}

type fixtureProvider struct {
	mu          sync.Mutex
	states      map[string]Event
	orders      map[string]ProviderOrder
	unavailable bool
}

func (p *fixtureProvider) Namespace() string     { return "fixture/account/test" }
func (p *fixtureProvider) ProductionReady() bool { return false }
func (p *fixtureProvider) CreateOrder(_ context.Context, r ProviderOrderRequest) (ProviderOrder, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.unavailable {
		return ProviderOrder{}, problem("provider down")
	}
	if o, ok := p.orders[r.IdempotencyKey]; ok {
		return o, nil
	}
	o := ProviderOrder{ID: "provider-" + r.OrderID, OrderID: r.OrderID, CustomerID: r.CustomerID, AmountMinor: r.Product.AmountMinor, Currency: r.Product.Currency}
	p.orders[r.IdempotencyKey] = o
	return o, nil
}
func (p *fixtureProvider) VerifyAndParseWebhook(_ context.Context, raw []byte, h http.Header) (Event, error) {
	var e Event
	mac := hmac.New(sha256.New, []byte("isolated-unit-test-key"))
	mac.Write(raw)
	got, err := hex.DecodeString(h.Get("Fixture-Signature"))
	if err != nil || !hmac.Equal(got, mac.Sum(nil)) {
		return e, problem("signature")
	}
	if json.Unmarshal(raw, &e) != nil {
		return e, problem("payload")
	}
	return e, nil
}
func (p *fixtureProvider) GetPaymentStatus(_ context.Context, id, providerOrder string) (Event, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.unavailable {
		return Event{}, problem("provider down")
	}
	e, ok := p.states[id]
	if !ok || e.ProviderOrderID != providerOrder {
		return e, problem("unknown payment")
	}
	return e, nil
}
func (p *fixtureProvider) set(e Event) { p.mu.Lock(); defer p.mu.Unlock(); p.states[e.OrderID] = e }
func (p *fixtureProvider) deliver(ctx context.Context, s *Service, e Event) error {
	b, _ := json.Marshal(e)
	mac := hmac.New(sha256.New, []byte("isolated-unit-test-key"))
	mac.Write(b)
	return s.ProcessWebhook(ctx, b, http.Header{"Fixture-Signature": []string{hex.EncodeToString(mac.Sum(nil))}})
}
func fixture(t *testing.T) (*Service, *fixtureProvider) {
	t.Helper()
	db := testDB(t)
	for _, file := range []string{"001_secure_payments.sql", "003_payment_application.sql", "005_provider_sandbox.sql"} {
		data, err := os.ReadFile("../../../database/migrations/" + file)
		if err != nil {
			t.Fatal(err)
		}
		for i := 0; i < 2; i++ {
			if _, err = db.Exec(string(data)); err != nil {
				t.Fatal(err)
			}
		}
	}
	p := &fixtureProvider{states: map[string]Event{}, orders: map[string]ProviderOrder{}}
	s, err := NewService(Dependencies{Store: &Store{DB: db, Provider: p.Namespace(), Catalog: map[string]Product{"fixture-product": {ID: "fixture-product", Version: "v1", Capability: "fixture-access", AmountMinor: 12345, Currency: "INR", OwnerApproved: true}}}, Identity: fixtureIdentity{}, Provider: p, Environment: "test"})
	if err != nil {
		t.Fatal(err)
	}
	return s, p
}
func newOrder(t *testing.T, s *Service) Event {
	t.Helper()
	o, err := s.createOrder(context.Background(), "customer-a", "fixture-product", randomID(), randomID())
	if err != nil {
		t.Fatal(err)
	}
	return Event{Provider: s.store.Provider, EventID: randomID(), EventType: "fixture.completed", OrderID: o.ID, ProviderOrderID: "provider-" + o.ID, PaymentID: "payment-" + o.ID, CustomerID: "customer-a", Currency: "INR", AmountMinor: 12345, Status: "COMPLETED", Revision: 1, OccurredAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)}
}
func activeCount(t *testing.T, s *Service, id string) int {
	t.Helper()
	var n int
	if err := s.store.DB.QueryRow(`SELECT count(*) FROM phase1_entitlements WHERE order_id=$1 AND active`, id).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}
func TestTransitionMatrix(t *testing.T) {
	allowed := map[string]string{"PENDING": "PENDING COMPLETED FAILED REFUNDED REVERSED CANCELLED EXPIRED", "FAILED": "COMPLETED FAILED REFUNDED REVERSED CANCELLED EXPIRED", "COMPLETED": "COMPLETED REFUNDED REVERSED", "REFUNDED": "REFUNDED", "REVERSED": "REVERSED", "CANCELLED": "CANCELLED", "EXPIRED": "EXPIRED"}
	states := []string{"CREATED", "PENDING", "COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED", "REVERSED", "AUTHORIZED", "PARTIALLY_REFUNDED", "UNKNOWN"}
	for _, from := range states {
		for _, to := range states {
			t.Run(from+"/"+to, func(t *testing.T) {
				want := strings.Contains(" "+allowed[from]+" ", " "+to+" ")
				if transition(from, to) != want {
					t.Fatal("wrong transition")
				}
			})
		}
	}
}
func TestPaymentApplication(t *testing.T) {
	s, p := fixture(t)
	ctx := context.Background()
	t.Run("configuration fails closed", func(t *testing.T) {
		for _, d := range []Dependencies{{}, {Store: s.store}, {Store: s.store, Identity: fixtureIdentity{}}, {Store: s.store, Identity: fixtureIdentity{}, Provider: p, Environment: "production", ActivationApproved: true}} {
			if _, err := NewService(d); err == nil {
				t.Fatal("unsafe dependencies accepted")
			}
		}
		if _, err := s.store.ApplyVerifiedEvent(ctx, VerifiedEvent{}); err == nil {
			t.Fatal("unsealed evidence accepted")
		}
		var v VerifiedEvent
		_ = json.Unmarshal([]byte(`{"verified":true,"Status":"COMPLETED"}`), &v)
		if _, err := s.store.ApplyVerifiedEvent(ctx, v); err == nil {
			t.Fatal("JSON verification bypass")
		}
	})
	t.Run("retry-safe catalog snapshot and concurrent creation", func(t *testing.T) {
		key := randomID()
		var wg sync.WaitGroup
		ids := make(chan string, 20)
		for i := 0; i < 20; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				o, err := s.createOrder(ctx, "customer-a", "fixture-product", key, randomID())
				if err != nil {
					t.Error(err)
					return
				}
				ids <- o.ID
			}()
		}
		wg.Wait()
		close(ids)
		var id string
		for got := range ids {
			if id != "" && id != got {
				t.Fatal("duplicate durable order")
			}
			id = got
		}
		if id == "" {
			t.Fatal("no order")
		}
		var n int
		if err := s.store.DB.QueryRow(`SELECT count(*) FROM phase1_orders WHERE customer_id='customer-a' AND idempotency_key=$1`, key).Scan(&n); err != nil || n != 1 {
			t.Fatal(n, err)
		}
		product := s.store.Catalog["fixture-product"]
		changed := product
		changed.AmountMinor = 999
		s.store.Catalog["fixture-product"] = changed
		o, err := s.createOrder(ctx, "customer-a", "fixture-product", key, "retry")
		s.store.Catalog["fixture-product"] = product
		if err != nil || o.AmountMinor != 12345 || o.ProductVersion != "v1" {
			t.Fatal(o, err)
		}
		if _, err = s.createOrder(ctx, "customer-a", "other", key, "retry"); err == nil {
			t.Fatal("key reused for another product")
		}
	})
	t.Run("unknown unapproved product and invalid currency", func(t *testing.T) {
		for _, id := range []string{"missing", "unapproved", "bad-currency", "bad-amount"} {
			s.store.Catalog[id] = Product{ID: id, Version: "v1", Capability: "fixture-access", AmountMinor: 100, Currency: "INR", OwnerApproved: true}
			if id == "missing" {
				delete(s.store.Catalog, id)
			}
			v := s.store.Catalog[id]
			if id == "unapproved" {
				v.OwnerApproved = false
			}
			if id == "bad-currency" {
				v.Currency = "inr"
			}
			if id == "bad-amount" {
				v.AmountMinor = 0
			}
			if id != "missing" {
				s.store.Catalog[id] = v
			}
			if _, err := s.createOrder(ctx, "customer-a", id, randomID(), "x"); err == nil {
				t.Fatal(id)
			}
			delete(s.store.Catalog, id)
		}
	})
	t.Run("20 duplicates and post-commit retry", func(t *testing.T) {
		e := newOrder(t, s)
		p.set(e)
		var wg sync.WaitGroup
		for i := 0; i < 20; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				if err := p.deliver(ctx, s, e); err != nil {
					t.Error(err)
				}
			}()
		}
		wg.Wait()
		if activeCount(t, s, e.OrderID) != 1 {
			t.Fatal("not exactly one grant")
		}
		if err := p.deliver(ctx, s, e); err != nil {
			t.Fatal(err)
		}
	})
	t.Run("20 conflicting event IDs", func(t *testing.T) {
		e := newOrder(t, s)
		var wg sync.WaitGroup
		var ok atomic.Int32
		for i := 0; i < 20; i++ {
			wg.Add(1)
			go func(i int) {
				defer wg.Done()
				bad := e
				bad.AmountMinor += int64(i)
				if _, err := s.store.ApplyVerifiedEvent(ctx, seal(bad)); err == nil {
					ok.Add(1)
				}
			}(i)
		}
		wg.Wait()
		var n int
		s.store.DB.QueryRow(`SELECT count(*) FROM phase1_payment_events WHERE provider=$1 AND event_id=$2`, e.Provider, e.EventID).Scan(&n)
		if n != 1 || ok.Load() > 1 || activeCount(t, s, e.OrderID) > 1 {
			t.Fatal("conflicting evidence duplicated effects")
		}
	})
	t.Run("refund versus completion is deterministic", func(t *testing.T) {
		e := newOrder(t, s)
		refund := e
		refund.Revision = 2
		refund.EventID = randomID()
		refund.Status = "REFUNDED"
		var wg sync.WaitGroup
		for _, event := range []Event{e, refund} {
			wg.Add(1)
			go func(event Event) {
				defer wg.Done()
				if _, err := s.store.ApplyVerifiedEvent(ctx, seal(event)); err != nil {
					t.Error(err)
				}
			}(event)
		}
		wg.Wait()
		if activeCount(t, s, e.OrderID) != 0 {
			t.Fatal("race retained access")
		}
		var state string
		s.store.DB.QueryRow(`SELECT status FROM phase1_orders WHERE order_id=$1`, e.OrderID).Scan(&state)
		if state != "REFUNDED" {
			t.Fatal(state)
		}
		if _, err := s.store.ApplyVerifiedEvent(ctx, seal(e)); err != nil {
			t.Fatal(err)
		}
		if activeCount(t, s, e.OrderID) != 0 {
			t.Fatal("replay regranted")
		}
	})
	t.Run("failure completion out-of-order and payment reuse", func(t *testing.T) {
		e := newOrder(t, s)
		fail := e
		fail.Status = "FAILED"
		if _, err := s.store.ApplyVerifiedEvent(ctx, seal(fail)); err != nil {
			t.Fatal(err)
		}
		e.Revision = 2
		e.EventID = randomID()
		if _, err := s.store.ApplyVerifiedEvent(ctx, seal(e)); err != nil {
			t.Fatal(err)
		}
		fail.EventID = randomID()
		if _, err := s.store.ApplyVerifiedEvent(ctx, seal(fail)); err != nil {
			t.Fatal(err)
		}
		if activeCount(t, s, e.OrderID) != 1 {
			t.Fatal("stale failure erased grant")
		}
		reuse := newOrder(t, s)
		reuse.PaymentID = e.PaymentID
		if _, err := s.store.ApplyVerifiedEvent(ctx, seal(reuse)); err == nil {
			t.Fatal("reused payment ID")
		}
		if activeCount(t, s, reuse.OrderID) != 0 {
			t.Fatal("partial commit")
		}
	})
	t.Run("multiple purchases refunds and expiration", func(t *testing.T) {
		a, b := newOrder(t, s), newOrder(t, s)
		for _, e := range []Event{a, b} {
			if _, err := s.store.ApplyVerifiedEvent(ctx, seal(e)); err != nil {
				t.Fatal(err)
			}
		}
		a.Status = "REFUNDED"
		a.Revision++
		a.EventID = randomID()
		if _, err := s.store.ApplyVerifiedEvent(ctx, seal(a)); err != nil {
			t.Fatal(err)
		}
		if activeCount(t, s, b.OrderID) != 1 {
			t.Fatal("independent purchase revoked")
		}
		if _, err := s.store.DB.Exec(`UPDATE phase1_entitlements SET expires_at=now()-interval '1 second' WHERE order_id=$1`, b.OrderID); err != nil {
			t.Fatal(err)
		}
		list, err := s.store.entitlements(ctx, "customer-a")
		if err != nil {
			t.Fatal(err)
		}
		for _, g := range list {
			if g.SourceOrder == a.OrderID || g.SourceOrder == b.OrderID {
				t.Fatal("expired/revoked grant returned")
			}
		}
	})
	t.Run("crash consistency at transaction boundaries", func(t *testing.T) {
		for _, stage := range []string{"before_event_insert", "after_event_insert", "after_order_update", "before_commit", "after_commit"} {
			t.Run(stage, func(t *testing.T) {
				e := newOrder(t, s)
				s.store.failpoint = func(at string, _ *sql.Tx) error {
					if at == stage {
						return problem("INJECTED_CRASH")
					}
					return nil
				}
				_, err := s.store.ApplyVerifiedEvent(ctx, seal(e))
				s.store.failpoint = nil
				if err == nil {
					t.Fatal("fault not hit")
				}
				want := 0
				if stage == "after_commit" {
					want = 1
				}
				if activeCount(t, s, e.OrderID) != want {
					t.Fatal("non-atomic grant")
				}
				if _, err = s.store.ApplyVerifiedEvent(ctx, seal(e)); err != nil {
					t.Fatal(err)
				}
				if activeCount(t, s, e.OrderID) != 1 {
					t.Fatal("retry failed")
				}
			})
		}
	})
	t.Run("order crash and provider outage recovery", func(t *testing.T) {
		for _, stage := range []string{"before_order_insert", "after_order_insert"} {
			key := randomID()
			s.store.failpoint = func(at string, _ *sql.Tx) error {
				if at == stage {
					return problem("INJECTED_CRASH")
				}
				return nil
			}
			if _, err := s.createOrder(ctx, "customer-a", "fixture-product", key, "x"); err == nil {
				t.Fatal("fault not hit")
			}
			s.store.failpoint = nil
			if _, err := s.createOrder(ctx, "customer-a", "fixture-product", key, "x"); err != nil {
				t.Fatal(err)
			}
		}
		key := randomID()
		p.unavailable = true
		_, err := s.createOrder(ctx, "customer-a", "fixture-product", key, "x")
		p.unavailable = false
		if err == nil {
			t.Fatal("provider outage hidden")
		}
		if _, err = s.createOrder(ctx, "customer-a", "fixture-product", key, "x"); err != nil {
			t.Fatal(err)
		}
	})
	t.Run("connection loss during commit and cancellation", func(t *testing.T) {
		e := newOrder(t, s)
		s.store.failpoint = func(at string, tx *sql.Tx) error {
			if at == "before_commit" {
				var pid int
				if err := tx.QueryRow(`SELECT pg_backend_pid()`).Scan(&pid); err != nil {
					return err
				}
				_, err := s.store.DB.Exec(`SELECT pg_terminate_backend($1)`, pid)
				return err
			}
			return nil
		}
		if _, err := s.store.ApplyVerifiedEvent(ctx, seal(e)); err == nil {
			t.Fatal("connection loss ignored")
		}
		s.store.failpoint = nil
		if activeCount(t, s, e.OrderID) != 0 {
			t.Fatal("lost transaction granted")
		}
		if _, err := s.store.ApplyVerifiedEvent(ctx, seal(e)); err != nil {
			t.Fatal(err)
		}
		cancelled, cancel := context.WithCancel(ctx)
		cancel()
		if _, err := s.createOrder(cancelled, "customer-a", "fixture-product", randomID(), "x"); err == nil {
			t.Fatal("cancel ignored")
		}
	})
	t.Run("unsigned malformed unknown and partial refund", func(t *testing.T) {
		e := newOrder(t, s)
		raw, _ := json.Marshal(e)
		for _, signature := range []string{"", "bogus"} {
			if err := s.ProcessWebhook(ctx, raw, http.Header{"Fixture-Signature": []string{signature}}); err == nil {
				t.Fatal("unsigned accepted")
			}
		}
		e.OrderID = "unknown"
		p.set(e)
		if err := p.deliver(ctx, s, e); err == nil {
			t.Fatal("unknown fulfilled")
		}
		e = newOrder(t, s)
		e.Status = "PARTIALLY_REFUNDED"
		p.set(e)
		if err := p.deliver(ctx, s, e); err == nil {
			t.Fatal("unapproved partial refund policy")
		}
	})
	t.Run("latest provider refund overrides stale completion", func(t *testing.T) {
		e := newOrder(t, s)
		refund := e
		refund.Status = "REFUNDED"
		refund.Revision = 2
		refund.EventID = randomID()
		p.set(refund)
		if err := p.deliver(ctx, s, e); err != nil {
			t.Fatal(err)
		}
		if activeCount(t, s, e.OrderID) != 0 {
			t.Fatal("stale webhook unlocked refunded purchase")
		}
	})
	t.Run("reconciliation durable pending and bounded backoff", func(t *testing.T) {
		e := newOrder(t, s)
		p.set(e)
		if err := s.store.queue(ctx, seal(e)); err != nil {
			t.Fatal(err)
		}
		if _, err := s.store.DB.Exec(`UPDATE phase1_orders SET created_at=now()-interval '1 hour',next_reconcile_at=now() WHERE order_id=$1`, e.OrderID); err != nil {
			t.Fatal(err)
		}
		r, err := s.Reconcile(ctx, time.Minute, 100)
		if err != nil || r.Examined < 1 || activeCount(t, s, e.OrderID) != 1 {
			t.Fatal(r, err)
		}
		if _, err = s.Reconcile(ctx, time.Second, 1000); err == nil {
			t.Fatal("unbounded batch")
		}
		var audit int
		s.store.DB.QueryRow(`SELECT count(*) FROM phase1_payment_audit WHERE order_id=$1 AND action='RECONCILE'`, e.OrderID).Scan(&audit)
		if audit != 1 {
			t.Fatal("no recovery audit")
		}
	})
	t.Run("simultaneous access reads and revocation", func(t *testing.T) {
		e := newOrder(t, s)
		if _, err := s.store.ApplyVerifiedEvent(ctx, seal(e)); err != nil {
			t.Fatal(err)
		}
		var wg sync.WaitGroup
		for i := 0; i < 20; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				if _, err := s.store.entitlements(ctx, "customer-a"); err != nil {
					t.Error(err)
				}
			}()
		}
		e.Status = "REVERSED"
		e.Revision++
		e.EventID = randomID()
		if _, err := s.store.ApplyVerifiedEvent(ctx, seal(e)); err != nil {
			t.Fatal(err)
		}
		wg.Wait()
		if activeCount(t, s, e.OrderID) != 0 {
			t.Fatal("reversal not durable")
		}
	})
}

func certificates(t *testing.T) (tls.Certificate, tls.Certificate, *x509.CertPool) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	ca := &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "isolated-test-ca"}, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour), IsCA: true, BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign}
	der, err := x509.CreateCertificate(rand.Reader, ca, ca, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	pool := x509.NewCertPool()
	pool.AddCert(mustCert(t, der))
	makeCert := func(serial int64, dns string, usage x509.ExtKeyUsage) tls.Certificate {
		k, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			t.Fatal(err)
		}
		c := &x509.Certificate{SerialNumber: big.NewInt(serial), DNSNames: []string{dns}, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour), ExtKeyUsage: []x509.ExtKeyUsage{usage}, KeyUsage: x509.KeyUsageDigitalSignature}
		b, err := x509.CreateCertificate(rand.Reader, c, ca, &k.PublicKey, key)
		if err != nil {
			t.Fatal(err)
		}
		cert, err := tls.X509KeyPair(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: b}), pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(k)}))
		if err != nil {
			t.Fatal(err)
		}
		return cert
	}
	return makeCert(2, "localhost", x509.ExtKeyUsageServerAuth), makeCert(3, "payment-web.internal", x509.ExtKeyUsageClientAuth), pool
}
func mustCert(t *testing.T, b []byte) *x509.Certificate {
	t.Helper()
	c, err := x509.ParseCertificate(b)
	if err != nil {
		t.Fatal(err)
	}
	return c
}
func TestApplicationHTTPOverMutualTLS(t *testing.T) {
	s, p := fixture(t)
	serverCert, clientCert, pool := certificates(t)
	tlsConfig := InternalTLS(serverCert, pool)
	if _, err := NewInternalServer(":0", s, &tls.Config{}, "payment-web.internal"); err == nil {
		t.Fatal("insecure listener")
	}
	srv := httptest.NewUnstartedServer(Handler(s, "payment-web.internal"))
	srv.TLS = tlsConfig
	srv.StartTLS()
	defer srv.Close()
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool, ServerName: "localhost", Certificates: []tls.Certificate{clientCert}, MinVersion: tls.VersionTLS13}}, Timeout: 5 * time.Second}
	defer client.CloseIdleConnections()
	call := func(method, path, token, body string) (int, []byte) {
		t.Helper()
		r, _ := http.NewRequest(method, srv.URL+path, strings.NewReader(body))
		r.Header.Set("Authorization", "Bearer "+token)
		r.Header.Set("X-User-ID", "customer-a")
		res, err := client.Do(r)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		b, _ := io.ReadAll(res.Body)
		return res.StatusCode, b
	}
	for _, body := range []string{`{"product_id":"fixture-product","idempotency_key":"long-test-creation-key","customer_id":"customer-a"}`, `{"product_id":"fixture-product","idempotency_key":"long-test-creation-key","amount_minor":1}`, `{"product_id":"fixture-product","idempotency_key":"long-test-creation-key","currency":"USD"}`} {
		if code, _ := call("POST", "/api/payment/orders", "customer-a-session", body); code != 422 {
			t.Fatal(code)
		}
	}
	if code, _ := call("POST", "/api/payment/orders", "forged", `{}`); code != 401 {
		t.Fatal(code)
	}
	code, body := call("POST", "/api/payment/orders", "customer-a-session", `{"product_id":"fixture-product","idempotency_key":"complete-lifecycle-creation-key"}`)
	if code != 200 {
		t.Fatal(code, string(body))
	}
	var o Order
	json.Unmarshal(body, &o)
	if code, _ = call("GET", "/api/payment/orders/"+o.ID, "customer-b-session", ""); code != 404 {
		t.Fatal("cross owner", code)
	}
	e := Event{Provider: p.Namespace(), EventID: randomID(), EventType: "fixture.completed", OrderID: o.ID, ProviderOrderID: "provider-" + o.ID, PaymentID: "payment-" + o.ID, CustomerID: "customer-a", Currency: "INR", AmountMinor: 12345, Status: "COMPLETED", Revision: 1, OccurredAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)}
	p.set(e)
	if err := p.deliver(context.Background(), s, e); err != nil {
		t.Fatal(err)
	}
	if err := p.deliver(context.Background(), s, e); err != nil {
		t.Fatal(err)
	}
	code, body = call("GET", "/api/payment/entitlements", "customer-a-session", "")
	if code != 200 || !bytes.Contains(body, []byte(o.ID)) {
		t.Fatal(code, string(body))
	}
	code, body = call("GET", "/api/payment/entitlements", "customer-b-session", "")
	if code != 200 || bytes.Contains(body, []byte(o.ID)) {
		t.Fatal("cross customer entitlement")
	}
	if code, _ = call("GET", "/api/payment/entitlements?customer_id=customer-a", "customer-b-session", ""); code != 422 {
		t.Fatal(code)
	}
	request := httptest.NewRequest("GET", "/", nil)
	request.Header.Set("Authorization", "Bearer customer-a-session")
	if err := s.RequireAccess(context.Background(), request, "fixture-access"); err != nil {
		t.Fatal(err)
	}
	e.Status = "REFUNDED"
	e.Revision = 2
	e.EventID = randomID()
	p.set(e)
	if err := p.deliver(context.Background(), s, e); err != nil {
		t.Fatal(err)
	}
	list, err := s.store.entitlements(context.Background(), "customer-a")
	if err != nil {
		t.Fatal(err)
	}
	for _, g := range list {
		if g.SourceOrder == o.ID {
			t.Fatal("refunded access")
		}
	}
	// Another test may have an independently valid purchase; use an absent capability to prove denial.
	if err = s.RequireAccess(context.Background(), request, "never-purchased"); err == nil {
		t.Fatal("unpaid capability allowed")
	}
	public := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/api/payment/entitlements", nil)
	r.Header.Set("X-User-ID", "customer-a")
	Handler(s, "payment-web.internal").ServeHTTP(public, r)
	if public.Code != 401 {
		t.Fatal("open internal service")
	}
	noCert := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool, ServerName: "localhost", MinVersion: tls.VersionTLS13}}, Timeout: time.Second}
	defer noCert.CloseIdleConnections()
	if res, err := noCert.Get(srv.URL + "/api/payment/entitlements"); err == nil {
		res.Body.Close()
		t.Fatal("TLS accepted no client cert")
	}
}

func TestDurableTransitionMatrix(t *testing.T) {
	s, _ := fixture(t)
	ctx := context.Background()
	states := []string{"CREATED", "PENDING", "COMPLETED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED", "REVERSED"}
	for _, from := range states {
		for _, to := range append(states, "PARTIALLY_REFUNDED") {
			t.Run(from+"/"+to, func(t *testing.T) {
				e := newOrder(t, s)
				if _, err := s.store.DB.Exec(`UPDATE phase1_orders SET status=$2,provider_revision=1 WHERE order_id=$1`, e.OrderID, from); err != nil {
					t.Fatal(err)
				}
				e.Status = to
				e.Revision = 2
				_, err := s.store.ApplyVerifiedEvent(ctx, seal(e))
				want := transition(from, to)
				if (err == nil) != want {
					t.Fatalf("transition %s -> %s: %v", from, to, err)
				}
				var state string
				if err := s.store.DB.QueryRow(`SELECT status FROM phase1_orders WHERE order_id=$1`, e.OrderID).Scan(&state); err != nil {
					t.Fatal(err)
				}
				if want && state != to || !want && state != from {
					t.Fatal("non-atomic transition", state)
				}
				if !want && activeCount(t, s, e.OrderID) != 0 {
					t.Fatal("forbidden transition granted")
				}
			})
		}
	}
}
func TestSchemaConstraintsAndLeastPrivilege(t *testing.T) {
	s, _ := fixture(t)
	ctx := context.Background()
	e := newOrder(t, s)
	for name, statement := range map[string]string{
		"amount":   `UPDATE phase1_orders SET amount_minor=0 WHERE order_id=$1`,
		"currency": `UPDATE phase1_orders SET currency='inr' WHERE order_id=$1`,
		"state":    `UPDATE phase1_orders SET status='FREE_PAID' WHERE order_id=$1`,
		"revision": `UPDATE phase1_orders SET provider_revision=-1 WHERE order_id=$1`,
		"owner":    `INSERT INTO phase1_entitlements(order_id,customer_id,active) VALUES($1,'another-owner',true)`,
	} {
		t.Run(name, func(t *testing.T) {
			if _, err := s.store.DB.Exec(statement, e.OrderID); err == nil {
				t.Fatal("constraint absent")
			}
		})
	}
	other := newOrder(t, s)
	if _, err := s.store.DB.Exec(`UPDATE phase1_orders SET provider_order_id=$2 WHERE order_id=$1`, other.OrderID, e.ProviderOrderID); err == nil {
		t.Fatal("duplicate provider order")
	}
	for _, file := range []string{"../../../database/migrations/004_payment_validate.sql", "../../../database/payment_runtime_role.sql"} {
		b, err := os.ReadFile(file)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = s.store.DB.Exec(string(b)); err != nil {
			t.Fatal(err)
		}
	}
	// Test the granted role using SET ROLE on a dedicated connection, not the migration owner.
	conn, err := s.store.DB.Conn(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	if _, err = conn.ExecContext(ctx, `SET ROLE mymomentoclock_payment_runtime`); err != nil {
		t.Fatal(err)
	}
	defer conn.ExecContext(ctx, `RESET ROLE`)
	var allowed bool
	if err = conn.QueryRowContext(ctx, `SELECT has_table_privilege(current_user,'phase1_orders','UPDATE') AND NOT has_table_privilege(current_user,'phase1_orders','DELETE')`).Scan(&allowed); err != nil || !allowed {
		t.Fatal("role grants", err)
	}
	if _, err = conn.ExecContext(ctx, `ALTER TABLE phase1_orders ADD COLUMN should_never_exist TEXT`); err == nil {
		t.Fatal("runtime can run DDL")
	}
	if _, err = conn.ExecContext(ctx, `INSERT INTO phase1_payment_audit(order_id,action,outcome) VALUES($1,'ROLE_PROBE','OK')`, e.OrderID); err != nil {
		t.Fatal("runtime cannot audit", err)
	}
}
func TestDatabaseConfigurationAndReadiness(t *testing.T) {
	for _, dsn := range []string{"", "postgres://user:secret@db/db?sslmode=disable", "postgres://user:secret@db/db?sslmode=require", "postgres://user:secret@db/db?sslmode=verify-full&host=elsewhere", "postgres://user:secret@db/db?sslmode=verify-full&sslmode=disable"} {
		db, err := OpenDatabase(context.Background(), DatabaseConfig{DSN: dsn, MaxOpen: 20, MaxIdle: 10, Lifetime: time.Minute, IdleTimeout: time.Minute})
		if db != nil || err == nil || strings.Contains(err.Error(), "secret") {
			t.Fatal("unsafe DSN accepted/leaked")
		}
	}
	s, _ := fixture(t)
	if err := s.Ready(context.Background()); err != nil {
		t.Fatal(err)
	}
	closed, _ := sql.Open("postgres", os.Getenv("PHASE1_TEST_DATABASE_URL"))
	closed.Close()
	copy := *s
	store := *s.store
	store.DB = closed
	copy.store = &store
	if err := copy.Ready(context.Background()); err == nil {
		t.Fatal("closed DB ready")
	}
}

func TestVerifiedDatabaseTLS(t *testing.T) {
	dsn := os.Getenv("PHASE1_TEST_DATABASE_URL")
	if !strings.Contains(dsn, "sslmode=verify-full") {
		t.Skip("full gate script provisions verified TLS database")
	}
	db, err := OpenDatabase(context.Background(), DatabaseConfig{DSN: dsn, MaxOpen: 4, MaxIdle: 2, Lifetime: time.Minute, IdleTimeout: time.Minute})
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var ssl bool
	if err = db.QueryRow(`SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()`).Scan(&ssl); err != nil || !ssl {
		t.Fatal("database TLS not active", err)
	}
	bad := strings.Replace(dsn, "/test-tls/server.crt", "/nonexistent-trust-root", 1)
	if untrusted, err := OpenDatabase(context.Background(), DatabaseConfig{DSN: bad, MaxOpen: 4, MaxIdle: 2, Lifetime: time.Minute, IdleTimeout: time.Minute}); err == nil || untrusted != nil {
		t.Fatal("untrusted TLS accepted")
	}
}

func TestPendingAndExpiryWithoutPaymentID(t *testing.T) {
	s, _ := fixture(t)
	e := newOrder(t, s)
	e.PaymentID = ""
	e.Status = "PENDING"
	if _, err := s.store.ApplyVerifiedEvent(context.Background(), seal(e)); err != nil {
		t.Fatal(err)
	}
	e.EventID = randomID()
	e.Revision++
	e.Status = "EXPIRED"
	if _, err := s.store.ApplyVerifiedEvent(context.Background(), seal(e)); err != nil {
		t.Fatal(err)
	}
	if activeCount(t, s, e.OrderID) != 0 {
		t.Fatal("expired unpaid order grants")
	}
}

func TestCatalogManifest(t *testing.T) {
	good := `{"approval_reference":"isolated-test-review","products":[{"id":"fixture","version":"v1","capability_id":"fixture-capability","amount_minor":12345,"currency":"INR","access_seconds":0}]}`
	if catalog, err := LoadCatalog(strings.NewReader(good)); err != nil || catalog["fixture"].AmountMinor != 12345 {
		t.Fatal("catalog", err)
	}
	for _, bad := range []string{strings.Replace(good, "12345", "0", 1), strings.Replace(good, "INR", "inr", 1), strings.Replace(good, "isolated-test-review", "", 1), strings.Replace(good, "12345", "1.5", 1), good + `{}`, strings.Replace(good, `"access_seconds":0`, `"access_seconds":-1`, 1), strings.Replace(good, `"products":`, `"customer_id":"forged","products":`, 1)} {
		if _, err := LoadCatalog(strings.NewReader(bad)); err == nil {
			t.Fatal("invalid manifest accepted")
		}
	}
}

func TestNodeGoPostgresLifecycle(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("full gate mounts Node22 for cross-service lifecycle")
	}
	s, p := fixture(t)
	certDir := t.TempDir()
	caPEM, certPEM, keyPEM, serverTLS := e2eTLS(t)
	if err = os.WriteFile(filepath.Join(certDir, "ca.pem"), caPEM, 0600); err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(filepath.Join(certDir, "client.pem"), certPEM, 0600); err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(filepath.Join(certDir, "client.key"), keyPEM, 0600); err != nil {
		t.Fatal(err)
	}
	handler := Handler(s, "payment-web.internal")
	srv := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/_fixture/") {
			handler.ServeHTTP(w, r)
			return
		}
		if !HasTrustedPeer(r, "payment-web.internal") {
			http.Error(w, "denied", 401)
			return
		}
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/_fixture/"), "/")
		if len(parts) != 2 {
			http.Error(w, "bad fixture", 400)
			return
		}
		o, err := s.store.ownOrder(r.Context(), "customer-a", parts[1])
		if err != nil {
			http.Error(w, "missing fixture", 404)
			return
		}
		e := Event{Provider: p.Namespace(), EventID: "fixture-completion-" + o.ID, EventType: "fixture.completed", OrderID: o.ID, ProviderOrderID: o.providerOrder, PaymentID: "payment-" + o.ID, CustomerID: "customer-a", Currency: o.Currency, AmountMinor: o.AmountMinor, Status: "COMPLETED", Revision: 1, OccurredAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)}
		if parts[0] == "refund" {
			e.Status = "REFUNDED"
			e.Revision = 2
			e.EventID = "fixture-refund-" + o.ID
		}
		p.set(e)
		if err = p.deliver(r.Context(), s, e); err != nil {
			http.Error(w, "fixture processing failed", 500)
			return
		}
		w.WriteHeader(200)
	}))
	srv.TLS = serverTLS
	srv.StartTLS()
	defer srv.Close()
	address := "https://localhost:" + strings.Split(srv.Listener.Addr().String(), ":")[1] + "/"
	commandCtx, cancelCommand := context.WithTimeout(context.Background(), time.Minute)
	defer cancelCommand()
	command := exec.CommandContext(commandCtx, node, "--import", "tsx", "tests/payment/e2e-client.mjs", address, filepath.Join(certDir, "ca.pem"), filepath.Join(certDir, "client.pem"), filepath.Join(certDir, "client.key"))
	command.Dir = "../../.."
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("cross-service lifecycle: %v\n%s", err, output)
	}
	t.Log(strings.TrimSpace(string(output)))
}
func e2eTLS(t *testing.T) ([]byte, []byte, []byte, *tls.Config) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	ca := &x509.Certificate{SerialNumber: big.NewInt(101), Subject: pkix.Name{CommonName: "isolated-e2e-ca"}, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour), IsCA: true, BasicConstraintsValid: true, KeyUsage: x509.KeyUsageCertSign}
	der, err := x509.CreateCertificate(rand.Reader, ca, ca, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	pool := x509.NewCertPool()
	pool.AddCert(mustCert(t, der))
	makeCert := func(n int64, dns string, usage x509.ExtKeyUsage) ([]byte, []byte) {
		k, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			t.Fatal(err)
		}
		c := &x509.Certificate{SerialNumber: big.NewInt(n), DNSNames: []string{dns}, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour), ExtKeyUsage: []x509.ExtKeyUsage{usage}, KeyUsage: x509.KeyUsageDigitalSignature}
		b, err := x509.CreateCertificate(rand.Reader, c, ca, &k.PublicKey, key)
		if err != nil {
			t.Fatal(err)
		}
		return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: b}), pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(k)})
	}
	sc, sk := makeCert(102, "localhost", x509.ExtKeyUsageServerAuth)
	cc, ck := makeCert(103, "payment-web.internal", x509.ExtKeyUsageClientAuth)
	certificate, err := tls.X509KeyPair(sc, sk)
	if err != nil {
		t.Fatal(err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), cc, ck, InternalTLS(certificate, pool)
}

func TestRazorpayLatticeNoInventedRevision(t *testing.T) {
	s, _ := fixture(t)
	s.store.EvidenceModel = "CAPTURE_REFUND_LATTICE_V1"
	for _, sequence := range [][]string{{"COMPLETED", "REFUNDED", "COMPLETED"}, {"REFUNDED", "COMPLETED"}, {"COMPLETED", "PAYMENT_REVIEW", "COMPLETED"}, {"PENDING", "COMPLETED", "PENDING"}} {
		e := newOrder(t, s)
		e.EvidenceModel = s.store.EvidenceModel
		e.Revision = 0
		for i, status := range sequence {
			e.Status = status
			e.EventID = randomID()
			_, err := s.store.ApplyVerifiedEvent(context.Background(), seal(e))
			if i == len(sequence)-1 {
				if err == nil {
					t.Fatal("stale lattice transition accepted", sequence)
				}
			} else if err != nil {
				t.Fatal(err)
			}
		}
		var state string
		if err := s.store.DB.QueryRow(`SELECT CASE WHEN provider_review_required THEN 'PAYMENT_REVIEW' ELSE status END FROM phase1_orders WHERE order_id=$1`, e.OrderID).Scan(&state); err != nil {
			t.Fatal(err)
		}
		want := sequence[1]
		if len(sequence) == 3 && sequence[1] == "COMPLETED" {
			want = "COMPLETED"
		}
		if sequence[0] == "REFUNDED" {
			want = "REFUNDED"
		}
		if state != want {
			t.Fatalf("%v -> %s expected %s", sequence, state, want)
		}
		if state != "COMPLETED" && activeCount(t, s, e.OrderID) != 0 {
			t.Fatal("refund/review retained grant")
		}
	}
}

func TestLegacyFingerprintCompatibility(t *testing.T) {
	type legacy struct {
		Provider, EventID, EventType, OrderID, ProviderOrderID, PaymentID, CustomerID, Currency, Status string
		AmountMinor                                                                                     int64
		Revision                                                                                        int64
		OccurredAt                                                                                      time.Time
	}
	original := legacy{"provider/account/test", "event", "captured", "order", "provider-order", "payment", "customer", "INR", "COMPLETED", 12345, 1, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)}
	encoded, _ := json.Marshal(original)
	hash := sha256.Sum256(encoded)
	var current Event
	if err := json.Unmarshal(encoded, &current); err != nil {
		t.Fatal(err)
	}
	got, _ := fingerprint(current)
	if got != hex.EncodeToString(hash[:]) {
		t.Fatal("PAY-P0-01 persisted event fingerprint changed")
	}
}
