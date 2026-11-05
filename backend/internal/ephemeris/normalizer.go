package ephemeris

import (
	"encoding/json"
	"fmt"
	"math"
	"time"
)

type NormalizationRequest struct {
	Timezone           string   `json:"timezone"`
	TimezoneOffset     *float64 `json:"timezone_offset,omitempty"`
	BirthTimeCertainty string   `json:"birth_time_certainty,omitempty"`
	Ayanamsa           string   `json:"ayanamsa_type,omitempty"`
	RequiredMode       string   `json:"required_mode,omitempty"`
	BirthDate          string   `json:"birth_date"`
	BirthTime          string   `json:"birth_time"`
	Latitude           *float64 `json:"latitude"`
	Longitude          *float64 `json:"longitude"`
}

type PlanetData struct {
	Latitude       float64 `json:"latitude"`
	RequestedFlags int32   `json:"requested_flags"`
	ReturnedFlags  int32   `json:"returned_flags"`
	EphemerisMode  string  `json:"ephemeris_mode"`
	LibraryVersion string  `json:"library_version"`
	Warning        string  `json:"warning,omitempty"`
	Ayanamsa       string  `json:"ayanamsa"`
	TimeScale      string  `json:"time_scale"`
	Longitude      float64 `json:"longitude"`
	Velocity       float64 `json:"velocity"`
}

type NormalizedPayload struct {
	BirthTimeCertainty          string                `json:"birth_time_certainty"`
	TimezoneMode                string                `json:"timezone_mode"`
	IndependentValidationStatus string                `json:"independent_validation_status"`
	Limitations                 []string              `json:"limitations"`
	JulianDayUtc                float64               `json:"julian_day_utc"`
	NormalizedTime              time.Time             `json:"normalized_time_utc"`
	SystemTimestamp             int64                 `json:"system_timestamp"`
	Coordinates                 map[string]PlanetData `json:"coordinates"`
}

func CalculateJulianDay(t time.Time) float64 {
	t = t.UTC()
	year, month, day := t.Date()
	hour := float64(t.Hour()) + float64(t.Minute())/60.0 + float64(t.Second())/3600.0
	m := int(month)
	if m <= 2 {
		year--
		m += 12
	}
	A := year / 100
	B := A / 4
	C_val := 2 - A + B
	E := int(365.25 * float64(year+4716))
	F := int(30.6001 * float64(m+1))
	return float64(C_val) + float64(day) + float64(E) + float64(F) + (hour / 24.0) - 1524.5
}

func ExecuteNormalization(req NormalizationRequest, tzLocation string) ([]byte, error) {
	utcTime, err := ParseBirth(req, tzLocation)
	if err != nil {
		return nil, err
	}
	if req.RequiredMode != "" && req.RequiredMode != "SWISS_FILE" && req.RequiredMode != "JPL" && req.RequiredMode != "MOSHIER" {
		return nil, fmt.Errorf("INVALID_EPHEMERIS_MODE")
	}
	julianDay := CalculateJulianDay(utcTime)

	planetsMap := make(map[string]PlanetData)
	targetPlanets := map[string]int32{"sun": 0, "moon": 1, "mars": 4, "saturn": 6}

	for name, id := range targetPlanets {
		coord, err := computeCelestialPosition(julianDay, id)
		if err != nil {
			return nil, err
		}
		if req.RequiredMode != "" && coord.EphemerisMode != req.RequiredMode {
			return nil, fmt.Errorf("EPHEMERIS_MODE_UNAVAILABLE")
		}
		planetsMap[name] = coord
	}
	certainty := req.BirthTimeCertainty
	if certainty == "" {
		certainty = "UNSPECIFIED"
	}
	zoneMode := "IANA"
	if req.TimezoneOffset != nil {
		zoneMode = "CALLER_SUPPLIED_OFFSET"
		if tzLocation != "" || req.Timezone != "" {
			zoneMode = "IANA_WITH_EXPLICIT_OFFSET"
		}
	}
	payload := NormalizedPayload{
		BirthTimeCertainty: certainty, TimezoneMode: zoneMode, IndependentValidationStatus: "NOT_PERFORMED",
		Limitations:     []string{"UTC is supplied as UT without a UT1 correction; independent numerical accuracy validation has not been performed.", "Native normalization supports sun, moon, mars and saturn only; returned flags disclose actual ephemeris mode."},
		JulianDayUtc:    julianDay,
		NormalizedTime:  utcTime,
		SystemTimestamp: time.Now().UnixNano(),
		Coordinates:     planetsMap,
	}
	return json.Marshal(payload)
}

