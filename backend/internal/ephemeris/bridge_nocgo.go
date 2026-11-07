//go:build !cgo

package ephemeris

import (
	"fmt"
	"time"
)

func computeCelestialPosition(jd float64, id int32) (PlanetData, error) {
	return PlanetData{}, fmt.Errorf("NATIVE_EPHEMERIS_UNAVAILABLE")
}

func NativeAvailable() bool { return false }

func nativeUTCToJD(time.Time) (float64, float64, error) {
	return 0, 0, nativeError("NATIVE_EPHEMERIS_UNAVAILABLE")
}
func nativeUT1ToUTC(float64) (time.Time, error) {
	return time.Time{}, nativeError("NATIVE_EPHEMERIS_UNAVAILABLE")
}
func nativeSnapshotAt(NativeEpoch, NativeConfig, *NativePlace) (NativeSnapshotResult, error) {
	return NativeSnapshotResult{}, nativeError("NATIVE_EPHEMERIS_UNAVAILABLE")
}
func nativeSolarAt(time.Time, time.Time, NativeEpoch, NativePlace, NativeConfig, *float64) (NativeSolarResult, error) {
	return NativeSolarResult{}, nativeError("NATIVE_EPHEMERIS_UNAVAILABLE")
}

func nativeCalendarToJD(int, int, int, int, int, float64) (float64, float64, error) {
	return 0, 0, nativeError("NATIVE_EPHEMERIS_UNAVAILABLE")
}
