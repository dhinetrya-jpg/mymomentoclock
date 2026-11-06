// Package release verifies owner-signed, artifact-bound readiness. It contains no approval key or green artifact.
package release

import (
	"bytes"
	"crypto/ed25519"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/url"
	"regexp"
	"time"
)

type Gate struct {
	Status   string `json:"status"`
	Evidence string `json:"evidence"`
}
type Manifest struct {
	SchemaVersion     int             `json:"schema_version"`
	Environment       string          `json:"environment"`
	ArtifactDigest    string          `json:"artifact_digest"`
	GatewayDigest     string          `json:"gateway_digest"`
	ConfigDigest      string          `json:"config_digest"`
	CatalogDigest     string          `json:"catalog_digest"`
	MerchantAccount   string          `json:"merchant_account"`
	IdentityIssuer    string          `json:"identity_issuer"`
	ApprovalReference string          `json:"approval_reference"`
	IssuedAt          time.Time       `json:"issued_at"`
	ExpiresAt         time.Time       `json:"expires_at"`
	Gates             map[string]Gate `json:"gates"`
}
type Authorization struct {
	manifest Manifest
	verified bool
}

var digestPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

func denied() error { return errors.New("PAYMENT_RELEASE_NOT_AUTHORIZED") }
func validHTTPS(raw string) bool {
	u, e := url.Parse(raw)
	return e == nil && u.Scheme == "https" && u.Hostname() != "" && u.User == nil && u.RawQuery == "" && u.Fragment == ""
}
func Verify(raw, signature []byte, key ed25519.PublicKey, artifactDigest, configDigest string, now time.Time) (*Authorization, error) {
	if len(raw) > 65536 || len(key) != ed25519.PublicKeySize || len(signature) != ed25519.SignatureSize || !ed25519.Verify(key, raw, signature) {
		return nil, denied()
	}
	var m Manifest
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if d.Decode(&m) != nil || d.Decode(new(any)) != io.EOF {
		return nil, denied()
	}
	if m.SchemaVersion != 1 || m.Environment != "production" || !digestPattern.MatchString(m.ArtifactDigest) || !digestPattern.MatchString(m.GatewayDigest) || !digestPattern.MatchString(m.ConfigDigest) || !digestPattern.MatchString(m.CatalogDigest) || m.ArtifactDigest != artifactDigest || m.ConfigDigest != configDigest || len(m.ApprovalReference) < 8 || len(m.ApprovalReference) > 200 || m.MerchantAccount == "" || !validHTTPS(m.IdentityIssuer) || m.IssuedAt.After(now.Add(time.Minute)) || !m.ExpiresAt.After(now) || m.ExpiresAt.After(m.IssuedAt.Add(24*time.Hour)) || len(m.Gates) != 26 {
		return nil, denied()
	}
	for _, id := range GateIDs() {
		g, ok := m.Gates[id]
		if !ok || g.Status != "PASS" || len(g.Evidence) < 8 || len(g.Evidence) > 1000 {
			return nil, denied()
		}
	}
	return &Authorization{m, true}, nil
}
func GateIDs() []string {
	ids := []string{}
	for _, id := range []string{"G01", "G02", "G03", "G04", "G05", "G06", "G07", "G08", "G09", "G10", "G11", "G12", "G13", "G14", "G15", "G16", "G17", "G18", "G19", "G20", "G21", "G22", "G23", "G24", "G25", "G26"} {
		ids = append(ids, id)
	}
	return ids
}
func (a *Authorization) Valid(now time.Time) bool {
	return a != nil && a.verified && a.manifest.ExpiresAt.After(now) && !a.manifest.IssuedAt.After(now.Add(time.Minute))
}
func (a *Authorization) Merchant(account string) bool {
	return a.Valid(time.Now()) && a.manifest.MerchantAccount == account
}
func (a *Authorization) Identity(issuer string) bool {
	return a.Valid(time.Now()) && a.manifest.IdentityIssuer == issuer
}
func (a *Authorization) Catalog(raw []byte) bool {
	h := sha256.Sum256(raw)
	return a.Valid(time.Now()) && a.manifest.CatalogDigest == hex.EncodeToString(h[:])
}

// ConfigHash must cover non-secret bindings and secret VERSION references, never secret values.
func ConfigHash(raw []byte) string { h := sha256.Sum256(raw); return hex.EncodeToString(h[:]) }
