package ephemeris

import (
	"math"
	"path/filepath"
	"testing"
	"time"
)

func TestNativeConfigurationFailures(t *testing.T) {
	instant := time.Date(2000, 1, 1, 12, 0, 0, 0, time.UTC)
	for _, c := range []NativeConfig{{Mode: "ANALYTICAL_APPROXIMATION"}, {Mode: "SWISS_FILE"}, {Mode: "SWISS_FILE", EphemerisPath: "relative"}, {Mode: "JPL", EphemerisPath: "/not-provisioned"}, {Mode: "SWISS_FILE", EphemerisPath: "/not-provisioned", FileSHA256: map[string]string{"sepl_18.se1": "bad"}}} {
		if _, err := NativeSnapshot(instant, c, nil, nil); err == nil {
			t.Fatal("invalid/missing configuration accepted", c.Mode)
		}
	}
	if _, err := ConvertUTC(instant, func() *float64 { x := math.Inf(1); return &x }()); err == nil {
		t.Fatal("invalid DUT1")
	}
	if _, err := NativeSolarDay(instant, instant.Add(time.Hour), NativePlace{}, NativeConfig{Mode: "MOSHIER"}, nil); err == nil {
		t.Fatal("invalid day")
	}
	if NativeAvailable() {
		return
	}
	if _, err := NativeSnapshot(instant, NativeConfig{Mode: "MOSHIER"}, nil, nil); err == nil || err.Error() != "NATIVE_EPHEMERIS_UNAVAILABLE" {
		t.Fatal("non-CGO fake output", err)
	}
}
func nativeTestFileConfig(t *testing.T) NativeConfig {
	t.Helper()
	path, err := filepath.Abs("../../../tests/calculation/reference/acquired/native-data")
	if err != nil {
		t.Fatal(err)
	}
	return NativeConfig{Mode: "SWISS_FILE", EphemerisPath: path, FileSHA256: map[string]string{"sepl_18.se1": "ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66", "semo_18.se1": "1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7"}}
}

func TestUTCLabelNoCGORefusal(t *testing.T) {
	if NativeAvailable() {
		return
	}
	if _, err := ConvertUTCLabel("1994-06-30", "23:59:60.13599"); err == nil || err.Error() != "NATIVE_EPHEMERIS_UNAVAILABLE" {
		t.Fatal("non-CGO leap fabrication", err)
	}
}
