package webhook

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestUnavailableProviderCannotFulfill(t *testing.T) {
	for _, sig := range []string{"", "forged", strings.Repeat("0", 64)} {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/payment", strings.NewReader(`{"type":"payment.succeeded","session_token":"unknown"}`))
		r.Header.Set("X-Gateway-Signature", sig)
		(&WebhookServer{}).HandlePaymentCallback(w, r)
		if w.Code != 503 {
			t.Fatal("provider not disabled")
		}
	}
	if (&WebhookServer{}).VerifyWebhookSignature(nil, "") {
		t.Fatal("empty credentials verified")
	}
}
