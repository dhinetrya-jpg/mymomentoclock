package razorpay

import (
	"astroengine-core/backend/internal/payment"
	"astroengine-core/backend/internal/payment/authn"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"math/big"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestCommercialAuthenticatedLifecycle(t *testing.T) {
	db := adapterDB(t, true)
	ctx := context.Background()
	if _, err := db.Exec(`TRUNCATE payment_sessions,payment_customers,payment_login_challenges;INSERT INTO payment_environment_binding(binding_id,environment) VALUES(1,'test') ON CONFLICT(binding_id) DO UPDATE SET environment='test'`); err != nil {
		t.Fatal(err)
	}
	signing, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	jwks, _ := json.Marshal(map[string]any{"keys": []any{map[string]any{"kty": "RSA", "kid": "fixture-key", "use": "sig", "alg": "RS256", "n": base64.RawURLEncoding.EncodeToString(signing.N.Bytes()), "e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(signing.E)).Bytes())}}})
	hash := sha256.Sum256(jwks)
	identity, err := authn.New(db, authn.Config{Environment: "test", Issuer: "https://identity.fixture.invalid", Audience: "fixture-client", ApprovalReference: "fixture-identity-review", JWKSDigest: hex.EncodeToString(hash[:]), CountryClaim: "verified_country", SessionTTL: 30 * time.Minute}, jwks, nil)
	if err != nil {
		t.Fatal(err)
	}
	policy := &payment.CommercialPolicy{Description: "Fixture-only commercial product", AccessDisclosure: "Fixture lifetime access", Lifetime: true, BillingModel: "one_time", TaxPolicyReference: "fixture-tax-policy", TaxDisclosure: "Fixture total price policy", RefundPolicyReference: "fixture-refund-policy", RefundDisclosure: "Fixture refunds only", Availability: true, EffectiveFrom: time.Now().Add(-time.Hour), EffectiveUntil: time.Now().Add(time.Hour), Countries: []string{"IN"}, ApprovalReference: "fixture-commercial-review"}
	product := payment.Product{ID: "fixture-product", Version: "v1", Capability: "fixture-access", AmountMinor: 12345, Currency: "INR", OwnerApproved: true, Commercial: policy}
	store := &payment.Store{DB: db, Provider: "razorpay/acc_fixture/test", Catalog: map[string]payment.Product{product.ID: product}, Telemetry: &payment.Telemetry{}}
	var mu sync.Mutex
	receipt := ""
	providerOrder := "order_commercialfixture"
	state := "created"
	posts := 0
	api := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == "POST" && r.URL.Path == "/orders":
			var req struct{ Receipt string }
			json.NewDecoder(r.Body).Decode(&req)
			receipt = req.Receipt
			posts++
			fmt.Fprintf(w, `{"id":%q,"entity":"order","receipt":%q,"amount":12345,"currency":"INR","status":"created","created_at":1700000000}`, providerOrder, receipt)
		case r.URL.Path == "/orders":
			if receipt == "" {
				fmt.Fprint(w, `{"count":0,"items":[]}`)
			} else {
				fmt.Fprintf(w, `{"count":1,"items":[{"id":%q,"entity":"order","receipt":%q,"amount":12345,"currency":"INR","status":"created","created_at":1700000000}]}`, providerOrder, receipt)
			}
		case strings.HasPrefix(r.URL.Path, "/disputes/"):
			fmt.Fprint(w, `{"id":"disp_fixture","entity":"dispute","status":"open","payment_id":"pay_commercialfixture","amount":12345,"currency":"INR"}`)
		case r.URL.Path == "/payments/pay_commercialfixture":
			fmt.Fprintf(w, `{"id":"pay_commercialfixture","entity":"payment","status":"captured","captured":true,"order_id":%q,"amount":12345,"currency":"INR","created_at":1700000000}`, providerOrder)
		case strings.HasSuffix(r.URL.Path, "/refunds"):
			fmt.Fprint(w, `{"count":1,"items":[{"id":"rfnd_commercialfixture","entity":"refund","status":"processed","payment_id":"pay_commercialfixture","amount":12345}]}`)
		case strings.HasSuffix(r.URL.Path, "/payments"):
			if state == "created" {
				fmt.Fprint(w, `{"count":0,"items":[]}`)
			} else {
				refunded := 0
				if state == "refunded" {
					refunded = 12345
				}
				fmt.Fprintf(w, `{"count":1,"items":[{"id":"pay_commercialfixture","entity":"payment","status":%q,"captured":true,"order_id":%q,"amount":12345,"amount_refunded":%d,"currency":"INR","created_at":1700000000}]}`, state, providerOrder, refunded)
			}
		default:
			status := "created"
			if state != "created" {
				status = "paid"
			}
			fmt.Fprintf(w, `{"id":%q,"entity":"order","receipt":%q,"amount":12345,"currency":"INR","status":%q,"created_at":1700000000}`, providerOrder, receipt, status)
		}
	}))
	defer api.Close()
	adapter, err := NewWithOptions(Config{true, key, apiSecret, hookSecret, "acc_fixture"}, func(ctx context.Context, id string) (Binding, error) {
		o, c, currency, amount, e := store.ResolveBinding(ctx, id)
		return Binding{o, c, id, currency, amount}, e
	}, Options{Environment: "test", Telemetry: store.Telemetry})
	if err != nil {
		t.Fatal(err)
	}
	adapter.baseURL = api.URL
	capability := payment.CapabilityPolicy{ID: "fixture-access", ApprovalReference: "fixture-delivery-review", Delivered: true}
	service, err := payment.NewService(payment.Dependencies{Store: store, Identity: identity, Provider: adapter, Environment: "test", Capabilities: map[string]payment.CapabilityPolicy{capability.ID: capability}})
	if err != nil {
		t.Fatal(err)
	}
	protected := service.Protect(capability, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { fmt.Fprint(w, "fixture-only-delivered-capability") }))
	ledger := payment.Handler(service, "payment-web.internal")
	auth := authn.Handler(identity, "payment-web.internal")
	ca, cert, keyPEM, tlsConfig := providerTLS(t)
	dir := t.TempDir()
	for name, data := range map[string][]byte{"ca.pem": ca, "client.pem": cert, "client.key": keyPEM} {
		if err = os.WriteFile(filepath.Join(dir, name), data, 0600); err != nil {
			t.Fatal(err)
		}
	}
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/internal/auth/") {
			auth.ServeHTTP(w, r)
			return
		}
		if strings.HasPrefix(r.URL.Path, "/api/payment/") {
			ledger.ServeHTTP(w, r)
			return
		}
		if !payment.HasTrustedPeer(r, "payment-web.internal") {
			http.Error(w, "denied", 401)
			return
		}
		if r.URL.Path == "/fixture/protected" {
			protected.ServeHTTP(w, r)
			return
		}
		if r.URL.Path == "/_fixture/token" {
			var request struct{ Nonce, Subject string }
			json.NewDecoder(r.Body).Decode(&request)
			now := time.Now()
			claims := jwt.MapClaims{"iss": "https://identity.fixture.invalid", "aud": "fixture-client", "sub": request.Subject, "nonce": request.Nonce, "iat": now.Unix(), "exp": now.Add(15 * time.Minute).Unix(), "verified_country": "IN"}
			token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
			token.Header["kid"] = "fixture-key"
			signed, err := token.SignedString(signing)
			if err != nil {
				http.Error(w, "test signer failed", 500)
				return
			}
			json.NewEncoder(w).Encode(map[string]string{"id_token": signed})
			return
		}
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/_fixture/"), "/")
		if len(parts) != 2 {
			http.NotFound(w, r)
			return
		}
		id := parts[1]
		var binding string
		if err := db.QueryRow(`SELECT provider_order_id FROM phase1_orders WHERE order_id=$1`, id).Scan(&binding); err != nil {
			http.Error(w, "missing", 404)
			return
		}
		eventType := "payment.captured"
		payload := map[string]any{"payment": map[string]any{"entity": map[string]any{"id": "pay_commercialfixture", "entity": "payment", "status": "captured", "captured": true, "order_id": binding, "amount": 12345, "currency": "INR", "created_at": 1700000000}}}
		mu.Lock()
		if parts[0] == "refund" {
			state = "refunded"
		} else {
			state = "captured"
		}
		mu.Unlock()
		if parts[0] == "dispute" {
			eventType = "payment.dispute.created"
			payload = map[string]any{"dispute": map[string]any{"entity": map[string]any{"id": "disp_fixture", "entity": "dispute", "payment_id": "pay_commercialfixture", "amount": 12345, "currency": "INR", "status": "open"}}}
		}
		raw, _ := json.Marshal(map[string]any{"entity": "event", "account_id": "acc_fixture", "event": eventType, "created_at": 1700000000, "payload": payload})
		headers := sign(raw)
		headers.Set("X-Razorpay-Event-Id", parts[0]+"_"+id)
		if err := service.ProcessWebhook(r.Context(), raw, headers); err != nil {
			http.Error(w, "fixture-event-rejected", 500)
			return
		}
		w.WriteHeader(200)
	})
	internal := httptest.NewUnstartedServer(handler)
	internal.TLS = tlsConfig
	internal.StartTLS()
	defer internal.Close()
	node, err := exec.LookPath("node")
	if err != nil {
		t.Fatal("full gate must supply Node22")
	}
	commandCtx, cancel := context.WithTimeout(ctx, time.Minute)
	defer cancel()
	address := "https://localhost:" + strings.Split(internal.Listener.Addr().String(), ":")[1] + "/"
	command := exec.CommandContext(commandCtx, node, "--import", "tsx", "tests/payment/pay03-e2e.mjs", address, filepath.Join(dir, "ca.pem"), filepath.Join(dir, "client.pem"), filepath.Join(dir, "client.key"))
	command.Dir = "../../../../.."
	output, err := command.CombinedOutput()
	if err != nil {
		t.Fatalf("commercial session lifecycle: %v\n%s", err, output)
	}
	t.Log(strings.TrimSpace(string(output)))
	if posts != 1 {
		t.Fatal("duplicate provider charge preparation", posts)
	}
}
