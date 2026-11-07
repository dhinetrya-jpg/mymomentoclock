package astronomy

import (
	"astroengine-core/backend/internal/ephemeris"
	"context"
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"testing"
)

func productionTestConfig(t *testing.T) ephemeris.NativeConfig {
	t.Helper()
	path, err := filepath.Abs("../../../tests/calculation/reference/acquired/native-data")
	if err != nil {
		t.Fatal(err)
	}
	return ephemeris.NativeConfig{Mode: "SWISS_FILE", Usage: ProductionAuthority, EphemerisPath: path, FileSHA256: PinnedDataHashes()}
}
func TestOptionAConfigurationAndAdmission(t *testing.T) {
	t.Setenv("ASTRONOMY_NATIVE_CONFIG_FILE", "")
	if _, err := ConfigFromEnvironment(); err == nil {
		t.Fatal("implicit default must not select Moshier")
	}
	for _, c := range []ephemeris.NativeConfig{{}, {Mode: "MOSHIER"}, {Mode: "JPL"}, {Mode: "MOSHIER", Usage: ProductionAuthority}, {Mode: "SWISS_FILE", EphemerisPath: "/missing", FileSHA256: map[string]string{"sepl_18.se1": "bad"}}} {
		if RequireProductionConfiguration(c) == nil {
			t.Fatal("non-authoritative config accepted", c.Mode)
		}
	}
	config := productionTestConfig(t)
	if RequireProductionConfiguration(config) != nil {
		t.Fatal("pinned SWISS_FILE rejected")
	}
	a := Authority(config)
	if a.Role != ProductionAuthority || a.ProductionMode != "SWISS_FILE" || a.ProductionEligible || a.CustomerAdmission == "APPROVED" || a.DatasetHash == "" {
		t.Fatal(a)
	}
	for _, raw := range []string{`{"mode":"MOSHIER"}`, `{"mode":"MOSHIER","usage":"PRODUCTION_AUTHORITY"}`, `{"mode":"MOSHIER","usage":"DIAGNOSTIC_ONLY","scientific_acceptance_status":"PASS"}`, `{"mode":"JPL"}`} {
		file := filepath.Join(t.TempDir(), "config.json")
		if os.WriteFile(file, []byte(raw), 0600) != nil {
			t.Fatal("write")
		}
		t.Setenv("ASTRONOMY_NATIVE_CONFIG_FILE", file)
		if _, err := ConfigFromEnvironment(); err == nil {
			t.Fatal("forged/implicit production selection accepted", raw)
		}
	}
	file := filepath.Join(t.TempDir(), "config.json")
	raw, _ := json.Marshal(config)
	_ = os.WriteFile(file, raw, 0600)
	t.Setenv("ASTRONOMY_NATIVE_CONFIG_FILE", file)
	if _, err := ConfigFromEnvironment(); err != nil {
		t.Fatal(err)
	}
	_ = os.WriteFile(file, []byte(`{"mode":"MOSHIER","usage":"DIAGNOSTIC_ONLY"}`), 0600)
	c, err := ConfigFromEnvironment()
	if err != nil || Authority(c).Role != DiagnosticOnly {
		t.Fatal(c, err)
	}
}
func TestOptionAActualSnapshotMetadata(t *testing.T) {
	if !ephemeris.NativeAvailable() {
		return
	}
	c := productionTestConfig(t)
	r := SnapshotRequest{SchemaVersion: 1, Civil: ephemeris.NormalizationRequest{BirthDate: "2000-01-01", BirthTime: "11:58:55", Timezone: "UTC", Latitude: coordinate(22.57), Longitude: coordinate(88.36), RequiredMode: "SWISS_FILE", BirthTimeCertainty: "APPROXIMATE"}}
	out, err := ComputeSnapshot(context.Background(), r, c)
	if err != nil {
		t.Fatal(err)
	}
	if out.Native.ActualMode != "SWISS_FILE" || out.Native.LibraryVersion != "2.10.03" || out.Native.AuthorityRole != ProductionAuthority || out.Authority.Role != ProductionAuthority || out.CustomerTimingAuthorized || out.Authority.ProductionEligible {
		t.Fatal(out)
	}
	for _, p := range out.Placements {
		if p.D60Segment != nil {
			t.Fatal("uncertain D60")
		}
	}
	for _, kind := range []string{"mean", "true"} {
		n, ok := out.LunarNodes[kind]
		if !ok || math.Abs(math.Abs(signed(n.KetuSidereal-n.RahuSidereal))-180) > 1e-10 || math.Abs(math.Abs(signed(n.KetuTropical-n.RahuTropical))-180) > 1e-10 || n.IndependentAcceptance != "NOT_INDEPENDENTLY_VERIFIED" {
			t.Fatal("node conventions/opposition not explicit", n)
		}
	}
	r.Civil.RequiredMode = "MOSHIER"
	if _, err := ComputeSnapshot(context.Background(), r, c); err == nil {
		t.Fatal("explicit diagnostic request entered production-configured API")
	}
}
