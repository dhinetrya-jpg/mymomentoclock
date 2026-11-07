package timing

import (
	"astroengine-core/backend/internal/ephemeris"
	"context"
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
