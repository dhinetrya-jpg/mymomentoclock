package timing

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"
)

// Handler is stateless; never logs, stores, returns or accepts profile references/birth facts in URLs.
func Handler(engine *Engine, clock func() time.Time) http.Handler {
	if clock == nil {
		clock = time.Now
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		send := func(status int, value any) { w.WriteHeader(status); _ = json.NewEncoder(w).Encode(value) }
		fail := func(status int, code string) {
			send(status, map[string]any{"schema_version": 1, "status": Unavailable, "code": code, "windows": []Window{}, "message": "The request or required timing evidence is unavailable."})
		}
		if r.URL.RawQuery != "" {
			fail(422, "URL_PARAMETERS_NOT_ALLOWED")
			return
		}
		switch r.URL.Path {
		case "/api/v1/timing/activities":
			if r.Method != "GET" {
				fail(405, "METHOD_NOT_ALLOWED")
				return
			}
			send(200, map[string]any{"schema_version": 1, "rule_version": RuleVersion, "activities": Activities()})
			return
		case "/api/v1/timing/capability":
			if r.Method != "GET" {
				fail(405, "METHOD_NOT_ALLOWED")
				return
			}
			send(200, Capability())
			return
		case "/api/v1/timing/daily":
			if r.Method != "POST" {
				fail(405, "METHOD_NOT_ALLOWED")
				return
			}
		default:
			fail(404, "NOT_FOUND")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
		d := json.NewDecoder(r.Body)
		d.DisallowUnknownFields()
		var req Request
		if err := d.Decode(&req); err != nil {
			var large *http.MaxBytesError
			if errors.As(err, &large) {
				fail(413, "REQUEST_TOO_LARGE")
			} else {
				fail(422, "INVALID_REQUEST")
			}
			return
		}
		if d.Decode(new(any)) != io.EOF {
			fail(422, "INVALID_REQUEST")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		result, err := engine.Calculate(ctx, req, clock())
		if err != nil {
			fail(422, err.Error())
			return
		}
		status := 200
		if result.Status == Unavailable || result.Status == Insufficient {
			status = 503
		}
		send(status, result)
	})
}
