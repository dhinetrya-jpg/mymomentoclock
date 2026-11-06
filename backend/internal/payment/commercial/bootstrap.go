// Package commercial builds isolated, explicitly configured payment services; standard native entry never enables production.
package commercial

import (
	"astroengine-core/backend/internal/payment"
	"astroengine-core/backend/internal/payment/authn"
	"astroengine-core/backend/internal/payment/providers/razorpay"
	"astroengine-core/backend/internal/payment/release"
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/tls"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"
)

type Config struct {
	SchemaVersion     int    `json:"schema_version"`
	Environment       string `json:"environment"`
	ApprovalReference string `json:"approval_reference"`
	AccountID         string `json:"account_id"`
	KeyID             string `json:"key_id"`
	DatabaseName      string `json:"database_name"`
	PublicOrigin      string `json:"public_origin"`
	APISecretFile     string `json:"api_secret_file"`
	WebhookSecretFile string `json:"webhook_secret_file"`
	PreviousSecrets   []struct {
		File      string    `json:"file"`
		NotBefore time.Time `json:"not_before"`
		NotAfter  time.Time `json:"not_after"`
	} `json:"previous_webhook_secrets"`
	IdentityConfigFile   string `json:"identity_config_file"`
	IdentityConfigDigest string `json:"identity_config_sha256"`
	JWKSFile             string `json:"jwks_file"`
	CatalogFile          string `json:"catalog_file"`
	CapabilitiesFile     string `json:"capabilities_file"`
	InternalCertFile     string `json:"internal_cert_file"`
	InternalKeyFile      string `json:"internal_key_file"`
	ClientCAFile         string `json:"client_ca_file"`
	WebClientDNS         string `json:"web_client_dns"`
	ObserverDNS          string `json:"observer_dns"`
	WebhookCertFile      string `json:"webhook_cert_file"`
	WebhookKeyFile       string `json:"webhook_key_file"`
	WorkerEnabled        bool   `json:"worker_enabled"`
}
type Runtime struct {
	Service                 *payment.Service
	Identity                *authn.Manager
	Telemetry               *payment.Telemetry
	Config                  Config
	InternalTLS, WebhookTLS *tls.Config
}

