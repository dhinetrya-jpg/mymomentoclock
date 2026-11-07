package astronomy

import (
	"astroengine-core/backend/internal/ephemeris"
	"context"
	"testing"
	"time"
)

func defaultConfiguration() ephemeris.NativeConfig { return ephemeris.NativeConfig{Mode: "MOSHIER"} }
func syntheticSolar() ephemeris.NativeSolarResult {
	a := time.Date(2026, 1, 1, 6, 0, 0, 0, time.UTC)
	b := a.Add(12 * time.Hour)
	return ephemeris.NativeSolarResult{Sunrise: &a, Sunset: &b}
}
func emptySolar() ephemeris.NativeSolarResult { return ephemeris.NativeSolarResult{} }
func coordinate(v float64) *float64           { return &v }
func TestRealNativePanchangDayAndCoverage(t *testing.T) {
	req := DayRequest{SchemaVersion: 1, Date: "2026-03-08", Timezone: "America/New_York", Latitude: coordinate(40.71), Longitude: coordinate(-74), RequiredMode: "MOSHIER"}
	if !ephemeris.NativeAvailable() {
		if _, err := ComputeDay(context.Background(), req, defaultConfiguration()); err == nil {
			t.Fatal("nonCGO invented astronomy")
		}
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	day, err := ComputeDay(ctx, req, defaultConfiguration())
	if err != nil {
		t.Fatal(err)
	}
	if day.End.Sub(day.Start) != 23*time.Hour || len(day.EnclosingFactors) != 4 || day.CustomerTimingAuthorized || day.Solar.Sunrise == nil || day.Solar.Sunset == nil {
		t.Fatal(day)
	}
	for _, kind := range []string{"tithi", "nakshatra", "yoga", "karana"} {
		cursor := day.Start
		count := 0
		for _, interval := range day.FactorIntervals {
			if interval.Kind != kind {
				continue
			}
			if !interval.Start.Equal(cursor) || !interval.Start.Before(interval.End) {
				t.Fatal("gap or overlap", interval)
			}
			cursor = interval.End
			count++
		}
		if count == 0 || !cursor.Equal(day.End) {
			t.Fatal("incomplete day", kind)
		}
	}
	for _, b := range day.Transitions {
		if b.At.Before(day.Start) || !b.At.Before(day.End) || b.BracketSeconds > 1 {
			t.Fatal(b)
		}
	}
	for _, bounds := range day.EnclosingFactors {
		if bounds.Start.After(day.Start) || !bounds.End.After(day.Start) {
			t.Fatal("missing true enclosing bound", bounds)
		}
	}
	t.Logf("native_model_only date=%s mode=%s factors=%d transitions=%d solar=%s", req.Date, day.Snapshot.ActualMode, len(day.FactorIntervals), len(day.Transitions), day.Solar.Status)
}
func TestRealNativeBirthUncertaintyAndConventions(t *testing.T) {
	if !ephemeris.NativeAvailable() {
		return
	}
	req := SnapshotRequest{SchemaVersion: 1, Civil: ephemeris.NormalizationRequest{BirthDate: "2000-01-01", BirthTime: "12:00", Timezone: "UTC", Latitude: coordinate(0), Longitude: coordinate(0), BirthTimeCertainty: "APPROXIMATE", RequiredMode: "MOSHIER"}}
	result, err := ComputeSnapshot(context.Background(), req, defaultConfiguration())
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range result.Placements {
		if p.D60Segment != nil {
			t.Fatal("uncertain D60")
		}
	}
	req.Civil.Ayanamsa = "TRUE_LAHIRI"
	if _, err = ComputeSnapshot(context.Background(), req, defaultConfiguration()); err == nil {
		t.Fatal("Lahiri/Citra conflation")
	}
	req.Civil.Ayanamsa = "SWISS_SE_SIDM_LAHIRI"
	req.Civil.BirthTimeCertainty = "EXACT"
	result, err = ComputeSnapshot(context.Background(), req, defaultConfiguration())
	if err != nil || result.Native.Houses == nil {
		t.Fatal(err)
	}
	if len(result.Placements) != 9 || result.CustomerTimingAuthorized {
		t.Fatal("provider contract", result)
	}
}
func TestNativePolarDailyWithoutInventedAscendant(t *testing.T) {
	if !ephemeris.NativeAvailable() {
		return
	}
	place := ephemeris.NativePlace{Latitude: 90, Longitude: 0}
	if _, err := ephemeris.NativeSnapshot(time.Date(2026, 6, 21, 12, 0, 0, 0, time.UTC), defaultConfiguration(), nil, &place); err == nil {
		t.Fatal("undefined polar ascendant invented")
	}
	req := DayRequest{SchemaVersion: 1, Date: "2026-06-21", Timezone: "UTC", Latitude: coordinate(90), Longitude: coordinate(0), RequiredMode: "MOSHIER"}
	day, err := ComputeDay(context.Background(), req, defaultConfiguration())
	if err != nil {
		t.Fatal(err)
	}
	if day.Solar.Sunrise != nil || day.Solar.Sunset != nil || len(day.Traditional) != 0 || day.Snapshot.Houses != nil {
		t.Fatal("polar windows or ascendant invented", day.Solar)
	}
}
