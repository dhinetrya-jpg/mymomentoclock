package razorpay

import (
	"astroengine-core/backend/internal/payment/release"
	"context"
	"crypto/ed25519"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

func proof(t *testing.T) *release.Authorization {
	t.Helper()
	pub, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	m := release.Manifest{SchemaVersion: 1, Environment: "production", ArtifactDigest: strings.Repeat("a", 64), GatewayDigest: strings.Repeat("b", 64), ConfigDigest: strings.Repeat("c", 64), CatalogDigest: strings.Repeat("d", 64), MerchantAccount: "acc_fixture", IdentityIssuer: "https://identity.fixture.invalid", ApprovalReference: "ephemeral-fixture-approval", IssuedAt: now.Add(-time.Minute), ExpiresAt: now.Add(time.Hour), Gates: map[string]release.Gate{}}
	for _, id := range release.GateIDs() {
		m.Gates[id] = release.Gate{Status: "PASS", Evidence: "ephemeral-fixture-evidence"}
	}
	raw, _ := json.Marshal(m)
	authorization, err := release.Verify(raw, ed25519.Sign(key, raw), pub, m.ArtifactDigest, m.ConfigDigest, now)
	if err != nil {
		t.Fatal(err)
	}
	return authorization
}
func TestProductionIsolationAndRotation(t *testing.T) {
	a := testAdapter(t, func(w http.ResponseWriter, r *http.Request) { fmt.Fprint(w, `{}`) })
	lookup := a.lookup
	if _, err := NewProduction(Config{true, "rzp_live_nonfunctional_fixture", apiSecret, hookSecret, "acc_fixture"}, lookup, Options{}, nil); err == nil {
		t.Fatal("missing release proof accepted")
	}
	if _, err := NewProduction(Config{true, key, apiSecret, hookSecret, "acc_fixture"}, lookup, Options{}, proof(t)); err == nil {
		t.Fatal("test key accepted for production")
	}
	if _, err := NewWithOptions(Config{true, "rzp_live_nonfunctional_fixture", apiSecret, hookSecret, "acc_fixture"}, lookup, Options{Environment: "sandbox"}); err == nil {
		t.Fatal("live-shaped key accepted in sandbox")
	}
	// Syntactic nonfunctional fixture string only: no real live key is used or any API called.
	production, err := NewProduction(Config{true, "rzp_live_nonfunctional_fixture", apiSecret, hookSecret, "acc_fixture"}, lookup, Options{}, proof(t))
	if err != nil || !production.ProductionReady() {
		t.Fatal(err)
	}
	if production.Namespace() != "razorpay/acc_fixture/production" {
		t.Fatal("environment scope")
	}
	previous := "previous-fixture-secret-only"
	a.options.PreviousSecrets = []RotationSecret{{Value: previous, NotBefore: time.Now().Add(-time.Hour), NotAfter: time.Now().Add(time.Hour)}}
	raw := webhook("acc_fixture", "payment.captured", "captured", true, 12345)
	mac := hmac.New(sha256.New, []byte(previous))
	mac.Write(raw)
	h := sign(raw)
	h.Set("X-Razorpay-Signature", hex.EncodeToString(mac.Sum(nil)))
	if _, err = a.VerifyAndParseWebhook(context.Background(), raw, h); err != nil {
		t.Fatal("approved overlap secret", err)
	}
	a.options.PreviousSecrets[0].NotAfter = time.Now().Add(-time.Second)
	if _, err = a.VerifyAndParseWebhook(context.Background(), raw, h); err == nil {
		t.Fatal("expired rotation secret")
	}
}
func TestVerifiedDisputeBecomesReviewNotification(t *testing.T) {
	a := testAdapter(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/disputes/disp_fixture":
			fmt.Fprint(w, `{"id":"disp_fixture","entity":"dispute","status":"open","payment_id":"pay_fixture","amount":12345,"currency":"INR"}`)
		case "/payments/pay_fixture":
			fmt.Fprint(w, `{"id":"pay_fixture","entity":"payment","status":"captured","captured":true,"order_id":"order_fixture","amount":12345,"currency":"INR","created_at":1700000000}`)
		default:
			http.NotFound(w, r)
		}
	})
	raw := []byte(`{"entity":"event","account_id":"acc_fixture","event":"payment.dispute.created","created_at":1700000000,"payload":{"dispute":{"entity":{"id":"disp_fixture","entity":"dispute","payment_id":"pay_fixture","amount":12345,"currency":"INR","status":"open"}}}}`)
	event, err := a.VerifyAndParseWebhook(context.Background(), raw, sign(raw))
	if err != nil || !event.RiskHold || !event.NotificationOnly || event.Revision != 0 {
		t.Fatal(event, err)
	}
}
