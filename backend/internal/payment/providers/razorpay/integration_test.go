package razorpay

import (
	"astroengine-core/backend/internal/payment"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"database/sql"
	"encoding/json"
	"encoding/pem"
	"fmt"
	_ "github.com/lib/pq"
	"io"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

type testIdentity struct{}

func (testIdentity) ProductionReady() bool { return false }
func (testIdentity) SandboxReady() bool    { return true }
func (testIdentity) Authenticate(_ context.Context, r *http.Request) (string, error) {
	switch r.Header.Get("Authorization") {
	case "Bearer customer-a-session":
		return "customer-a", nil
	case "Bearer customer-b-session":
		return "customer-b", nil
	}
	return "", fmt.Errorf("UNAUTHENTICATED")
}
func adapterDB(t *testing.T, migrate bool) *sql.DB {
	t.Helper()
	raw := os.Getenv("PHASE1_TEST_DATABASE_URL")
	if raw == "" {
		t.Skip("disposable TLS PG required")
	}
	u, err := url.Parse(raw)
	if err != nil || u.Path != "/phase1_test" {
		t.Fatal("refusing non-test database")
	}
	admin, err := sql.Open("postgres", raw)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	var exists bool
	if err = admin.QueryRow(`SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname='pay02_fixture')`).Scan(&exists); err != nil {
		t.Fatal(err)
	}
	if !exists {
		if _, err = admin.Exec(`CREATE DATABASE pay02_fixture`); err != nil {
			t.Fatal(err)
		}
	}
	u.Path = "/pay02_fixture"
	db, err := sql.Open("postgres", u.String())
	if err != nil {
		t.Fatal(err)
	}
	db.SetMaxOpenConns(20)
	t.Cleanup(func() { db.Close() })
	if migrate {
		for _, name := range []string{"001_secure_payments.sql", "003_payment_application.sql", "005_provider_sandbox.sql"} {
			b, err := os.ReadFile("../../../../../database/migrations/" + name)
			if err != nil {
				t.Fatal(err)
			}
			if _, err = db.Exec(string(b)); err != nil {
				t.Fatal(err)
			}
		}
		if _, err = db.Exec(`TRUNCATE phase1_payment_audit,phase1_entitlements,phase1_payment_events,phase1_orders`); err != nil {
			t.Fatal(err)
		}
	}
	return db
}
func TestProviderPostgresNodeLifecycle(t *testing.T) {
	db := adapterDB(t, true)
	var mu sync.Mutex
	orders := map[string]order{}
	receipts := map[string]string{}
	statuses := map[string]string{}
	posts := 0
	loseNextPost := false
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok || user != key || pass != apiSecret {
			http.Error(w, "unauthorized", 401)
			return
		}
		mu.Lock()
		defer mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == "POST" && r.URL.Path == "/orders":
			var req struct {
				Amount            int64
				Currency, Receipt string
			}
			json.NewDecoder(r.Body).Decode(&req)
			posts++
			id := "order_" + req.Receipt[:16]
			o := order{ID: id, Entity: "order", Receipt: req.Receipt, Amount: req.Amount, Currency: req.Currency, Status: "created", CreatedAt: 1700000000}
			orders[id] = o
			receipts[req.Receipt] = id
			statuses[id] = "created"
			if loseNextPost {
				loseNextPost = false
				connection, _, err := w.(http.Hijacker).Hijack()
				if err != nil {
					t.Error(err)
				} else {
					connection.Close()
				}
				return
			}
			json.NewEncoder(w).Encode(o)
		case r.URL.Path == "/orders":
			items := []order{}
			if id := receipts[r.URL.Query().Get("receipt")]; id != "" {
				items = append(items, orders[id])
			}
			json.NewEncoder(w).Encode(map[string]any{"count": len(items), "items": items})
		case strings.HasSuffix(r.URL.Path, "/refunds"):
			id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/payments/pay_"), "/refunds")
			json.NewEncoder(w).Encode(map[string]any{"count": 1, "items": []any{map[string]any{"id": "rfnd_" + id, "entity": "refund", "payment_id": "pay_" + id, "amount": 12345, "status": "processed"}}})
		case strings.HasSuffix(r.URL.Path, "/payments"):
			id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/orders/"), "/payments")
			status := statuses[id]
			if status == "created" {
				fmt.Fprint(w, `{"count":0,"items":[]}`)
				return
			}
			refund := int64(0)
			if status == "refunded" {
				refund = 12345
			}
			json.NewEncoder(w).Encode(map[string]any{"count": 1, "items": []any{map[string]any{"id": "pay_" + id, "entity": "payment", "order_id": id, "amount": 12345, "currency": "INR", "status": status, "captured": true, "amount_refunded": refund, "created_at": 1700000000}}})
		default:
			id := strings.TrimPrefix(r.URL.Path, "/orders/")
			o, ok := orders[id]
			if !ok {
				http.NotFound(w, r)
				return
			}
			if statuses[id] != "created" {
				o.Status = "paid"
			}
			json.NewEncoder(w).Encode(o)
		}
	}))
	defer api.Close()
	store := &payment.Store{DB: db, Provider: "razorpay/acc_fixture/sandbox", Catalog: map[string]payment.Product{"fixture-product": {ID: "fixture-product", Version: "v1", Capability: "fixture-access", AmountMinor: 12345, Currency: "INR", OwnerApproved: true}}}
	adapter, err := New(Config{true, key, apiSecret, hookSecret, "acc_fixture"}, func(ctx context.Context, id string) (Binding, error) {
		o, c, curr, amount, err := store.ResolveBinding(ctx, id)
		return Binding{o, c, id, curr, amount}, err
	})
	if err != nil {
		t.Fatal(err)
	}
	adapter.baseURL = api.URL
	service, err := payment.NewService(payment.Dependencies{Store: store, Identity: testIdentity{}, Provider: adapter, Environment: "sandbox", ActivationApproved: true})
	if err != nil {
		t.Fatal(err)
	}
	handler := payment.Handler(service, "payment-web.internal")
	ca, cert, keyPEM, tlsConfig := providerTLS(t)
	dir := t.TempDir()
	for name, b := range map[string][]byte{"ca.pem": ca, "client.pem": cert, "client.key": keyPEM} {
		if err = os.WriteFile(filepath.Join(dir, name), b, 0600); err != nil {
			t.Fatal(err)
		}
	}
	deliver := func(id string, refund bool) error {
		var providerID string
		if err := db.QueryRow(`SELECT provider_order_id FROM phase1_orders WHERE order_id=$1`, id).Scan(&providerID); err != nil {
			return err
		}
		status, event, eventID := "captured", "payment.captured", "capture_"+id
		if refund {
			status, event, eventID = "refunded", "payment.captured", "refundnotice_"+id
		}
		mu.Lock()
		statuses[providerID] = status
		mu.Unlock()
		// Captured notification may be redelivered after a refund: latest API snapshot must revoke.
		raw, _ := json.Marshal(map[string]any{"entity": "event", "account_id": "acc_fixture", "event": event, "created_at": 1700000000, "payload": map[string]any{"payment": map[string]any{"entity": map[string]any{"id": "pay_" + providerID, "entity": "payment", "order_id": providerID, "amount": 12345, "currency": "INR", "status": "captured", "captured": true, "created_at": 1700000000}}}})
		h := sign(raw)
		h.Set("X-Razorpay-Event-Id", eventID)
		request := httptest.NewRequest("POST", "/sandbox/webhooks/razorpay", strings.NewReader(string(raw)))
		request.Header = h
		recorder := httptest.NewRecorder()
		payment.ProviderWebhook(service).ServeHTTP(recorder, request)
		if recorder.Code != 200 {
			return fmt.Errorf("webhook rejected %d: %s", recorder.Code, recorder.Body.String())
		}
		return nil
	}
	internal := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/_fixture/") {
			handler.ServeHTTP(w, r)
			return
		}
		if !payment.HasTrustedPeer(r, "payment-web.internal") {
			http.Error(w, "denied", 401)
			return
		}
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/_fixture/"), "/")
		if len(parts) != 2 {
			http.Error(w, "bad", 400)
			return
		}
		if err := deliver(parts[1], parts[0] == "refund"); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.WriteHeader(200)
	}))
	internal.TLS = tlsConfig
	internal.StartTLS()
	defer internal.Close()
	// Durable application reservation survives a provider POST lost acknowledgement.
	clientCert, err := tls.X509KeyPair(cert, keyPEM)
	if err != nil {
		t.Fatal(err)
	}
	trust := x509.NewCertPool()
	trust.AppendCertsFromPEM(ca)
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: trust, ServerName: "localhost", Certificates: []tls.Certificate{clientCert}, MinVersion: tls.VersionTLS13}}, Timeout: 5 * time.Second}
	defer client.CloseIdleConnections()
	create := func(serverURL string) (int, []byte) {
		req, _ := http.NewRequest("POST", serverURL+"/api/payment/orders", strings.NewReader(`{"product_id":"fixture-product","idempotency_key":"lost-provider-acknowledgement-proof"}`))
		req.Header.Set("Authorization", "Bearer customer-a-session")
		res, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		b, _ := io.ReadAll(res.Body)
		return res.StatusCode, b
	}
	mu.Lock()
	loseNextPost = true
	mu.Unlock()
	if code, _ := create(internal.URL); code != 503 {
		t.Fatal("lost ack must fail closed", code)
	}
	var originalID string
	var attempted bool
	if err := db.QueryRow(`SELECT order_id,provider_create_attempted FROM phase1_orders WHERE idempotency_key='lost-provider-acknowledgement-proof' AND status='CREATED'`).Scan(&originalID, &attempted); err != nil || !attempted {
		t.Fatal("durable creation intent missing", err)
	}
	restartedAdapter, err := New(Config{true, key, apiSecret, hookSecret, "acc_fixture"}, adapter.lookup)
	if err != nil {
		t.Fatal(err)
	}
	restartedAdapter.baseURL = api.URL
	restartedService, err := payment.NewService(payment.Dependencies{Store: store, Identity: testIdentity{}, Provider: restartedAdapter, Environment: "sandbox", ActivationApproved: true})
	if err != nil {
		t.Fatal(err)
	}
	restartedServer := httptest.NewUnstartedServer(payment.Handler(restartedService, "payment-web.internal"))
	restartedServer.TLS = tlsConfig.Clone()
	restartedServer.StartTLS()
	defer restartedServer.Close()
	code, b := create(restartedServer.URL)
	var recovered payment.Order
	json.Unmarshal(b, &recovered)
	if code != 200 || recovered.ID != originalID || recovered.Status != "PENDING" {
		t.Fatal("lost ack recovery", code, string(b))
	}
	mu.Lock()
	postCount := posts
	mu.Unlock()
	if postCount != 1 {
		t.Fatal("ambiguous POST retried", postCount)
	}
	node, err := exec.LookPath("node")
	if err != nil {
		t.Fatal("full integration gate must mount Node22")
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	address := "https://localhost:" + strings.Split(internal.Listener.Addr().String(), ":")[1] + "/"
	cmd := exec.CommandContext(ctx, node, "--import", "tsx", "tests/payment/e2e-client.mjs", address, filepath.Join(dir, "ca.pem"), filepath.Join(dir, "client.pem"), filepath.Join(dir, "client.key"))
	cmd.Dir = "../../../../.."
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("Node/Razorpay fixture lifecycle: %v\n%s", err, output)
	}
	t.Log(strings.TrimSpace(string(output)))
	var id string
	if err = db.QueryRow(`SELECT order_id FROM phase1_orders WHERE status='REFUNDED' LIMIT 1`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	// New captured notification concurrent with terminal refunded state cannot regrant.
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := deliver(id, true); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	var active int
	if err = db.QueryRow(`SELECT count(*) FROM phase1_entitlements WHERE active`).Scan(&active); err != nil || active != 0 {
		t.Fatal("regrant", active, err)
	}
	if posts != 2 {
		t.Fatal("duplicate provider creation", posts)
	}
	if _, err = db.Exec(`INSERT INTO phase1_payment_audit(order_id,action,outcome) VALUES($1,'PAY02_RESTART_MARKER','REFUNDED')`, id); err != nil {
		t.Fatal(err)
	}
	// Raw receiver method/body limits and unavailable dependency boundary.
	for _, method := range []string{"GET", "PUT"} {
		rec := httptest.NewRecorder()
		payment.ProviderWebhook(service).ServeHTTP(rec, httptest.NewRequest(method, "/", nil))
		if rec.Code != 405 {
			t.Fatal("method", rec.Code)
		}
	}
	rec := httptest.NewRecorder()
	payment.ProviderWebhook(service).ServeHTTP(rec, httptest.NewRequest("POST", "/", strings.NewReader(strings.Repeat("x", 65537))))
	if rec.Code != 413 {
		t.Fatal("body bound", rec.Code)
	}
	_ = io.Discard
}
func TestRazorpayRecoveryAfterRestart(t *testing.T) {
	if os.Getenv("PHASE1_TEST_RESTART_CHECK") != "1" {
		t.Skip("explicit post-restart invocation")
	}
	db := adapterDB(t, false)
	var count int
	if err := db.QueryRow(`SELECT count(*) FROM phase1_payment_audit a JOIN phase1_orders o USING(order_id) WHERE a.action='PAY02_RESTART_MARKER' AND o.status='REFUNDED' AND NOT EXISTS(SELECT 1 FROM phase1_entitlements e WHERE e.order_id=o.order_id AND e.active)`).Scan(&count); err != nil || count != 1 {
		t.Fatal("provider integration restart", count, err)
	}
}

func providerTLS(t *testing.T) ([]byte, []byte, []byte, *tls.Config) {
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
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), cc, ck, payment.InternalTLS(certificate, pool)
}
func mustCert(t *testing.T, b []byte) *x509.Certificate {
	t.Helper()
	c, err := x509.ParseCertificate(b)
	if err != nil {
		t.Fatal(err)
	}
	return c
}
