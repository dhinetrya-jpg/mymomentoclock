//go:build cgo

package ephemeris

import (
	"encoding/json"
	"math"
	"sync"
	"testing"
	"time"
)

// These are linked-native operation/invariant tests, not independent numerical acceptance.
func TestCanonicalNativeEpochAndBodies(t *testing.T) {
	epoch := time.Date(2000, 1, 1, 11, 58, 55, 816000000, time.UTC)
	converted, err := ConvertUTC(epoch, nil)
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs(converted.JulianDayTT-2451545) > 2e-9 || converted.JulianDayUT1 == converted.JulianDayTT || converted.TTSource != "SWISS_BUILTIN_LEAP_TABLE_NOT_EXTERNALLY_VERIFIED" {
		t.Fatal("time-scale conflation", converted)
	}
	dut1 := 0.355
	withDUT1, err := ConvertUTC(epoch, &dut1)
	if err != nil || math.Abs(withDUT1.DUT1Seconds-dut1) > 0.0001 {
		t.Fatal(withDUT1, err)
	}
	roundtrip, err := UT1ToUTC(withDUT1.JulianDayUT1, &dut1)
	if err != nil || math.Abs(roundtrip.Sub(epoch).Seconds()) > 0.0001 {
		t.Fatal("DUT1 inverse", roundtrip, err)
	}
	utc := time.Date(2000, 1, 1, 12, 0, 0, 0, time.UTC)
	place := NativePlace{Latitude: 22.57, Longitude: 88.36}
	for _, config := range []NativeConfig{{Mode: "MOSHIER"}, nativeTestFileConfig(t)} {
		out, err := NativeSnapshot(utc, config, nil, &place)
		if err != nil {
			t.Fatal(config.Mode, err)
		}
		if out.ActualMode != config.Mode || out.RequestedMode != config.Mode || len(out.Planets) != 9 || out.LibraryVersion != "2.10.03" || out.ValidationStatus != "NOT_INDEPENDENTLY_VERIFIED" || out.Houses == nil {
			t.Fatal(out)
		}
		for name, p := range out.Planets {
			if p.TropicalLongitude < 0 || p.TropicalLongitude >= 360 || p.SiderealLongitude < 0 || p.SiderealLongitude >= 360 || math.Abs(p.Latitude) > 90 || math.IsNaN(p.DistanceAU) || p.Retrograde != (p.LongitudeSpeed < 0) || nativeModeFromFlags(p.ReturnedFlags) != config.Mode || nativeModeFromFlags(p.SiderealReturnedFlags) != config.Mode {
				t.Fatal(name, p)
			}
		}
		b, _ := json.Marshal(out)
		t.Log(string(b))
	}
}
func TestNativeFileIntegrityAndNoFallback(t *testing.T) {
	config := nativeTestFileConfig(t)
	config.FileSHA256["sepl_18.se1"] = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	if _, err := NativeSnapshot(time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC), config, nil, nil); err == nil || err.Error() != "EPHEMERIS_CHECKSUM_MISMATCH" {
		t.Fatal("changed data admitted", err)
	}
	config = nativeTestFileConfig(t)
	config.JPLFile = "missing-kernel.eph"
	config.Mode = "JPL"
	config.FileSHA256[config.JPLFile] = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
	if _, err := NativeSnapshot(time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC), config, nil, nil); err == nil {
		t.Fatal("absent local JPL silently substituted")
	}
}
func TestNativeConcurrentModeIsolation(t *testing.T) {
	utc := time.Date(2024, 3, 20, 12, 0, 0, 0, time.UTC)
	moshier := NativeConfig{Mode: "MOSHIER"}
	file := nativeTestFileConfig(t)
	a, err := NativeSnapshot(utc, moshier, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	b, err := NativeSnapshot(utc, file, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	legacy, err := computeCelestialPosition(2451545, 0)
	if err != nil {
		t.Fatal(err)
	}
	var wg sync.WaitGroup
	for i := 0; i < 16; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			cfg, want := moshier, a
			if i%2 == 1 {
				cfg, want = file, b
			}
			got, err := NativeSnapshot(utc, cfg, nil, nil)
			if err != nil || got.ActualMode != cfg.Mode || got.Planets["moon"].TropicalLongitude != want.Planets["moon"].TropicalLongitude {
				t.Errorf("mode leakage: %s %v", cfg.Mode, err)
			}
			p, e := computeCelestialPosition(2451545, 0)
			if e != nil || p.Longitude != legacy.Longitude || p.ReturnedFlags != legacy.ReturnedFlags {
				t.Errorf("legacy state leakage %v", e)
			}
		}(i)
	}
	wg.Wait()
}
func TestNativeSolarEventsAndPolar(t *testing.T) {
	for _, x := range []struct {
		zone, date string
		place      NativePlace
		status     string
	}{{"Asia/Kolkata", "2024-03-20", NativePlace{Latitude: 22.57, Longitude: 88.36}, "EVENTS_AVAILABLE"}, {"America/New_York", "2026-03-08", NativePlace{Latitude: 40.71, Longitude: -74}, "EVENTS_AVAILABLE"}, {"Arctic/Longyearbyen", "2024-06-21", NativePlace{Latitude: 78.22, Longitude: 15.65}, "POLAR_DAY"}, {"Arctic/Longyearbyen", "2024-12-21", NativePlace{Latitude: 78.22, Longitude: 15.65}, "POLAR_NIGHT"}} {
		loc, err := time.LoadLocation(x.zone)
		if err != nil {
			t.Fatal(err)
		}
		date, err := time.ParseInLocation("2006-01-02", x.date, loc)
		if err != nil {
			t.Fatal(err)
		}
		start, end := date.UTC(), date.AddDate(0, 0, 1).UTC()
		out, err := NativeSolarDay(start, end, x.place, NativeConfig{Mode: "MOSHIER"}, nil)
		if err != nil || out.Status != x.status {
			t.Fatal(x.zone, out, err)
		}
		if x.status == "EVENTS_AVAILABLE" && (out.Sunrise == nil || out.Sunset == nil || out.Noon == nil || out.DaylightSeconds == nil || *out.DaylightSeconds <= 0) {
			t.Fatal(out)
		}
		if x.status != "EVENTS_AVAILABLE" && (out.Sunrise != nil || out.Sunset != nil) {
			t.Fatal("invented polar events", out)
		}
		b, _ := json.Marshal(out)
		t.Log(x.zone, string(b))
	}
}

