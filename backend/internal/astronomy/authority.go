package astronomy

import (
	"astroengine-core/backend/internal/ephemeris"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"path/filepath"
)

const ProductionAuthority = "PRODUCTION_AUTHORITY"
const DiagnosticOnly = "DIAGNOSTIC_ONLY"
const DatasetVersion = "swisseph-DE441-1800-2399@94621aba9f3ff9c32cb721eac0380c30dbb153fe"
const TraditionalRuleVersion = "weekday-daylight-eighths-v1; daylight-fifteenth-centered-v1; fixed96-to48-minutes-before-sunrise-v1; UNAPPROVED"

// AuthorityContract describes candidacy, not an approval supplied by a caller.
// Option A has no configuration switch that authorizes customer timing.
type AuthorityContract struct {
	TimezoneDatabase       string `json:"timezone_database_version"`
	Version                string `json:"version"`
	Engine                 string `json:"astronomy_engine"`
	EngineVersion          string `json:"astronomy_engine_version"`
	ProductionMode         string `json:"production_mode"`
	ActualMode             string `json:"configured_mode"`
	Role                   string `json:"authority_role"`
	DatasetVersion         string `json:"ephemeris_dataset_version"`
	DatasetHash            string `json:"ephemeris_dataset_hash"`
	SiderealMode           string `json:"sidereal_mode"`
	TimeScalePolicy        string `json:"time_scale_policy"`
	TraditionalRuleVersion string `json:"traditional_rule_version"`
	ScientificAcceptance   string `json:"scientific_acceptance_status"`
	CustomerAdmission      string `json:"customer_admission_status"`
	ProductionEligible     bool   `json:"production_eligible"`
}

func PinnedDataHashes() map[string]string {
	return map[string]string{
		"sepl_18.se1": "ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66",
		"semo_18.se1": "1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7",
	}
}
func Authority(c ephemeris.NativeConfig) AuthorityContract {
	role := DiagnosticOnly
	dataset := "NOT_PRODUCTION_DATA"
	digest := "NOT_APPLICABLE"
	if c.Mode == "SWISS_FILE" {
		role = ProductionAuthority
		dataset = DatasetVersion
		raw, _ := json.Marshal(PinnedDataHashes())
		sum := sha256.Sum256(raw)
		digest = hex.EncodeToString(sum[:])
	}
	return AuthorityContract{ephemeris.TimezoneDatabaseVersion, "option-a-v1", "SWISS_EPHEMERIS", "2.10.03", "SWISS_FILE", c.Mode, role, dataset, digest, "SWISS_SE_SIDM_LAHIRI=1; default Swiss precession; ayanamsa_ex includes nutation (no NONUT); no TrueCitra or SIDBIT_PREC_ORIG", "UTC leap table to TT; modeled UT1 or explicitly unverified caller DUT1; no universal DeltaT", TraditionalRuleVersion, "PARTIAL_INDEPENDENT_COVERAGE", "DISABLED_SCIENCE_DOMAIN_AND_LICENSE_APPROVAL_PENDING", false}
}

// RequireProductionConfiguration rejects diagnostic modes before natal/day work.
// File presence/content is rechecked by the native engine on every calculation.
func RequireProductionConfiguration(c ephemeris.NativeConfig) error {
	if c.Mode != "SWISS_FILE" || (c.Usage != "" && c.Usage != ProductionAuthority) || c.JPLFile != "" {
		return problem("PRODUCTION_AUTHORITY_REQUIRED")
	}
	expected := PinnedDataHashes()
	if len(c.FileSHA256) != len(expected) {
		return problem("PRODUCTION_DATASET_NOT_PINNED")
	}
	for name, hash := range expected {
		if c.FileSHA256[name] != hash {
			return problem("PRODUCTION_DATASET_NOT_PINNED")
		}
	}
	if !filepath.IsAbs(c.EphemerisPath) || filepath.Clean(c.EphemerisPath) != c.EphemerisPath {
		return problem("PRODUCTION_EPHEMERIS_PATH_REQUIRED")
	}
	return nil
}

func verifyActualAuthority(s ephemeris.NativeSnapshotResult, c ephemeris.NativeConfig) error {
	if c.Mode == "SWISS_FILE" && (s.ActualMode != "SWISS_FILE" || s.LibraryVersion != "2.10.03") {
		return problem("PRODUCTION_ENGINE_VERSION_OR_MODE_MISMATCH")
	}
	return nil
}
