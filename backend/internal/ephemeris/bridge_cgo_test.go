//go:build cgo

package ephemeris

import (
	"encoding/json"
	"math"
	"testing"
)

// Exercises the linked native library, not the !cgo approximate implementation.
func TestNativeEphemeris(t *testing.T) {
	for _, id := range []int32{0, 1, 4, 6} {
		p, err := computeCelestialPosition(2451545.0, id)
		if err != nil {
			t.Fatalf("planet %d: %v", id, err)
		}
		if p.LibraryVersion == "" || p.RequestedFlags == 0 || p.ReturnedFlags <= 0 || p.EphemerisMode == "" || p.Ayanamsa != "TRUE_LAHIRI" {
			t.Fatalf("missing provenance: %+v", p)
		}
		if math.IsNaN(p.Longitude) || math.IsInf(p.Longitude, 0) || p.Longitude < 0 || p.Longitude >= 360 || p.Velocity == 0 {
			t.Fatalf("invalid native result for %d: %+v", id, p)
		}
	}
	if _, err := computeCelestialPosition(2451545.0, 999); err == nil {
		t.Fatal("invalid planet must return a native error")
	}
}

func TestNativeNormalizationWithTimezone(t *testing.T) {
	lat, lon := 22.57, 88.36
	raw, err := ExecuteNormalization(NormalizationRequest{BirthDate: "2000-01-01", BirthTime: "17:30:00", Latitude: &lat, Longitude: &lon}, "Asia/Kolkata")
	if err != nil {
		t.Fatal(err)
	}
	var result NormalizedPayload
	if err := json.Unmarshal(raw, &result); err != nil {
		t.Fatal(err)
	}
	if result.JulianDayUtc != 2451545.0 || len(result.Coordinates) != 4 {
		t.Fatalf("unexpected normalization: %+v", result)
	}
}
func TestNativeConcurrentDeterminism(t *testing.T) {
	want, err := computeCelestialPosition(2451545, 0)
	if err != nil {
		t.Fatal(err)
	}
	results := make(chan PlanetData, 30)
	for i := 0; i < 30; i++ {
		go func() {
			got, err := computeCelestialPosition(2451545, 0)
			if err != nil {
				t.Error(err)
			}
			results <- got
		}()
	}
	for i := 0; i < 30; i++ {
		got := <-results
		if got.Longitude != want.Longitude || got.ReturnedFlags != want.ReturnedFlags || got.LibraryVersion != want.LibraryVersion {
			t.Fatal("native result changed concurrently")
		}
	}
}
