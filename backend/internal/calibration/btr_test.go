package calibration

import (
	"astroengine-core/backend/internal/ephemeris"
	"sync"
	"testing"
	"time"
)

func fixture() BTRRequest {
	lat, lon := 22.0, 88.0
	return BTRRequest{BasePayload: ephemeris.NormalizationRequest{BirthDate: "2000-01-01", BirthTime: "00:00:00", Latitude: &lat, Longitude: &lon, Timezone: "UTC"}, Milestones: []MilestoneEvent{{EventType: "MARRIAGE", Timestamp: time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC), Confidence: "HIGH"}}, SearchWindowMinutes: 15}
}
func TestNoFabricatedDashaOrCertification(t *testing.T) {
	r := fixture()
	var wg sync.WaitGroup
	for i := 0; i < 40; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			data, err := ExecuteRectification(r, "")
			if data != nil || err == nil || err.Error() != "DASHA_CALCULATION_UNAVAILABLE" {
				t.Errorf("fabricated candidate: %s %v", data, err)
			}
		}()
	}
	wg.Wait()
	if r.BasePayload.BirthTime != "00:00:00" {
		t.Fatal("input overwritten")
	}
}
func TestMilestoneValidation(t *testing.T) {
	for _, change := range []func(*BTRRequest){func(r *BTRRequest) { r.Milestones = nil }, func(r *BTRRequest) { r.Milestones[0].EventType = "UNKNOWN" }, func(r *BTRRequest) { r.Milestones[0].Timestamp = time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC) }, func(r *BTRRequest) { r.Milestones[0].Timestamp = time.Now().AddDate(1, 0, 0) }, func(r *BTRRequest) { r.Milestones = append(r.Milestones, r.Milestones[0]) }, func(r *BTRRequest) { r.SearchWindowMinutes = 10000000 }} {
		r := fixture()
		change(&r)
		data, err := ExecuteRectification(r, "")
		if data != nil || err == nil || err.Error() == "DASHA_CALCULATION_UNAVAILABLE" {
			t.Fatalf("invalid input accepted: %s %v", data, err)
		}
	}
}
func TestCanonicalNodeMilestoneContract(t *testing.T) {
	r := fixture()
	r.Milestones = []MilestoneEvent{{Type: "MARRIAGE_UNION", ApproxDate: "2020-01", Confidence: "HIGH"}}
	data, err := ExecuteRectification(r, "")
	if data != nil || err == nil || err.Error() != "DASHA_CALCULATION_UNAVAILABLE" {
		t.Fatalf("canonical contract: %s %v", data, err)
	}
}
