package main

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestLegacyProtectedFunctionsDisabled(t *testing.T) {
	if data, err := ResolveConflictMatrix(context.Background(), nil, "alice", "Wealth"); err == nil || data != nil {
		t.Fatal("resolver did not fail closed")
	}
	if err := HydrateUserGraph(context.Background(), nil, SubChartCoordinates{UserID: "other"}); err == nil {
		t.Fatal("hydration did not fail closed")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := ResolveConflictMatrix(ctx, nil, "", "Wealth"); err != context.Canceled {
		t.Fatal("cancellation ignored")
	}
}
func TestRawSignaturePrimitiveAndDisabledFulfillment(t *testing.T) {
	body := []byte("{ \"amount\": 12345 }")
	ws := &WebhookServer{WebhookSecretKey: "test-only-primitive-key"}
	mac := hmac.New(sha256.New, []byte(ws.WebhookSecretKey))
	mac.Write(body)
	signature := hex.EncodeToString(mac.Sum(nil))
	if !ws.VerifyWebhookSignature(body, signature) {
		t.Fatal("valid raw signature rejected")
	}
	for _, s := range []string{"", "garbage", signature[:62], strings.Repeat("0", 64)} {
		if ws.VerifyWebhookSignature(body, s) {
			t.Fatal("invalid signature accepted")
		}
	}
	if ws.VerifyWebhookSignature([]byte(`{"amount":12345}`), signature) {
		t.Fatal("reconstructed bytes accepted")
	}
	if (&WebhookServer{}).VerifyWebhookSignature(body, signature) {
		t.Fatal("missing secret accepted")
	}
	r := httptest.NewRequest("POST", "/webhook", strings.NewReader(string(body)))
	r.Header.Set("X-Gateway-Signature", signature)
	w := httptest.NewRecorder()
	ws.HandlePaymentCallback(w, r)
	if w.Code != 503 || strings.Contains(w.Body.String(), "unlocked") {
		t.Fatal("disabled gateway granted access")
	}
}
func TestLegacyBTRCannotCreateCandidate(t *testing.T) {
	lat, lon := 0.0, 0.0
	r := BTRRequest{BasePayload: NormalizationRequest{BirthDate: "2000-01-01", BirthTime: "00:00:00", Latitude: &lat, Longitude: &lon, Timezone: "UTC"}, Milestones: []MilestoneEvent{{Type: "MARRIAGE_UNION", ApproxDate: "2020-01", Confidence: "HIGH"}}}
	data, err := ExecuteRectification(r, "")
	if data != nil || err == nil || err.Error() != "DASHA_CALCULATION_UNAVAILABLE" {
		t.Fatalf("unsafe legacy BTR: %s %v", data, err)
	}
}
