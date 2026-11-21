package main

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestOptionAUnconfiguredAuthorityFailsReadiness(t *testing.T) {
	t.Setenv("ASTRONOMY_NATIVE_CONFIG_FILE", "")
	h := newHandler()
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/ready", nil))
	if w.Code != 503 {
		t.Fatal("implicit Moshier authority readiness", w.Code)
	}
	config := map[string]any{"mode": "SWISS_FILE", "usage": "PRODUCTION_AUTHORITY", "ephemeris_path": "/not-mounted", "file_sha256": map[string]string{"sepl_18.se1": "ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66", "semo_18.se1": "1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7"}}
	path := filepath.Join(t.TempDir(), "authority.json")
	raw, _ := json.Marshal(config)
	if os.WriteFile(path, raw, 0600) != nil {
		t.Fatal("config write")
	}
	t.Setenv("ASTRONOMY_NATIVE_CONFIG_FILE", path)
	w = httptest.NewRecorder()
	newHandler().ServeHTTP(w, httptest.NewRequest("GET", "/ready", nil))
	if w.Code != 503 {
		t.Fatal("missing data became Moshier fallback")
	}
}
