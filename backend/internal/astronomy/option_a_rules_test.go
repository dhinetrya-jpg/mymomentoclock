package astronomy

import (
	"context"
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestOptionAExternalRuleConventions(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "..", "tests", "calculation", "reference", "option-a", "reuse-rules.json"))
	if err != nil {
		t.Fatal(err)
	}
	var data struct {
		Rules []struct {
			Source  string  `json:"source"`
			Weekday int     `json:"weekday"`
			Hours   float64 `json:"daylight_hours"`
			Name    string  `json:"name"`
			Start   float64 `json:"start_seconds"`
			End     float64 `json:"end_seconds"`
		} `json:"rule_cases"`
		Segments []struct {
			Source    string  `json:"source"`
			Longitude float64 `json:"longitude"`
			Nak       int     `json:"nakshatra"`
			Pada      int     `json:"pada"`
		} `json:"segments"`
	}
	if json.Unmarshal(raw, &data) != nil || len(data.Rules) != 249 || len(data.Segments) != 30 {
		t.Fatal("external rule audit incomplete")
	}
	base := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	for _, r := range data.Rules {
		rise, set := base.Add(6*time.Hour), base.Add(time.Duration((6+r.Hours)*3600)*time.Second)
		solar := syntheticSolar()
		solar.Sunrise = &rise
		solar.Sunset = &set
		found := false
		for _, v := range TraditionalIntervals(solar, time.Weekday(r.Weekday)) {
			if v.Name != r.Name {
				continue
			}
			found = true
			if math.Abs(v.Start.Sub(base).Seconds()-r.Start) > .00001 || math.Abs(v.End.Sub(base).Seconds()-r.End) > .00001 {
				t.Errorf("%s %s weekday%d %gh mismatch", r.Source, r.Name, r.Weekday, r.Hours)
			}
			if v.ApprovalStatus != "TRADITIONAL_SOURCE_AND_OWNER_APPROVAL_PENDING" {
				t.Fatal("source agreement must not grant owner approval")
			}
		}
		if !found {
			t.Fatal("missing rule", r.Name)
		}
	}
	variants := 0
	for _, r := range data.Segments {
		actual, err := Segment(0, r.Longitude, 0, r.Longitude)
		if err != nil {
			t.Fatal(err)
		}
		if actual.Nakshatra != r.Nak || actual.Pada != r.Pada {
			within := math.Mod(r.Longitude, 360.0/108)
			if math.Min(within, 360.0/108-within) > 1e-10 {
				t.Fatalf("nonboundary source mismatch %+v", r)
			}
			variants++
			t.Logf("BOUNDARY_REPRESENTATION_VARIANT source=%s longitude=%.17g native=%d/%d upstream=%d/%d; no epsilon snapping or imported expected value", r.Source, r.Longitude, actual.Nakshatra, actual.Pada, r.Nak, r.Pada)
		}
	}
	t.Logf("249 actual upstream mathematical rule outputs compared; 30 segmentation probes, %d exact-boundary representation variants; not independent astronomical accuracy", variants)
	// Native solver remains half-open at exact wrap; source ceil-at-ending conventions do not replace it.
	roots, err := Transitions(context.Background(), "wrap", base, base.Add(2*time.Hour), 6, func(t time.Time) (float64, error) { return norm(359 + t.Sub(base).Hours()*2), nil })
	if err != nil || len(roots) != 1 {
		t.Fatal(roots, err)
	}
}
