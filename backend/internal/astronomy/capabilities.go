package astronomy

import (
	"astroengine-core/backend/internal/ephemeris"
	_ "embed"
	"encoding/json"
)

//go:embed capabilities.json
var capabilityJSON []byte

func Capabilities() map[string]any {
	var inventory []map[string]any
	if json.Unmarshal(capabilityJSON, &inventory) != nil {
		return map[string]any{"contract_version": Version, "status": "CAPABILITY_INVENTORY_INVALID", "customer_timing_authorized": false}
	}
	return map[string]any{"contract_version": Version, "native_available": ephemeris.NativeAvailable(), "status": "IMPLEMENTED_NOT_FULLY_INDEPENDENTLY_ACCEPTED", "customer_timing_authorized": false, "capabilities": inventory}
}
