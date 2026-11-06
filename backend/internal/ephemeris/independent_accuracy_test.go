package ephemeris

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"
)

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
		BirthDate      string   `json:"birthDate"`
		BirthTime      string   `json:"birthTime"`
		Timezone       string   `json:"timezone"`
		TimezoneOffset float64  `json:"timezoneOffset"`
		Latitude       float64  `json:"latitude"`
		Longitude      float64  `json:"longitude"`
		AyanamsaType   string   `json:"ayanamsaType"`
		RequiredMode   string   `json:"required_mode"`
	} `json:"inputs"`
	Expected struct {
		JulianDayUT       float64 `json:"julianDayUT"`
		AyanamsaLahiri    float64 `json:"ayanamsaLahiri"`
		DeltaTSeconds     float64 `json:"deltaTSeconds"`
		SunSiderealLahiri float64 `json:"sunSiderealLahiri"`
		MoonSiderealLahiri float64 `json:"moonSiderealLahiri"`
		ErrorCode         string  `json:"errorCode"`
		ErrorCodeWithoutOffset string `json:"errorCodeWithoutOffset"`
	} `json:"expected"`
	ValidationStatus string `json:"validation_status"`
}

func circularAngularDifference(a, b float64) float64 {
	diff := math.Mod(math.Abs(a-b), 360.0)
	if diff > 180.0 {
		return 360.0 - diff
	}
	return diff
}

func loadReferenceDataset(t *testing.T) *ReferenceDataset {
	// Try multiple relative paths depending on where test is executed
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
		t.Skipf("Reference dataset not found in path, skipping: %v", err)
		return nil
	}
	var dataset ReferenceDataset
	if err := json.Unmarshal(data, &dataset); err != nil {
		t.Fatalf("Failed to parse independent reference dataset: %v", err)
	}
	return &dataset
}

func TestIndependentAstronomicalAccuracy(t *testing.T) {
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
					// Check if this scenario was expected to fail (e.g. DST gap or leap year)
					if fix.Expected.ErrorCode != "" {
						if !stringsContains(err.Error(), fix.Expected.ErrorCode) {
							t.Fatalf("Expected error %s, got %v", fix.Expected.ErrorCode, err)
						}
						return
					}
					t.Fatalf("ParseBirth failed unexpectedly: %v", err)
				}

				jdCalculated := CalculateJulianDay(utcTime)
				jdDiff := math.Abs(jdCalculated - fix.Expected.JulianDayUT)
				if jdDiff > 1e-5 {
					t.Errorf("Julian Day mismatch for %s: calculated %.6f, expected %.6f (diff %.8f)",
						fix.FixtureID, jdCalculated, fix.Expected.JulianDayUT, jdDiff)
				}
			}

			// Verify DST ambiguous local time behavior
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
				if err == nil || !stringsContains(err.Error(), "AMBIGUOUS_LOCAL_TIME") {
					t.Errorf("Expected AMBIGUOUS_LOCAL_TIME without offset, got: %v", err)
				}
			}
		})
	}
}

func stringsContains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || (len(s) > 0 && len(substr) > 0 && hasSubstr(s, substr)))
}

func hasSubstr(s, substr string) bool {
	for i := 0; i+len(substr) <= len(s); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
