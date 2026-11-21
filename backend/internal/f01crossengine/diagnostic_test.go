package crossengine

import (
	"bytes"
	"encoding/json"
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

func TestDecodeRejectsAmbiguousOrOversizedJSON(t *testing.T) {
	data := example()
	data.Conventions = SecondaryConventions{"JYOTIPY_LAHIRI", "UTC_CIVIL_FIELDS_AS_PYMEEUS_EPOCH_WITHOUT_DUT1_CORRECTION", "JYOTIPY_SRIPATI_TROPICAL_THEN_SIDEREAL"}
	for i := range data.Cases {
		data.Cases[i].JulianDay = 2451545
	}
	original, err := json.Marshal(data)
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(t.TempDir(), "capture.json")
	decode := func(input []byte) error {
		t.Helper()
		if err := os.WriteFile(path, input, 0600); err != nil {
			t.Fatal(err)
		}
		_, err := Decode(path)
		return err
	}
	if err := decode(original); err != nil {
		t.Fatalf("valid diagnostic refused: %v", err)
	}
	array := []byte(`"sidereal_sripati_cusps_deg":[0,30,60,90,120,150,180,210,240,270,300,330]`)
	mutations := map[string][]byte{
		"uppercase only":               bytes.Replace(original, []byte(`"latitude":28`), []byte(`"LATITUDE":28`), 1),
		"mixed case alias":             bytes.Replace(original, []byte(`"latitude":28`), []byte(`"latitude":999,"LaTiTuDe":28`), 1),
		"missing latitude":             bytes.Replace(original, []byte(`"latitude":28,`), nil, 1),
		"null longitude":               bytes.Replace(original, []byte(`"longitude":77`), []byte(`"longitude":null`), 1),
		"null ascendant":               bytes.Replace(original, []byte(`"sidereal_ascendant_deg":23`), []byte(`"sidereal_ascendant_deg":null`), 1),
		"uppercase root":               bytes.Replace(original, []byte(`"schema_version":2`), []byte(`"SCHEMA_VERSION":2`), 1),
		"uppercase package":            bytes.Replace(original, []byte(`"name":"jyotipy"`), []byte(`"NAME":"jyotipy"`), 1),
		"thirteenth cusp":              bytes.Replace(original, array, []byte(`"sidereal_sripati_cusps_deg":[0,30,60,90,120,150,180,210,240,270,300,330,42]`), 1),
		"eleven cusps":                 bytes.Replace(original, array, []byte(`"sidereal_sripati_cusps_deg":[0,30,60,90,120,150,180,210,240,270,300]`), 1),
		"null cusp":                    bytes.Replace(original, array, []byte(`"sidereal_sripati_cusps_deg":[null,30,60,90,120,150,180,210,240,270,300,330]`), 1),
		"null array":                   bytes.Replace(original, array, []byte(`"sidereal_sripati_cusps_deg":null`), 1),
		"nonnumeric cusp":              bytes.Replace(original, array, []byte(`"sidereal_sripati_cusps_deg":["0",30,60,90,120,150,180,210,240,270,300,330]`), 1),
		"duplicate root":               bytes.Replace(original, []byte(`"schema_version":2`), []byte(`"schema_version":1,"schema_version":2`), 1),
		"duplicate nested":             bytes.Replace(original, []byte(`"name":"jyotipy"`), []byte(`"name":"wrong","name":"jyotipy"`), 1),
		"escaped duplicate":            bytes.Replace(original, []byte(`"schema_version":2`), []byte(`"schema_version":1,"schema_\u0076ersion":2`), 1),
		"trailing object":              append(append([]byte{}, original...), []byte(` {}`)...),
		"oversized whitespace":         append(append([]byte{}, original...), bytes.Repeat([]byte(" "), 1<<20)...),
		"trailing object beyond limit": append(append(append([]byte{}, original...), bytes.Repeat([]byte(" "), 1<<20)...), []byte(`{}`)...),
	}
	for name, input := range mutations {
		t.Run(name, func(t *testing.T) {
			if bytes.Equal(input, original) {
				t.Fatal("mutation missed fixture")
			}
			if err := decode(input); err == nil {
				t.Fatal("ambiguous diagnostic accepted")
			}
		})
	}
}
