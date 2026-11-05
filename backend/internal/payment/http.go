package payment

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"
)

// InternalTLS requires a client certificate signed by the dedicated service CA.
// SAN allowlisting is additionally enforced by Handler; no X-User-ID is trusted.
func InternalTLS(certificate tls.Certificate, ca *x509.CertPool) *tls.Config {
	return &tls.Config{MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{certificate}, ClientCAs: ca, ClientAuth: tls.RequireAndVerifyClientCert}
}
func HasTrustedPeer(r *http.Request, serviceDNS string) bool {
	return serviceDNS != "" && r.TLS != nil && len(r.TLS.VerifiedChains) > 0 && len(r.TLS.PeerCertificates) > 0 && r.TLS.PeerCertificates[0].VerifyHostname(serviceDNS) == nil
}

// Handler can be dependency-injected into the public server but will reject requests lacking mTLS.
// Only real adapters plus explicit activation approval can construct a production Service.
func Handler(s *Service, serviceDNS string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		reply := func(status int, value any) { w.WriteHeader(status); _ = json.NewEncoder(w).Encode(value) }
		fail := func(code string) {
			status := 503
			switch code {
			case "UNAUTHENTICATED", "INTERNAL_SERVICE_AUTH_REQUIRED":
				status = 401
			case "ORDER_NOT_FOUND":
				status = 404
			case "INVALID_REQUEST", "INVALID_ORDER", "PRODUCT_UNAVAILABLE":
				status = 422
			case "IDEMPOTENCY_CONFLICT", "PAYMENT_CONFLICT":
				status = 409
			}
			reply(status, map[string]any{"error": code, "status": "UNAVAILABLE", "is_certified": false, "is_graph_verified": false, "vector_matrix": nil})
		}
		if s == nil {
			fail("PAYMENT_PROVIDER_UNAVAILABLE")
			return
		}
		if !HasTrustedPeer(r, serviceDNS) {
			fail("INTERNAL_SERVICE_AUTH_REQUIRED")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()
		if r.URL.Path == "/internal/ready" && r.Method == "GET" {
			if err := s.Ready(ctx); err != nil {
				fail(err.Error())
				return
			}
			reply(200, map[string]string{"status": "ready", "payment_mode": "sandbox-or-test-only"})
			return
		}
		customer, err := s.identity.Authenticate(ctx, r)
		if err != nil || !opaque.MatchString(customer) {
			fail("UNAUTHENTICATED")
			return
		}
		// Reject all client identity/amount/status selectors, even on GET requests.
		if r.URL.RawQuery != "" {
			fail("INVALID_REQUEST")
			return
		}
		path := r.URL.Path
		switch {
		case path == "/api/payment/orders" && r.Method == "POST":
			var req struct {
				ProductID      string `json:"product_id"`
				IdempotencyKey string `json:"idempotency_key"`
			}
			r.Body = http.MaxBytesReader(w, r.Body, 4096)
			d := json.NewDecoder(r.Body)
			d.DisallowUnknownFields()
			if err = d.Decode(&req); err != nil || d.Decode(new(any)) != io.EOF {
				fail("INVALID_REQUEST")
				return
			}
			o, err := s.createOrder(ctx, customer, req.ProductID, req.IdempotencyKey, randomID())
			if err != nil {
				fail(err.Error())
				return
			}
			reply(200, s.checkoutOrder(o))
		case strings.HasPrefix(path, "/api/payment/orders/") && r.Method == "GET":
			id := strings.TrimPrefix(path, "/api/payment/orders/")
			if !opaque.MatchString(id) || strings.Contains(id, "/") {
				fail("INVALID_REQUEST")
				return
			}
			o, err := s.store.ownOrder(ctx, customer, id)
			if err != nil {
				fail(err.Error())
				return
			}
			if _, err = s.store.DB.ExecContext(ctx, `INSERT INTO phase1_payment_audit(order_id,action,outcome) VALUES($1,'READ_ORDER','AUTHORIZED')`, o.ID); err != nil {
				fail("PAYMENT_STORAGE_UNAVAILABLE")
				return
			}
			reply(200, s.checkoutOrder(o))
		case path == "/api/payment/entitlements" && r.Method == "GET":
			if err = s.store.auditAccess(ctx, customer, "READ_ENTITLEMENTS"); err != nil {
				fail(err.Error())
				return
			}
			list, err := s.store.entitlements(ctx, customer)
			if err != nil {
				fail(err.Error())
				return
			}
			reply(200, map[string]any{"entitlements": list})
		default:
			reply(404, map[string]string{"error": "NOT_FOUND"})
		}
	})
}

// NewInternalServer constructs, but never starts, the dedicated TLS-only service listener.
// Callers must provision real adapters and certificates; public native HTTP listener is separate.
func NewInternalServer(address string, s *Service, tlsConfig *tls.Config, serviceDNS string) (*http.Server, error) {
	if s == nil || tlsConfig == nil || tlsConfig.ClientAuth != tls.RequireAndVerifyClientCert || tlsConfig.MinVersion < tls.VersionTLS13 || tlsConfig.ClientCAs == nil || len(tlsConfig.Certificates) == 0 || serviceDNS == "" {
		return nil, problem("PAYMENT_INTERNAL_TLS_REQUIRED")
	}
	return &http.Server{Addr: address, Handler: Handler(s, serviceDNS), TLSConfig: tlsConfig, ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second, IdleTimeout: 30 * time.Second, MaxHeaderBytes: 16 << 10}, nil
}
