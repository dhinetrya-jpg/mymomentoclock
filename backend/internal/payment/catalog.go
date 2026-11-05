package payment

import (
	"encoding/json"
	"io"
	"time"
)

// LoadCatalog reads operator-controlled reviewed server configuration, never a browser body.
// This does not constitute owner approval by itself; the deployment review must verify the manifest.
func LoadCatalog(reader io.Reader) (map[string]Product, error) {
	var manifest struct {
		ApprovalReference string `json:"approval_reference"`
		Products          []struct {
			ID            string `json:"id"`
			Version       string `json:"version"`
			Capability    string `json:"capability_id"`
			AmountMinor   int64  `json:"amount_minor"`
			Currency      string `json:"currency"`
			AccessSeconds int64  `json:"access_seconds"`
		} `json:"products"`
	}
	decoder := json.NewDecoder(io.LimitReader(reader, 65537))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&manifest); err != nil || decoder.Decode(new(any)) != io.EOF || !opaque.MatchString(manifest.ApprovalReference) || len(manifest.Products) < 1 || len(manifest.Products) > 100 {
		return nil, problem("PRODUCT_UNAVAILABLE")
	}
	catalog := map[string]Product{}
	for _, entry := range manifest.Products {
		if !opaque.MatchString(entry.ID) || !opaque.MatchString(entry.Version) || !opaque.MatchString(entry.Capability) || entry.AmountMinor <= 0 || entry.AmountMinor > 9007199254740991 || !currency.MatchString(entry.Currency) || entry.AccessSeconds < 0 || entry.AccessSeconds > 10*365*86400 {
			return nil, problem("PRODUCT_UNAVAILABLE")
		}
		if _, exists := catalog[entry.ID]; exists {
			return nil, problem("PRODUCT_UNAVAILABLE")
		}
		catalog[entry.ID] = Product{ID: entry.ID, Version: entry.Version, Capability: entry.Capability, AmountMinor: entry.AmountMinor, Currency: entry.Currency, OwnerApproved: true, AccessDuration: time.Duration(entry.AccessSeconds) * time.Second}
	}
	return catalog, nil
}
