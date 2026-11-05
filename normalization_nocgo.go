//go:build !cgo

package main

import "fmt"

func computeRootCelestialPosition(jd float64, id int32) (PlanetData, error) {
	return PlanetData{}, fmt.Errorf("NATIVE_EPHEMERIS_UNAVAILABLE")
}

func NativeAvailable() bool { return false }
