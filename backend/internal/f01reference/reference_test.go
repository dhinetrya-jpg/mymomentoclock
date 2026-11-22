package f01reference

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func fixture(t *testing.T) (Reference, string) {
	t.Helper()
	root := t.TempDir()
	if e := os.Mkdir(filepath.Join(root, "originals"), 0700); e != nil {
		t.Fatal(e)
	}
	ref := Reference{
		ID: "unit_fixture", UTC: "2000-01-01T12:00:00Z", Latitude: 22.57, Longitude: 88.36,
		HouseSystem: "SRIPATI_S_CUSP_START_1_BASED", Ayanamsa: "SWISS_SE_SIDM_LAHIRI",
		SiderealMode: "SIDEREAL_ECLIPTIC_OF_DATE", TimeScale: "UTC",
		SourceProducer: "TEST_ONLY_EXTERNAL_CALCULATOR", SourceMethod: "independent formula for parser tests",
		SourceVersion: "unit-v1", SourceURL: "https://example.org/test-only",
		OriginalFile:     "published-example.json",
		Qualification:    Qualification{AstronomyLineage: "TEST_ONLY independently specified astronomy", HouseFormulaLineage: "TEST_ONLY independent geometry", ReviewEvidence: "TEST_ONLY fictitious parser fixture, not qualified science", SourcePrecisionDegrees: 0.00001, ToleranceBasis: "TEST_ONLY artificial threshold, not a scientific tolerance", ToleranceDeclaredUTC: "2026-01-01T00:00:00Z", FirstComparisonUTC: "2026-01-02T00:00:00Z"},
		ToleranceDegrees: 0.0001,
	}
	for i := range ref.ExpectedCusps {
		ref.ExpectedCusps[i] = float64(i * 30)
	}
	chart := SourceChart{UTC: ref.UTC, Latitude: &ref.Latitude, Longitude: &ref.Longitude, HouseSystem: ref.HouseSystem, Ayanamsa: ref.Ayanamsa, SiderealMode: ref.SiderealMode, TimeScale: ref.TimeScale, CuspUnits: "DEGREES", ExpectedCusps: ref.ExpectedCusps}
	raw, e := json.Marshal(chart)
	if e != nil {
		t.Fatal(e)
	}
	if e = os.WriteFile(filepath.Join(root, "originals", ref.OriginalFile), raw, 0600); e != nil {
		t.Fatal(e)
	}
	sum := sha256.Sum256(raw)
	ref.OriginalSHA256 = hex.EncodeToString(sum[:])
	return ref, root
}
func TestAdmissionAndWraparound(t *testing.T) {
	ref, root := fixture(t)
	if e := Admit(ref, root); e != nil {
		t.Fatal(e)
	}
	actual := ref.ExpectedCusps
	actual[0] = 359.99995
	ref.ExpectedCusps[0] = 0
	r := Compare(ref, actual)
	if r.Status != "PASS" {
		t.Fatalf("wrap %.8f %+v", r.MaxErrorDegrees, r)
	}
	actual[0] = 359.98
	if Compare(ref, actual).Status != "FAIL" {
		t.Fatal("failed numerical comparison falsely admitted")
	}
}
func TestInvalidReferencesCannotBeAdmitted(t *testing.T) {
	original, root := fixture(t)
	cases := map[string]func(*Reference){
		"swiss_not_independent": func(r *Reference) { r.SourceProducer = "Swiss Ephemeris" },
		"wrong_house":           func(r *Reference) { r.HouseSystem = "PLACIDUS" },
		"wrong_ayanamsa":        func(r *Reference) { r.Ayanamsa = "KP_NEW" },
		"wrong_timescale":       func(r *Reference) { r.TimeScale = "TT" },
		"wrong_source_hash":     func(r *Reference) { r.OriginalSHA256 = strings.Repeat("0", 64) },
		"unsafe_path":           func(r *Reference) { r.OriginalFile = "../published-example.txt" },
		"missing_producer":      func(r *Reference) { r.SourceProducer = "" },
		"wrong_tolerance":       func(r *Reference) { r.ToleranceDegrees = 1 },
		"invalid_cusp":          func(r *Reference) { r.ExpectedCusps[3] = math.NaN() },
		"wrong_epoch":           func(r *Reference) { r.UTC = "2000-01-01T12:00:00+00:00" },
		"invalid_latitude":      func(r *Reference) { r.Latitude = 99 },
	}
	for name, change := range cases {
		t.Run(name, func(t *testing.T) {
			r := original
			change(&r)
			if e := Admit(r, root); e == nil {
				t.Fatal("unverified source admitted")
			}
		})
	}
}
func TestMissingReferencesFailClosed(t *testing.T) {
	root := t.TempDir()
	data := Dataset{SchemaVersion: Schema, DatasetPurpose: "F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON", References: []Reference{}}
	report, e := Run(data, root, func(Reference) ([12]float64, error) {
		t.Fatal("empty dataset executed calculation")
		return [12]float64{}, nil
	})
	if e == nil || report.Status != StatusBlocked || report.Accepted != 0 {
		t.Fatalf("false admission %+v %v", report, e)
	}
}
func TestComparisonPassFailureAndNativeFailure(t *testing.T) {
	ref, root := fixture(t)
	set := Dataset{SchemaVersion: Schema, DatasetPurpose: "F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON", References: []Reference{ref}}
	success, e := Run(set, root, func(Reference) ([12]float64, error) { return ref.ExpectedCusps, nil })
	if e != nil || success.Status != StatusPartial || success.Passed != 1 || success.Failed != 0 {
		t.Fatalf("pass %+v %v", success, e)
	}
	bad := ref.ExpectedCusps
	bad[1] = 30.02
	failure, e := Run(set, root, func(Reference) ([12]float64, error) { return bad, nil })
	if e == nil || failure.Status != StatusFailed || failure.Failed != 1 {
		t.Fatalf("false numerical PASS %+v %v", failure, e)
	}
	unavailable, e := Run(set, root, func(Reference) ([12]float64, error) { return [12]float64{}, errors.New("NATIVE_UNAVAILABLE") })
	if e == nil || unavailable.Status == StatusPartial {
		t.Fatalf("native fallback %+v %v", unavailable, e)
	}
}

