// Package sandbox constructs test-mode dependencies; it never starts a listener or enables production.
package sandbox

import (
	"astroengine-core/backend/internal/payment"
	"astroengine-core/backend/internal/payment/providers/razorpay"
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"os"
	"strings"
)

type Runtime struct {
	Service    *payment.Service
	TLS        *tls.Config
	ClientDNS  string
	WebhookTLS *tls.Config
}

func secret(path string) (string, error) {
	if path == "" {
		return "", errors.New("SANDBOX_SECRET_UNAVAILABLE")
	}
	b, err := os.ReadFile(path)
	if err != nil {
		return "", errors.New("SANDBOX_SECRET_UNAVAILABLE")
	}
	return strings.TrimSpace(string(b)), nil
}

// Identity is a real approved integration supplied by reviewed application code, never a header bypass.
func FromEnvironment(ctx context.Context, identity payment.Identity) (*Runtime, error) {
	if os.Getenv("PAYMENT_MODE") != "sandbox" || os.Getenv("RAZORPAY_SANDBOX_APPROVED") != "owner-approved" {
		return nil, errors.New("SANDBOX_ACTIVATION_NOT_APPROVED")
	}
	if identity == nil {
		return nil, errors.New("PAYMENT_AUTHENTICATION_UNAVAILABLE")
	}
	key, err := secret(os.Getenv("RAZORPAY_TEST_KEY_SECRET_FILE"))
	if err != nil {
		return nil, err
	}
	webhook, err := secret(os.Getenv("RAZORPAY_TEST_WEBHOOK_SECRET_FILE"))
	if err != nil {
		return nil, err
	}
	config, err := payment.DatabaseConfigFromEnvironment()
	if err != nil {
		return nil, err
	}
	db, err := payment.OpenDatabase(ctx, config)
	if err != nil {
		return nil, err
	}
	ok := false
	defer func() {
		if !ok {
			db.Close()
		}
	}()
	catalogFile, err := os.Open(os.Getenv("PAYMENT_CATALOG_FILE"))
	if err != nil {
		return nil, errors.New("PRODUCT_UNAVAILABLE")
	}
	defer catalogFile.Close()
	catalog, err := payment.LoadCatalog(catalogFile)
	if err != nil {
		return nil, err
	}
	account := os.Getenv("RAZORPAY_ACCOUNT_ID")
	store := &payment.Store{DB: db, Catalog: catalog, Provider: "razorpay/" + account + "/sandbox"}
	adapter, err := razorpay.New(razorpay.Config{Approved: true, KeyID: os.Getenv("RAZORPAY_TEST_KEY_ID"), KeySecret: key, WebhookSecret: webhook, AccountID: account}, func(ctx context.Context, id string) (razorpay.Binding, error) {
		o, c, currency, amount, err := store.ResolveBinding(ctx, id)
		return razorpay.Binding{OrderID: o, CustomerID: c, ProviderOrderID: id, Currency: currency, AmountMinor: amount}, err
	})
	if err != nil {
		return nil, err
	}
	service, err := payment.NewService(payment.Dependencies{Store: store, Identity: identity, Provider: adapter, Environment: "sandbox", ActivationApproved: true})
	if err != nil {
		return nil, err
	}
	cert, err := tls.LoadX509KeyPair(os.Getenv("PAYMENT_INTERNAL_CERT_FILE"), os.Getenv("PAYMENT_INTERNAL_KEY_FILE"))
	if err != nil {
		return nil, errors.New("PAYMENT_INTERNAL_TLS_REQUIRED")
	}
	pem, err := os.ReadFile(os.Getenv("PAYMENT_INTERNAL_CA_FILE"))
	if err != nil {
		return nil, errors.New("PAYMENT_INTERNAL_TLS_REQUIRED")
	}
	ca := x509.NewCertPool()
	if !ca.AppendCertsFromPEM(pem) {
		return nil, errors.New("PAYMENT_INTERNAL_TLS_REQUIRED")
	}
	dns := os.Getenv("PAYMENT_WEB_CLIENT_DNS")
	if dns == "" {
		return nil, errors.New("PAYMENT_INTERNAL_TLS_REQUIRED")
	}
	webhookCert, err := tls.LoadX509KeyPair(os.Getenv("PAYMENT_WEBHOOK_CERT_FILE"), os.Getenv("PAYMENT_WEBHOOK_KEY_FILE"))
	if err != nil {
		return nil, errors.New("SANDBOX_WEBHOOK_TLS_REQUIRED")
	}
	ok = true
	return &Runtime{Service: service, TLS: payment.InternalTLS(cert, ca), ClientDNS: dns, WebhookTLS: &tls.Config{MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{webhookCert}}}, nil
}
