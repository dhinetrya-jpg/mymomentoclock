package payment

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

// CommercialPolicy is an immutable order-time disclosure/policy snapshot, not a tax or refund engine.
type CommercialPolicy struct {
	Description           string    `json:"description"`
	AccessDisclosure      string    `json:"access_disclosure"`
	AccessSeconds         int64     `json:"access_seconds"`
	Lifetime              bool      `json:"lifetime"`
	BillingModel          string    `json:"billing_model"`
	TaxPolicyReference    string    `json:"tax_policy_reference"`
	TaxDisclosure         string    `json:"tax_disclosure"`
	RefundPolicyReference string    `json:"refund_policy_reference"`
	RefundDisclosure      string    `json:"refund_disclosure"`
	Availability          bool      `json:"available"`
	EffectiveFrom         time.Time `json:"effective_from"`
	EffectiveUntil        time.Time `json:"effective_until"`
	PurchaseCountry       string    `json:"purchase_country,omitempty"`
	Countries             []string  `json:"eligible_countries"`
	ApprovalReference     string    `json:"approval_reference"`
}

func LoadCommercialCatalog(raw []byte) (map[string]Product, error) {
	var document struct {
		SchemaVersion     int    `json:"schema_version"`
		ApprovalReference string `json:"approval_reference"`
		Products          []struct {
			ID          string           `json:"id"`
			Version     string           `json:"version"`
			Capability  string           `json:"capability_id"`
			Currency    string           `json:"currency"`
			AmountMinor int64            `json:"amount_minor"`
			Policy      CommercialPolicy `json:"policy"`
		} `json:"products"`
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if len(raw) > 65536 || decoder.Decode(&document) != nil || decoder.Decode(new(any)) != io.EOF || document.SchemaVersion != 2 || !opaque.MatchString(document.ApprovalReference) || len(document.Products) < 1 || len(document.Products) > 100 {
		return nil, problem("COMMERCIAL_CATALOG_UNAPPROVED")
	}
	catalog := map[string]Product{}
	for _, item := range document.Products {
		p := item.Policy
		if !opaque.MatchString(item.ID) || !opaque.MatchString(item.Version) || !opaque.MatchString(item.Capability) || item.Currency != "INR" || item.AmountMinor <= 0 || item.AmountMinor > 9007199254740991 || catalog[item.ID].ID != "" || p.PurchaseCountry != "" || p.BillingModel != "one_time" || !opaque.MatchString(p.ApprovalReference) || !opaque.MatchString(p.TaxPolicyReference) || !opaque.MatchString(p.RefundPolicyReference) || len(p.Description) < 8 || len(p.Description) > 500 || len(p.AccessDisclosure) < 8 || len(p.AccessDisclosure) > 500 || len(p.TaxDisclosure) < 8 || len(p.TaxDisclosure) > 500 || len(p.RefundDisclosure) < 8 || len(p.RefundDisclosure) > 1000 || p.AccessSeconds < 0 || p.AccessSeconds > 10*365*86400 || (p.Lifetime == (p.AccessSeconds > 0)) || p.EffectiveFrom.IsZero() || !p.EffectiveUntil.After(p.EffectiveFrom) || len(p.Countries) < 1 || len(p.Countries) > 1 || p.Countries[0] != "IN" {
			return nil, problem("COMMERCIAL_CATALOG_UNAPPROVED")
		}
		catalog[item.ID] = Product{ID: item.ID, Version: item.Version, Capability: item.Capability, Currency: item.Currency, AmountMinor: item.AmountMinor, OwnerApproved: true, AccessDuration: time.Duration(p.AccessSeconds) * time.Second, Commercial: &p}
	}
	return catalog, nil
}

type countryContextKey struct{}

func (s *Store) commercialCheck(ctx context.Context, customer string, p Product) error {
	if p.Commercial == nil {
		return nil
	}
	policy := p.Commercial
	now := time.Now()
	if !policy.Availability || now.Before(policy.EffectiveFrom) || !now.Before(policy.EffectiveUntil) {
		return problem("PRODUCT_UNAVAILABLE")
	}
	country, _ := ctx.Value(countryContextKey{}).(string)
	eligible := false
	for _, allowed := range policy.Countries {
		if allowed == country {
			eligible = true
		}
	}
	if !eligible {
		return problem("CUSTOMER_COUNTRY_UNVERIFIED")
	}
	grants, err := s.entitlements(ctx, customer)
	if err != nil {
		return err
	}
	for _, g := range grants {
		if g.Capability == p.Capability {
			return problem("ALREADY_PURCHASED")
		}
	}
	return nil
}

// Protect never enables an unimplemented astrology feature. Only approved delivered capabilities can be registered.
type CapabilityPolicy struct {
	ID, ApprovalReference string
	Delivered             bool
}

func (s *Service) Protect(policy CapabilityPolicy, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		if !policy.Delivered || !opaque.MatchString(policy.ID) || !opaque.MatchString(policy.ApprovalReference) || next == nil {
			failureJSON(w, 503, "CAPABILITY_UNAVAILABLE")
			return
		}
		if err := s.RequireAccess(r.Context(), r, policy.ID); err != nil {
			code := 403
			if strings.Contains(err.Error(), "UNAVAILABLE") {
				code = 503
			}
			if err.Error() == "UNAUTHENTICATED" {
				code = 401
			}
			failureJSON(w, code, "ENTITLEMENT_REQUIRED")
			return
		}
		next.ServeHTTP(w, r)
	})
}
func failureJSON(w http.ResponseWriter, status int, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": code})
}

// LoadCapabilityPolicies binds reviewed policy to capabilities actually delivered by the application build.
// Config alone cannot turn an unimplemented calculation into a paid feature.
func LoadCapabilityPolicies(raw []byte, compiled map[string]bool) (map[string]CapabilityPolicy, error) {
	var d struct {
		SchemaVersion     int    `json:"schema_version"`
		ApprovalReference string `json:"approval_reference"`
		Capabilities      []struct {
			ID                string `json:"id"`
			ApprovalReference string `json:"approval_reference"`
			DeliveryReference string `json:"delivery_reference"`
		} `json:"capabilities"`
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.DisallowUnknownFields()
	if len(raw) > 32768 || decoder.Decode(&d) != nil || decoder.Decode(new(any)) != io.EOF || d.SchemaVersion != 1 || !opaque.MatchString(d.ApprovalReference) || len(d.Capabilities) > 100 {
		return nil, problem("CAPABILITY_POLICY_UNAPPROVED")
	}
	result := map[string]CapabilityPolicy{}
	for _, c := range d.Capabilities {
		if !opaque.MatchString(c.ID) || !opaque.MatchString(c.ApprovalReference) || !opaque.MatchString(c.DeliveryReference) || result[c.ID].ID != "" {
			return nil, problem("CAPABILITY_POLICY_UNAPPROVED")
		}
		result[c.ID] = CapabilityPolicy{ID: c.ID, ApprovalReference: c.ApprovalReference, Delivered: compiled[c.ID]}
	}
	return result, nil
}
func (s *Service) Catalog(ctx context.Context, customer string) []Product {
	result := []Product{}
	for _, p := range s.store.Catalog {
		if p.Commercial == nil {
			continue
		}
		policy, ok := s.capabilities[p.Capability]
		if !ok || !policy.Delivered {
			continue
		}
		if err := s.store.commercialCheck(ctx, customer, p); err != nil && err.Error() != "ALREADY_PURCHASED" {
			continue
		}
		result = append(result, p)
	}
	return result
}
