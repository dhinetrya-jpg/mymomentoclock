// Native normalization only; no profile, graph, payment or AI capability is activated.
package main

import (
	"astroengine-core/backend/internal/calibration"
	"astroengine-core/backend/internal/ephemeris"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"
)

func respond(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
func failure(w http.ResponseWriter, status int, code, message string) {
	respond(w, status, map[string]any{"error": code, "message": message, "request_id": w.Header().Get("X-Request-ID"), "status": "UNAVAILABLE", "is_certified": false, "is_graph_verified": false, "vector_matrix": nil, "candidate_fit_score": nil, "candidate_birth_time": nil, "independent_validation_status": "NOT_PERFORMED"})
}
func decode(w http.ResponseWriter, r *http.Request, target any) bool {
	if r.Method != "POST" {
		failure(w, 405, "METHOD_NOT_ALLOWED", "Use POST.")
		return false
	}
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(target); err != nil {
		var large *http.MaxBytesError
		var wrongType *json.UnmarshalTypeError
		if errors.As(err, &large) {
			failure(w, 413, "REQUEST_TOO_LARGE", "The request is too large.")
		} else if errors.As(err, &wrongType) || strings.Contains(err.Error(), "unknown field") {
			failure(w, 422, "INVALID_REQUEST", "An unsupported field was supplied.")
		} else {
			failure(w, 400, "INVALID_JSON", "Send valid JSON.")
		}
		return false
	}
	if err := d.Decode(new(any)); err != io.EOF {
		failure(w, 400, "INVALID_JSON", "Send one JSON object.")
		return false
	}
	return true
}
func domainError(w http.ResponseWriter, err error) {
	code := err.Error()
	status := 422
	if strings.Contains(code, "UNAVAILABLE") || code == "NATIVE_CALCULATION_FAILED" {
		status = 503
	}
	failure(w, status, code, "The input or required calculation capability is unavailable. Check birth data and the explicit timezone.")
}
func newHandler() http.Handler {
	mux := http.NewServeMux()
	health := func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/ready" && !ephemeris.NativeAvailable() {
			failure(w, 503, "NATIVE_EPHEMERIS_UNAVAILABLE", "Native calculation is unavailable.")
			return
		}
		native := "UNAVAILABLE"
		if ephemeris.NativeAvailable() {
			native = "AVAILABLE_WITH_MODE_DISCLOSURE"
		}
		respond(w, 200, map[string]any{"status": "healthy", "capabilities": map[string]string{"native_ephemeris": native, "btr": "UNAVAILABLE", "profiles": "UNAVAILABLE", "payments": "UNAVAILABLE", "resolver": "UNAVAILABLE"}})
	}
	for _, path := range []string{"/health", "/ready", "/api/v1/health"} {
		mux.HandleFunc(path, health)
	}
	mux.HandleFunc("/api/v1/ephemeris/normalize", func(w http.ResponseWriter, r *http.Request) {
		var req ephemeris.NormalizationRequest
		if !decode(w, r, &req) {
			return
		}
		result, err := ephemeris.ExecuteNormalization(req, req.Timezone)
		if err != nil {
			domainError(w, err)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		_, _ = w.Write(result)
	})
	mux.HandleFunc("/api/v1/btr/rectify", func(w http.ResponseWriter, r *http.Request) {
		var req calibration.BTRRequest
		if !decode(w, r, &req) {
			return
		}
		_, err := calibration.ExecuteRectification(req, req.BasePayload.Timezone)
		if err != nil {
			domainError(w, err)
			return
		}
		failure(w, 503, "DASHA_CALCULATION_UNAVAILABLE", "A verified birth-time method is unavailable.")
	})
	graph := func(w http.ResponseWriter, r *http.Request) {
		failure(w, 503, "PROFILE_GRAPH_UNAVAILABLE", "Secure sign-in, profile ownership and graph rules are not configured.")
	}
	for _, p := range []string{"/api/v1/graph/hydrate", "/api/v1/resolver/evaluate"} {
		mux.HandleFunc(p, graph)
	}
	payment := func(w http.ResponseWriter, r *http.Request) {
		failure(w, 503, "PAYMENT_PROVIDER_UNAVAILABLE", "Payments are not enabled. No entitlement was granted.")
	}
	mux.HandleFunc("/api/v1/webhook/payment", payment)
	mux.HandleFunc("/api/payment/", payment)
	mux.HandleFunc("/api/v1/rvm/remedies", func(w http.ResponseWriter, r *http.Request) {
		failure(w, 503, "REMEDIES_UNAVAILABLE", "Verified personal remedy rules are not available.")
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		failure(w, 404, "NOT_FOUND", "This operation is unavailable.")
	})
	slots := make(chan struct{}, 8)
	var mu sync.Mutex
	window := time.Now()
	count := 0
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := make([]byte, 16)
		if _, err := rand.Read(id); err != nil {
			failure(w, 503, "SERVICE_UNAVAILABLE", "Please try again later.")
			return
		}
		w.Header().Set("X-Request-ID", hex.EncodeToString(id))
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		mu.Lock()
		if time.Since(window) > time.Minute {
			window = time.Now()
			count = 0
		}
		count++
		limited := count > 600
		mu.Unlock()
		if limited {
			failure(w, 429, "RATE_LIMITED", "Please try again shortly.")
			return
		}
		select {
		case slots <- struct{}{}:
			defer func() { <-slots }()
		default:
			failure(w, 429, "RATE_LIMITED", "Please try again shortly.")
			return
		}
		mux.ServeHTTP(w, r)
	})
}
func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	server := &http.Server{Addr: ":" + port, Handler: newHandler(), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdown)
	}()
	log.Print("Native service ready; protected capabilities disabled")
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(fmt.Errorf("HTTP_STARTUP_FAILED"))
	}
}