func TestManifestRejectsAmbiguousAndTruncatedEvidence(t *testing.T) {
	ref, _ := fixture(t)
	dataset := Dataset{SchemaVersion: Schema, DatasetPurpose: "F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON", References: []Reference{ref}}
	raw, e := json.Marshal(dataset)
	if e != nil {
		t.Fatal(e)
	}
	for _, count := range []int{0, 11, 13} {
		t.Run(fmt.Sprintf("cusps_%d", count), func(t *testing.T) {
			var document map[string]any
			if e := json.Unmarshal(raw, &document); e != nil {
				t.Fatal(e)
			}
			values := make([]float64, count)
			document["references"].([]any)[0].(map[string]any)["expected_cusps"] = values
			malformed, e := json.Marshal(document)
			if e != nil {
				t.Fatal(e)
			}
			assertLoadFails(t, malformed)
		})
	}
	assertLoadFails(t, []byte(strings.Replace(string(raw), `"schema_version":2`, `"schema_version":2,"schema_version":2`, 1)))
	assertLoadFails(t, append(append(raw, []byte(strings.Repeat(" ", 1<<20))...), []byte(`{}`)...))
	assertLoadFails(t, []byte(strings.Replace(string(raw), `"expected_cusps":[0,`, `"expected_cusps":[null,`, 1)))
}
func assertLoadFails(t *testing.T, raw []byte) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "manifest.json")
	if e := os.WriteFile(path, raw, 0600); e != nil {
		t.Fatal(e)
	}
	if _, e := Load(path); e == nil {
		t.Fatal("ambiguous or incomplete evidence accepted")
	}
}
func TestHashDoesNotPermitDifferentClaimedChart(t *testing.T) {
	original, root := fixture(t)
	for name, change := range map[string]func(*Reference){
		"instant":                 func(r *Reference) { r.UTC = "2000-01-01T12:01:00Z" },
		"latitude":                func(r *Reference) { r.Latitude += 0.1 },
		"longitude":               func(r *Reference) { r.Longitude += 0.1 },
		"cusp":                    func(r *Reference) { r.ExpectedCusps[1] += 0.01 },
		"no_qualification":        func(r *Reference) { r.Qualification = Qualification{} },
		"shared_formula":          func(r *Reference) { r.Qualification.HouseFormulaLineage = "JyotiPy case S" },
		"precision":               func(r *Reference) { r.Qualification.SourcePrecisionDegrees = 0.01 },
		"retrospective_tolerance": func(r *Reference) { r.Qualification.ToleranceDeclaredUTC = r.Qualification.FirstComparisonUTC },
	} {
		t.Run(name, func(t *testing.T) {
			r := original
			change(&r)
			if e := Admit(r, root); e == nil {
				t.Fatal("unsupported chart claim admitted")
			}
		})
	}
}
func TestAllSourcesAdmittedBeforeAnyCalculation(t *testing.T) {
	ref, root := fixture(t)
	bad := ref
	bad.ID = "bad_source"
	bad.ExpectedCusps[1] += 0.01
	set := Dataset{SchemaVersion: Schema, DatasetPurpose: "F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON", References: []Reference{ref, bad}}
	report, e := Run(set, root, func(Reference) ([12]float64, error) {
		t.Fatal("calculation ran before every source was admitted")
		return [12]float64{}, nil
	})
	if e == nil || report.Accepted != 0 || len(report.Comparisons) != 0 {
		t.Fatalf("partial admission %+v %v", report, e)
	}
	set.References = []Reference{ref}
	if _, e := Run(set, root, nil); e == nil {
		t.Fatal("nil calculator accepted")
	}
}
func TestComparisonRejectsInvalidDirectInputs(t *testing.T) {
	ref, _ := fixture(t)
	actual := ref.ExpectedCusps
	ref.ToleranceDegrees = math.NaN()
	if Compare(ref, actual).Status != "FAIL" {
		t.Fatal("NaN tolerance passed")
	}
	ref.ToleranceDegrees = 0.01
	ref.ExpectedCusps[1] = math.NaN()
	if Compare(ref, actual).Status != "FAIL" {
		t.Fatal("NaN expected value passed")
	}
}

