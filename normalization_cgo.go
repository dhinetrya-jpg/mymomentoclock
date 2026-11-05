//go:build cgo

package main

/*
#cgo LDFLAGS: -lswe -lm -ldl -lstdc++
#include <stdint.h>
typedef struct {double longitude,latitude,speed;int32_t error_code,requested_flags,returned_flags;char warning[256],library_version[256];} PlanetCoordinate;
extern PlanetCoordinate compute_celestial_position_safe(double jd,int32_t id);
*/
import "C"
import "fmt"

func computeRootCelestialPosition(jd float64, id int32) (PlanetData, error) {
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
	return PlanetData{Longitude: float64(c.longitude), Latitude: float64(c.latitude), Velocity: float64(c.speed), RequestedFlags: int32(c.requested_flags), ReturnedFlags: int32(c.returned_flags), EphemerisMode: mode, LibraryVersion: C.GoString(&c.library_version[0]), Warning: C.GoString(&c.warning[0]), Ayanamsa: "TRUE_LAHIRI", TimeScale: "UTC_AS_UT"}, nil
}

func NativeAvailable() bool { return true }
