package payment

import (
	"io"
	"net/http"
	"sync"
	"time"
)

// ProviderWebhook is public only on a separately approved sandbox TLS receiver.
// Raw bytes are authenticated by the configured provider; no JSON evidence is accepted directly.
func ProviderWebhook(s *Service) http.Handler {
	slots := make(chan struct{}, 8)
	var mu sync.Mutex
	window := time.Now()
	count := 0
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Request-ID", randomID())
		select {
		case slots <- struct{}{}:
			defer func() { <-slots }()
		default:
			failureJSON(w, 503, "PAYMENT_BUSY")
			return
		}
		mu.Lock()
		if time.Since(window) >= time.Minute {
			window = time.Now()
			count = 0
		}
		count++
		limited := count > 600
		mu.Unlock()
		if limited {
			failureJSON(w, 429, "RATE_LIMITED")
			return
		}
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
			s.store.Telemetry.Observe("webhook_error", 0)
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
