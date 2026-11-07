//go:build cgo

package ephemeris

/*
#cgo LDFLAGS: -lswe -lm -ldl -lstdc++
#include <stdint.h>
typedef struct {double longitude,latitude,speed;int32_t error_code,requested_flags,returned_flags;char warning[256],library_version[256];} PlanetCoordinate;
extern PlanetCoordinate compute_celestial_position_safe(double jd,int32_t id);
#include <stdlib.h>
typedef struct {double tt,ut1;int error;} MMOEpoch;
typedef struct {int year,month,day,hour,minute;double second;int error;} MMOCalendar;
typedef struct {double tropical[6],sidereal[6];int32_t tropical_flags,sidereal_flags;int error;} MMOPlanet;
typedef struct {MMOPlanet planets[9];double ayanamsa;double tropical_ascendant,sidereal_ascendant,cusps[12];char version[256];int error,house_error;} MMOSnapshot;
typedef struct {double rise,set,noon,lower,upper_altitude,lower_altitude,set_after_rise;int rise_status,set_status,noon_status,lower_status,set_after_rise_status;int32_t returned_flags;char version[256];int error;} MMOSolar;
extern MMOEpoch mmo_utc_to_jd(int,int,int,int,int,double);
extern MMOCalendar mmo_ut1_to_utc(double);
extern MMOSnapshot mmo_snapshot(double,double,int32_t,const char*,const char*,int,double,double);
extern MMOSolar mmo_solar(double,int32_t,const char*,const char*,double,double,double);
*/
import "C"
import (
	"fmt"
	"math"
	"time"
	"unsafe"
)

func computeCelestialPosition(jd float64, id int32) (PlanetData, error) {
	c := C.compute_celestial_position_safe(C.double(jd), C.int32_t(id))
	if c.error_code < 0 {
		return PlanetData{}, fmt.Errorf("NATIVE_CALCULATION_FAILED")
	}
	mode := "UNKNOWN"
	switch int32(c.returned_flags) & 7 {
	case 1:
		mode = "JPL"
	case 2:
		mode = "SWISS_FILE"
	case 4:
		mode = "MOSHIER"
	}
	if mode == "UNKNOWN" {
		return PlanetData{}, fmt.Errorf("EPHEMERIS_MODE_UNAVAILABLE")
	}
	return PlanetData{Longitude: float64(c.longitude), Latitude: float64(c.latitude), Velocity: float64(c.speed), RequestedFlags: int32(c.requested_flags), ReturnedFlags: int32(c.returned_flags), EphemerisMode: mode, LibraryVersion: C.GoString(&c.library_version[0]), Warning: C.GoString(&c.warning[0]), Ayanamsa: "SWISS_SE_SIDM_LAHIRI", TimeScale: "UTC_AS_UT"}, nil
}

func NativeAvailable() bool { return true }

