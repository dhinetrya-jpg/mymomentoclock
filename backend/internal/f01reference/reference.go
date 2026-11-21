// Package f01reference admits externally generated F01 house-cusp references.
// It never promotes internal Swiss geometry checks or historical legacy fixtures
// into independent numerical evidence.
package f01reference

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"astroengine-core/backend/internal/ephemeris"
)

const Schema = 2
const StatusBlocked = "BLOCKED_NO_ADMITTED_EXTERNAL_REFERENCES"
const StatusPartial = "PARTIAL_EXTERNAL_NUMERICAL_COVERAGE_NOT_PREDICTIVE_VALIDATION"
const StatusFailed = "FAILED_EXTERNAL_NUMERICAL_COMPARISON"

// Cusps rejects JSON arrays that Go's fixed-array decoder would pad or truncate.
type Cusps [12]float64

func (c *Cusps) UnmarshalJSON(raw []byte) error {
	var values []json.RawMessage
	if err := json.Unmarshal(raw, &values); err != nil {
		return err
	}
	if len(values) != 12 {
		return errors.New("REFERENCE_REQUIRES_EXACTLY_12_CUSPS")
	}
	for i, value := range values {
		if bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
			return errors.New("REFERENCE_CUSP_NULL")
		}
		if err := json.Unmarshal(value, &c[i]); err != nil {
			return err
		}
	}
	return nil
}

// SourceChart is the supported original JSON chart contract. Other publisher
// formats require an independently reviewed extractor before admission.
type SourceChart struct {
	UTC           string   `json:"utc"`
	Latitude      *float64 `json:"latitude"`
	Longitude     *float64 `json:"longitude"`
	HouseSystem   string   `json:"house_system"`
	Ayanamsa      string   `json:"ayanamsa"`
	SiderealMode  string   `json:"sidereal_mode"`
	TimeScale     string   `json:"time_scale"`
	CuspUnits     string   `json:"cusp_units"`
	ExpectedCusps Cusps    `json:"expected_cusps"`
}
type Qualification struct {
	AstronomyLineage       string  `json:"astronomy_lineage"`
	HouseFormulaLineage    string  `json:"house_formula_lineage"`
	ReviewEvidence         string  `json:"review_evidence"`
	SourcePrecisionDegrees float64 `json:"source_precision_degrees"`
	ToleranceBasis         string  `json:"tolerance_basis"`
	// These are review records, not authentication or scientific proof. The
	// independent auditor must inspect the cited original evidence separately.
	ToleranceDeclaredUTC string `json:"tolerance_declared_utc"`
	FirstComparisonUTC   string `json:"first_comparison_utc"`
}
type Reference struct {
	ID               string        `json:"id"`
	UTC              string        `json:"utc"`
	Latitude         float64       `json:"latitude"`
	Longitude        float64       `json:"longitude"`
	HouseSystem      string        `json:"house_system"`
	Ayanamsa         string        `json:"ayanamsa"`
	SiderealMode     string        `json:"sidereal_mode"`
	TimeScale        string        `json:"time_scale"`
	SourceProducer   string        `json:"source_producer"`
	SourceMethod     string        `json:"source_method"`
	SourceVersion    string        `json:"source_version"`
	SourceURL        string        `json:"source_url"`
	OriginalFile     string        `json:"original_file"`
	OriginalSHA256   string        `json:"original_sha256"`
	ToleranceDegrees float64       `json:"tolerance_degrees"`
	ExpectedCusps    Cusps         `json:"expected_cusps"`
	Qualification    Qualification `json:"qualification"`
}

// Missing/null coordinates must not silently become zero-valued coordinates.
func (r *Reference) UnmarshalJSON(raw []byte) error {
	type plain Reference
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return err
	}
	for _, key := range []string{"latitude", "longitude", "tolerance_degrees", "expected_cusps", "qualification"} {
		value, ok := fields[key]
		if !ok || bytes.Equal(bytes.TrimSpace(value), []byte("null")) {
			return errors.New("REFERENCE_REQUIRED_FIELD_MISSING_OR_NULL")
		}
	}
	var decoded plain
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if err := d.Decode(&decoded); err != nil {
		return err
	}
	*r = Reference(decoded)
	return nil
}

type Dataset struct {
	SchemaVersion  int         `json:"schema_version"`
	DatasetPurpose string      `json:"dataset_purpose"`
	References     []Reference `json:"references"`
}
type Comparison struct {
	ID               string  `json:"id"`
	Status           string  `json:"status"`
	MaxErrorDegrees  float64 `json:"max_error_degrees"`
	ToleranceDegrees float64 `json:"tolerance_degrees"`
	WorstCusp        int     `json:"worst_cusp_1_based"`
	SourceSHA256     string  `json:"source_sha256"`
}
type Report struct {
	Status      string       `json:"status"`
	Accepted    int          `json:"accepted"`
	Passed      int          `json:"passed"`
	Failed      int          `json:"failed"`
	Comparisons []Comparison `json:"comparisons"`
	Limitations []string     `json:"limitations"`
}