func TestOriginalJSONMustMatchActualTwelveValuesAndRequiredMetadata(t *testing.T) {
	for name, mutate := range map[string]func(map[string]any){
		"eleven":             func(v map[string]any) { v["expected_cusps"] = v["expected_cusps"].([]any)[:11] },
		"thirteen":           func(v map[string]any) { v["expected_cusps"] = append(v["expected_cusps"].([]any), 359.0) },
		"null_coordinate":    func(v map[string]any) { v["latitude"] = nil },
		"missing_coordinate": func(v map[string]any) { delete(v, "longitude") },
		"radians":            func(v map[string]any) { v["cusp_units"] = "RADIANS" },
	} {
		t.Run(name, func(t *testing.T) {
			ref, root := fixture(t)
			path := filepath.Join(root, "originals", ref.OriginalFile)
			raw, e := os.ReadFile(path)
			if e != nil {
				t.Fatal(e)
			}
			var chart map[string]any
			if e = json.Unmarshal(raw, &chart); e != nil {
				t.Fatal(e)
			}
			mutate(chart)
			raw, e = json.Marshal(chart)
			if e != nil {
				t.Fatal(e)
			}
			if e = os.WriteFile(path, raw, 0600); e != nil {
				t.Fatal(e)
			}
			sum := sha256.Sum256(raw)
			ref.OriginalSHA256 = hex.EncodeToString(sum[:])
			if e = Admit(ref, root); e == nil {
				t.Fatal("malformed source accepted despite matching checksum")
			}
		})
	}
}
func TestManifestMissingAndNullCoordinatesFailClosed(t *testing.T) {
	ref, _ := fixture(t)
	raw, e := json.Marshal(Dataset{SchemaVersion: Schema, DatasetPurpose: "F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON", References: []Reference{ref}})
	if e != nil {
		t.Fatal(e)
	}
	assertLoadFails(t, []byte(strings.Replace(string(raw), `"latitude":22.57,`, "", 1)))
	assertLoadFails(t, []byte(strings.Replace(string(raw), `"latitude":22.57`, `"latitude":null`, 1)))
}
func TestOriginalSymlinksRejected(t *testing.T) {
	ref, root := fixture(t)
	path := filepath.Join(root, "originals", ref.OriginalFile)
	target := filepath.Join(root, "outside.json")
	if e := os.Rename(path, target); e != nil {
		t.Fatal(e)
	}
	if e := os.Symlink(target, path); e != nil {
		t.Fatal(e)
	}
	if e := Admit(ref, root); e == nil {
		t.Fatal("symlink original accepted")
	}
}

