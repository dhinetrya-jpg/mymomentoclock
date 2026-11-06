package commercial

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestConfigurationAndMissingDependenciesFailClosed(t *testing.T) {
	dir := t.TempDir()
	config := Config{SchemaVersion: 1, Environment: "test", ApprovalReference: "fixture-only-review", DatabaseName: "isolated", PublicOrigin: "https://checkout.fixture.invalid", WebClientDNS: "payment-web.internal", ObserverDNS: "observer.internal"}
	config.APISecretFile = filepath.Join(dir, "api-secret")
	config.WebhookSecretFile = filepath.Join(dir, "webhook-secret")
	config.IdentityConfigFile = filepath.Join(dir, "identity")
	config.JWKSFile = filepath.Join(dir, "jwks")
	config.CatalogFile = filepath.Join(dir, "catalog")
	config.CapabilitiesFile = filepath.Join(dir, "capabilities")
	config.InternalCertFile = filepath.Join(dir, "internal-cert")
	config.InternalKeyFile = filepath.Join(dir, "internal-key")
	config.ClientCAFile = filepath.Join(dir, "ca")
	config.WebhookCertFile = filepath.Join(dir, "webhook-cert")
	config.WebhookKeyFile = filepath.Join(dir, "webhook-key")
	path := filepath.Join(dir, "config.json")
	write := func(c Config) {
		t.Helper()
		raw, _ := json.Marshal(c)
		if err := os.WriteFile(path, raw, 0600); err != nil {
			t.Fatal(err)
		}
	}
	write(config)
	c, _, err := ReadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = Build(context.Background(), c, nil); err == nil {
		t.Fatal("missing identity accepted")
	}
	c.Environment = "production"
	if _, err = Build(context.Background(), c, nil); err == nil {
		t.Fatal("missing release authorization accepted")
	}
	for _, mutate := range []func(*Config){func(c *Config) { c.APISecretFile = "relative" }, func(c *Config) { c.PublicOrigin = "http://insecure.invalid" }, func(c *Config) { c.PublicOrigin = "https://user:password@invalid" }, func(c *Config) { c.ObserverDNS = c.WebClientDNS }, func(c *Config) { c.CatalogFile = "" }, func(c *Config) { c.InternalKeyFile = "" }, func(c *Config) { c.ApprovalReference = "" }} {
		c = config
		mutate(&c)
		write(c)
		if _, _, err = ReadConfig(path); err == nil {
			t.Fatal("unsafe or incomplete configuration accepted")
		}
	}
	if _, err = Authorize(nil, nil, "", "", ""); err == nil {
		t.Fatal("missing pinned trust root accepted")
	}
}
