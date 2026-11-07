package timing

import (
	"astroengine-core/backend/internal/astronomy"
	"astroengine-core/backend/internal/ephemeris"
	"context"
	"path/filepath"
	"testing"
)

func TestRealAstronomyCannotBypassTimingAdmission(t *testing.T) {
	r := request()
	v, err := Validate(r)
	if err != nil {
		t.Fatal(err)
	}
	p := NewNativeAstronomyProvider(ephemeris.NativeConfig{Mode: "MOSHIER"})
	if in, err := p.Load(context.Background(), v); err == nil || in.Synthetic {
		t.Fatal("real astronomy cannot masquerade as synthetic", in, err)
	}
	native := NativeEngine()
	out, err := native.Calculate(context.Background(), r, now)
	if err != nil || out.Status != Unavailable || len(out.Windows) != 0 || out.Provenance.ReleaseAuthorized {
		t.Fatal(out, err)
	}
}

func TestOptionAAuthorityProviderRejectsDiagnosticModes(t *testing.T) {
	r := request()
	r.EphemerisMode = "MOSHIER"
	v, err := Validate(r)
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range []ephemeris.NativeConfig{{}, {Mode: "MOSHIER"}, {Mode: "JPL"}} {
		p := NewNativeAstronomyProvider(c)
		if _, err := p.Inspect(context.Background(), v); err == nil {
			t.Fatal("diagnostic mode entered natal/day production authority")
		}
		if in, err := p.Load(context.Background(), v); err == nil || in.Synthetic {
			t.Fatal("diagnostic mode acquired customer admission")
		}
	}
}

func TestOptionARealProductionProviderInspection(t *testing.T) {
	if !ephemeris.NativeAvailable() {
		return
	}
	path, err := filepath.Abs("../../../tests/calculation/reference/acquired/native-data")
	if err != nil {
		t.Fatal(err)
	}
	c := ephemeris.NativeConfig{Mode: "SWISS_FILE", Usage: astronomy.ProductionAuthority, EphemerisPath: path, FileSHA256: astronomy.PinnedDataHashes()}
	r := request()
	r.EphemerisMode = "SWISS_FILE"
	v, err := Validate(r)
	if err != nil {
		t.Fatal(err)
	}
	p := NewNativeAstronomyProvider(c)
	out, err := p.Inspect(context.Background(), v)
	if err != nil {
		t.Fatal(err)
	}
	if out.Natal.Native.ActualMode != "SWISS_FILE" || out.Day.Snapshot.ActualMode != "SWISS_FILE" || out.CustomerTimingAuthorized || out.Natal.Authority.ProductionEligible || out.Day.Authority.ProductionEligible {
		t.Fatal("same authority/disabled admission contract violated")
	}
	if in, err := p.Load(context.Background(), v); err == nil || in.Synthetic {
		t.Fatal("unaccepted real inputs became customer timing")
	}
	r.EphemerisMode = "MOSHIER"
	v, err = Validate(r)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := p.Inspect(context.Background(), v); err == nil {
		t.Fatal("explicit Moshier entered SWISS_FILE authority provider")
	}
}
