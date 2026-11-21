//go:build cgo

package astronomy

import (
	"astroengine-core/backend/internal/ephemeris"
	"context"
	"strings"

	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// A close numerical result cannot admit a physically different target.
func TestOptionACenterReferenceIsNotAdmittedAsBarycenter(t *testing.T) {
	_, _, base := pr21Data(t)
	path := filepath.Join(base, "..", "option-a")
	raw, err := os.ReadFile(filepath.Join(path, "jupiter-normalized.json"))
	if err != nil {
		t.Fatal(err)
	}
	var row struct {
		Target   int    `json:"target_center"`
		Observer int    `json:"observer_center"`
		UTC      string `json:"utc"`
	}
	if json.Unmarshal(raw, &row) != nil || row.Target != 599 || row.Observer != 399 {
		t.Fatal("original COB source lost")
	}
	utc, err := time.Parse(time.RFC3339Nano, row.UTC)
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range pr21Configurations(t, base) {
		out, err := ephemeris.NativeSnapshot(utc, c, nil, nil)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(out.Planets["jupiter"].Definition, "SYSTEM_BARYCENTER") {
			t.Fatal("native target definition must be explicit")
		}
		pr21Record(t, map[string]any{"id": "JUP310_CENTER_20150302_12", "mode": c.Mode, "quantity": "target_admission", "source_target": 599, "native_target": 5, "status": "NOT_ADMITTED_DIFFERENT_TARGET_CENTERS", "reason": "Default Swiss Jupiter is system barycenter, not COB. Closeness inside tolerance cannot establish physical equivalence."})
	}
}

func TestOptionAMatchedOuterPlanetaryBarycenters(t *testing.T) {
	_, _, base := pr21Data(t)
	raw, err := os.ReadFile(filepath.Join(base, "..", "option-a", "outer-planets.json"))
	if err != nil {
		t.Fatal(err)
	}
	var data struct {
		Rows []struct {
			ID         string             `json:"id"`
			Body       string             `json:"body"`
			Target     int                `json:"target_code"`
			Observer   int                `json:"observer_code"`
			UTC        string             `json:"utc"`
			TT         float64            `json:"jd_tt"`
			Quantities map[string]float64 `json:"quantities"`
		} `json:"rows"`
	}
	if json.Unmarshal(raw, &data) != nil || len(data.Rows) != 18 {
		t.Fatal("matched outer-planet coverage absent")
	}
	for _, c := range pr21Configurations(t, base) {
		for _, r := range data.Rows {
			t.Run(c.Mode+"/"+r.ID, func(t *testing.T) {
				if r.Target != map[string]int{"jupiter": 5, "saturn": 6}[r.Body] || r.Observer != 399 {
					t.Fatal("target/observer mismatch")
				}
				utc, err := time.Parse(time.RFC3339Nano, r.UTC)
				if err != nil {
					t.Fatal(err)
				}
				out, err := ephemeris.NativeSnapshot(utc, c, nil, nil)
				if err != nil {
					t.Fatal(err)
				}
				if math.Abs(out.Epoch.JulianDayTT-r.TT)*86400 > .001 {
					pr21Record(t, map[string]any{"id": r.ID, "mode": c.Mode, "quantity": "epoch_tt", "status": "NOT_ADMITTED", "reason": "pre1972 UTC/UT1 instants not equivalent"})
					return
				}
				v := out.Planets[r.Body]
				if !strings.Contains(v.Definition, "SYSTEM_BARYCENTER") {
					t.Fatal("native target no longer matches reference")
				}
				if v.Retrograde != (r.Quantities["longitude_speed_deg_per_day"] < 0) {
					t.Fatal("independent retrograde mismatch")
				}
				values := map[string]float64{"tropical_longitude": v.TropicalLongitude, "latitude": v.Latitude, "distance_au": v.DistanceAU, "longitude_speed_deg_per_day": v.LongitudeSpeed}
				for _, q := range []string{"tropical_longitude", "latitude", "distance_au", "longitude_speed_deg_per_day"} {
					tolerance := .0002
					if q == "distance_au" {
						tolerance = .000001
					}
					residual := values[q] - r.Quantities[q]
					if q == "tropical_longitude" {
						residual = signed(residual)
					}
					status := "PASS"
					if math.Abs(residual) > tolerance {
						status = "FAIL"
						if os.Getenv("CORE01_STRICT_SCIENCE") == "1" {
							t.Errorf("matched %s %s residual %g", r.Body, q, residual)
						}
					}
					pr21Record(t, map[string]any{"id": r.ID, "body": r.Body, "epoch": r.UTC, "mode": c.Mode, "quantity": q, "source": "Original DE421 target5/6 planetary-system barycenter, Earth center399; independent Skyfield evaluator", "expected": r.Quantities[q], "actual": values[q], "residual": residual, "tolerance": tolerance, "status": status})
				}
			})
		}
	}
}

func TestOptionAIndependentTransitionEdges(t *testing.T) {
	_, _, base := pr21Data(t)
	raw, err := os.ReadFile(filepath.Join(base, "..", "option-a", "events.json"))
	if err != nil {
		t.Fatal(err)
	}
	var data struct {
		Cases []struct {
			ID        string    `json:"id"`
			Date      string    `json:"date"`
			Zone      string    `json:"timezone"`
			Latitude  float64   `json:"latitude"`
			Longitude float64   `json:"longitude"`
			At        time.Time `json:"transition_utc"`
			Target    float64   `json:"target_angle"`
			Start     time.Time `json:"day_start_utc"`
			End       time.Time `json:"day_end_utc"`
		} `json:"cases"`
		Tolerance float64 `json:"tolerance_seconds"`
	}
	if json.Unmarshal(raw, &data) != nil || len(data.Cases) != 3 || data.Tolerance != 10 {
		t.Fatal("edge-case evidence/budget absent")
	}
	for _, c := range pr21Configurations(t, base) {
		for _, r := range data.Cases {
			t.Run(c.Mode+"/"+r.ID, func(t *testing.T) {
				out, err := ComputeDay(context.Background(), DayRequest{SchemaVersion: 1, Date: r.Date, Timezone: r.Zone, Latitude: &r.Latitude, Longitude: &r.Longitude}, c)
				if err != nil {
					t.Fatal(err)
				}
				if !out.Start.Equal(r.Start) || !out.End.Equal(r.End) {
					t.Fatal("reference/native civil day mismatch")
				}
				found := false
				for _, v := range out.Transitions {
					if v.Kind != "tithi" || math.Abs(signed(v.TargetAngle-r.Target)) > 1e-7 {
						continue
					}
					found = true
					residual := v.At.Sub(r.At).Seconds()
					status := "PASS"
					if math.Abs(residual) > data.Tolerance || v.BracketSeconds > 1 {
						status = "FAIL"
						t.Errorf("independent near-boundary Tithi mismatch %g", residual)
					}
					pr21Record(t, map[string]any{"id": r.ID, "mode": c.Mode, "quantity": "edge_tithi", "source": "Original JPL DE421 independently evaluated by Skyfield; sunrise proximity is a different-model diagnostic only", "expected": r.At, "actual": v.At, "residual": residual, "tolerance": data.Tolerance, "status": status})
				}
				if !found {
					t.Fatal("missing independent edge transition")
				}
			})
		}
	}
}
