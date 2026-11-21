package ephemeris

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"math"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"time"
)

const NativeContractVersion = "astronomy-native-v1"
const SwissSourceCommit = "175e1fcb3108bcd5c0d146c803f51dcf23508012"

// NativeConfig is trusted server configuration, never a client-selected file path or approval.
type NativeConfig struct {
	Usage         string            `json:"usage,omitempty"`
	Mode          string            `json:"mode"`
	EphemerisPath string            `json:"ephemeris_path,omitempty"`
	JPLFile       string            `json:"jpl_file,omitempty"`
	FileSHA256    map[string]string `json:"file_sha256,omitempty"`
}
type NativePlace struct {
	Latitude        float64 `json:"latitude"`
	Longitude       float64 `json:"longitude"`
	ElevationMeters float64 `json:"elevation_meters"`
}
type NativeEpoch struct {
	UTC               time.Time `json:"utc"`
	JulianDayUTC      float64   `json:"julian_day_utc_nominal"`
	JulianDayTT       float64   `json:"julian_day_tt"`
	JulianDayUT1      float64   `json:"julian_day_ut1"`
	TTMinusUTCSeconds float64   `json:"tt_minus_utc_seconds"`
	DUT1Seconds       float64   `json:"dut1_seconds"`
	DeltaTSeconds     float64   `json:"delta_t_seconds"`
	UT1Source         string    `json:"ut1_source"`
	TTSource          string    `json:"tt_source"`
}
type NativePlanet struct {
	TropicalLongitude      float64 `json:"tropical_longitude"`
	SiderealLongitude      float64 `json:"sidereal_longitude"`
	Latitude               float64 `json:"latitude"`
	DistanceAU             float64 `json:"distance_au"`
	LongitudeSpeed         float64 `json:"longitude_speed_deg_per_day"`
	LatitudeSpeed          float64 `json:"latitude_speed_deg_per_day"`
	DistanceSpeed          float64 `json:"distance_speed_au_per_day"`
	SiderealLongitudeSpeed float64 `json:"sidereal_longitude_speed_deg_per_day"`
	Retrograde             bool    `json:"retrograde"`
	RequestedFlags         int32   `json:"requested_flags"`
	ReturnedFlags          int32   `json:"returned_flags"`
	SiderealReturnedFlags  int32   `json:"sidereal_returned_flags"`
	Definition             string  `json:"definition"`
}
type NativeHouses struct {
	TropicalAscendant float64     `json:"tropical_ascendant"`
	SiderealAscendant float64     `json:"sidereal_ascendant"`
	SiderealCusps     [12]float64 `json:"sidereal_cusps"`
	System            string      `json:"system"`
}
type NativeSnapshotResult struct {
	AuthorityRole        string                  `json:"authority_role"`
	ContractVersion      string                  `json:"contract_version"`
	Epoch                NativeEpoch             `json:"epoch"`
	RequestedMode        string                  `json:"requested_mode"`
	ActualMode           string                  `json:"actual_mode"`
	LibraryVersion       string                  `json:"library_version"`
	SourceCommit         string                  `json:"source_commit"`
	DataFileStatus       string                  `json:"data_file_status"`
	DataFileSHA256       map[string]string       `json:"data_file_sha256,omitempty"`
	CoordinateConvention string                  `json:"coordinate_convention"`
	AyanamsaConvention   string                  `json:"ayanamsa_convention"`
	AyanamsaDegrees      float64                 `json:"ayanamsa_degrees"`
	Planets              map[string]NativePlanet `json:"planets"`
	Houses               *NativeHouses           `json:"houses,omitempty"`
	ValidationStatus     string                  `json:"validation_status"`
	PrecisionStatus      string                  `json:"precision_status"`
	Limitations          []string                `json:"limitations"`
}
type NativeUTCInterval struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}
type NativeSolarResult struct {
	AuthorityRole          string              `json:"authority_role"`
	ContractVersion        string              `json:"contract_version"`
	Sunrise                *time.Time          `json:"sunrise_utc,omitempty"`
	Sunset                 *time.Time          `json:"sunset_utc,omitempty"`
	Noon                   *time.Time          `json:"solar_noon_utc,omitempty"`
	Status                 string              `json:"status"`
	RequestedMode          string              `json:"requested_mode"`
	ActualMode             string              `json:"actual_mode"`
	LibraryVersion         string              `json:"library_version"`
	SunsetAfterSunrise     *time.Time          `json:"sunset_after_sunrise_utc,omitempty"`
	SunriseToSunsetSeconds *float64            `json:"sunrise_to_sunset_seconds,omitempty"`
	DaylightIntervals      []NativeUTCInterval `json:"daylight_intervals"`
	DaylightSeconds        *float64            `json:"daylight_seconds,omitempty"`
	Refraction             string              `json:"refraction"`
	SolarLimb              string              `json:"solar_limb"`
	ElevationMeters        float64             `json:"elevation_meters"`
	ValidationStatus       string              `json:"validation_status"`
	Limitations            []string            `json:"limitations"`
}

var nativeHashPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

func nativeError(code string) error { return errors.New(code) }
func validNativePlace(p NativePlace) bool {
	return !math.IsNaN(p.Latitude) && !math.IsInf(p.Latitude, 0) && math.Abs(p.Latitude) <= 90 && !math.IsNaN(p.Longitude) && !math.IsInf(p.Longitude, 0) && math.Abs(p.Longitude) <= 180 && !math.IsNaN(p.ElevationMeters) && !math.IsInf(p.ElevationMeters, 0) && p.ElevationMeters >= -500 && p.ElevationMeters <= 9000
}
func validateNativeConfig(c NativeConfig, instant time.Time) (NativeConfig, error) {
	if (c.Usage != "" && c.Usage != "PRODUCTION_AUTHORITY" && c.Usage != "DIAGNOSTIC_ONLY") || (c.Usage == "PRODUCTION_AUTHORITY" && c.Mode != "SWISS_FILE") {
		return c, nativeError("INVALID_AUTHORITY_USAGE")
	}
	if c.Mode == "" {
		c.Mode = "MOSHIER"
	}
	if c.Mode != "MOSHIER" && c.Mode != "SWISS_FILE" && c.Mode != "JPL" {
		return c, nativeError("INVALID_EPHEMERIS_MODE")
	}
	if instant.Year() < 1800 || instant.Year() > 2399 {
		return c, nativeError("NATIVE_EPOCH_OUT_OF_RANGE")
	}
	if c.Mode == "MOSHIER" {
		c.EphemerisPath = ""
		c.JPLFile = ""
		c.FileSHA256 = nil
		return c, nil
	}
	if !filepath.IsAbs(c.EphemerisPath) || filepath.Clean(c.EphemerisPath) != c.EphemerisPath {
		return c, nativeError("EPHEMERIS_CONFIGURATION_INVALID")
	}
	if env := os.Getenv("SE_EPHE_PATH"); env != "" && env != c.EphemerisPath {
		return c, nativeError("EPHEMERIS_ENVIRONMENT_CONFLICT")
	}
	needed := []string{"sepl_18.se1", "semo_18.se1"}
	if c.Mode == "JPL" {
		if filepath.Base(c.JPLFile) != c.JPLFile || c.JPLFile == "" || c.JPLFile == "." {
			return c, nativeError("JPL_KERNEL_UNAVAILABLE")
		}
		needed = []string{c.JPLFile}
	}
	for _, name := range needed {
		expected := c.FileSHA256[name]
		if !nativeHashPattern.MatchString(expected) {
			return c, nativeError("EPHEMERIS_CHECKSUM_REQUIRED")
		}
		path := filepath.Join(c.EphemerisPath, name)
		stat, err := os.Lstat(path)
		if err != nil || !stat.Mode().IsRegular() || stat.Size() < 100 || stat.Size() > 2<<30 {
			return c, nativeError("EPHEMERIS_DATA_UNAVAILABLE")
		}
		// Configuration is expected to be mounted read-only; do not trust a named file without its exact content hash.
		file, err := os.Open(path)
		if err != nil {
			return c, nativeError("EPHEMERIS_DATA_UNAVAILABLE")
		}
		hasher := sha256.New()
		_, err = io.Copy(hasher, file)
		file.Close()
		if err != nil {
			return c, nativeError("EPHEMERIS_DATA_UNAVAILABLE")
		}
		if hex.EncodeToString(hasher.Sum(nil)) != expected {
			return c, nativeError("EPHEMERIS_CHECKSUM_MISMATCH")
		}
	}
	return c, nil
}
func modeCode(mode string) int32 {
	switch mode {
	case "JPL":
		return 1
	case "SWISS_FILE":
		return 2
	default:
		return 4
	}
}
func nominalJulianDay(t time.Time) float64 {
	return 2440587.5 + float64(t.Unix())/86400 + float64(t.Nanosecond())/86400e9
}

