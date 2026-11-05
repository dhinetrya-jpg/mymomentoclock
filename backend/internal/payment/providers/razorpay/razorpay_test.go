package razorpay

import (
	"astroengine-core/backend/internal/payment"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

const key = "rzp_test_fixtureonly"
const apiSecret = "fixture-api-secret-not-live"
const hookSecret = "fixture-hook-secret-not-live"

func testAdapter(t *testing.T, handler http.HandlerFunc) *Adapter {
	t.Helper()
	server := httptest.NewServer(handler)
	t.Cleanup(server.Close)
	adapter, err := New(Config{true, key, apiSecret, hookSecret, "acc_fixture"}, func(_ context.Context, id string) (Binding, error) {
		if id != "order_fixture" {
			return Binding{}, errors.New("unknown")
		}
		return Binding{OrderID: "internal", CustomerID: "customer-a", ProviderOrderID: id, AmountMinor: 12345, Currency: "INR"}, nil
	})
	if err != nil {
		t.Fatal(err)
	}
	adapter.baseURL = server.URL
	return adapter
}
func sign(raw []byte) http.Header {
	mac := hmac.New(sha256.New, []byte(hookSecret))
	mac.Write(raw)
	return http.Header{"X-Razorpay-Signature": []string{hex.EncodeToString(mac.Sum(nil))}, "X-Razorpay-Event-Id": []string{"evt_fixture"}}
}
func webhook(account, event, status string, captured bool, amount int64) []byte {
	b, _ := json.Marshal(map[string]any{"entity": "event", "account_id": account, "event": event, "created_at": 1700000000, "payload": map[string]any{"payment": map[string]any{"entity": map[string]any{"id": "pay_fixture", "entity": "payment", "order_id": "order_fixture", "status": status, "captured": captured, "amount": amount, "currency": "INR", "created_at": 1700000000}}}})
	return b
}
func TestConfig(t *testing.T) {
	lookup := func(context.Context, string) (Binding, error) { return Binding{}, nil }
	for _, c := range []Config{{}, {true, "rzp_live_notallowed", apiSecret, hookSecret, "acc_fixture"}, {true, key, "", hookSecret, "acc_fixture"}, {true, key, apiSecret, "", "acc_fixture"}, {true, key, apiSecret, hookSecret, "wrong"}} {
		if _, err := New(c, lookup); err == nil {
			t.Fatal("unsafe config")
		}
	}
}
func TestRawWebhook(t *testing.T) {
	a := testAdapter(t, func(w http.ResponseWriter, r *http.Request) { t.Error("unexpected API call") })
	raw := webhook("acc_fixture", "payment.captured", "captured", true, 12345)
	if e, err := a.VerifyAndParseWebhook(context.Background(), raw, sign(raw)); err != nil || !e.NotificationOnly || e.Revision != 0 || e.EvidenceModel != SnapshotModel {
		t.Fatal(e, err)
	}
	for name, body := range map[string][]byte{"wrong-merchant": webhook("acc_other", "payment.captured", "captured", true, 12345), "authorized-not-captured": webhook("acc_fixture", "payment.captured", "authorized", false, 12345), "wrong-amount": webhook("acc_fixture", "payment.captured", "captured", true, 1), "unsupported": webhook("acc_fixture", "payment.fake", "captured", true, 12345), "malformed": []byte("{"), "wrong-currency": []byte(strings.Replace(string(raw), "INR", "USD", 1)), "wrong-order": []byte(strings.Replace(string(raw), "order_fixture", "order_unknown", 1))} {
		t.Run(name, func(t *testing.T) {
			if _, err := a.VerifyAndParseWebhook(context.Background(), body, sign(body)); err == nil {
				t.Fatal("bad webhook accepted")
			}
		})
	}
	for _, h := range []http.Header{{}, {"X-Razorpay-Signature": []string{"bogus"}}, sign(append([]byte(" "), raw...))} {
		if _, err := a.VerifyAndParseWebhook(context.Background(), raw, h); err == nil {
			t.Fatal("missing/invalid/tampered signature")
		}
	}
}
func TestCreateRecoveryAndNoPostRetry(t *testing.T) {
	ctx := context.Background()
	receipt := Receipt("internal")
	var mu sync.Mutex
	exists := false
	posts := 0
	a := testAdapter(t, func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok || user != key || pass != apiSecret {
			t.Error("wrong API authentication")
		}
		mu.Lock()
		defer mu.Unlock()
		switch r.Method {
		case "GET":
			if r.URL.Query().Get("receipt") != receipt {
				t.Error("wrong receipt")
			}
			if !exists {
				fmt.Fprint(w, `{"count":0,"items":[]}`)
			} else {
				fmt.Fprintf(w, `{"count":1,"items":[{"id":"order_fixture","entity":"order","receipt":%q,"amount":12345,"currency":"INR","status":"created"}]}`, receipt)
			}
		case "POST":
			posts++
			exists = true
			connection, _, err := w.(http.Hijacker).Hijack()
			if err != nil {
				t.Error(err)
			} else {
				connection.Close()
			}
		}
	})
	request := payment.ProviderOrderRequest{OrderID: "internal", IdempotencyKey: "internal", CustomerID: "customer-a", Product: payment.Product{AmountMinor: 12345, Currency: "INR"}}
	if _, err := a.CreateOrder(ctx, request); err == nil {
		t.Fatal("lost ack not detected")
	}
	request.RecoveryOnly = true
	// Fresh adapter models process restart: provider receipt lookup, no memory-based idempotency.
	copy := *a
	result, err := copy.CreateOrder(ctx, request)
	if err != nil || result.ID != "order_fixture" || posts != 1 {
		t.Fatal(result, posts, err)
	}
	mu.Lock()
	exists = false
	mu.Unlock()
	if _, err := a.CreateOrder(ctx, request); err == nil || posts != 1 {
		t.Fatal("ambiguous absence retried POST")
	}
}
func TestAuthoritativeStates(t *testing.T) {
	for _, tt := range []struct {
		status   string
		captured bool
		refunded int64
		want     string
	}{{"authorized", false, 0, "PENDING"}, {"failed", false, 0, "PENDING"}, {"captured", true, 0, "COMPLETED"}, {"refunded", true, 12345, "REFUNDED"}, {"captured", true, 100, "PAYMENT_REVIEW"}, {"captured", false, 0, "ERROR"}, {"unknown", true, 0, "ERROR"}} {
		t.Run(tt.status+fmt.Sprint(tt.captured, tt.refunded), func(t *testing.T) {
			a := testAdapter(t, func(w http.ResponseWriter, r *http.Request) {
				switch {
				case strings.HasSuffix(r.URL.Path, "/refunds"):
					fmt.Fprintf(w, `{"count":1,"items":[{"id":"rfnd_fixture","entity":"refund","status":"processed","payment_id":"pay_fixture","amount":%d}]}`, tt.refunded)
				case strings.HasSuffix(r.URL.Path, "/payments"):
					fmt.Fprintf(w, `{"count":1,"items":[{"id":"pay_fixture","entity":"payment","status":%q,"captured":%t,"amount":12345,"amount_refunded":%d,"currency":"INR","order_id":"order_fixture","created_at":1700000000}]}`, tt.status, tt.captured, tt.refunded)
				default:
					fmt.Fprintf(w, `{"id":"order_fixture","entity":"order","receipt":%q,"amount":12345,"currency":"INR","status":"paid","created_at":1700000000}`, Receipt("internal"))
				}
			})
			e, err := a.GetPaymentStatus(context.Background(), "internal", "order_fixture")
			if tt.want == "ERROR" {
				if err == nil {
					t.Fatal("invalid state accepted")
				}
			} else if err != nil || e.Status != tt.want || e.Revision != 0 {
				t.Fatal(e, err)
			}
		})
	}
}
func TestSafeRetriesAndTimeout(t *testing.T) {
	calls := 0
	a := testAdapter(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		http.Error(w, "secret error body must not leak", 500)
	})
	var result any
	if err := a.request(context.Background(), "GET", "/orders", nil, &result); err == nil || calls != 2 || strings.Contains(err.Error(), "secret") {
		t.Fatal(calls, err)
	}
	calls = 0
	if err := a.request(context.Background(), "POST", "/orders", map[string]string{}, &result); err == nil || calls != 1 {
		t.Fatal("POST retried", calls, err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond)
	defer cancel()
	if err := a.request(ctx, "GET", "/orders", nil, &result); err == nil {
		t.Fatal("deadline ignored")
	}
}
