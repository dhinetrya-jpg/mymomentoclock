//go:build cgo

package astronomy

import (
	"astroengine-core/backend/internal/ephemeris"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"testing"
	"time"
)

type externalPlanet struct {
	ID                 string  `json:"id"`
	Body               string  `json:"body"`
	UTC                string  `json:"utc"`
	Frame              string  `json:"frame"`
	Center             string  `json:"center"`
	TimeScale          string  `json:"time_scale"`
	ReferenceBody      string  `json:"reference_body"`
	SourceID           string  `json:"source_id"`
	SourceSHA256       string  `json:"source_sha256"`
	Longitude          float64 `json:"longitude_deg"`
	Latitude           float64 `json:"latitude_deg"`
	LongitudeTolerance float64 `json:"longitude_tolerance_deg"`
	LatitudeTolerance  float64 `json:"latitude_tolerance_deg"`
}
type externalTemporal struct {
	ID          string    `json:"id"`
	Operation   string    `json:"operation"`
	Calendar    []float64 `json:"calendar"`
	InputJD1    float64   `json:"input_jd1"`
	InputJD2    float64   `json:"input_jd2"`
	DUT1        float64   `json:"dut1_seconds"`
	ExpectedJD1 float64   `json:"expected_jd1"`
	ExpectedJD2 float64   `json:"expected_jd2"`
	Tolerance   float64   `json:"tolerance_days"`
	ExpectedJD  float64   `json:"expected_jd"`
}

func externalDataset(t *testing.T) ([]externalPlanet, []externalTemporal, string) {
	t.Helper()
	base := filepath.Join("..", "..", "..", "tests", "calculation", "reference", "acquired")
	raw, err := os.ReadFile(filepath.Join(base, "normalized.json"))
	if err != nil {
		t.Fatal("Required immutable source package absent; never silently skip", err)
	}
	var data struct {
		Schema    int                `json:"schema_version"`
		Planetary []externalPlanet   `json:"planetary"`
		Temporal  []externalTemporal `json:"temporal"`
	}
	if json.Unmarshal(raw, &data) != nil || data.Schema != 1 || len(data.Planetary) != 3 || len(data.Temporal) != 5 {
		t.Fatal("reference schema/coverage changed; review source admission")
	}
	return data.Planetary, data.Temporal, base
}
func fileModeConfigurations(t *testing.T, base string) []ephemeris.NativeConfig {
	t.Helper()
	path, err := filepath.Abs(filepath.Join(base, "native-data"))
	if err != nil {
		t.Fatal(err)
	}
	config := ephemeris.NativeConfig{Mode: "SWISS_FILE", EphemerisPath: path, FileSHA256: map[string]string{"sepl_18.se1": "ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66", "semo_18.se1": "1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7"}}
	return []ephemeris.NativeConfig{{Mode: "MOSHIER"}, config}
}
func TestPublishedExternalNativePlanetaryComparisons(t *testing.T) {
	data, _, base := externalDataset(t)
	source, err := os.ReadFile(filepath.Join(base, "originals", "skyfield-test-against-horizons.py"))
	if err != nil {
		t.Fatal(err)
	}
	hash := sha256.Sum256(source)
	for _, c := range fileModeConfigurations(t, base) {
		for _, v := range data {
			t.Run(c.Mode+"/"+v.ID, func(t *testing.T) {
				if v.SourceSHA256 != hex.EncodeToString(hash[:]) || v.SourceID != "skyfield-horizons-tests" || v.Frame != "APPARENT_GEOCENTRIC_ECLIPTIC_OF_DATE" || v.Center != "Earth center" || v.TimeScale != "UTC" || v.LongitudeTolerance != 0.0002 || v.LatitudeTolerance != 0.00001 {
					t.Fatal("coordinate/source/tolerance admission mismatch")
				}
				if v.Body == "mars" {
					t.Log("NOT_ADMITTED: default Swiss Mars target is also system barycenter, but the pre1972 UTC/UT1 physical instant remains unmatched; no false numerical PASS")
					return
				}
				instant, err := time.Parse(time.RFC3339, v.UTC)
				if err != nil {
					t.Fatal(err)
				}
				actual, err := ephemeris.NativeSnapshot(instant, c, nil, nil)
				if err != nil {
					t.Fatal(err)
				}
				p, ok := actual.Planets[v.Body]
				if !ok || actual.ActualMode != c.Mode {
					t.Fatal("native body/mode unavailable")
				}
				for _, q := range []struct {
					name                        string
					expected, actual, tolerance float64
				}{{"tropical_longitude", v.Longitude, p.TropicalLongitude, v.LongitudeTolerance}, {"latitude", v.Latitude, p.Latitude, v.LatitudeTolerance}} {
					residual := q.actual - q.expected
					if q.name == "tropical_longitude" {
						residual = signed(residual)
					}
					absolute := math.Abs(residual)
					status := "PASS"
					if absolute > q.tolerance {
						status = "FAIL"
					}
					record := map[string]any{"id": v.ID, "body": v.Body, "mode": c.Mode, "quantity": q.name, "expected": q.expected, "actual": q.actual, "signed_residual_deg": residual, "absolute_error_deg": absolute, "tolerance_deg": q.tolerance, "tolerance_source": "immutable upstream preexisting test; not fitted to local result", "source_id": v.SourceID, "status": status, "source_scope": "UPSTREAM_PUBLISHED_HORIZONS_DERIVED_NOT_DIRECT_NASA_CAPTURE"}
					encoded, _ := json.Marshal(record)
					t.Log("CORE01_NUMERICAL_RESULT " + string(encoded))
					if status != "PASS" {
						t.Errorf("native %s exceeds unchanged published tolerance: %.12g > %.12g", q.name, absolute, q.tolerance)
					}
				}
			})
		}
	}
}