func nativeUTCToJD(instant time.Time) (float64, float64, error) {
	return nativeCalendarToJD(instant.Year(), int(instant.Month()), instant.Day(), instant.Hour(), instant.Minute(), float64(instant.Second())+float64(instant.Nanosecond())/1e9)
}
func nativeCalendarToJD(year, month, day, hour, minute int, seconds float64) (float64, float64, error) {
	r := C.mmo_utc_to_jd(C.int(year), C.int(month), C.int(day), C.int(hour), C.int(minute), C.double(seconds))
	if r.error < 0 {
		return 0, 0, nativeError("NATIVE_TIME_CONVERSION_FAILED")
	}
	return float64(r.tt), float64(r.ut1), nil
}
func nativeUT1ToUTC(jd float64) (time.Time, error) {
	r := C.mmo_ut1_to_utc(C.double(jd))
	if r.error < 0 {
		return time.Time{}, nativeError("NATIVE_TIME_CONVERSION_FAILED")
	}
	seconds := float64(r.second)
	if seconds >= 60 {
		return time.Time{}, nativeError("UTC_LEAP_SECOND_REQUIRES_LABEL_API")
	}
	whole, part := math.Modf(seconds)
	return time.Date(int(r.year), time.Month(r.month), int(r.day), int(r.hour), int(r.minute), int(whole), int(math.Round(part*1e9)), time.UTC), nil
}
func nativeModeFromFlags(flags int32) string {
	switch flags & 7 {
	case 1:
		return "JPL"
	case 2:
		return "SWISS_FILE"
	case 4:
		return "MOSHIER"
	}
	return "UNAVAILABLE"
}
func nativeSnapshotAt(epoch NativeEpoch, cfg NativeConfig, place *NativePlace) (NativeSnapshotResult, error) {
	path, jpl := C.CString(cfg.EphemerisPath), C.CString(cfg.JPLFile)
	defer C.free(unsafe.Pointer(path))
	defer C.free(unsafe.Pointer(jpl))
	houses := 0
	lat, lon := 0., 0.
	if place != nil {
		houses = 1
		lat = place.Latitude
		lon = place.Longitude
	}
	r := C.mmo_snapshot(C.double(epoch.JulianDayTT), C.double(epoch.JulianDayUT1), C.int32_t(modeCode(cfg.Mode)), path, jpl, C.int(houses), C.double(lat), C.double(lon))
	if r.error == -2 {
		return NativeSnapshotResult{}, nativeError("EPHEMERIS_MODE_UNAVAILABLE")
	}
	if r.error < 0 {
		return NativeSnapshotResult{}, nativeError("NATIVE_CALCULATION_FAILED")
	}
	result := NativeSnapshotResult{ActualMode: cfg.Mode, LibraryVersion: C.GoString(&r.version[0]), AyanamsaDegrees: float64(r.ayanamsa), Planets: map[string]NativePlanet{}}
	names := []string{"sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "mean_node", "true_node"}
	for i, name := range names {
		p := r.planets[i]
		definition := "GEOCENTRIC_APPARENT_BODY"
		if name == "mean_node" {
			definition = "MEAN_LUNAR_ASCENDING_NODE"
		}
		if name == "true_node" {
			definition = "OSCULATING_TRUE_LUNAR_ASCENDING_NODE"
		}
		result.Planets[name] = NativePlanet{TropicalLongitude: float64(p.tropical[0]), SiderealLongitude: float64(p.sidereal[0]), Latitude: float64(p.tropical[1]), DistanceAU: float64(p.tropical[2]), LongitudeSpeed: float64(p.tropical[3]), LatitudeSpeed: float64(p.tropical[4]), DistanceSpeed: float64(p.tropical[5]), SiderealLongitudeSpeed: float64(p.sidereal[3]), Retrograde: float64(p.tropical[3]) < 0, RequestedFlags: modeCode(cfg.Mode) | 256, ReturnedFlags: int32(p.tropical_flags), SiderealReturnedFlags: int32(p.sidereal_flags), Definition: definition}
	}
	if place != nil && r.house_error == 0 {
		h := &NativeHouses{TropicalAscendant: float64(r.tropical_ascendant), SiderealAscendant: float64(r.sidereal_ascendant), System: "WHOLE_SIGN_SWISS_W"}
		for i := 0; i < 12; i++ {
			h.SiderealCusps[i] = float64(r.cusps[i])
		}
		result.Houses = h
	}
	return result, nil
}
func nativeSolarAt(start, end time.Time, epoch NativeEpoch, place NativePlace, cfg NativeConfig, dut1 *float64) (NativeSolarResult, error) {
	path, jpl := C.CString(cfg.EphemerisPath), C.CString(cfg.JPLFile)
	defer C.free(unsafe.Pointer(path))
	defer C.free(unsafe.Pointer(jpl))
	r := C.mmo_solar(C.double(epoch.JulianDayUT1), C.int32_t(modeCode(cfg.Mode)), path, jpl, C.double(place.Latitude), C.double(place.Longitude), C.double(place.ElevationMeters))
	if r.error == -2 {
		return NativeSolarResult{}, nativeError("EPHEMERIS_MODE_UNAVAILABLE")
	}
	if r.error < 0 || r.rise_status == -1 || r.set_status == -1 {
		return NativeSolarResult{}, nativeError("NATIVE_SOLAR_CALCULATION_FAILED")
	}
	out := NativeSolarResult{ContractVersion: NativeContractVersion, Status: "EVENTS_AVAILABLE", RequestedMode: cfg.Mode, ActualMode: nativeModeFromFlags(int32(r.returned_flags)), LibraryVersion: C.GoString(&r.version[0]), Refraction: "SWISS_PRESSURE_FROM_ELEVATION_TEMPERATURE_15_C_NOT_OBSERVED", SolarLimb: "UPPER_LIMB_WITH_SWISS_SOLAR_SEMIDIAMETER", ElevationMeters: place.ElevationMeters, ValidationStatus: "NOT_INDEPENDENTLY_VERIFIED", Limitations: []string{"Solar event atmospheric/elevation models are explicit assumptions, not measured weather.", "Swiss rise/transit uses its internal Delta-T model; convergence does not prove external sub-minute accuracy."}}
	convert := func(jd float64, status C.int) *time.Time {
		if status < 0 {
			return nil
		}
		instant, err := UT1ToUTC(jd, dut1)
		if err != nil || instant.Before(start) || !instant.Before(end) {
			return nil
		}
		return &instant
	}
	out.Sunrise = convert(float64(r.rise), r.rise_status)
	out.Sunset = convert(float64(r.set), r.set_status)
	out.Noon = convert(float64(r.noon), r.noon_status)

	out.DaylightIntervals = []NativeUTCInterval{}
	if out.Sunrise == nil || out.Sunset == nil {
		out.Status = "SOLAR_EVENT_UNAVAILABLE"
		if r.rise_status == -2 && r.set_status == -2 {
			if float64(r.lower_altitude) > 0 {
				out.Status = "POLAR_DAY"
				out.DaylightIntervals = append(out.DaylightIntervals, NativeUTCInterval{start, end})
			} else if float64(r.upper_altitude) < -0.833333333333 {
				out.Status = "POLAR_NIGHT"
			}
		} else if out.Sunrise != nil {
			out.Status = "SUNRISE_ONLY"
			out.DaylightIntervals = append(out.DaylightIntervals, NativeUTCInterval{*out.Sunrise, end})
		} else if out.Sunset != nil {
			out.Status = "SUNSET_ONLY"
			out.DaylightIntervals = append(out.DaylightIntervals, NativeUTCInterval{start, *out.Sunset})
		}
	} else if out.Sunrise.Before(*out.Sunset) {
		out.DaylightIntervals = append(out.DaylightIntervals, NativeUTCInterval{*out.Sunrise, *out.Sunset})
	} else {
		out.Status = "DAYLIGHT_CROSSES_MIDNIGHT"
		out.DaylightIntervals = append(out.DaylightIntervals, NativeUTCInterval{start, *out.Sunset}, NativeUTCInterval{*out.Sunrise, end})
	}
	if out.Status != "SOLAR_EVENT_UNAVAILABLE" {
		seconds := 0.
		for _, interval := range out.DaylightIntervals {
			seconds += interval.End.Sub(interval.Start).Seconds()
		}
		out.DaylightSeconds = &seconds
	}
	if out.Sunrise != nil && r.set_after_rise_status >= 0 {
		following, err := UT1ToUTC(float64(r.set_after_rise), dut1)
		if err == nil && following.After(*out.Sunrise) && following.Sub(*out.Sunrise) < 48*time.Hour {
			out.SunsetAfterSunrise = &following
			seconds := following.Sub(*out.Sunrise).Seconds()
			out.SunriseToSunsetSeconds = &seconds
		}
	}
	out.Limitations = append(out.Limitations, "Daylight duration is the union clipped to the requested civil day; sunset_after_sunrise may fall on the following civil date. Flat astronomical horizon, no terrain or observed weather.")

	return out, nil
}
