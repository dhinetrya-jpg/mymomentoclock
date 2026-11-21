package crossengine

import (
	"errors"
	"math"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func example() Dataset {
	data := Dataset{
		SchemaVersion: 2, DiagnosticMode: DiagnosticMode,
		AstronomicalProvider: "PYMEEUS_VSOP87_MEEUS",
		HouseFormulaOrigin:   "JYOTIPY_SRIPATI_TRANSCRIBED_FROM_SWISS_SOURCE",
		SourcePackage:        Package{"jyotipy", "0.2.1"}, TimeBasePackage: Package{"PyMeeus", "0.5.12"},
		CustomerTimingAuthorized: false, ScientificAcceptance: "NOT_ESTABLISHED",
	}
	for i := 0; i < 8; i++ {
		c := Case{ID: "example_1234", UTC: "2000-01-01T12:00:00Z", Latitude: 28, Longitude: 77, SiderealAscendantDegrees: 23, SiderealMCDegrees: 140}
		c.ID += string(rune('a' + i))
		for j := range c.Cusps {
			c.Cusps[j] = float64(j * 30)
		}
		data.Cases = append(data.Cases, c)
	}
	return data
}
func TestDifferentEngineProducesOnlyNonAcceptedDiagnostic(t *testing.T) {
	data := example()
	report, e := Compare(data, func(c Case) (NativeResult, error) {
		return NativeResult{Cusps: c.Cusps, Version: "2.10.03", Mode: "SWISS_FILE"}, nil
	})
	if e != nil || report.Status != ReportStatus || report.CasesCompared != 8 || report.MaxObservedDifferenceDegrees != 0 || report.ScientificAcceptance != "NOT_ESTABLISHED" || report.CustomerTimingAuthorized {
		t.Fatalf("false scientific acceptance %+v %v", report, e)
	}
}
func TestAngularWrapAndDisagreementRemainVisible(t *testing.T) {
	data := example()
	report, e := Compare(data, func(c Case) (NativeResult, error) {
		actual := c.Cusps
		actual[0] = 359.99
		return NativeResult{Cusps: actual, Version: "2.10.03", Mode: "SWISS_FILE"}, nil
	})
	if e != nil || math.Abs(report.MaxObservedDifferenceDegrees-0.01) > 1e-7 || report.Measurements[0].WorstCusp1Based != 1 {
		t.Fatalf("unexpected wrap %+v %v", report, e)
	}
	cusp := report.Measurements[0].Cusps[0]
	if cusp.Cusp1Based != 1 || cusp.SecondaryDegrees != 0 || cusp.NativeDegrees != 359.99 || math.Abs(cusp.DifferenceDegrees-0.01) > 1e-7 {
		t.Fatalf("missing cusp evidence: %+v", cusp)
	}
}
func TestNativeAndAuthorityFailuresAreFatal(t *testing.T) {
	data := example()
	for name, calculate := range map[string]func(Case) (NativeResult, error){
		"missing": func(Case) (NativeResult, error) { return NativeResult{}, errors.New("offline") },
		"wrong_mode": func(c Case) (NativeResult, error) {
			return NativeResult{Cusps: c.Cusps, Version: "2.10.03", Mode: "MOSHIER"}, nil
		},
		"wrong_version": func(c Case) (NativeResult, error) {
			return NativeResult{Cusps: c.Cusps, Version: "0.0", Mode: "SWISS_FILE"}, nil
		},
	} {
		t.Run(name, func(t *testing.T) {
			if _, e := Compare(data, calculate); e == nil {
				t.Fatal("invalid native context accepted")
			}
		})
	}
}
func TestMalformedOrUntrustedCaptureRefused(t *testing.T) {
	data := example()
	tmp := t.TempDir()
	p := filepath.Join(tmp, "capture.json")
	original := `{"schema_version":1,"diagnostic_mode":"CROSS_ENGINE_NOT_INDEPENDENT_SRIPATI_FORMULA","cases":[]}`
	if e := os.WriteFile(p, []byte(original), 0600); e != nil {
		t.Fatal(e)
	}
	if _, e := Decode(p); e == nil {
		t.Fatal("missing evidence accepted")
	}
	data.ScientificAcceptance = "ACCEPTED"
	if _, e := Compare(data, func(Case) (NativeResult, error) { t.Fatal("must not execute"); return NativeResult{}, nil }); e == nil {
		t.Fatal("upstream certification accepted")
	}
}
func TestTimestampAndDimensions(t *testing.T) {
	data := example()
	// No additional runtime clock or local timezone may influence diagnostic comparisons.
	t1, e := time.Parse(time.RFC3339, data.Cases[0].UTC)
	if e != nil || t1.Location() != time.UTC {
		t.Fatal("UTC fixture broken")
	}
}
