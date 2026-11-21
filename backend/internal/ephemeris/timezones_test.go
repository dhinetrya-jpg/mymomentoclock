package ephemeris

import (
	"testing"
	"time"
)

func TestPinnedTimezoneIgnoresHostDataAndHandlesCurrentVancouver(t *testing.T) {
	t.Setenv("ZONEINFO", "/nonexistent/unreviewed.zip")
	for _, c := range []struct {
		zone string
		date string
		want int
	}{{"Asia/Kolkata", "2026-03-08T00:00:00", 19800}, {"Asia/Kathmandu", "2026-03-08T00:00:00", 20700}, {"America/Vancouver", "2026-11-01T01:30:00", -25200}, {"Australia/Lord_Howe", "2026-04-05T03:00:00", 37800}} {
		loc, err := LoadCalculationLocation(c.zone)
		if err != nil {
			t.Fatal(err)
		}
		v, err := time.ParseInLocation("2006-01-02T15:04:05", c.date, loc)
		if err != nil {
			t.Fatal(err)
		}
		_, offset := v.Zone()
		if offset != c.want {
			t.Fatalf("%s offset %d want %d", c.zone, offset, c.want)
		}
	}
	for _, zone := range []string{"Local", "../etc/passwd", "Unknown/Zone"} {
		if _, err := LoadCalculationLocation(zone); err == nil {
			t.Fatal("unreviewed timezone accepted", zone)
		}
	}
}
