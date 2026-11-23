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

func TestNativeEpochWithIERSNoonDUT1(t *testing.T) {
	// IERS EOP 20u24 C04, MJD 51544.50, and the USNO TAI-UTC history.
	const nominalUTCJD = 2451545.0
	const dut1 = 0.3550132
	const ttMinusUTC = 64.184
	utc := time.Date(2000, 1, 1, 12, 0, 0, 0, time.UTC)

	epoch, err := ConvertUTC(utc, nil)
	if err != nil {
		t.Fatal(err)
	}
	suppliedDUT1 := dut1
	observedClock, err := ConvertUTC(utc, &suppliedDUT1)
	if err != nil {
		t.Fatal(err)
	}
	wantUT1 := float64(nominalUTCJD + dut1/86400)
	wantTT := float64(nominalUTCJD + ttMinusUTC/86400)
	if observedClock.JulianDayUTC != nominalUTCJD ||
		observedClock.JulianDayUT1 != wantUT1 ||
		observedClock.JulianDayTT != wantTT ||
		observedClock.JulianDayTT != epoch.JulianDayTT {
		t.Fatalf("unexpected Julian days: UTC %.17g, UT1 %.17g (want %.17g), TT %.17g (want %.17g)",
			observedClock.JulianDayUTC, observedClock.JulianDayUT1, wantUT1, observedClock.JulianDayTT, wantTT)
	}
	if observedClock.UT1Source != "CALLER_SUPPLIED_DUT1_NOT_INDEPENDENTLY_VERIFIED" ||
		observedClock.TTSource != "SWISS_BUILTIN_LEAP_TABLE_NOT_EXTERNALLY_VERIFIED" {
		t.Fatalf("unexpected input provenance: UT1=%s, TT=%s", observedClock.UT1Source, observedClock.TTSource)
	}
	// Subtracting the recorded Julian dates to recover offsets exposes the
	// original rounding at the Julian date's scale (about 40 microseconds/ULP).
	halfULPSeconds := (math.Nextafter(nominalUTCJD, math.Inf(1)) - nominalUTCJD) * 86400 / 2
	if math.Abs(observedClock.DUT1Seconds-dut1) > halfULPSeconds ||
		math.Abs(observedClock.TTMinusUTCSeconds-ttMinusUTC) > halfULPSeconds {
		t.Fatalf("offset loss exceeds a half ULP: DUT1=%.12f, TT-UTC=%.12f",
			observedClock.DUT1Seconds, observedClock.TTMinusUTCSeconds)
	}
	t.Logf("UTC %.17g, UT1 %.17g, TT %.17g; DUT1 %.12f s, TT-UTC %.12f s",
		observedClock.JulianDayUTC, observedClock.JulianDayUT1, observedClock.JulianDayTT,
		observedClock.DUT1Seconds, observedClock.TTMinusUTCSeconds)
}

func TestObservedAndModeledClockDiagnostic(t *testing.T) {
	// IERS C04 noon rows and USNO leap history pinned in release evidence.
	const secondsPerDay = 86400
	cases := []struct {
		utc         time.Time
		utcJD       float64
		observedDUT float64
		ttMinusUTC  float64
	}{
		{time.Date(2000, 1, 1, 12, 0, 0, 0, time.UTC), 2451545, 0.3550132, 64.184},
		{time.Date(2007, 4, 5, 12, 0, 0, 0, time.UTC), 2454196, -0.0721024, 65.184},
	}
	for _, fixture := range cases {
		t.Run(fixture.utc.Format(time.DateOnly), func(t *testing.T) {
			modeled, err := ConvertUTC(fixture.utc, nil)
			if err != nil {
				t.Fatal(err)
			}
			observed, err := ConvertUTC(fixture.utc, &fixture.observedDUT)
			if err != nil {
				t.Fatal(err)
			}
			if modeled.UT1Source != "SWISS_DELTAT_MODEL_ESTIMATE" ||
				observed.UT1Source != "CALLER_SUPPLIED_DUT1_NOT_INDEPENDENTLY_VERIFIED" {
				t.Fatalf("unexpected UT1 sources: %s, %s", modeled.UT1Source, observed.UT1Source)
			}
			halfULP := (math.Nextafter(fixture.utcJD, math.Inf(1)) - fixture.utcJD) * secondsPerDay / 2
			ut1Rounding := (observed.JulianDayUT1-fixture.utcJD)*secondsPerDay - fixture.observedDUT
			ttRounding := (modeled.JulianDayTT-fixture.utcJD)*secondsPerDay - fixture.ttMinusUTC
			if math.Abs(ut1Rounding) > halfULP || math.Abs(ttRounding) > halfULP ||
				modeled.JulianDayTT != observed.JulianDayTT {
				t.Fatalf("clock conversion exceeded representation bound: UT1 %.12f s, TT %.12f s", ut1Rounding, ttRounding)
			}
			modelResidual := (modeled.JulianDayUT1-fixture.utcJD)*secondsPerDay - fixture.observedDUT
			t.Logf("modeled minus observed UT1 %+.9f s; override rounding %+.9f s; TT rounding %+.9f s; rotation-input sensitivity %+.9f arcsec",
				modelResidual, ut1Rounding, ttRounding, modelResidual*15.041)
		})
	}
}
