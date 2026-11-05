//go:build !cgo

package ephemeris

import "fmt"

func computeCelestialPosition(jd float64, id int32) (PlanetData, error) {
	return PlanetData{}, fmt.Errorf("NATIVE_EPHEMERIS_UNAVAILABLE")
}

func NativeAvailable() bool { return false }
