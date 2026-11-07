package astronomy

import (
	"astroengine-core/backend/internal/ephemeris"
	"context"
	"math"
)

type ChartPlacement struct {
	RashiIndex              int                `json:"rashi_index_0_based"`
	Nakshatra               int                `json:"nakshatra_1_based"`
	Pada                    int                `json:"pada_1_based"`
	WholeSignHouse          int                `json:"whole_sign_house_1_based,omitempty"`
	D2Sign                  int                `json:"d2_luminary_hora_sign_index"`
	D9Sign                  int                `json:"d9_parashari_sign_index"`
	D60Segment              *int               `json:"d60_segment_index_0_based,omitempty"`
	BoundaryDistanceDegrees float64            `json:"nearest_half_degree_boundary_distance"`
	MappingConvention       string             `json:"mapping_convention"`
	TraditionalAcceptance   string             `json:"traditional_acceptance"`
	BoundaryPolicy          string             `json:"boundary_policy"`
	BoundaryDistances       map[string]float64 `json:"boundary_distances_degrees"`
}

func Classify(longitude float64, ascendant *float64, exactBirth bool) (ChartPlacement, error) {
	if math.IsNaN(longitude) || math.IsInf(longitude, 0) {
		return ChartPlacement{}, problem("INVALID_ANGLE")
	}
	lon := norm(longitude)
	sign := int(math.Floor(lon / 30))
	degree := lon - float64(sign)*30
	first := degree < 15
	hora := 3
	if sign%2 == 0 && first || sign%2 == 1 && !first {
		hora = 4
	}
	result := ChartPlacement{RashiIndex: sign, Nakshatra: int(math.Floor(lon*27/360)) + 1, Pada: int(math.Floor(lon*108/360))%4 + 1, D2Sign: hora, D9Sign: int(math.Floor(lon*3/10)) % 12, BoundaryDistanceDegrees: math.Min(math.Mod(lon, 0.5), 0.5-math.Mod(lon, 0.5)), MappingConvention: "rashi-whole-sign; D2 luminary odd/even15deg; D9 Parashari zodiac-ninth; D60 half-degree segment only", TraditionalAcceptance: "MATHEMATICAL_MAPPINGS_TESTED_SOURCE_TRADITION_APPROVAL_PENDING"}
	result.BoundaryPolicy = "Half-open floating-point inputs; rational boundaries may fall either side within representation ULP. No epsilon snapping or astronomical accuracy inference."
	result.BoundaryDistances = map[string]float64{}
	for name, step := range map[string]float64{"rashi": 30, "nakshatra": 360.0 / 27, "pada": 360.0 / 108, "d2": 15, "d9": 10.0 / 3, "d60": 0.5} {
		within := math.Mod(lon, step)
		result.BoundaryDistances[name] = math.Min(within, step-within)
	}
	if ascendant != nil {
		if math.IsNaN(*ascendant) || math.IsInf(*ascendant, 0) {
			return ChartPlacement{}, problem("INVALID_ASCENDANT")
		}
		result.WholeSignHouse = (sign-int(math.Floor(norm(*ascendant)/30))+12)%12 + 1
	}
	if exactBirth {
		part := int(math.Floor(degree * 2))
		result.D60Segment = &part
	}
	return result, nil
}

type SnapshotRequest struct {
	SchemaVersion   int                            `json:"schema_version"`
	Civil           ephemeris.NormalizationRequest `json:"civil"`
	DUT1Seconds     *float64                       `json:"dut1_seconds,omitempty"`
	ElevationMeters float64                        `json:"elevation_meters"`
}
type SnapshotResult struct {
	ContractVersion          string                         `json:"contract_version"`
	Status                   string                         `json:"status"`
	Native                   ephemeris.NativeSnapshotResult `json:"native"`
	Placements               map[string]ChartPlacement      `json:"placements"`
	BirthTimeCertainty       string                         `json:"birth_time_certainty"`
	CustomerTimingAuthorized bool                           `json:"customer_timing_authorized"`
	Limitations              []string                       `json:"limitations"`
}

func ComputeSnapshot(ctx context.Context, r SnapshotRequest, configuration ephemeris.NativeConfig) (SnapshotResult, error) {
	if configuration.Mode == "" {
		configuration.Mode = "MOSHIER"
	}
	if r.SchemaVersion != 1 {
		return SnapshotResult{}, problem("INVALID_SCHEMA_VERSION")
	}
	if ctx.Err() != nil {
		return SnapshotResult{}, problem("ASTRONOMY_TIMEOUT")
	}
	civil := r.Civil
	if civil.Ayanamsa != "" && civil.Ayanamsa != "SWISS_SE_SIDM_LAHIRI" {
		return SnapshotResult{}, problem("UNSUPPORTED_AYANAMSA_CONVENTION")
	}
	civil.Ayanamsa = ""
	utc, err := ephemeris.ParseBirth(civil, civil.Timezone)
	if err != nil {
		return SnapshotResult{}, err
	}
	if r.Civil.RequiredMode != "" && r.Civil.RequiredMode != configuration.Mode {
		return SnapshotResult{}, problem("EPHEMERIS_MODE_UNAVAILABLE")
	}
	place := ephemeris.NativePlace{Latitude: *r.Civil.Latitude, Longitude: *r.Civil.Longitude, ElevationMeters: r.ElevationMeters}
	snapshot, err := ephemeris.NativeSnapshot(utc, configuration, r.DUT1Seconds, &place)
	if err != nil {
		return SnapshotResult{}, err
	}
	placements := map[string]ChartPlacement{}
	var asc *float64
	if snapshot.Houses != nil {
		asc = &snapshot.Houses.SiderealAscendant
	}
	exact := r.Civil.BirthTimeCertainty == "EXACT"
	for name, p := range snapshot.Planets {
		classification, e := Classify(p.SiderealLongitude, asc, exact)
		if e != nil {
			return SnapshotResult{}, e
		}
		placements[name] = classification
	}
	certainty := r.Civil.BirthTimeCertainty
	if certainty == "" {
		certainty = "UNSPECIFIED"
	}
	return SnapshotResult{Version, "COMPUTED_UNVERIFIED", snapshot, placements, certainty, false, []string{"Actual native full-precision longitude drives segmentation; no rounded display degrees are used.", "D60 is suppressed unless birth time is explicitly EXACT; exact input is not a claim of externally verified longitude accuracy.", "D60 here is a half-degree segment, not an approved deity/sign interpretive mapping. D2/D9 traditional convention approval remains pending.", "No ascendant, house, or varga placement is a personal timing recommendation."}}, nil
}
