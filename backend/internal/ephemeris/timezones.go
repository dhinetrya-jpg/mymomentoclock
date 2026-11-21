package ephemeris

import (
	"archive/zip"
	"bytes"
	_ "embed"
	"errors"
	"io"
	"sync"
	"time"
)

const TimezoneDatabaseVersion = "IANA@e29969d3f327f129ec4aebaa9c7aee96c46f8e3b"

//go:embed timezone.zip
var pinnedTimezoneData []byte
var timezoneOnce sync.Once
var timezoneFiles map[string]*zip.File
var timezoneCache sync.Map
var timezoneError error

// LoadCalculationLocation uses immutable reviewed data, never an OS/env fallback.
func LoadCalculationLocation(name string) (*time.Location, error) {
	if name == "UTC" {
		return time.UTC, nil
	}
	timezoneOnce.Do(func() {
		reader, err := zip.NewReader(bytes.NewReader(pinnedTimezoneData), int64(len(pinnedTimezoneData)))
		if err != nil {
			timezoneError = err
			return
		}
		timezoneFiles = map[string]*zip.File{}
		for _, f := range reader.File {
			timezoneFiles[f.Name] = f
		}
	})
	if timezoneError != nil {
		return nil, errors.New("TIMEZONE_DATABASE_UNAVAILABLE")
	}
	if value, ok := timezoneCache.Load(name); ok {
		return value.(*time.Location), nil
	}
	file, ok := timezoneFiles[name]
	if !ok {
		return nil, errors.New("UNKNOWN_TIMEZONE")
	}
	reader, err := file.Open()
	if err != nil {
		return nil, errors.New("TIMEZONE_DATABASE_UNAVAILABLE")
	}
	defer reader.Close()
	raw, err := io.ReadAll(io.LimitReader(reader, 65537))
	if err != nil || len(raw) > 65536 {
		return nil, errors.New("TIMEZONE_DATABASE_UNAVAILABLE")
	}
	location, err := time.LoadLocationFromTZData(name, raw)
	if err != nil {
		return nil, errors.New("TIMEZONE_DATABASE_UNAVAILABLE")
	}
	timezoneCache.Store(name, location)
	return location, nil
}