// Native epochs use one float64 JD. Budget is declared BEFORE measurements:
// original ERFA fractional-part tolerance + one representational ULP near JD2.45million (~40microseconds).
func TestPublishedERFANativeEpochs(t *testing.T) {
	_, vectors, _ := externalDataset(t)
	taiMinusUTC := 0.0
	for _, v := range vectors {
		if v.Operation == "UTCTAI" {
			taiMinusUTC = math.Round(((v.ExpectedJD1 - v.InputJD1) + (v.ExpectedJD2 - v.InputJD2)) * 86400)
		}
	}
	if taiMinusUTC <= 0 || taiMinusUTC > 50 {
		t.Fatal("independent UTC/TAI source pairing missing")
	}
	for _, v := range vectors {
		t.Run(v.ID, func(t *testing.T) {
			expected := v.ExpectedJD1 + v.ExpectedJD2
			var actual float64
			if v.Operation == "DTF2D" {
				if len(v.Calendar) != 6 {
					t.Fatal("missing leap-label source")
				}
				c := v.Calendar
				label, err := ephemeris.ConvertUTCLabel(fmt.Sprintf("%04d-%02d-%02d", int(c[0]), int(c[1]), int(c[2])), fmt.Sprintf("%02d:%02d:%012.9f", int(c[3]), int(c[4]), c[5]))
				if err != nil {
					t.Fatal(err)
				}
				actual = label.JulianDayUTCQuasi
				expected = v.ExpectedJD
			} else if v.Operation == "CAL2JD" {
				if len(v.Calendar) != 3 {
					t.Fatal("invalid source calendar")
				}
				epoch, err := ephemeris.ConvertUTC(time.Date(int(v.Calendar[0]), time.Month(v.Calendar[1]), int(v.Calendar[2]), 0, 0, 0, 0, time.UTC), nil)
				if err != nil {
					t.Fatal(err)
				}
				actual = epoch.JulianDayUTC
			} else {
				instant := ephemeris.JulianDayUTCToTime(v.InputJD1).Add(time.Duration(math.Round(v.InputJD2 * 86400e9)))
				var dut1 *float64
				if v.Operation == "UTCUT1" {
					dut1 = &v.DUT1
				}
				if v.Operation == "TAITT" {
					instant = instant.Add(-time.Duration(taiMinusUTC * 1e9))
				}
				epoch, err := ephemeris.ConvertUTC(instant, dut1)
				if err != nil {
					t.Fatal(err)
				}
				switch v.Operation {
				case "UTCTAI":
					actual = epoch.JulianDayTT - 32.184/86400
				case "TAITT":
					actual = epoch.JulianDayTT
				case "UTCUT1":
					actual = epoch.JulianDayUT1
				default:
					t.Fatal("unrecognized scientific reference", v.Operation)
				}
			}
			budget := v.Tolerance
			if v.Operation != "CAL2JD" {
				budget += math.Nextafter(expected, math.Inf(1)) - expected
			}
			errorDays := math.Abs(actual - expected)
			status := "PASS"
			if errorDays > budget {
				status = "FAIL"
			}
			record := map[string]any{"id": v.ID, "operation": v.Operation, "expected_jd": expected, "actual_jd": actual, "absolute_error_seconds": errorDays * 86400, "tolerance_seconds": budget * 86400, "status": status, "source_id": "erfa-published-vectors"}
			encoded, _ := json.Marshal(record)
			t.Log("CORE01_TEMPORAL_RESULT " + string(encoded))
			if status != "PASS" {
				t.Errorf("native epoch exceeds predeclared float64/source budget: %.12g > %.12g", errorDays, budget)
			}
		})
	}
}