func TestNativeUTCLeapLabels(t *testing.T) {
	label, err := ConvertUTCLabel("1994-06-30", "23:59:60.13599")
	if err != nil {
		t.Fatal(err)
	}
	if label.UTCLabel != "1994-06-30T23:59:60.13599Z" || label.DayLengthSeconds != 86401 || !label.LeapSecondLabel || label.JulianDayTT == label.JulianDayUTCQuasi || label.JulianDayUT1 == label.JulianDayUTCQuasi {
		t.Fatal("leap label conflated", label)
	}
	before, err := ConvertUTCLabel("1994-06-30", "23:59:59.13599")
	if err != nil {
		t.Fatal(err)
	}
	after, err := ConvertUTCLabel("1994-07-01", "00:00:00.13599")
	if err != nil {
		t.Fatal(err)
	}
	if math.Abs((label.JulianDayTT-before.JulianDayTT)*86400-1) > 0.0001 || math.Abs((after.JulianDayTT-label.JulianDayTT)*86400-1) > 0.0001 {
		t.Fatal("TT not continuous across leap", before, label, after)
	}
	for _, x := range []struct{ date, clock string }{{"1994-06-29", "23:59:60.13599"}, {"2000-01-01", "12:00:60"}, {"2016-12-31", "23:59:61"}, {"2027-12-31", "23:59:60"}, {"1900-02-29", "12:00:00"}} {
		if _, err := ConvertUTCLabel(x.date, x.clock); err == nil {
			t.Fatal("invalid leap/calendar accepted", x)
		}
	}
	encoded, _ := json.Marshal(label)
	t.Log(string(encoded))
}
func TestNativeCrossMidnightDaylight(t *testing.T) {
	loc, err := time.LoadLocation("America/Anchorage")
	if err != nil {
		t.Fatal(err)
	}
	date := time.Date(2024, 6, 21, 0, 0, 0, 0, loc)
	start, end := date.UTC(), date.AddDate(0, 0, 1).UTC()
	out, err := NativeSolarDay(start, end, NativePlace{Latitude: 64.8378, Longitude: -147.7164}, NativeConfig{Mode: "MOSHIER"}, nil)
	if err != nil || out.Status != "DAYLIGHT_CROSSES_MIDNIGHT" || len(out.DaylightIntervals) != 2 || out.SunsetAfterSunrise == nil || !out.SunsetAfterSunrise.After(end) || out.DaylightSeconds == nil {
		t.Fatal(out, err)
	}
	seconds := 0.
	for _, interval := range out.DaylightIntervals {
		if interval.Start.Before(start) || interval.End.After(end) || !interval.Start.Before(interval.End) {
			t.Fatal("unclipped daylight", interval)
		}
		seconds += interval.End.Sub(interval.Start).Seconds()
	}
	if math.Abs(seconds-*out.DaylightSeconds) > 0.0001 {
		t.Fatal("daylight duration mismatch")
	}
	encoded, _ := json.Marshal(out)
	t.Log(string(encoded))
}
