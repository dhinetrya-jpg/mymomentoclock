package release

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func candidate(now time.Time) Manifest {
	m := Manifest{SchemaVersion: 1, Environment: "production", ArtifactDigest: strings.Repeat("a", 64), GatewayDigest: strings.Repeat("b", 64), ConfigDigest: strings.Repeat("c", 64), CatalogDigest: strings.Repeat("d", 64), MerchantAccount: "acc_ephemeral_test", IdentityIssuer: "https://identity.fixture.invalid", ApprovalReference: "ephemeral-test-approval", IssuedAt: now.Add(-time.Minute), ExpiresAt: now.Add(time.Hour), Gates: map[string]Gate{}}
	for _, id := range GateIDs() {
		m.Gates[id] = Gate{"PASS", "ephemeral-fixture-evidence"}
	}
	return m
}
func TestSignedArtifactGates(t *testing.T) {
	pub, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now()
	m := candidate(now)
	raw, _ := json.Marshal(m)
	signature := ed25519.Sign(key, raw)
	authorization, err := Verify(raw, signature, pub, m.ArtifactDigest, m.ConfigDigest, now)
	if err != nil || !authorization.Valid(now) || !authorization.Merchant(m.MerchantAccount) || !authorization.Identity(m.IdentityIssuer) {
		t.Fatal(err)
	}
	for _, id := range GateIDs() {
		t.Run(id+" blocks", func(t *testing.T) {
			bad := candidate(now)
			bad.Gates[id] = Gate{"BLOCKED_EXTERNAL_DEPENDENCY", "missing-owner-evidence"}
			raw, _ := json.Marshal(bad)
			if _, err := Verify(raw, ed25519.Sign(key, raw), pub, m.ArtifactDigest, m.ConfigDigest, now); err == nil {
				t.Fatal("blocked gate authorized")
			}
		})
	}
	for _, change := range []func(*Manifest){func(m *Manifest) { m.Environment = "sandbox" }, func(m *Manifest) { m.ExpiresAt = now.Add(-time.Second) }, func(m *Manifest) { m.ExpiresAt = now.Add(48 * time.Hour) }, func(m *Manifest) { m.IssuedAt = now.Add(time.Hour) }, func(m *Manifest) { m.ArtifactDigest = strings.Repeat("e", 64) }, func(m *Manifest) { m.ConfigDigest = strings.Repeat("e", 64) }, func(m *Manifest) { delete(m.Gates, "G01") }, func(m *Manifest) { m.Gates["G27"] = Gate{"PASS", "extra gate"} }, func(m *Manifest) { m.Gates["G01"] = Gate{"PASS", ""} }} {
		bad := candidate(now)
		change(&bad)
		b, _ := json.Marshal(bad)
		if _, err := Verify(b, ed25519.Sign(key, b), pub, m.ArtifactDigest, m.ConfigDigest, now); err == nil {
			t.Fatal("invalid release authorized")
		}
	}
	if _, err := Verify(append(raw, ' '), signature, pub, m.ArtifactDigest, m.ConfigDigest, now); err == nil {
		t.Fatal("tamper")
	}
	if _, err := Verify(raw, signature, nil, m.ArtifactDigest, m.ConfigDigest, now); err == nil {
		t.Fatal("missing pinned key")
	}
	if authorization.Valid(now.Add(2 * time.Hour)) {
		t.Fatal("expired authorization")
	}
}
