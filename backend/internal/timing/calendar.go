package timing

import (
	"astroengine-core/backend/internal/ephemeris"
	"errors"
	"math"
	"strings"
	"time"
	_ "time/tzdata"
)

func problem(code string) error { return errors.New(code) }
func validPlace(p Place) bool {
	if p.Latitude == nil || p.Longitude == nil || math.IsNaN(*p.Latitude) || math.IsInf(*p.Latitude, 0) || math.Abs(*p.Latitude) > 90 || math.IsNaN(*p.Longitude) || math.IsInf(*p.Longitude, 0) || math.Abs(*p.Longitude) > 180 {
		return false
	}
	if p.Timezone == "" || p.Timezone == "Local" || len(p.Timezone) > 100 || strings.TrimSpace(p.Timezone) != p.Timezone {
		return false
	}
	_, err := time.LoadLocation(p.Timezone)
	return err == nil
}
func parseDate(s string, min, max int) (time.Time, error) {
	t, err := time.Parse("2006-01-02", s)
	if err != nil || t.Format("2006-01-02") != s || t.Year() < min || t.Year() > max {
		return time.Time{}, problem("INVALID_DATE")
	}
	return t, nil
}

// LocalDay uses civil midnight boundaries, not start+24h. Unresolvable midnight transitions fail closed.
func LocalDay(target Target) (Day, error) {
	if !validPlace(target.Place) {
		return Day{}, problem("INVALID_LOCATION")
	}
	date, err := parseDate(target.Date, 2000, 2100)
	if err != nil {
		return Day{}, err
	}
	resolve := func(date string) (time.Time, error) {
		return ephemeris.ParseBirth(ephemeris.NormalizationRequest{BirthDate: date, BirthTime: "00:00:00", Timezone: target.Timezone, Latitude: target.Latitude, Longitude: target.Longitude}, "")
	}
	start, err := resolve(target.Date)
	if err != nil {
		return Day{}, problem("LOCAL_DAY_UNAVAILABLE")
	}
	end, err := resolve(date.AddDate(0, 0, 1).Format("2006-01-02"))
	if err != nil || !end.After(start) || end.Sub(start) < 20*time.Hour || end.Sub(start) > 28*time.Hour {
		return Day{}, problem("LOCAL_DAY_UNAVAILABLE")
	}
	return Day{Interval{start, end}, target.Date, target.Timezone, int64(end.Sub(start) / time.Second)}, nil
}
func Validate(req Request) (Validated, error) {
	v := Validated{Request: req}
	if req.SchemaVersion != 1 || req.RuleVersion != RuleVersion || !supportedActivity(req.Activity) {
		return v, problem("UNSUPPORTED_TIMING_REQUEST")
	}
	if req.EphemerisMode != "MOSHIER" && req.EphemerisMode != "SWISS_FILE" && req.EphemerisMode != "JPL" {
		return v, problem("UNSUPPORTED_EPHEMERIS_MODE")
	}
	if !validPlace(req.Birth.Place) {
		return v, problem("INVALID_BIRTH_LOCATION")
	}
	_, err := parseDate(req.Birth.Date, 1900, 2100)
	if err != nil {
		return v, problem("INVALID_BIRTH_DATE")
	}
	v.Day, err = LocalDay(req.Target)
	if err != nil {
		return v, err
	}
	if req.Birth.Certainty == "UNKNOWN" {
		if req.Birth.Time != "" || req.Birth.UTCOffset != nil || req.Birth.UncertaintyMinutes != 0 {
			return v, problem("INVALID_BIRTH_UNCERTAINTY")
		}
		return v, nil
	}
	if req.Birth.Certainty != "EXACT" && req.Birth.Certainty != "APPROXIMATE" {
		return v, problem("INVALID_BIRTH_CERTAINTY")
	}
	if req.Birth.Certainty == "EXACT" && req.Birth.UncertaintyMinutes != 0 || req.Birth.Certainty == "APPROXIMATE" && (req.Birth.UncertaintyMinutes < 1 || req.Birth.UncertaintyMinutes > 1440) {
		return v, problem("INVALID_BIRTH_UNCERTAINTY")
	}
	v.BirthUTC, err = ephemeris.ParseBirth(ephemeris.NormalizationRequest{BirthDate: req.Birth.Date, BirthTime: req.Birth.Time, Timezone: req.Birth.Timezone, TimezoneOffset: req.Birth.UTCOffset, Latitude: req.Birth.Latitude, Longitude: req.Birth.Longitude, BirthTimeCertainty: req.Birth.Certainty}, "")
	if err != nil {
		return v, err
	}
	if !v.BirthUTC.Before(v.Day.End) {
		return v, problem("BIRTH_AFTER_TARGET")
	}
	return v, nil
}
