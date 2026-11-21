package astronomy

import (
	"astroengine-core/backend/internal/ephemeris"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"time"
)

// ConfigFromEnvironment only reads a reviewed server file; clients never choose filesystem paths or hashes.
func ConfigFromEnvironment() (ephemeris.NativeConfig, error) {
	config := ephemeris.NativeConfig{}
	path := os.Getenv("ASTRONOMY_NATIVE_CONFIG_FILE")
	if path == "" {
		return config, problem("ASTRONOMY_CONFIGURATION_REQUIRED")
	}
	raw, err := os.ReadFile(path)
	if err != nil || len(raw) > 16384 {
		return config, problem("ASTRONOMY_CONFIGURATION_INVALID")
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&config) != nil || decoder.Decode(new(any)) != io.EOF {
		return config, problem("ASTRONOMY_CONFIGURATION_INVALID")
	}
	if config.Mode == "MOSHIER" && config.Usage == DiagnosticOnly {
		return config, nil
	}
	if err := RequireProductionConfiguration(config); err != nil {
		return config, err
	}
	return config, nil
}
func Handler(config ephemeris.NativeConfig) http.Handler {
	copy := map[string]string{}
	for k, v := range config.FileSHA256 {
		copy[k] = v
	}
	config.FileSHA256 = copy
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		reply := func(status int, value any) { w.WriteHeader(status); _ = json.NewEncoder(w).Encode(value) }
		fail := func(status int, code string) {
			reply(status, map[string]any{"contract_version": Version, "status": "UNAVAILABLE", "code": code, "customer_timing_authorized": false, "validation_status": "NOT_INDEPENDENTLY_VERIFIED", "authority": Authority(config)})
		}
		if r.URL.RawQuery != "" {
			fail(422, "URL_PARAMETERS_NOT_ALLOWED")
			return
		}
		if r.URL.Path == "/api/v1/astronomy/capabilities" {
			if r.Method != "GET" {
				fail(405, "METHOD_NOT_ALLOWED")
				return
			}
			inventory := Capabilities()
			inventory["authority"] = Authority(config)
			reply(200, inventory)
			return
		}
		if r.Method != "POST" {
			fail(405, "METHOD_NOT_ALLOWED")
			return
		}
		if r.URL.Path != "/api/v1/astronomy/snapshot" && r.URL.Path != "/api/v1/astronomy/day" && r.URL.Path != "/api/v1/astronomy/utc-label" {
			fail(404, "NOT_FOUND")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
		decoder := json.NewDecoder(r.Body)
		decoder.DisallowUnknownFields()
		decode := func(v any) bool {
			if err := decoder.Decode(v); err != nil {
				var max *http.MaxBytesError
				if errors.As(err, &max) {
					fail(413, "REQUEST_TOO_LARGE")
				} else {
					fail(422, "INVALID_REQUEST")
				}
				return false
			}
			if err := decoder.Decode(new(any)); err != io.EOF {
				var max *http.MaxBytesError
				if errors.As(err, &max) {
					fail(413, "REQUEST_TOO_LARGE")
				} else {
					fail(422, "INVALID_REQUEST")
				}
				return false
			}
			return true
		}
		ctx, cancel := context.WithTimeout(r.Context(), 12*time.Second)
		defer cancel()
		var value any
		var err error
		if r.URL.Path == "/api/v1/astronomy/utc-label" {
			var req struct {
				SchemaVersion int    `json:"schema_version"`
				Date          string `json:"date"`
				Clock         string `json:"clock"`
			}
			if !decode(&req) {
				return
			}
			if req.SchemaVersion != 1 {
				fail(422, "INVALID_SCHEMA_VERSION")
				return
			}
			var label ephemeris.NativeUTCLabelResult
			label, err = ephemeris.ConvertUTCLabel(req.Date, req.Clock)
			value = map[string]any{"contract_version": Version, "status": "COMPUTED_UNVERIFIED", "utc_scales": label, "customer_timing_authorized": false, "validation_status": "NOT_INDEPENDENTLY_VERIFIED", "authority": Authority(config)}
		} else if r.URL.Path == "/api/v1/astronomy/snapshot" {
			var req SnapshotRequest
			if !decode(&req) {
				return
			}
			value, err = ComputeSnapshot(ctx, req, config)
		} else {
			var req DayRequest
			if !decode(&req) {
				return
			}
			value, err = ComputeDay(ctx, req, config)
		}
		if err != nil {
			status := 422
			switch err.Error() {
			case "NATIVE_EPHEMERIS_UNAVAILABLE", "EPHEMERIS_MODE_UNAVAILABLE", "EPHEMERIS_DATA_UNAVAILABLE", "JPL_KERNEL_UNAVAILABLE", "ASTRONOMY_TIMEOUT", "PANCHANG_ENCLOSING_BOUNDARY_UNAVAILABLE", "EPHEMERIS_CHECKSUM_MISMATCH", "EPHEMERIS_CHECKSUM_REQUIRED", "EPHEMERIS_CONFIGURATION_INVALID", "EPHEMERIS_ENVIRONMENT_CONFLICT", "PRODUCTION_DATASET_NOT_PINNED", "PRODUCTION_ENGINE_VERSION_OR_MODE_MISMATCH", "PRODUCTION_EPHEMERIS_PATH_REQUIRED":
				status = 503
			}
			fail(status, err.Error())
			return
		}
		reply(200, value)
	})
}
