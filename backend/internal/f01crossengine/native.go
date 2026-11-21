package crossengine

import (
	"astroengine-core/backend/internal/astronomy"
	"astroengine-core/backend/internal/ephemeris"
	"errors"
	"time"
)

func NativeCalculator(config ephemeris.NativeConfig) func(Case) (NativeResult, error) {
	return func(v Case) (NativeResult, error) {
		if err := astronomy.RequireProductionConfiguration(config); err != nil {
			return NativeResult{}, err
		}
		instant, e := time.Parse(time.RFC3339, v.UTC)
		if e != nil {
			return NativeResult{}, e
		}
		place := ephemeris.NativePlace{Latitude: v.Latitude, Longitude: v.Longitude}
		snapshot, e := ephemeris.NativeSnapshot(instant, config, nil, &place)
		if e != nil {
			return NativeResult{}, e
		}
		if snapshot.Houses == nil || !snapshot.Houses.SripatiAvailable {
			return NativeResult{}, errors.New("F01_SRIPATI_HOUSES_UNAVAILABLE")
		}
		if _, e = ephemeris.CheckSripatiGeometry(snapshot.Houses); e != nil {
			return NativeResult{}, e
		}
		return NativeResult{
			Cusps: snapshot.Houses.SiderealSripatiCusps, Version: snapshot.LibraryVersion, Mode: snapshot.ActualMode,
			Trace: NativeTrace{HouseSystem: snapshot.Houses.SripatiSystem, AyanamsaConvention: snapshot.AyanamsaConvention,
				AyanamsaDegrees: snapshot.AyanamsaDegrees, CoordinateConvention: snapshot.CoordinateConvention,
				Epoch: snapshot.Epoch, SourceCommit: snapshot.SourceCommit, DataFileSHA256: snapshot.DataFileSHA256},
		}, nil
	}
}
