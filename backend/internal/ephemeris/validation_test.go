package ephemeris

import (
	"math"
	"strings"
	"testing"
	"time"
)

func number(v float64) *float64 { return &v }
func validBirth() NormalizationRequest {
	return NormalizationRequest{BirthDate: "2000-01-01", BirthTime: "17:30:00", Latitude: number(0), Longitude: number(0), Timezone: "Asia/Kolkata"}
}
func TestBirthValidation(t *testing.T) {
	cases := []struct {
		name, code string
		change     func(*NormalizationRequest)
	}{
		{"missing date", "MISSING_REQUIRED_BIRTH_DATA", func(r *NormalizationRequest) { r.BirthDate = "" }},
		{"missing time", "MISSING_REQUIRED_BIRTH_DATA", func(r *NormalizationRequest) { r.BirthTime = "" }},
		{"missing coordinates", "MISSING_REQUIRED_BIRTH_DATA", func(r *NormalizationRequest) { r.Latitude = nil }},
		{"invalid leap day", "INVALID_BIRTH_DATE", func(r *NormalizationRequest) { r.BirthDate = "1900-02-29" }},
		{"invalid time", "INVALID_BIRTH_TIME", func(r *NormalizationRequest) { r.BirthTime = "25:90:00" }},
		{"invalid latitude", "INVALID_COORDINATES", func(r *NormalizationRequest) { r.Latitude = number(120) }},
		{"nan", "INVALID_COORDINATES", func(r *NormalizationRequest) { r.Longitude = number(math.NaN()) }},
		{"infinity", "INVALID_TIMEZONE", func(r *NormalizationRequest) { r.TimezoneOffset = number(math.Inf(1)) }},
		{"unknown time", "BIRTH_TIME_UNKNOWN", func(r *NormalizationRequest) { r.BirthTimeCertainty = "UNKNOWN" }},
		{"missing zone", "INVALID_TIMEZONE", func(r *NormalizationRequest) { r.Timezone = "" }},
		{"machine-local zone", "INVALID_TIMEZONE", func(r *NormalizationRequest) { r.Timezone = "Local" }},
		{"invalid zone", "INVALID_TIMEZONE", func(r *NormalizationRequest) { r.Timezone = "Mars/Olympus" }},
		{"DST gap", "NONEXISTENT_LOCAL_TIME", func(r *NormalizationRequest) {
			r.BirthDate = "2026-03-08"
			r.BirthTime = "02:30:00"
			r.Timezone = "America/New_York"
		}},
		{"DST fold", "AMBIGUOUS_LOCAL_TIME", func(r *NormalizationRequest) {
			r.BirthDate = "2026-11-01"
			r.BirthTime = "01:30:00"
			r.Timezone = "America/New_York"
		}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := validBirth()
			c.change(&r)
			_, err := ParseBirth(r, "")
			if err == nil || !strings.Contains(err.Error(), c.code) {
				t.Fatalf("expected %s, got %v", c.code, err)
			}
		})
	}
}
func TestTimezoneArithmetic(t *testing.T) {
	for _, c := range []struct {
		date, clock, zone string
		offset            *float64
		want              string
	}{
		{"2000-01-01", "17:30:00", "Asia/Kolkata", nil, "2000-01-01T12:00:00Z"},
		{"2000-01-01", "17:45:00", "Asia/Kathmandu", nil, "2000-01-01T12:00:00Z"},
		{"2000-01-01", "00:15:00", "", number(-3.5), "2000-01-01T03:45:00Z"},
		{"2000-01-01", "00:00:00", "", number(14), "1999-12-31T10:00:00Z"},
		{"2000-02-29", "00:00:00", "UTC", nil, "2000-02-29T00:00:00Z"},
		{"2026-11-01", "01:30:00", "America/New_York", number(-4), "2026-11-01T05:30:00Z"},
		{"2026-11-01", "01:30:00", "America/New_York", number(-5), "2026-11-01T06:30:00Z"},
	} {
		r := validBirth()
		r.BirthDate = c.date
		r.BirthTime = c.clock
		r.Timezone = c.zone
		r.TimezoneOffset = c.offset
		got, err := ParseBirth(r, "")
		if err != nil || got.Format(time.RFC3339) != c.want {
			t.Fatalf("%+v: %s %v", c, got, err)
		}
	}
}
