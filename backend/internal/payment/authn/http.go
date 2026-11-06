package authn

import (
	"astroengine-core/backend/internal/payment"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"
)

func Handler(m *Manager, serviceDNS string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		fail := func(status int, code string) {
			w.WriteHeader(status)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": code})
		}
		if m == nil {
			fail(503, "AUTHENTICATION_UNAVAILABLE")
			return
		}
		if !payment.HasTrustedPeer(r, serviceDNS) {
			fail(401, "INTERNAL_SERVICE_AUTH_REQUIRED")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		if r.URL.RawQuery != "" {
			fail(422, "INVALID_REQUEST")
			return
		}
		send := func(value any) { _ = json.NewEncoder(w).Encode(value) }
		switch r.URL.Path {
		case "/internal/auth/challenge":
			if r.Method != "POST" {
				fail(405, "METHOD_NOT_ALLOWED")
				return
			}
			challenge, err := m.Challenge(ctx)
			if err != nil {
				fail(503, "AUTHENTICATION_UNAVAILABLE")
				return
			}
			send(challenge)
		case "/internal/auth/login":
			if r.Method != "POST" {
				fail(405, "METHOD_NOT_ALLOWED")
				return
			}
			r.Body = http.MaxBytesReader(w, r.Body, 24<<10)
			var body struct {
				Challenge string `json:"challenge"`
				Nonce     string `json:"nonce"`
				CSRF      string `json:"csrf"`
				IDToken   string `json:"id_token"`
			}
			d := json.NewDecoder(r.Body)
			d.DisallowUnknownFields()
			if d.Decode(&body) != nil || d.Decode(new(any)) != io.EOF {
				fail(422, "INVALID_REQUEST")
				return
			}
			session, err := m.Login(ctx, body.Challenge, body.Nonce, body.CSRF, body.IDToken)
			if err != nil {
				fail(401, "LOGIN_NOT_ACCEPTED")
				return
			}
			send(session)
		case "/internal/auth/session":
			if r.Method != "GET" {
				fail(405, "METHOD_NOT_ALLOWED")
				return
			}
			if _, err := m.Authenticate(ctx, r); err != nil {
				fail(401, "UNAUTHENTICATED")
				return
			}
			send(map[string]any{"authenticated": true, "environment": m.config.Environment})
		case "/internal/auth/logout", "/internal/auth/delete-account":
			if r.Method != "POST" {
				fail(405, "METHOD_NOT_ALLOWED")
				return
			}
			if err := m.Logout(ctx, r, r.URL.Path == "/internal/auth/delete-account"); err != nil {
				fail(401, "UNAUTHENTICATED")
				return
			}
			send(map[string]bool{"revoked": true})
		default:
			fail(404, "NOT_FOUND")
		}
	})
}