// ParseBirth accepts explicit IANA zones or caller offsets; ambiguous/gap local times never guess.
func ParseBirth(req NormalizationRequest, zone string) (time.Time, error) {
	if req.BirthDate == "" || req.BirthTime == "" || req.Latitude == nil || req.Longitude == nil {
		return time.Time{}, fmt.Errorf("MISSING_REQUIRED_BIRTH_DATA")
	}
	if req.BirthTimeCertainty == "UNKNOWN" {
		return time.Time{}, fmt.Errorf("BIRTH_TIME_UNKNOWN")
	}
	if req.BirthTimeCertainty != "" && req.BirthTimeCertainty != "EXACT" && req.BirthTimeCertainty != "APPROXIMATE" {
		return time.Time{}, fmt.Errorf("INVALID_BIRTH_TIME_CERTAINTY")
	}
	if req.Ayanamsa != "" && req.Ayanamsa != "TRUE_LAHIRI" {
		return time.Time{}, fmt.Errorf("INVALID_AYANAMSA")
	}
	if math.IsNaN(*req.Latitude) || math.IsInf(*req.Latitude, 0) || math.Abs(*req.Latitude) > 90 || math.IsNaN(*req.Longitude) || math.IsInf(*req.Longitude, 0) || math.Abs(*req.Longitude) > 180 {
		return time.Time{}, fmt.Errorf("INVALID_COORDINATES")
	}
	date, err := time.Parse("2006-01-02", req.BirthDate)
	if err != nil || date.Year() < 1 {
		return time.Time{}, fmt.Errorf("INVALID_BIRTH_DATE")
	}
	rawTime := req.BirthTime
	if len(rawTime) == 5 {
		rawTime += ":00"
	}
	wall := req.BirthDate + " " + rawTime
	naive, err := time.Parse("2006-01-02 15:04:05", wall)
	if err != nil || naive.Format("2006-01-02 15:04:05") != wall {
		return time.Time{}, fmt.Errorf("INVALID_BIRTH_TIME")
	}
	if zone != "" && req.Timezone != "" && zone != req.Timezone {
		return time.Time{}, fmt.Errorf("INVALID_TIMEZONE")
	}
	if zone == "" {
		zone = req.Timezone
	}
	if zone == "Local" {
		return time.Time{}, fmt.Errorf("INVALID_TIMEZONE")
	}
	var loc *time.Location
	if zone != "" {
		loc, err = time.LoadLocation(zone)
		if err != nil {
			return time.Time{}, fmt.Errorf("INVALID_TIMEZONE")
		}
	}
	if req.TimezoneOffset != nil {
		off := *req.TimezoneOffset
		if math.IsNaN(off) || math.IsInf(off, 0) || off < -12 || off > 14 {
			return time.Time{}, fmt.Errorf("INVALID_TIMEZONE")
		}
		result := naive.Add(-time.Duration(math.Round(off*3600)) * time.Second)
		if loc != nil {
			_, actual := result.In(loc).Zone()
			if math.Abs(float64(actual)-off*3600) > 0.5 || result.In(loc).Format("2006-01-02 15:04:05") != wall {
				return time.Time{}, fmt.Errorf("INVALID_TIMEZONE")
			}
		}
		return result.UTC(), nil
	}
	if loc == nil {
		return time.Time{}, fmt.Errorf("INVALID_TIMEZONE")
	}
	offsets := map[int]bool{}
	for h := -48; h <= 48; h++ {
		_, off := naive.Add(time.Duration(h) * time.Hour).In(loc).Zone()
		offsets[off] = true
	}
	matches := []time.Time{}
	for off := range offsets {
		candidate := naive.Add(-time.Duration(off) * time.Second)
		if candidate.In(loc).Format("2006-01-02 15:04:05") == wall {
			matches = append(matches, candidate)
		}
	}
	if len(matches) == 0 {
		return time.Time{}, fmt.Errorf("NONEXISTENT_LOCAL_TIME")
	}
	if len(matches) > 1 {
		return time.Time{}, fmt.Errorf("AMBIGUOUS_LOCAL_TIME")
	}
	return matches[0].UTC(), nil
}