var filePattern = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,80}\.(json)$`)
var idPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$`)
var hashPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

func canonical(v float64) float64 {
	return math.Mod(math.Mod(v, 360)+360, 360)
}
func angularDistance(a, b float64) float64 {
	d := canonical(a - b)
	if d > 180 {
		return 360 - d
	}
	return d
}
func validFinite(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) }
func normalizedCycle(cusps [12]float64) bool {
	sum := 0.0
	for i, c := range cusps {
		if !validFinite(c) || c < 0 || c >= 360 {
			return false
		}
		next := cusps[(i+1)%12]
		if !validFinite(next) {
			return false
		}
		width := canonical(next - c)
		if width < 1e-8 || width >= 180 {
			return false
		}
		sum += width
	}
	return math.Abs(sum-360) < 1e-5
}

// Admission checks provenance AND actual raw-source bytes. It does not establish
// whether an external published reference is scientifically correct.
func Admit(ref Reference, sourceRoot string) error {
	if !idPattern.MatchString(ref.ID) {
		return errors.New("REFERENCE_ID_INVALID")
	}
	instant, e := time.Parse(time.RFC3339, ref.UTC)
	if e != nil || instant.Location() != time.UTC || !strings.HasSuffix(ref.UTC, "Z") || instant.Year() < 1900 || instant.Year() > 2100 {
		return errors.New("REFERENCE_UTC_INVALID")
	}
	if !validFinite(ref.Latitude) || math.Abs(ref.Latitude) >= 89.99999 || !validFinite(ref.Longitude) || math.Abs(ref.Longitude) > 180 {
		return errors.New("REFERENCE_LOCATION_INVALID")
	}
	if ref.HouseSystem != "SRIPATI_S_CUSP_START_1_BASED" || ref.Ayanamsa != "SWISS_SE_SIDM_LAHIRI" || ref.SiderealMode != "SIDEREAL_ECLIPTIC_OF_DATE" || ref.TimeScale != "UTC" {
		return errors.New("REFERENCE_CONVENTION_MISMATCH")
	}
	if strings.TrimSpace(ref.SourceProducer) == "" || strings.TrimSpace(ref.SourceMethod) == "" || strings.TrimSpace(ref.SourceVersion) == "" || len(ref.SourceProducer) > 140 || len(ref.SourceMethod) > 140 || len(ref.SourceVersion) > 80 {
		return errors.New("REFERENCE_PROVENANCE_MISSING")
	}
	metadata := strings.ToLower(ref.SourceProducer + " " + ref.SourceMethod)
	if strings.Contains(metadata, "swiss ephemeris") || strings.Contains(metadata, "swisseph") || strings.Contains(metadata, "same implementation") || strings.Contains(metadata, "internal porphyry") {
		return errors.New("REFERENCE_NOT_INDEPENDENT")
	}
	if !strings.HasPrefix(ref.SourceURL, "https://") || len(ref.SourceURL) > 1024 || strings.Contains(strings.ToLower(ref.SourceURL), "swisseph") {
		return errors.New("REFERENCE_SOURCE_URL_INVALID")
	}
	if !filePattern.MatchString(ref.OriginalFile) || !hashPattern.MatchString(ref.OriginalSHA256) {
		return errors.New("REFERENCE_ORIGINAL_HASH_INVALID")
	}
	if !validFinite(ref.ToleranceDegrees) || ref.ToleranceDegrees <= 0 || ref.ToleranceDegrees > 0.1 {
		return errors.New("REFERENCE_TOLERANCE_INVALID")
	}
	if !normalizedCycle(ref.ExpectedCusps) {
		return errors.New("REFERENCE_CUSPS_INVALID")
	}
	q := ref.Qualification
	for _, v := range []string{q.AstronomyLineage, q.HouseFormulaLineage, q.ReviewEvidence, q.ToleranceBasis} {
		if strings.TrimSpace(v) == "" || len(v) > 4096 {
			return errors.New("REFERENCE_QUALIFICATION_MISSING")
		}
	}
	lineage := strings.ToLower(q.AstronomyLineage + " " + q.HouseFormulaLineage)
	for _, shared := range []string{"swiss", "jyotipy", "same implementation", "internal porphyry"} {
		if strings.Contains(lineage, shared) {
			return errors.New("REFERENCE_SHARED_LINEAGE")
		}
	}
	if !validFinite(q.SourcePrecisionDegrees) || q.SourcePrecisionDegrees <= 0 || q.SourcePrecisionDegrees > ref.ToleranceDegrees {
		return errors.New("REFERENCE_PRECISION_INVALID")
	}
	declared, de := time.Parse(time.RFC3339, q.ToleranceDeclaredUTC)
	first, fe := time.Parse(time.RFC3339, q.FirstComparisonUTC)
	if de != nil || fe != nil || !strings.HasSuffix(q.ToleranceDeclaredUTC, "Z") || !strings.HasSuffix(q.FirstComparisonUTC, "Z") || !declared.Before(first) {
		return errors.New("REFERENCE_TOLERANCE_NOT_PREDECLARED")
	}
	directory := filepath.Join(sourceRoot, "originals")
	dirStat, dirErr := os.Lstat(directory)
	if dirErr != nil || !dirStat.IsDir() {
		return errors.New("REFERENCE_ORIGINAL_DIRECTORY_INVALID")
	}
	p := filepath.Join(directory, ref.OriginalFile)
	stat, e := os.Lstat(p)
	if e != nil || !stat.Mode().IsRegular() || stat.Size() < 1 || stat.Size() > 10<<20 {
		return errors.New("REFERENCE_ORIGINAL_INVALID")
	}
	file, e := os.Open(p)
	if e != nil {
		return fmt.Errorf("REFERENCE_ORIGINAL_UNAVAILABLE: %w", e)
	}
	defer file.Close()
	opened, e := file.Stat()
	if e != nil || !os.SameFile(stat, opened) || !opened.Mode().IsRegular() {
		return errors.New("REFERENCE_ORIGINAL_CHANGED")
	}
	raw, e := io.ReadAll(io.LimitReader(file, (10<<20)+1))
	if e != nil {
		return fmt.Errorf("REFERENCE_ORIGINAL_UNAVAILABLE: %w", e)
	}
	if len(raw) == 0 || len(raw) > 10<<20 {
		return errors.New("REFERENCE_ORIGINAL_INVALID")
	}
	digest := sha256.Sum256(raw)
	if hex.EncodeToString(digest[:]) != ref.OriginalSHA256 {
		return errors.New("REFERENCE_ORIGINAL_SHA256_MISMATCH")
	}
	// Hash integrity alone does not establish correspondence. Require every
	// asserted numeric chart field to occur in the retained original JSON bytes.
	var chart SourceChart
	if err := decodeStrict(raw, &chart); err != nil {
		return fmt.Errorf("REFERENCE_SOURCE_FORMAT: %w", err)
	}
	if chart.Latitude == nil || chart.Longitude == nil || chart.UTC != ref.UTC || *chart.Latitude != ref.Latitude || *chart.Longitude != ref.Longitude || chart.HouseSystem != ref.HouseSystem || chart.Ayanamsa != ref.Ayanamsa || chart.SiderealMode != ref.SiderealMode || chart.TimeScale != ref.TimeScale || chart.CuspUnits != "DEGREES" || chart.ExpectedCusps != ref.ExpectedCusps {
		return errors.New("REFERENCE_SOURCE_CHART_MISMATCH")
	}
	return nil
}

