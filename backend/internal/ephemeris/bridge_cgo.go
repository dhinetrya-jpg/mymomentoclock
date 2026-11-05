//go:build cgo

package ephemeris

/*
#cgo LDFLAGS: -lswe -lm
#include <stdint.h>
typedef struct {
    double longitude;
    double latitude;
    double speed;
    int32_t error_code;
} PlanetCoordinate;
extern PlanetCoordinate compute_celestial_position_safe(double julian_day, int32_t planet_id);
*/
import "C"

import (
	"fmt"
	"runtime"
)

func computeCelestialPosition(julianDay float64, planetID int32) (PlanetData, error) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	cCoord := C.compute_celestial_position_safe(C.double(julianDay), C.int32_t(planetID))
	if cCoord.error_code < 0 {
		return PlanetData{}, fmt.Errorf("error code: %d", cCoord.error_code)
	}
	return PlanetData{
		Longitude: float64(cCoord.longitude),
		Velocity:  float64(cCoord.speed),
	}, nil
}
