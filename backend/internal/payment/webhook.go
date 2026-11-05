package payment

import (
	"io"
	"net/http"
)

// ProviderWebhook is public only on a separately approved sandbox TLS receiver.
// Raw bytes are authenticated by the configured provider; no JSON evidence is accepted directly.
func ProviderWebhook(s *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		if s == nil {
			http.Error(w, `{"error":"PAYMENT_PROVIDER_UNAVAILABLE"}`, 503)
			return
		}
		if r.Method != "POST" {
			w.Header().Set("Allow", "POST")
			http.Error(w, `{"error":"METHOD_NOT_ALLOWED"}`, 405)
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
		raw, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, `{"error":"INVALID_WEBHOOK_BODY"}`, 413)
			return
		}
		if err = s.ProcessWebhook(r.Context(), raw, r.Header); err != nil {
			status := 503
			if err.Error() == "PAYMENT_SIGNATURE_INVALID" {
				status = 401
			}
			http.Error(w, `{"error":"PAYMENT_EVENT_NOT_ACCEPTED"}`, status)
			return
		}
		w.WriteHeader(200)
		_, _ = w.Write([]byte(`{"received":true}`))
	})
}