// ConvertUTC delegates leap/Delta-T treatment to the pinned Swiss library. DUT1 is never silently called observed.
func ConvertUTC(instant time.Time, dut1 *float64) (NativeEpoch, error) {
	if os.Getenv("SE_EPHE_PATH") != "" {
		return NativeEpoch{}, nativeError("EPHEMERIS_ENVIRONMENT_CONFLICT")
	}
	instant = instant.UTC()
	if instant.Year() < 1800 || instant.Year() > 2399 {
		return NativeEpoch{}, nativeError("NATIVE_EPOCH_OUT_OF_RANGE")
	}
	if dut1 != nil && (math.IsNaN(*dut1) || math.IsInf(*dut1, 0) || math.Abs(*dut1) > 0.9) {
		return NativeEpoch{}, nativeError("INVALID_DUT1")
	}
	tt, ut1, err := nativeUTCToJD(instant)
	if err != nil {
		return NativeEpoch{}, err
	}
	utc := nominalJulianDay(instant)
	source := "SWISS_DELTAT_MODEL_ESTIMATE"
	ttSource := "SWISS_BUILTIN_LEAP_TABLE_NOT_EXTERNALLY_VERIFIED"
	if instant.Year() < 1972 {
		ttSource = "SWISS_PRE1972_UTC_AS_UT1_MODEL"
	} else if instant.Year() > 2026 {
		ttSource = "SWISS_FUTURE_LEAP_SECONDS_OR_UTC_AS_UT1_MODEL_UNCERTAIN"
	}
	if dut1 != nil {
		ut1 = utc + *dut1/86400
		source = "CALLER_SUPPLIED_DUT1_NOT_INDEPENDENTLY_VERIFIED"
	}
	return NativeEpoch{instant, utc, tt, ut1, (tt - utc) * 86400, (ut1 - utc) * 86400, (tt - ut1) * 86400, source, ttSource}, nil
}

// UT1ToUTC mirrors ConvertUTC: supplied DUT1 uses that offset, otherwise Swiss's modeled inverse is disclosed.
func UT1ToUTC(jd float64, dut1 *float64) (time.Time, error) {
	if os.Getenv("SE_EPHE_PATH") != "" {
		return time.Time{}, nativeError("EPHEMERIS_ENVIRONMENT_CONFLICT")
	}
	if math.IsNaN(jd) || math.IsInf(jd, 0) {
		return time.Time{}, nativeError("INVALID_JULIAN_DAY")
	}
	if dut1 != nil {
		if math.IsNaN(*dut1) || math.IsInf(*dut1, 0) || math.Abs(*dut1) > 0.9 {
			return time.Time{}, nativeError("INVALID_DUT1")
		}
		return JulianDayUTCToTime(jd - *dut1/86400), nil
	}
	return nativeUT1ToUTC(jd)
}

// JulianDayUTCToTime converts a nominal continuous UTC JD; it cannot represent a leap-second label.
func JulianDayUTCToTime(jd float64) time.Time {
	seconds := (jd - 2440587.5) * 86400
	whole, frac := math.Modf(seconds)
	return time.Unix(int64(whole), int64(math.Round(frac*1e9))).UTC()
}
func NativeSnapshot(instant time.Time, config NativeConfig, dut1 *float64, place *NativePlace) (NativeSnapshotResult, error) {
	cfg, err := validateNativeConfig(config, instant)
	if err != nil {
		return NativeSnapshotResult{}, err
	}
	if place != nil && math.Abs(place.Latitude) == 90 {
		return NativeSnapshotResult{}, nativeError("ASCENDANT_UNAVAILABLE_AT_POLE")
	}
	if place != nil && !validNativePlace(*place) {
		return NativeSnapshotResult{}, nativeError("INVALID_COORDINATES")
	}
	epoch, err := ConvertUTC(instant, dut1)
	if err != nil {
		return NativeSnapshotResult{}, err
	}
	result, err := nativeSnapshotAt(epoch, cfg, place)
	if err != nil {
		return NativeSnapshotResult{}, err
	}
	result.AuthorityRole = "DIAGNOSTIC_ONLY"
	if cfg.Mode == "SWISS_FILE" {
		result.AuthorityRole = "PRODUCTION_AUTHORITY"
	}
	result.ContractVersion = NativeContractVersion
	result.Epoch = epoch
	result.RequestedMode = cfg.Mode
	result.SourceCommit = SwissSourceCommit
	result.CoordinateConvention = "GEOCENTRIC_APPARENT_ECLIPTIC_OF_DATE; SWISS_DEFAULT_ABERRATION_NUTATION"
	result.AyanamsaConvention = "SWISS_SE_SIDM_LAHIRI"
	result.ValidationStatus = "NOT_INDEPENDENTLY_VERIFIED"
	result.PrecisionStatus = "NUMERICAL_OUTPUT_NOT_EXTERNAL_ERROR_BUDGET"
	result.Limitations = []string{"Swiss builtin leap seconds and Delta-T are model inputs unless independently sourced DUT1 is supplied.", "Native numerical output is not proof of independent astronomical accuracy or traditional interpretation."}
	if cfg.Mode == "MOSHIER" {
		result.DataFileStatus = "NOT_USED_MOSHIER"
	} else {
		result.DataFileStatus = "CONFIGURED_HASHES_VERIFIED"
		result.DataFileSHA256 = map[string]string{}
		for k, v := range cfg.FileSHA256 {
			result.DataFileSHA256[k] = v
		}
	}
	return result, nil
}
func NativeSolarDay(start, end time.Time, place NativePlace, config NativeConfig, dut1 *float64) (NativeSolarResult, error) {
	if !start.Before(end) || end.Sub(start) < 20*time.Hour || end.Sub(start) > 28*time.Hour {
		return NativeSolarResult{}, nativeError("INVALID_LOCAL_DAY")
	}
	if !validNativePlace(place) {
		return NativeSolarResult{}, nativeError("INVALID_COORDINATES")
	}
	cfg, err := validateNativeConfig(config, start)
	if err != nil {
		return NativeSolarResult{}, err
	}
	epoch, err := ConvertUTC(start, dut1)
	if err != nil {
		return NativeSolarResult{}, err
	}
	result, err := nativeSolarAt(start, end, epoch, place, cfg, dut1)
	result.AuthorityRole = "DIAGNOSTIC_ONLY"
	if cfg.Mode == "SWISS_FILE" {
		result.AuthorityRole = "PRODUCTION_AUTHORITY"
	}
	return result, err
}

