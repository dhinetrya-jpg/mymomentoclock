package payment

import (
	"astroengine-core/backend/internal/payment/release"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

// Identity must validate a real session/token (issuer/audience/expiry/revocation as appropriate).
// The public client never supplies an authoritative customer ID.
type Identity interface {
	Authenticate(context.Context, *http.Request) (string, error)
	ProductionReady() bool
}
type ProviderOrderRequest struct {
	OrderID, IdempotencyKey, CustomerID string
	Product                             Product
	RecoveryOnly                        bool
}
type ProviderOrder struct {
	ID, OrderID, CustomerID, Currency string
	AmountMinor                       int64
}

// Provider implementations must use stable order idempotency and ordered authoritative revisions.
// Partial refunds have no approved policy and must be rejected, not mapped to a full refund.
type Provider interface {
	Namespace() string
	ProductionReady() bool
	CreateOrder(context.Context, ProviderOrderRequest) (ProviderOrder, error)
	VerifyAndParseWebhook(context.Context, []byte, http.Header) (Event, error)
	GetPaymentStatus(context.Context, string, string) (Event, error) // internal order ID and provider order ID
}
type Dependencies struct {
	Store              *Store
	Identity           Identity
	Provider           Provider
	Environment        string
	ActivationApproved bool
	Release            *release.Authorization
	Capabilities       map[string]CapabilityPolicy
}
type Service struct {
	store        *Store
	identity     Identity
	provider     Provider
	release      *release.Authorization
	capabilities map[string]CapabilityPolicy
}

func NewService(d Dependencies) (*Service, error) {
	if d.Environment == "production" && (d.Release == nil || !d.Release.Valid(time.Now())) {
		return nil, problem("PAYMENT_RELEASE_NOT_AUTHORIZED")
	}
	if d.Store == nil || d.Store.DB == nil {
		return nil, problem("PAYMENT_STORAGE_UNAVAILABLE")
	}
	if d.Identity == nil {
		return nil, problem("PAYMENT_AUTHENTICATION_UNAVAILABLE")
	}
	if d.Provider == nil {
		return nil, problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	if d.Environment == "local" || d.Environment == "staging" {
		p, ok := d.Provider.(interface{ NonProductionReady(string) bool })
		i, iok := d.Identity.(interface{ NonProductionReady(string) bool })
		if !ok || !iok || !d.ActivationApproved || !p.NonProductionReady(d.Environment) || !i.NonProductionReady(d.Environment) {
			return nil, problem("NONPRODUCTION_DEPENDENCIES_UNAVAILABLE")
		}
	} else if d.Environment == "sandbox" {
		p, ok := d.Provider.(interface{ SandboxReady() bool })
		identity, identityOK := d.Identity.(interface{ SandboxReady() bool })
		if !ok || !identityOK || !d.ActivationApproved || !p.SandboxReady() || !identity.SandboxReady() {
			return nil, problem("SANDBOX_DEPENDENCIES_UNAVAILABLE")
		}
	} else if d.Environment != "test" && (d.Environment != "production" || !d.ActivationApproved || !d.Provider.ProductionReady() || !d.Identity.ProductionReady()) {
		return nil, problem("PAYMENT_ACTIVATION_NOT_APPROVED")
	}
	ns := strings.Split(d.Provider.Namespace(), "/")
	if len(ns) != 3 || !opaque.MatchString(d.Provider.Namespace()) || d.Store.Provider != d.Provider.Namespace() {
		return nil, problem("INVALID_PROVIDER_NAMESPACE")
	}
	for _, part := range ns {
		if part == "" {
			return nil, problem("INVALID_PROVIDER_NAMESPACE")
		}
	}
	if ns[2] != d.Environment {
		return nil, problem("INVALID_PROVIDER_NAMESPACE")
	}
	catalog := map[string]Product{}
	for id, p := range d.Store.Catalog {
		if _, err := d.Store.product(id); err != nil || p.Version == "" || p.Capability == "" || p.AccessDuration < 0 || !opaque.MatchString(id) || !opaque.MatchString(p.Version) || !opaque.MatchString(p.Capability) {
			return nil, problem("PRODUCT_UNAVAILABLE")
		}
		if p.Commercial != nil {
			copyPolicy := *p.Commercial
			copyPolicy.Countries = append([]string(nil), p.Commercial.Countries...)
			p.Commercial = &copyPolicy
		}
		if d.Environment == "production" && p.Commercial == nil {
			return nil, problem("COMMERCIAL_CATALOG_UNAPPROVED")
		}
		catalog[id] = p
	}
	if len(catalog) == 0 {
		return nil, problem("PRODUCT_UNAVAILABLE")
	}
	copyStore := *d.Store
	copyStore.Catalog = catalog
	if provider, ok := d.Provider.(interface{ SnapshotModel() string }); ok {
		if provider.SnapshotModel() != "CAPTURE_REFUND_LATTICE_V1" {
			return nil, problem("UNSUPPORTED_EVIDENCE_MODEL")
		}
		copyStore.EvidenceModel = provider.SnapshotModel()
	}
	service := &Service{store: &copyStore, identity: d.Identity, provider: d.Provider, release: d.Release, capabilities: map[string]CapabilityPolicy{}}
	for id, p := range d.Capabilities {
		if id != p.ID || !opaque.MatchString(p.ApprovalReference) {
			return nil, problem("CAPABILITY_POLICY_UNAPPROVED")
		}
		service.capabilities[id] = p
	}
	if d.Environment == "production" {
		for _, p := range catalog {
			if !service.capabilities[p.Capability].Delivered {
				return nil, problem("CAPABILITY_NOT_DELIVERED")
			}
		}
	}
	if err := service.Ready(context.Background()); err != nil {
		return nil, err
	}
	return service, nil
}
func randomID() string {
	var b [24]byte
	if _, err := rand.Read(b[:]); err != nil {
		return ""
	}
	return hex.EncodeToString(b[:])
}

type Order struct {
	ID                                string            `json:"order_id"`
	Status                            string            `json:"status"`
	AmountMinor                       int64             `json:"amount_minor"`
	Currency                          string            `json:"currency"`
	ProductID                         string            `json:"product_id"`
	ProductVersion                    string            `json:"product_version"`
	Capability                        string            `json:"capability_id"`
	Checkout                          *CheckoutSession  `json:"checkout,omitempty"`
	Commercial                        *CommercialPolicy `json:"commercial_policy,omitempty"`
	providerOrder, customer, provider string
}

const orderFields = `order_id,CASE WHEN provider_review_required THEN 'PAYMENT_REVIEW' ELSE status END,amount_minor,currency,product_id,product_version,capability_id,coalesce(provider_order_id,''),customer_id,provider,commercial_snapshot`

func scanOrder(row interface{ Scan(...any) error }) (Order, error) {
	var o Order
	var snapshot []byte
	err := row.Scan(&o.ID, &o.Status, &o.AmountMinor, &o.Currency, &o.ProductID, &o.ProductVersion, &o.Capability, &o.providerOrder, &o.customer, &o.provider, &snapshot)
	if err == sql.ErrNoRows {
		return o, problem("ORDER_NOT_FOUND")
	}
	if err == nil && len(snapshot) > 0 && string(snapshot) != "null" {
		if json.Unmarshal(snapshot, &o.Commercial) != nil {
			return o, problem("PAYMENT_STORAGE_UNAVAILABLE")
		}
	}
	return o, storageError(err)
}
func (s *Store) ownOrder(ctx context.Context, customer, id string) (Order, error) {
	return scanOrder(s.DB.QueryRowContext(ctx, `SELECT `+orderFields+` FROM phase1_orders WHERE order_id=$1 AND customer_id=$2 AND provider=$3`, id, customer, s.Provider))
}
func (s *Store) reserveOrder(ctx context.Context, customer, product, key, correlation string) (Order, error) {
	if !opaque.MatchString(customer) || !opaque.MatchString(key) || len(key) < 16 {
		return Order{}, problem("INVALID_ORDER")
	}
	// Return original snapshot even when catalog pricing/version has changed since the first attempt.
	existing, err := scanOrder(s.DB.QueryRowContext(ctx, `SELECT `+orderFields+` FROM phase1_orders WHERE customer_id=$1 AND idempotency_key=$2`, customer, key))
	if err == nil {
		if existing.ProductID != product || existing.provider != s.Provider {
			return Order{}, problem("IDEMPOTENCY_CONFLICT")
		}
		return existing, nil
	}
	if err.Error() != "ORDER_NOT_FOUND" {
		return Order{}, err
	}
	p, err := s.product(product)
	if err != nil {
		return Order{}, err
	}
	if err := s.commercialCheck(ctx, customer, p); err != nil {
		return Order{}, err
	}
	if p.Commercial != nil {
		copyPolicy := *p.Commercial
		copyPolicy.PurchaseCountry, _ = ctx.Value(countryContextKey{}).(string)
		p.Commercial = &copyPolicy
	}
	snapshot, _ := json.Marshal(p.Commercial)
	id := randomID()
	if id == "" {
		return Order{}, problem("PAYMENT_STORAGE_UNAVAILABLE")
	}
	if err = s.checkpoint("before_order_insert", nil); err != nil {
		return Order{}, err
	}
	_, err = s.DB.ExecContext(ctx, `INSERT INTO phase1_orders(order_id,customer_id,product_id,product_version,capability_id,provider,amount_minor,currency,status,idempotency_key,correlation_id,access_expires_at,evidence_model,commercial_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'CREATED',$9,$10,CASE WHEN $11::bigint>0 THEN now()+$11*interval '1 microsecond' ELSE NULL END,$12,$13) ON CONFLICT(customer_id,idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`, id, customer, p.ID, p.Version, p.Capability, s.Provider, p.AmountMinor, p.Currency, key, correlation, p.AccessDuration.Microseconds(), s.model(), string(snapshot))
	if err != nil {
		return Order{}, storageError(err)
	}
	if err = s.checkpoint("after_order_insert", nil); err != nil {
		return Order{}, err
	}
	existing, err = scanOrder(s.DB.QueryRowContext(ctx, `SELECT `+orderFields+` FROM phase1_orders WHERE customer_id=$1 AND idempotency_key=$2`, customer, key))
	if err == nil && (existing.ProductID != product || existing.provider != s.Provider) {
		return Order{}, problem("IDEMPOTENCY_CONFLICT")
	}
	return existing, err
}
func (s *Service) createOrder(ctx context.Context, customer, product, key, correlation string) (Order, error) {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	s.store.Telemetry.Observe("order_attempt", 0)
	if strings.HasSuffix(s.store.Provider, "/production") && !s.release.Valid(time.Now()) {
		return Order{}, problem("PAYMENT_RELEASE_NOT_AUTHORIZED")
	}

	if p, ok := s.store.Catalog[product]; ok && p.Commercial != nil && !s.capabilities[p.Capability].Delivered {
		return Order{}, problem("CAPABILITY_NOT_DELIVERED")
	}
	o, err := s.store.reserveOrder(ctx, customer, product, key, correlation)
	if err != nil {
		return o, err
	}
	if o.Status != "CREATED" {
		return o, nil
	}
	// Provider gets the durable snapshot, never current mutable catalog prices or browser amounts.
	p := Product{ID: o.ProductID, Version: o.ProductVersion, Capability: o.Capability, AmountMinor: o.AmountMinor, Currency: o.Currency}
	recoveryOnly := false
	if provider, ok := s.provider.(interface{ RequiresCreateIntent() bool }); ok && provider.RequiresCreateIntent() {
		result, e := s.store.DB.ExecContext(ctx, `UPDATE phase1_orders SET provider_create_attempted=true WHERE order_id=$1 AND provider_create_attempted=false AND status='CREATED'`, o.ID)
		if e != nil {
			return Order{}, storageError(e)
		}
		n, e := result.RowsAffected()
		if e != nil {
			return Order{}, storageError(e)
		}
		recoveryOnly = n == 0
	}
	po, err := s.provider.CreateOrder(ctx, ProviderOrderRequest{OrderID: o.ID, IdempotencyKey: o.ID, CustomerID: customer, Product: p, RecoveryOnly: recoveryOnly})
	if err != nil {
		s.store.Telemetry.Observe("provider_create_error", 0)
		return Order{}, problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	if !opaque.MatchString(po.ID) || po.OrderID != o.ID || po.CustomerID != customer || po.AmountMinor != o.AmountMinor || po.Currency != o.Currency {
		return Order{}, problem("PAYMENT_MISMATCH")
	}
	_, err = s.store.DB.ExecContext(ctx, `UPDATE phase1_orders SET provider_order_id=$2,status='PENDING',updated_at=now() WHERE order_id=$1 AND status='CREATED' AND provider_order_id IS NULL`, o.ID, po.ID)
	if err != nil {
		return Order{}, storageError(err)
	}
	o, err = s.store.ownOrder(ctx, customer, o.ID)
	if err == nil && o.providerOrder != po.ID {
		return Order{}, problem("PAYMENT_MISMATCH")
	}
	return o, err
}

type Entitlement struct {
	Capability  string     `json:"capability_id"`
	SourceOrder string     `json:"source_order"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
}

func (s *Store) entitlements(ctx context.Context, customer string) ([]Entitlement, error) {
	rows, err := s.DB.QueryContext(ctx, `SELECT e.capability_id,e.order_id,e.expires_at FROM phase1_entitlements e JOIN phase1_orders o USING(order_id) WHERE e.customer_id=$1 AND o.customer_id=$1 AND o.provider=$2 AND o.status='COMPLETED' AND NOT o.provider_review_required AND NOT EXISTS(SELECT 1 FROM payment_customers c WHERE c.customer_id=$1 AND c.deleted_at IS NOT NULL) AND e.active AND e.revoked_at IS NULL AND (e.expires_at IS NULL OR e.expires_at>now()) ORDER BY e.capability_id,e.order_id`, customer, s.Provider)
	if err != nil {
		return nil, storageError(err)
	}
	defer rows.Close()
	result := []Entitlement{}
	for rows.Next() {
		var e Entitlement
		if err = rows.Scan(&e.Capability, &e.SourceOrder, &e.ExpiresAt); err != nil {
			return nil, storageError(err)
		}
		result = append(result, e)
	}
	return result, storageError(rows.Err())
}

// RequireAccess is a reusable server-side guard. It authenticates anew and queries durable grants.
// Multiple purchases are independent: one valid unexpired grant is sufficient.
func (s *Service) RequireAccess(ctx context.Context, r *http.Request, capability string) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	if s == nil {
		return problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	customer, err := s.identity.Authenticate(ctx, r)
	if err != nil || !opaque.MatchString(customer) {
		return problem("UNAUTHENTICATED")
	}
	if err = s.store.auditAccess(ctx, customer, "CHECK_ENTITLEMENT"); err != nil {
		return err
	}
	list, err := s.store.entitlements(ctx, customer)
	if err != nil {
		return err
	}
	for _, e := range list {
		if e.Capability == capability {
			return nil
		}
	}
	return problem("ENTITLEMENT_REQUIRED")
}
func sameIdentity(a, b Event) bool {
	return a.Provider == b.Provider && a.OrderID == b.OrderID && a.ProviderOrderID == b.ProviderOrderID && (a.PaymentID == "" || a.PaymentID == b.PaymentID || a.NotificationOnly && a.EventType != "payment.captured") && a.CustomerID == b.CustomerID && a.Currency == b.Currency && a.AmountMinor == b.AmountMinor
}
func (s *Service) ProcessWebhook(ctx context.Context, raw []byte, headers http.Header) error {
	ctx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()
	if len(raw) == 0 || len(raw) > 64<<10 {
		return problem("INVALID_PAYMENT_EVENT")
	}
	e, err := s.provider.VerifyAndParseWebhook(ctx, raw, headers)
	if err != nil {
		return problem("PAYMENT_SIGNATURE_INVALID")
	}
	if !validEvent(e) || e.Provider != s.store.Provider || e.OccurredAt.After(time.Now().Add(5*time.Minute)) {
		return problem("INVALID_PAYMENT_EVENT")
	}
	// Persist signed evidence before provider retrieval, so transient outage is recoverable.
	if err = s.store.queue(ctx, seal(e)); err != nil {
		return err
	}
	snapshot, err := s.provider.GetPaymentStatus(ctx, e.OrderID, e.ProviderOrderID)
	if err != nil {
		return problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	if !sameIdentity(e, snapshot) || (e.EvidenceModel != "CAPTURE_REFUND_LATTICE_V1" && snapshot.Revision < e.Revision) {
		return problem("PAYMENT_MISMATCH")
	}
	if e.RiskHold && snapshot.Status != "REFUNDED" {
		snapshot.Status = "PAYMENT_REVIEW"
		s.store.Telemetry.Observe("refund_review", 0)
	}
	// Apply latest authoritative state first. A stale completed callback cannot unlock a refunded order.
	if err = s.applySnapshot(ctx, snapshot); err != nil {
		return err
	}
	if e.NotificationOnly {
		_, err = s.store.DB.ExecContext(ctx, `UPDATE phase1_payment_events SET processing_status='PROCESSED',processing_attempts=processing_attempts+1 WHERE provider=$1 AND event_id=$2`, e.Provider, e.EventID)
		return storageError(err)
	}
	_, err = s.store.ApplyVerifiedEvent(ctx, seal(e))
	return err
}
func (s *Service) applySnapshot(ctx context.Context, e Event) error {
	if !validEvent(e) {
		return problem("INVALID_PAYMENT_EVENT")
	}
	if e.EvidenceModel == "CAPTURE_REFUND_LATTICE_V1" {
		e.EventID = "snapshot"
		e.EventType = "AUTHORITATIVE_STATE"
		h, _ := fingerprint(e)
		e.EventID = "state/" + h
	} else {
		e.EventID = "state/" + e.OrderID + "/" + jsonNumber(e.Revision)
	}
	e.EventType = "AUTHORITATIVE_STATE"
	_, err := s.store.ApplyVerifiedEvent(ctx, seal(e))
	return err
}
func jsonNumber(n int64) string { b, _ := json.Marshal(n); return string(b) }

func (s *Store) auditAccess(ctx context.Context, customer, action string) error {
	hash := sha256.Sum256([]byte(s.Provider + "/" + customer))
	_, err := s.DB.ExecContext(ctx, `INSERT INTO phase1_payment_audit(action,outcome,actor_hash) VALUES($1,'AUTHORIZED',$2)`, action, hex.EncodeToString(hash[:]))
	return storageError(err)
}

// ResolveBinding is only for provider adapters; never exposed as a customer lookup route.
func (s *Store) ResolveBinding(ctx context.Context, providerOrder string) (orderID, customer, currency string, amount int64, err error) {
	err = s.DB.QueryRowContext(ctx, `SELECT order_id,customer_id,currency,amount_minor FROM phase1_orders WHERE provider=$1 AND provider_order_id=$2`, s.Provider, providerOrder).Scan(&orderID, &customer, &currency, &amount)
	err = storageError(err)
	return
}

type CheckoutSession struct {
	Mode            string `json:"mode"`
	KeyID           string `json:"key_id"`
	ProviderOrderID string `json:"provider_order_id"`
}

func (s *Service) checkoutOrder(o Order) Order {
	provider, ok := s.provider.(interface{ PublicKey() string })
	if !ok || o.providerOrder == "" {
		return o
	}
	mode := "sandbox"
	prefix := "rzp_test_"
	if strings.HasSuffix(s.store.Provider, "/production") {
		if !s.release.Valid(time.Now()) || !s.provider.ProductionReady() {
			return o
		}
		mode = "production"
		prefix = "rzp_live_"
	}
	if strings.HasPrefix(provider.PublicKey(), prefix) {
		o.Checkout = &CheckoutSession{mode, provider.PublicKey(), o.providerOrder}
	}
	return o
}
