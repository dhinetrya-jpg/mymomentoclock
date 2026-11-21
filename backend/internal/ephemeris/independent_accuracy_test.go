package ephemeris

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Quarantined source numbers are not independent astronomical evidence. This suite checks only calendar/error regressions.
// ReferenceDataset matches tests/calculation/reference/independent_reference_fixtures.json
type ReferenceDataset struct {
	DatasetTitle   string             `json:"dataset_title"`
	TotalScenarios int                `json:"total_scenarios"`
	Fixtures       []ReferenceFixture `json:"fixtures"`
}

type ReferenceFixture struct {
	FixtureID          string `json:"fixture_id"`
	Category           string `json:"category"`
	Description        string `json:"description"`
	SourceInstitution  string `json:"source_institution"`
	ObservationInstant string `json:"observation_instant"`
	Inputs             struct {
		BirthDate      string  `json:"birthDate"`
		BirthTime      string  `json:"birthTime"`
		Timezone       string  `json:"timezone"`
		TimezoneOffset float64 `json:"timezoneOffset"`
		Latitude       float64 `json:"latitude"`
		Longitude      float64 `json:"longitude"`
		AyanamsaType   string  `json:"ayanamsaType"`
		RequiredMode   string  `json:"required_mode"`
	} `json:"inputs"`
	Expected struct {
		JulianDayUT            float64 `json:"julianDayUT"`
		AyanamsaLahiri         float64 `json:"ayanamsaLahiri"`
		DeltaTSeconds          float64 `json:"deltaTSeconds"`
		SunSiderealLahiri      float64 `json:"sunSiderealLahiri"`
		MoonSiderealLahiri     float64 `json:"moonSiderealLahiri"`
		ErrorCode              string  `json:"errorCode"`
		ErrorCodeWithoutOffset string  `json:"errorCodeWithoutOffset"`
	} `json:"expected"`
	ValidationStatus string `json:"validation_status"`
}

func loadReferenceDataset(t *testing.T) *ReferenceDataset {
	candidates := []string{
		"../../../tests/calculation/reference/independent_reference_fixtures.json",
		"tests/calculation/reference/independent_reference_fixtures.json",
		"../../tests/calculation/reference/independent_reference_fixtures.json",
	}
	var data []byte
	var err error
	for _, p := range candidates {
		data, err = os.ReadFile(filepath.Clean(p))
		if err == nil {
			break
		}
	}
	if err != nil {
		t.Fatalf("Required legacy calendar dataset absent; package it explicitly: %v", err)
		return nil
	}
	var dataset ReferenceDataset
	if err := json.Unmarshal(data, &dataset); err != nil {
		t.Fatalf("Failed to parse independent reference dataset: %v", err)
	}
	return &dataset
}

func TestLegacyScenarioCalendarOnly(t *testing.T) {
	dataset := loadReferenceDataset(t)
	if dataset == nil {
		return
	}

	if dataset.TotalScenarios < 30 {
		t.Fatalf("Expected at least 30 independent reference scenarios, got %d", dataset.TotalScenarios)
	}

	for _, fix := range dataset.Fixtures {
		t.Run(fix.FixtureID, func(t *testing.T) {
			// Verify Julian Day UT calculation for date-based scenarios
			if fix.Expected.JulianDayUT > 0 && fix.Inputs.BirthDate != "" {
				lat := fix.Inputs.Latitude
				lon := fix.Inputs.Longitude
				offset := fix.Inputs.TimezoneOffset
				req := NormalizationRequest{
					BirthDate:      fix.Inputs.BirthDate,
					BirthTime:      fix.Inputs.BirthTime,
					Latitude:       &lat,
					Longitude:      &lon,
					Timezone:       fix.Inputs.Timezone,
					TimezoneOffset: &offset,
					Ayanamsa:       "TRUE_LAHIRI",
				}
				utcTime, err := ParseBirth(req, fix.Inputs.Timezone)
				if err != nil {
					t.Fatalf("ParseBirth failed unexpectedly for %s: %v", fix.FixtureID, err)
				}

				jdCalculated := CalculateJulianDay(utcTime)
				jdDiff := math.Abs(jdCalculated - fix.Expected.JulianDayUT)
				if jdDiff > 1e-5 {
					t.Errorf("Julian Day mismatch for %s: calculated %.6f, expected %.6f (diff %.8f)",
						fix.FixtureID, jdCalculated, fix.Expected.JulianDayUT, jdDiff)
				}
			}

			// Verify DST ambiguous local time behavior without offset
			if fix.Expected.ErrorCodeWithoutOffset == "AMBIGUOUS_LOCAL_TIME" {
				lat := fix.Inputs.Latitude
				lon := fix.Inputs.Longitude
				reqWithoutOffset := NormalizationRequest{
					BirthDate: fix.Inputs.BirthDate,
					BirthTime: fix.Inputs.BirthTime,
					Latitude:  &lat,
					Longitude: &lon,
					Timezone:  fix.Inputs.Timezone,
				}
				_, err := ParseBirth(reqWithoutOffset, fix.Inputs.Timezone)
				if err == nil || !strings.Contains(err.Error(), "AMBIGUOUS_LOCAL_TIME") {
					t.Errorf("Expected AMBIGUOUS_LOCAL_TIME without offset, got: %v", err)
				}
			}

			// Verify validation rejection error codes (e.g. spring forward gap or century non-leap)
			if fix.Expected.ErrorCode != "" && fix.Inputs.BirthDate != "" {
				lat := fix.Inputs.Latitude
				lon := fix.Inputs.Longitude
				req := NormalizationRequest{
					BirthDate: fix.Inputs.BirthDate,
					BirthTime: fix.Inputs.BirthTime,
					Latitude:  &lat,
					Longitude: &lon,
					Timezone:  fix.Inputs.Timezone,
				}
				_, err := ParseBirth(req, fix.Inputs.Timezone)
				if err == nil || !strings.Contains(err.Error(), fix.Expected.ErrorCode) {
					t.Errorf("Expected error %s for %s, got: %v", fix.Expected.ErrorCode, fix.FixtureID, err)
				}
			}
		})
	}
}