// NativeUTCLabel preserves :60 labels which time.Time cannot represent. UTC quasi-JD is not UT1 or TT.
type NativeUTCLabelResult struct {
	UTCLabel          string  `json:"utc_label"`
	JulianDayUTCQuasi float64 `json:"julian_day_utc_quasi"`
	JulianDayTT       float64 `json:"julian_day_tt"`
	JulianDayUT1      float64 `json:"julian_day_ut1"`
	DeltaTSeconds     float64 `json:"delta_t_seconds"`
	DayLengthSeconds  int     `json:"utc_day_length_seconds"`
	LeapSecondLabel   bool    `json:"leap_second_label"`
	UT1Source         string  `json:"ut1_source"`
	TTSource          string  `json:"tt_source"`
	ValidationStatus  string  `json:"validation_status"`
}

var nativeUTCClockPattern = regexp.MustCompile(`^([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9]|60)(\.[0-9]{1,9})?$`)

func ConvertUTCLabel(date, clock string) (NativeUTCLabelResult, error) {
	if os.Getenv("SE_EPHE_PATH") != "" {
		return NativeUTCLabelResult{}, nativeError("EPHEMERIS_ENVIRONMENT_CONFLICT")
	}
	day, err := time.Parse("2006-01-02", date)
	if err != nil || day.Format("2006-01-02") != date || day.Year() < 1800 || day.Year() > 2399 {
		return NativeUTCLabelResult{}, nativeError("INVALID_UTC_DATE")
	}
	parts := nativeUTCClockPattern.FindStringSubmatch(clock)
	if parts == nil {
		return NativeUTCLabelResult{}, nativeError("INVALID_UTC_CLOCK")
	}
	hour, _ := strconv.Atoi(parts[1])
	minute, _ := strconv.Atoi(parts[2])
	seconds, _ := strconv.ParseFloat(parts[3]+parts[4], 64)
	isLeap := seconds >= 60
	if isLeap && (hour != 23 || minute != 59 || day.Year() < 1972 || day.Year() > 2026) {
		return NativeUTCLabelResult{}, nativeError("INVALID_UTC_LEAP_SECOND")
	}
	tt, ut1, err := nativeCalendarToJD(day.Year(), int(day.Month()), day.Day(), hour, minute, seconds)
	if err != nil {
		return NativeUTCLabelResult{}, err
	}
	dayLength := 86400
	if day.Year() >= 1972 && day.Year() <= 2026 {
		if _, _, leapErr := nativeCalendarToJD(day.Year(), int(day.Month()), day.Day(), 23, 59, 60); leapErr == nil {
			dayLength = 86401
		}
	}
	if isLeap && dayLength != 86401 {
		return NativeUTCLabelResult{}, nativeError("INVALID_UTC_LEAP_SECOND")
	}
	quasi := nominalJulianDay(day) + (float64(hour*3600+minute*60)+seconds)/float64(dayLength)
	source := "SWISS_BUILTIN_LEAP_TABLE_NOT_EXTERNALLY_VERIFIED"
	if day.Year() < 1972 {
		source = "SWISS_PRE1972_UTC_AS_UT1_MODEL"
	} else if day.Year() > 2026 {
		source = "SWISS_FUTURE_LEAP_SECONDS_OR_UTC_AS_UT1_MODEL_UNCERTAIN"
	}
	return NativeUTCLabelResult{date + "T" + clock + "Z", quasi, tt, ut1, (tt - ut1) * 86400, dayLength, isLeap, "SWISS_DELTAT_MODEL_ESTIMATE", source, "NOT_INDEPENDENTLY_VERIFIED"}, nil
}