// Duplicate keys are ambiguous evidence even when a JSON decoder accepts them.
func rejectDuplicateKeys(d *json.Decoder, depth int) error {
	if depth > 64 {
		return errors.New("REFERENCE_JSON_TOO_DEEP")
	}
	token, err := d.Token()
	if err != nil {
		return err
	}
	delim, ok := token.(json.Delim)
	if !ok {
		return nil
	}
	switch delim {
	case '{':
		seen := map[string]bool{}
		for d.More() {
			key, e := d.Token()
			if e != nil {
				return e
			}
			name := key.(string)
			if name != strings.ToLower(name) {
				return errors.New("REFERENCE_NONCANONICAL_JSON_KEY")
			}
			if seen[name] {
				return errors.New("REFERENCE_DUPLICATE_JSON_KEY")
			}
			seen[name] = true
			if e = rejectDuplicateKeys(d, depth+1); e != nil {
				return e
			}
		}
	case '[':
		for d.More() {
			if e := rejectDuplicateKeys(d, depth+1); e != nil {
				return e
			}
		}
	default:
		return errors.New("REFERENCE_JSON_INVALID")
	}
	_, err = d.Token()
	return err
}
func decodeStrict(raw []byte, target any) error {
	scan := json.NewDecoder(bytes.NewReader(raw))
	scan.UseNumber()
	if e := rejectDuplicateKeys(scan, 0); e != nil {
		return e
	}
	if e := scan.Decode(new(any)); e != io.EOF {
		return errors.New("REFERENCE_JSON_TRAILING_CONTENT")
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	return d.Decode(target)
}
func Load(manifestPath string) (Dataset, error) {
	file, e := os.Open(manifestPath)
	if e != nil {
		return Dataset{}, e
	}
	defer file.Close()
	raw, e := io.ReadAll(io.LimitReader(file, (1<<20)+1))
	if e != nil {
		return Dataset{}, e
	}
	if len(raw) > 1<<20 {
		return Dataset{}, errors.New("REFERENCE_MANIFEST_TOO_LARGE")
	}
	var data Dataset
	if e = decodeStrict(raw, &data); e != nil {
		return Dataset{}, e
	}
	if data.SchemaVersion != Schema || data.DatasetPurpose != "F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON" || len(data.References) > 50 {
		return Dataset{}, errors.New("REFERENCE_MANIFEST_INVALID")
	}
	seen := map[string]bool{}
	for _, ref := range data.References {
		if seen[ref.ID] {
			return Dataset{}, errors.New("REFERENCE_DUPLICATE_ID")
		}
		seen[ref.ID] = true
	}
	return data, nil
}
func Compare(ref Reference, observed [12]float64) Comparison {
	row := Comparison{ID: ref.ID, Status: "PASS", ToleranceDegrees: ref.ToleranceDegrees, SourceSHA256: ref.OriginalSHA256}
	if !validFinite(ref.ToleranceDegrees) || ref.ToleranceDegrees <= 0 || ref.ToleranceDegrees > 0.1 || !normalizedCycle(ref.ExpectedCusps) || !normalizedCycle(observed) {
		row.Status = "FAIL"
		return row
	}
	for i := 0; i < 12; i++ {
		err := angularDistance(ref.ExpectedCusps[i], observed[i])
		if err > row.MaxErrorDegrees {
			row.MaxErrorDegrees = err
			row.WorstCusp = i + 1
		}
	}
	if row.MaxErrorDegrees > ref.ToleranceDegrees {
		row.Status = "FAIL"
	}
	return row
}
func Run(dataset Dataset, sourceRoot string, compute func(Reference) ([12]float64, error)) (Report, error) {
	report := Report{Status: StatusBlocked, Comparisons: []Comparison{}, Limitations: []string{
		"External reference agreement is numerical comparison, not astrological predictive accuracy.",
		"Swiss internal Porphyry/Sripati cross-checks are not external reference evidence.",
		"No customer release or birth-time rectification is authorized by this report.",
	}}
	if dataset.SchemaVersion != Schema || dataset.DatasetPurpose != "F01_INDEPENDENT_SRIPATI_NUMERICAL_COMPARISON" {
		return report, errors.New("REFERENCE_MANIFEST_INVALID")
	}
	if len(dataset.References) == 0 {
		return report, errors.New(StatusBlocked)
	}
	if len(dataset.References) > 50 {
		return report, errors.New("REFERENCE_MANIFEST_TOO_LARGE")
	}
	seen := map[string]bool{}
	for _, ref := range dataset.References {
		if seen[ref.ID] {
			return report, errors.New("REFERENCE_DUPLICATE_ID")
		}
		seen[ref.ID] = true
		if err := Admit(ref, sourceRoot); err != nil {
			return report, fmt.Errorf("reference %s not admitted: %w", ref.ID, err)
		}
	}
	if compute == nil {
		return report, errors.New("REFERENCE_CALCULATOR_UNAVAILABLE")
	}
	report.Accepted = len(dataset.References)
	for _, ref := range dataset.References {
		actual, err := compute(ref)
		if err != nil {
			return report, fmt.Errorf("reference %s native unavailable: %w", ref.ID, err)
		}
		row := Compare(ref, actual)
		report.Comparisons = append(report.Comparisons, row)
		if row.Status == "PASS" {
			report.Passed++
		} else {
			report.Failed++
		}
	}
	if report.Failed > 0 {
		report.Status = StatusFailed
		return report, errors.New(StatusFailed)
	}
	report.Status = StatusPartial
	return report, nil
}
func NativeCalculator(config ephemeris.NativeConfig) func(Reference) ([12]float64, error) {
	return func(ref Reference) ([12]float64, error) {
		instant, e := time.Parse(time.RFC3339, ref.UTC)
		if e != nil {
			return [12]float64{}, e
		}
		place := ephemeris.NativePlace{Latitude: ref.Latitude, Longitude: ref.Longitude}
		snapshot, e := ephemeris.NativeSnapshot(instant, config, nil, &place)
		if e != nil {
			return [12]float64{}, e
		}
		if snapshot.ActualMode != "SWISS_FILE" || snapshot.Houses == nil || !snapshot.Houses.SripatiAvailable {
			return [12]float64{}, errors.New("REFERENCE_NATIVE_MODE_OR_HOUSES_UNAVAILABLE")
		}
		if _, e = ephemeris.CheckSripatiGeometry(snapshot.Houses); e != nil {
			return [12]float64{}, e
		}
		return snapshot.Houses.SiderealSripatiCusps, nil
	}
}
