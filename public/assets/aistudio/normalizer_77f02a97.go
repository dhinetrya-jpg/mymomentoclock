//go:build ignore

package ephemeris

/*
#cgo LDFLAGS: -lswef -lm
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
	"encoding/json"
	"fmt"
	"runtime"
	"time"
)

type NormalizationRequest struct {
	BirthDate string  `json:"birth_date"`
	BirthTime string  `json:"birth_time"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type PlanetData struct {
	Longitude float64 `json:"longitude"`
	Velocity  float64 `json:"velocity"`
}

type NormalizedPayload struct {
	JulianDayUtc    float64               `json:"julian_day_utc"`
	NormalizedTime  time.Time             `json:"normalized_time_utc"`
	SystemTimestamp int64                 `json:"system_timestamp"`
	Coordinates     map[string]PlanetData `json:"coordinates"`
}

func CalculateJulianDay(t time.Time) float64 {
	year, month, day := t.Date()
	hour := float64(t.Hour()) + float64(t.Minute())/60.0 + float64(t.Second())/3600.0
	m := int(month)
	if m <= 2 {
		year--
		m += 12
	}
	A := year / 100
	B := A / 4
	C_val := 2 - A + B
	E := int(365.25 * float64(year+4716))
	F := int(30.6001 * float64(m+1))
	return float64(C_val) + float64(day) + float64(E) + float64(F) + (hour / 24.0) - 1524.5
}

func ExecuteNormalization(req NormalizationRequest, tzLocation string) ([]byte, error) {
	loc, err := time.LoadLocation(tzLocation)
	if err != nil { return nil, err }
	localTime, err := time.ParseInLocation("2006-01-02 15:04:05", req.BirthDate+" "+req.BirthTime, loc)
	if err != nil { return nil, err }
	utcTime := localTime.UTC()
	julianDay := CalculateJulianDay(utcTime)

	planetsMap := make(map[string]PlanetData)
	targetPlanets := map[string]int32{"sun": 0, "moon": 1, "mars": 4, "saturn": 6}

	// Lock OS Thread to guarantee thread-safe FFI evaluation under massive concurrency
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	for name, id := range targetPlanets {
		cCoord := C.compute_celestial_position_safe(C.double(julianDay), C.int32_t(id))
		if cCoord.error_code < 0 {
			return nil, fmt.Errorf("ephemeris mathematical calculation fault: %d", cCoord.error_code)
		}
		planetsMap[name] = PlanetData{
			Longitude: float64(cCoord.longitude),
			Velocity:  float64(cCoord.speed),
		}
	}
	payload := NormalizedPayload{
		JulianDayUtc:    julianDay,
		NormalizedTime:  utcTime,
		SystemTimestamp: time.Now().UnixNano(),
		Coordinates:     planetsMap,
	}
	return json.Marshal(payload)
}
