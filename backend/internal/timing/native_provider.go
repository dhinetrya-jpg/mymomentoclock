package timing

import (
	"astroengine-core/backend/internal/astronomy"
	"astroengine-core/backend/internal/ephemeris"
	"context"
)

// NativeAstronomyPayload is a typed scientific inspection contract, not timing release authorization.
type NativeAstronomyPayload struct {
	Version                  string                   `json:"version"`
	Natal                    astronomy.SnapshotResult `json:"natal"`
	Day                      astronomy.DayResult      `json:"day"`
	IndependentAcceptance    string                   `json:"independent_acceptance"`
	CustomerTimingAuthorized bool                     `json:"customer_timing_authorized"`
}
type NativeAstronomyProvider struct{ configuration ephemeris.NativeConfig }

func NewNativeAstronomyProvider(c ephemeris.NativeConfig) *NativeAstronomyProvider {
	copy := c
	copy.FileSHA256 = map[string]string{}
	for k, v := range c.FileSHA256 {
		copy.FileSHA256[k] = v
	}
	return &NativeAstronomyProvider{copy}
}
func (p *NativeAstronomyProvider) Inspect(ctx context.Context, v Validated) (NativeAstronomyPayload, error) {
	if p == nil {
		return NativeAstronomyPayload{}, problem("NATIVE_EPHEMERIS_UNAVAILABLE")
	}
	if err := astronomy.RequireProductionConfiguration(p.configuration); err != nil {
		return NativeAstronomyPayload{}, err
	}
	if v.Request.EphemerisMode != "SWISS_FILE" {
		return NativeAstronomyPayload{}, problem("PRODUCTION_AUTHORITY_REQUIRED")
	}
	birth := v.Request.Birth
	natal, err := astronomy.ComputeSnapshot(ctx, astronomy.SnapshotRequest{SchemaVersion: 1, Civil: ephemeris.NormalizationRequest{BirthDate: birth.Date, BirthTime: birth.Time, Timezone: birth.Timezone, TimezoneOffset: birth.UTCOffset, Latitude: birth.Latitude, Longitude: birth.Longitude, BirthTimeCertainty: birth.Certainty, RequiredMode: v.Request.EphemerisMode}}, p.configuration)
	if err != nil {
		return NativeAstronomyPayload{}, err
	}
	target := v.Request.Target
	day, err := astronomy.ComputeDay(ctx, astronomy.DayRequest{SchemaVersion: 1, Date: target.Date, Timezone: target.Timezone, Latitude: target.Latitude, Longitude: target.Longitude, RequiredMode: v.Request.EphemerisMode}, p.configuration)
	if err != nil {
		return NativeAstronomyPayload{}, err
	}
	return NativeAstronomyPayload{astronomy.Version, natal, day, "NOT_FULLY_INDEPENDENTLY_ACCEPTED", false}, nil
}

// Load cannot turn real, unaccepted science into Synthetic=true to bypass the existing timing gate.
// NativeEngine registration and activity-ranking code deliberately remain unchanged.
func (p *NativeAstronomyProvider) Load(_ context.Context, v Validated) (Inputs, error) {
	if p == nil {
		return Inputs{}, problem("NATIVE_EPHEMERIS_UNAVAILABLE")
	}
	if err := astronomy.RequireProductionConfiguration(p.configuration); err != nil {
		return Inputs{}, err
	}
	if v.Request.EphemerisMode != "SWISS_FILE" {
		return Inputs{}, problem("PRODUCTION_AUTHORITY_REQUIRED")
	}
	return Inputs{}, problem("ASTRONOMY_INDEPENDENT_ACCEPTANCE_PENDING")
}
