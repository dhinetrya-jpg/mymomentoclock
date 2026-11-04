//go:build !cgo

package main

import (
	"math"
)

// computeRootCelestialPosition computes sidereal Lahiri coordinates using pure Go calculation without CGO
func computeRootCelestialPosition(julianDay float64, planetID int32) (PlanetData, error) {
	d := julianDay - 2451545.0 // Days since J2000.0
	t := d / 36525.0           // Julian centuries

	ayanamsa := 23.85 + (d * 0.000038)

	var meanLong float64
	var speed float64

	switch planetID {
	case 0: // Sun
		meanLong = 280.46646 + 36000.76983*t
		speed = 0.9856
	case 1: // Moon
		meanLong = 218.3165 + 481267.8813*t
		speed = 13.1763
	case 4: // Mars
		meanLong = 355.433 + 19140.2993*t
		speed = 0.5240
	case 6: // Saturn
		meanLong = 50.077 + 1222.1138*t
		speed = 0.0335
	default:
		meanLong = 100.0 + 3600.0*t
		speed = 1.0
	}

	siderealLong := math.Mod(meanLong-ayanamsa, 360.0)
	if siderealLong < 0 {
		siderealLong += 360.0
	}

	return PlanetData{
		Longitude: siderealLong,
		Velocity:  speed,
	}, nil
}
