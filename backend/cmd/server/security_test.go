package main

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestProtectedOperationsFailClosed(t *testing.T) {
	h := newHandler()
	for _, path := range []string{"/api/v1/resolver/evaluate?user_id=alice", "/api/v1/graph/hydrate", "/api/v1/webhook/payment", "/api/payment/session/other", "/api/payment/sse/other"} {
		for _, token := range []string{"", "forged", "expired"} {
			r := httptest.NewRequest("POST", path, strings.NewReader(`{"user_id":"bob"}`))
			if token != "" {
				r.Header.Set("Authorization", "Bearer "+token)
			}
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != 503 {
				t.Fatalf("%s: %d", path, w.Code)
			}
			var body map[string]any
			json.Unmarshal(w.Body.Bytes(), &body)
			if body["is_certified"] != false || strings.Contains(w.Body.String(), "bob") {
				t.Fatal("identity or success leakage")
			}
			if w.Header().Get("Access-Control-Allow-Origin") != "" {
				t.Fatal("permissive CORS")
			}
		}
	}
}
func TestMalformedAndOversizedRequests(t *testing.T) {
	h := newHandler()
	for _, c := range []struct {
		body   string
		status int
	}{{"{", 400}, {`{"birth_date":"2000-01-01"} {}`, 400}, {`{"birth_date":"` + strings.Repeat("x", 70000) + `"}`, 413}} {
		r := httptest.NewRequest("POST", "/api/v1/ephemeris/normalize", strings.NewReader(c.body))
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		if w.Code != c.status {
			t.Fatalf("expected %d got %d", c.status, w.Code)
		}
	}
}
func TestProductionDiagnosticsHidden(t *testing.T) {
	for _, p := range []string{"/metrics", "/api/astro/stress-test", "/api/payment/simulate-webhook"} {
		w := httptest.NewRecorder()
		newHandler().ServeHTTP(w, httptest.NewRequest("GET", p, nil))
		if w.Code != 404 && w.Code != 503 {
			t.Fatalf("diagnostic exposed: %s %d", p, w.Code)
		}
	}
}
