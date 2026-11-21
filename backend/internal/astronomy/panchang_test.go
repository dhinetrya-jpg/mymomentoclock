package astronomy

import (
	"context"
	"encoding/json"
	"math"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestMathematicalPanchangAndChartBoundaries(t *testing.T) {
	for i := 0; i < 30; i++ {
		v, err := Segment(0, float64(i)*12, 0, 0)
		if err != nil || v.Tithi != i+1 {
			t.Fatal(i, v, err)
		}
		if i > 0 {
			before, _ := Segment(0, math.Nextafter(float64(i)*12, 0), 0, 0)
			if before.Tithi != i {
				t.Fatal("tithi before boundary", i, before)
			}
		}
	}
	for i := 0; i < 60; i++ {
		v, _ := Segment(0, float64(i)*6, 0, 0)
		if v.KaranaIndex != i {
			t.Fatal(i, v)
		}
	}
	for _, x := range []struct {
		angle float64
		name  string
	}{{0, "Kimstughna"}, {6, "Bava"}, {42, "Vishti"}, {48, "Bava"}, {336, "Vishti"}, {342, "Shakuni"}, {348, "Chatushpada"}, {354, "Naga"}} {
		v, _ := Segment(0, x.angle, 0, 0)
		if v.Karana != x.name {
			t.Fatal(x, v)
		}
	}
	for i := 0; i < 720; i++ {
		longitude := float64(i) / 2
		at, err := Classify(longitude, nil, true)
		if err != nil || at.D60Segment == nil || *at.D60Segment != i%60 {
			t.Fatal("D60 at cut", i, at, err)
		}
		if i > 0 {
			before, _ := Classify(math.Nextafter(longitude, 0), nil, true)
			if before.D60Segment == nil || *before.D60Segment != (i-1)%60 {
				t.Fatal("D60 before cut", i, before)
			}
		}
	}
	for _, angle := range []float64{14.9999, 15, 29.9999, 30, 359.9999, 360, math.Nextafter(0, math.Inf(-1))} {
		p, err := Classify(angle, nil, false)
		if err != nil || p.RashiIndex < 0 || p.RashiIndex > 11 || p.D60Segment != nil {
			t.Fatal(angle, p, err)
		}
	}
	p, _ := Classify(14.9999, nil, true)
	if p.D2Sign != 4 {
		t.Fatal("rounded-degree D2 defect", p)
	}
	p, _ = Classify(15, nil, true)
	if p.D2Sign != 3 {
		t.Fatal(p)
	}
	if _, err := Segment(math.NaN(), 0, 0, 0); err == nil {
		t.Fatal("NaN")
	}
}
func TestUnwrappedSolverAndFailureBounds(t *testing.T) {
	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	// Linear synthetic phase crosses360 at hour5, then12-degree spacing; this is algorithm evidence only.
	sample := func(t time.Time) (float64, error) { return norm(350 + t.Sub(start).Hours()*2), nil }
	found, err := Transitions(context.Background(), "synthetic", start, start.Add(20*time.Hour), 12, sample)
	if err != nil || len(found) != 3 {
		t.Fatal(found, err)
	}
	for i, b := range found {
		expected := start.Add(time.Duration(5+i*6) * time.Hour)
		if math.Abs(b.At.Sub(expected).Seconds()) > 1 || b.BracketSeconds > 1 || b.AngularResidual > 2.0/3600 || b.PrecisionStatus != "SOLVER_BRACKET_ONLY_NOT_EXTERNAL_ACCURACY" {
			t.Fatal(b)
		}
	}
	flat := func(time.Time) (float64, error) { return 10, nil }
	if _, err := Transitions(context.Background(), "flat", start, start.Add(time.Hour), 12, flat); err == nil {
		t.Fatal("nonmonotonic accepted")
	}
	for _, step := range []float64{0, math.NaN(), math.Inf(1)} {
		if _, err := Transitions(context.Background(), "bad", start, start.Add(time.Hour), step, sample); err == nil {
			t.Fatal("invalid step")
		}
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := Transitions(ctx, "cancel", start, start.Add(time.Hour), 12, sample); err == nil {
		t.Fatal("context ignored")
	}
}
func TestNativeHTTPStrictClosedContracts(t *testing.T) {
	h := Handler(defaultConfiguration())
	for _, v := range []struct {
		method, path, body string
		status             int
	}{{"GET", "/api/v1/astronomy/capabilities", "", 200}, {"GET", "/api/v1/astronomy/day?birth_date=private", "", 422}, {"POST", "/api/v1/astronomy/day", `{"profile_id":"other"}`, 422}, {"POST", "/api/v1/astronomy/day", strings.Repeat(" ", 17000), 413}, {"POST", "/api/v1/astronomy/day", `{}` + strings.Repeat(" ", 17000), 413}, {"GET", "/api/v1/astronomy/day", "", 405}} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest(v.method, v.path, strings.NewReader(v.body)))
		if w.Code != v.status || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal(v.path, w.Code, w.Body.String())
		}
		var body map[string]any
		if json.Unmarshal(w.Body.Bytes(), &body) != nil || body["customer_timing_authorized"] != false {
			t.Fatal("unsafe metadata", w.Body.String())
		}
	}
}
func TestTraditionalIntervalsAreMeasurementsNotApprovedGuidance(t *testing.T) {
	solar := syntheticSolar()
	for day := time.Sunday; day <= time.Saturday; day++ {
		parts := TraditionalIntervals(solar, day)
		if len(parts) != 5 {
			t.Fatal(parts)
		}
		for _, p := range parts {
			if !p.Start.Before(p.End) || p.ApprovalStatus != "TRADITIONAL_SOURCE_AND_OWNER_APPROVAL_PENDING" {
				t.Fatal(p)
			}
		}
	}
	if len(TraditionalIntervals(emptySolar(), time.Sunday)) != 0 {
		t.Fatal("polar invented time")
	}
}
func TestRationalSectorRepresentationPolicy(t *testing.T) {
	for i := 1; i < 27; i++ {
		cut := float64(i) * 360 / 27
		before, _ := Segment(0, 0, 0, cut-1e-9)
		after, _ := Segment(0, 0, 0, cut+1e-9)
		if before.Nakshatra != i || after.Nakshatra != i+1 {
			t.Fatal(i, before, after)
		}
	}
	for i := 1; i < 108; i++ {
		cut := float64(i) * 360 / 108
		before, _ := Classify(cut-1e-9, nil, true)
		after, _ := Classify(cut+1e-9, nil, true)
		if before.Pada != (i-1)%4+1 || after.Pada != i%4+1 || after.BoundaryPolicy == "" {
			t.Fatal(i, before, after)
		}
	}
}