func TestCaseAliasedChartClaimsCannotOverrideCanonicalKeys(t *testing.T) {
	ref, root := fixture(t)
	raw, e := json.Marshal(Dataset{SchemaVersion: Schema, DatasetPurpose: "F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON", References: []Reference{ref}})
	if e != nil {
		t.Fatal(e)
	}
	assertLoadFails(t, []byte(strings.Replace(string(raw), `"latitude":22.57`, `"latitude":999,"LATITUDE":22.57`, 1)))
	assertLoadFails(t, []byte(strings.Replace(string(raw), `"schema_version":2`, `"SCHEMA_VERSION":2`, 1)))
	path := filepath.Join(root, "originals", ref.OriginalFile)
	source, e := os.ReadFile(path)
	if e != nil {
		t.Fatal(e)
	}
	source = []byte(strings.Replace(string(source), `"latitude":22.57`, `"latitude":999,"LATITUDE":22.57`, 1))
	if e = os.WriteFile(path, source, 0600); e != nil {
		t.Fatal(e)
	}
	sum := sha256.Sum256(source)
	ref.OriginalSHA256 = hex.EncodeToString(sum[:])
	if e = Admit(ref, root); e == nil {
		t.Fatal("case-aliased original accepted")
	}
}

func TestUnicodeCaseAliasesCannotOverrideEvidence(t *testing.T) {
	ref, root := fixture(t)
	raw, e := json.Marshal(Dataset{SchemaVersion: Schema, DatasetPurpose: "F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON", References: []Reference{ref}})
	if e != nil {
		t.Fatal(e)
	}
	for _, replacement := range []string{`"houſe_system":"SRIPATI_S_CUSP_START_1_BASED"`, `"house_system":"BAD","houſe_system":"SRIPATI_S_CUSP_START_1_BASED"`, `"house_system":"BAD","hou\u017fe_system":"SRIPATI_S_CUSP_START_1_BASED"`} {
		assertLoadFails(t, []byte(strings.Replace(string(raw), `"house_system":"SRIPATI_S_CUSP_START_1_BASED"`, replacement, 1)))
	}
	path := filepath.Join(root, "originals", ref.OriginalFile)
	source, e := os.ReadFile(path)
	if e != nil {
		t.Fatal(e)
	}
	source = []byte(strings.Replace(string(source), `"house_system":"SRIPATI_S_CUSP_START_1_BASED"`, `"house_system":"BAD","houſe_system":"SRIPATI_S_CUSP_START_1_BASED"`, 1))
	if e = os.WriteFile(path, source, 0600); e != nil {
		t.Fatal(e)
	}
	sum := sha256.Sum256(source)
	ref.OriginalSHA256 = hex.EncodeToString(sum[:])
	if e = Admit(ref, root); e == nil {
		t.Fatal("Unicode alias in original accepted")
	}
}