func problem(s string) error { return errors.New(s) }
func ReadConfig(path string) (Config, []byte, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return Config{}, nil, problem("COMMERCIAL_CONFIGURATION_UNAPPROVED")
	}
	var c Config
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if len(raw) > 65536 || d.Decode(&c) != nil || d.Decode(new(any)) != io.EOF || c.SchemaVersion != 1 || len(c.ApprovalReference) < 8 || c.PublicOrigin == "" || c.DatabaseName == "" || c.WebClientDNS == "" || c.ObserverDNS == "" || len(c.PreviousSecrets) > 2 {
		return c, nil, problem("COMMERCIAL_CONFIGURATION_UNAPPROVED")
	}
	publicOrigin, parseErr := url.Parse(c.PublicOrigin)
	if parseErr != nil || publicOrigin.Scheme != "https" || publicOrigin.Hostname() == "" || publicOrigin.User != nil || publicOrigin.RawQuery != "" || publicOrigin.Fragment != "" || publicOrigin.Path != "" || c.WebClientDNS == c.ObserverDNS {
		return c, nil, problem("COMMERCIAL_CONFIGURATION_UNAPPROVED")
	}
	for _, previous := range c.PreviousSecrets {
		if !filepath.IsAbs(previous.File) || filepath.Clean(previous.File) != previous.File || !previous.NotAfter.After(previous.NotBefore) {
			return c, nil, problem("COMMERCIAL_CONFIGURATION_UNAPPROVED")
		}
	}
	for _, p := range []string{c.APISecretFile, c.WebhookSecretFile, c.IdentityConfigFile, c.JWKSFile, c.CatalogFile, c.CapabilitiesFile, c.InternalCertFile, c.InternalKeyFile, c.ClientCAFile, c.WebhookCertFile, c.WebhookKeyFile} {
		if !filepath.IsAbs(p) || filepath.Clean(p) != p {
			return c, nil, problem("COMMERCIAL_CONFIGURATION_UNAPPROVED")
		}
	}
	return c, raw, nil
}
func Authorize(raw, signature []byte, trustHex, artifactDigest, configDigest string) (*release.Authorization, error) {
	key, err := hex.DecodeString(trustHex)
	if err != nil || len(key) != ed25519.PublicKeySize {
		return nil, problem("PAYMENT_RELEASE_NOT_AUTHORIZED")
	}
	return release.Verify(raw, signature, ed25519.PublicKey(key), artifactDigest, configDigest, time.Now())
}
func textFile(path string) (string, error) {
	b, err := os.ReadFile(path)
	if err != nil || len(b) < 16 || len(b) > 8192 {
		return "", problem("PAYMENT_SECRET_UNAVAILABLE")
	}
	return string(bytes.TrimSpace(b)), nil
}
func Build(ctx context.Context, c Config, authorization *release.Authorization) (*Runtime, error) {
	if c.Environment == "production" && !authorization.Merchant(c.AccountID) {
		return nil, problem("PAYMENT_RELEASE_NOT_AUTHORIZED")
	}
	switch c.Environment {
	case "local", "test", "sandbox", "staging", "production":
	default:
		return nil, problem("PAYMENT_ENVIRONMENT_INVALID")
	}
	identityRaw, err := os.ReadFile(c.IdentityConfigFile)
	if err != nil || release.ConfigHash(identityRaw) != c.IdentityConfigDigest {
		return nil, problem("PAYMENT_AUTHENTICATION_UNAVAILABLE")
	}
	identityConfig, err := authn.DecodeConfig(identityRaw)
	if err != nil || identityConfig.Environment != c.Environment {
		return nil, problem("PAYMENT_AUTHENTICATION_UNAVAILABLE")
	}
	keys, err := os.ReadFile(c.JWKSFile)
	if err != nil {
		return nil, problem("PAYMENT_AUTHENTICATION_UNAVAILABLE")
	}
	catalogRaw, err := os.ReadFile(c.CatalogFile)
	if err != nil {
		return nil, problem("COMMERCIAL_CATALOG_UNAPPROVED")
	}
	if c.Environment == "production" && !authorization.Catalog(catalogRaw) {
		return nil, problem("COMMERCIAL_CATALOG_UNAPPROVED")
	}
	catalog, err := payment.LoadCommercialCatalog(catalogRaw)
	if err != nil {
		return nil, err
	}
	capabilityRaw, err := os.ReadFile(c.CapabilitiesFile)
	if err != nil {
		return nil, problem("CAPABILITY_POLICY_UNAPPROVED")
	}
	// No real premium feature list is approved/delivered in this repository.
	capabilities, err := payment.LoadCapabilityPolicies(capabilityRaw, map[string]bool{})
	if err != nil {
		return nil, err
	}
	dbConfig, err := payment.DatabaseConfigFromEnvironment()
	if err != nil {
		return nil, err
	}
	db, err := payment.OpenDatabase(ctx, dbConfig)
	if err != nil {
		return nil, err
	}
	ok := false
	defer func() {
		if !ok {
			db.Close()
		}
	}()
	var database, role, mode string
	var elevated, member, createSchema bool
	err = db.QueryRowContext(ctx, `SELECT current_database(),current_user,(r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication),pg_has_role(current_user,'mymomentoclock_payment_runtime','member'),has_schema_privilege(current_user,'public','CREATE') FROM pg_roles r WHERE rolname=current_user`).Scan(&database, &role, &elevated, &member, &createSchema)
	if err != nil || database != c.DatabaseName || elevated || !member || createSchema {
		return nil, problem("PAYMENT_DATABASE_ROLE_UNSAFE")
	}
	if err = db.QueryRowContext(ctx, `SELECT environment FROM payment_environment_binding WHERE binding_id=1`).Scan(&mode); err != nil || mode != c.Environment {
		return nil, problem("PAYMENT_DATABASE_ENVIRONMENT_MISMATCH")
	}
	manager, err := authn.New(db, identityConfig, keys, authorization)
	if err != nil {
		return nil, err
	}
	apiSecret, err := textFile(c.APISecretFile)
	if err != nil {
		return nil, err
	}
	webhookSecret, err := textFile(c.WebhookSecretFile)
	if err != nil {
		return nil, err
	}
	telemetry := &payment.Telemetry{}
	store := &payment.Store{DB: db, Provider: "razorpay/" + c.AccountID + "/" + c.Environment, Catalog: catalog, Telemetry: telemetry}
	lookup := func(ctx context.Context, id string) (razorpay.Binding, error) {
		o, customer, currency, amount, err := store.ResolveBinding(ctx, id)
		return razorpay.Binding{OrderID: o, CustomerID: customer, ProviderOrderID: id, Currency: currency, AmountMinor: amount}, err
	}
	options := razorpay.Options{Environment: c.Environment, Telemetry: telemetry}
	for _, previous := range c.PreviousSecrets {
		secret, err := textFile(previous.File)
		if err != nil {
			return nil, err
		}
		options.PreviousSecrets = append(options.PreviousSecrets, razorpay.RotationSecret{Value: secret, NotBefore: previous.NotBefore, NotAfter: previous.NotAfter})
	}
	providerConfig := razorpay.Config{Approved: true, KeyID: c.KeyID, KeySecret: apiSecret, WebhookSecret: webhookSecret, AccountID: c.AccountID}
	var provider *razorpay.Adapter
	if c.Environment == "production" {
		provider, err = razorpay.NewProduction(providerConfig, lookup, options, authorization)
	} else {
		provider, err = razorpay.NewWithOptions(providerConfig, lookup, options)
	}
	if err != nil {
		return nil, err
	}
	service, err := payment.NewService(payment.Dependencies{Store: store, Identity: manager, Provider: provider, Environment: c.Environment, ActivationApproved: true, Release: authorization, Capabilities: capabilities})
	if err != nil {
		return nil, err
	}
	internal, err := tls.LoadX509KeyPair(c.InternalCertFile, c.InternalKeyFile)
	if err != nil {
		return nil, problem("PAYMENT_INTERNAL_TLS_REQUIRED")
	}
	root, err := os.ReadFile(c.ClientCAFile)
	if err != nil {
		return nil, problem("PAYMENT_INTERNAL_TLS_REQUIRED")
	}
	ca := x509.NewCertPool()
	if !ca.AppendCertsFromPEM(root) {
		return nil, problem("PAYMENT_INTERNAL_TLS_REQUIRED")
	}
	webhook, err := tls.LoadX509KeyPair(c.WebhookCertFile, c.WebhookKeyFile)
	if err != nil {
		return nil, problem("PAYMENT_WEBHOOK_TLS_REQUIRED")
	}
	ok = true
	return &Runtime{service, manager, telemetry, c, payment.InternalTLS(internal, ca), &tls.Config{MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{webhook}}}, nil
}
func (r *Runtime) InternalHandler() http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/internal/auth/", authn.Handler(r.Identity, r.Config.WebClientDNS))
	mux.Handle("/api/payment/", payment.Handler(r.Service, r.Config.WebClientDNS))
	mux.Handle("/internal/ready", http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if !payment.HasTrustedPeer(req, r.Config.WebClientDNS) && !payment.HasTrustedPeer(req, r.Config.ObserverDNS) {
			http.Error(w, "denied", 401)
			return
		}
		if r.Service.Ready(req.Context()) != nil || r.Identity.Ready(req.Context()) != nil {
			http.Error(w, "not ready", 503)
			return
		}
		w.WriteHeader(200)
	}))
	mux.Handle("/internal/metrics", http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if !payment.HasTrustedPeer(req, r.Config.ObserverDNS) {
			http.Error(w, "denied", 401)
			return
		}
		stats, err := r.Service.OperationalStats(req.Context())
		if err != nil {
			http.Error(w, "unavailable", 503)
			return
		}
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		r.Telemetry.WritePrometheus(w)
		fmt.Fprintf(w, "mymomento_payment_pending_orders %d\nmymomento_payment_retry_events %d\nmymomento_payment_rejected_events %d\nmymomento_payment_overdue_reconciliation %d\nmymomento_payment_pending_over_hour %d\nmymomento_payment_dead_letters %d\nmymomento_payment_review_holds %d\n", stats.PendingOrders, stats.RetryEvents, stats.RejectedEvents, stats.OverdueReconciliation, stats.PendingOverHour, stats.DeadLetters, stats.ReviewHolds)
	}))
	return mux
}
func (r *Runtime) Servers() (*http.Server, *http.Server) {
	private := &http.Server{Addr: ":8443", Handler: r.InternalHandler(), TLSConfig: r.InternalTLS, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}
	mux := http.NewServeMux()
	mux.Handle("/webhooks/razorpay", payment.ProviderWebhook(r.Service))
	public := &http.Server{Addr: ":8444", Handler: mux, TLSConfig: r.WebhookTLS, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}
	return private, public
}
