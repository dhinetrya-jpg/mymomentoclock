// Package authn is a vendor-neutral pinned-JWKS OIDC ID-token exchange and durable session authority.
package authn

import (
	"astroengine-core/backend/internal/payment/release"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"github.com/golang-jwt/jwt/v5"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type Config struct {
	Environment, Issuer, Audience, ApprovalReference, JWKSDigest, CountryClaim string
	SessionTTL                                                                 time.Duration
}
type Manager struct {
	db       *sql.DB
	config   Config
	keys     map[string]*rsa.PublicKey
	approval *release.Authorization
}

var kidPattern = regexp.MustCompile(`^[A-Za-z0-9_.-]{1,100}$`)
var tokenPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)
var countryPattern = regexp.MustCompile(`^[A-Z]{2}$`)

func failure(code string) error { return errors.New(code) }
func digest(s string) string    { h := sha256.Sum256([]byte(s)); return hex.EncodeToString(h[:]) }
func randomToken() (string, error) {
	var b [32]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", failure("AUTHENTICATION_UNAVAILABLE")
	}
	return hex.EncodeToString(b[:]), nil
}
func New(db *sql.DB, c Config, jwks []byte, approval *release.Authorization) (*Manager, error) {
	u, err := url.Parse(c.Issuer)
	if db == nil || err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || c.Audience == "" || len(c.Audience) > 200 || len(c.ApprovalReference) < 8 || c.SessionTTL < 5*time.Minute || c.SessionTTL > time.Hour || len(jwks) > 65536 || digest(string(jwks)) != c.JWKSDigest {
		return nil, failure("IDENTITY_CONFIGURATION_UNAPPROVED")
	}
	if c.Environment != "local" && c.Environment != "test" && c.Environment != "sandbox" && c.Environment != "staging" && c.Environment != "production" {
		return nil, failure("IDENTITY_CONFIGURATION_UNAPPROVED")
	}
	if c.Environment == "production" && !approval.Identity(c.Issuer) {
		return nil, failure("IDENTITY_RELEASE_NOT_AUTHORIZED")
	}
	var set struct {
		Keys []struct{ Kty, Kid, Use, Alg, N, E string }
	}
	if json.Unmarshal(jwks, &set) != nil || len(set.Keys) == 0 || len(set.Keys) > 8 {
		return nil, failure("IDENTITY_KEYS_INVALID")
	}
	keys := map[string]*rsa.PublicKey{}
	for _, key := range set.Keys {
		if key.Kty != "RSA" || key.Alg != "RS256" || key.Use != "sig" || !kidPattern.MatchString(key.Kid) || keys[key.Kid] != nil {
			return nil, failure("IDENTITY_KEYS_INVALID")
		}
		n, err := base64.RawURLEncoding.DecodeString(key.N)
		if err != nil {
			return nil, failure("IDENTITY_KEYS_INVALID")
		}
		e, err := base64.RawURLEncoding.DecodeString(key.E)
		if err != nil || len(e) < 1 || len(e) > 4 {
			return nil, failure("IDENTITY_KEYS_INVALID")
		}
		exponent := 0
		for _, b := range e {
			exponent = exponent*256 + int(b)
		}
		modulus := new(big.Int).SetBytes(n)
		if modulus.BitLen() < 2048 || modulus.BitLen() > 8192 || exponent < 3 || exponent > 65537 || exponent%2 == 0 {
			return nil, failure("IDENTITY_KEYS_INVALID")
		}
		keys[key.Kid] = &rsa.PublicKey{N: modulus, E: exponent}
	}
	manager := &Manager{db, c, keys, approval}
	if err := manager.Ready(context.Background()); err != nil {
		return nil, err
	}
	return manager, nil
}
func (m *Manager) ProductionReady() bool {
	return m != nil && m.config.Environment == "production" && m.approval.Identity(m.config.Issuer)
}
func (m *Manager) SandboxReady() bool { return m != nil && m.config.Environment == "sandbox" }

type Challenge struct {
	ID          string `json:"challenge"`
	Nonce       string `json:"nonce"`
	CSRF        string `json:"csrf"`
	Environment string `json:"environment"`
}

func (m *Manager) Challenge(ctx context.Context) (Challenge, error) {
	if m.config.Environment == "production" && !m.ProductionReady() {
		return Challenge{}, failure("IDENTITY_RELEASE_NOT_AUTHORIZED")
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	id, err := randomToken()
	if err != nil {
		return Challenge{}, err
	}
	nonce, err := randomToken()
	if err != nil {
		return Challenge{}, err
	}
	csrf, err := randomToken()
	if err != nil {
		return Challenge{}, err
	}
	_, err = m.db.ExecContext(ctx, `INSERT INTO payment_login_challenges(challenge_digest,nonce_digest,csrf_digest,expires_at) VALUES($1,$2,$3,now()+interval '5 minutes')`, digest(id), digest(nonce), digest(csrf))
	if err != nil {
		return Challenge{}, failure("AUTHENTICATION_UNAVAILABLE")
	}
	return Challenge{id, nonce, csrf, m.config.Environment}, nil
}

type Session struct {
	Token       string    `json:"session_token"`
	ExpiresAt   time.Time `json:"expires_at"`
	Environment string    `json:"environment"`
}

func (m *Manager) verify(raw, nonce string) (string, string, error) {
	if len(raw) > 16384 || len(raw) < 50 || !tokenPattern.MatchString(nonce) {
		return "", "", failure("LOGIN_INVALID")
	}
	parsed, err := jwt.Parse(raw, func(t *jwt.Token) (any, error) {
		kid, ok := t.Header["kid"].(string)
		if !ok || m.keys[kid] == nil || t.Header["jku"] != nil || t.Header["jwk"] != nil || t.Header["crit"] != nil {
			return nil, failure("LOGIN_INVALID")
		}
		return m.keys[kid], nil
	}, jwt.WithValidMethods([]string{"RS256"}), jwt.WithIssuer(m.config.Issuer), jwt.WithAudience(m.config.Audience), jwt.WithExpirationRequired(), jwt.WithIssuedAt(), jwt.WithLeeway(30*time.Second), jwt.WithJSONNumber(), jwt.WithStrictDecoding())
	if err != nil || !parsed.Valid {
		return "", "", failure("LOGIN_INVALID")
	}
	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", failure("LOGIN_INVALID")
	}
	subject, err := claims.GetSubject()
	if err != nil || subject == "" || len(subject) > 255 || strings.ContainsRune(subject, 0) || strings.TrimSpace(subject) != subject {
		return "", "", failure("LOGIN_INVALID")
	}
	issued, e1 := claims.GetIssuedAt()
	expiry, e2 := claims.GetExpirationTime()
	actualNonce, ok := claims["nonce"].(string)
	if e1 != nil || e2 != nil || issued == nil || expiry == nil || expiry.Time.After(issued.Time.Add(time.Hour)) || !ok || subtle.ConstantTimeCompare([]byte(actualNonce), []byte(nonce)) != 1 {
		return "", "", failure("LOGIN_INVALID")
	}
	audience, err := claims.GetAudience()
	if err != nil || len(audience) > 1 && claims["azp"] != m.config.Audience {
		return "", "", failure("LOGIN_INVALID")
	}
	country := ""
	if m.config.CountryClaim != "" {
		if value, ok := claims[m.config.CountryClaim].(string); ok && countryPattern.MatchString(value) {
			country = value
		}
	}
	return subject, country, nil
}
func (m *Manager) Login(ctx context.Context, id, nonce, csrf, idToken string) (Session, error) {
	if m.config.Environment == "production" && !m.ProductionReady() {
		return Session{}, failure("IDENTITY_RELEASE_NOT_AUTHORIZED")
	}
	if !tokenPattern.MatchString(id) || !tokenPattern.MatchString(csrf) {
		return Session{}, failure("LOGIN_INVALID")
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	// Atomic bounded attempts persist even on failed verification. Single-use is locked below.
	result, err := m.db.ExecContext(ctx, `UPDATE payment_login_challenges SET attempts=attempts+1 WHERE challenge_digest=$1 AND consumed_at IS NULL AND expires_at>now() AND attempts<5 AND nonce_digest=$2 AND csrf_digest=$3`, digest(id), digest(nonce), digest(csrf))
	if err != nil {
		return Session{}, failure("AUTHENTICATION_UNAVAILABLE")
	}
	n, err := result.RowsAffected()
	if err != nil || n != 1 {
		return Session{}, failure("LOGIN_INVALID")
	}
	subject, country, err := m.verify(idToken, nonce)
	if err != nil {
		return Session{}, err
	}
	token, err := randomToken()
	if err != nil {
		return Session{}, err
	}
	customer := "cust_" + digest(m.config.Issuer+"\x00"+subject)
	tx, err := m.db.BeginTx(ctx, nil)
	if err != nil {
		return Session{}, failure("AUTHENTICATION_UNAVAILABLE")
	}
	defer tx.Rollback()
	result, err = tx.ExecContext(ctx, `UPDATE payment_login_challenges SET consumed_at=now() WHERE challenge_digest=$1 AND consumed_at IS NULL AND expires_at>now()`, digest(id))
	if err != nil {
		return Session{}, failure("AUTHENTICATION_UNAVAILABLE")
	}
	n, err = result.RowsAffected()
	if err != nil || n != 1 {
		return Session{}, failure("LOGIN_INVALID")
	}
	_, err = tx.ExecContext(ctx, `INSERT INTO payment_customers(customer_id,issuer,subject_digest,verified_country) VALUES($1,$2,$3,$4) ON CONFLICT(customer_id) DO UPDATE SET verified_country=excluded.verified_country`, customer, m.config.Issuer, digest(subject), country)
	if err != nil {
		return Session{}, failure("AUTHENTICATION_UNAVAILABLE")
	}
	var deleted sql.NullTime
	if err = tx.QueryRowContext(ctx, `SELECT deleted_at FROM payment_customers WHERE customer_id=$1 FOR UPDATE`, customer).Scan(&deleted); err != nil || deleted.Valid {
		return Session{}, failure("ACCOUNT_UNAVAILABLE")
	}
	var expires time.Time
	err = tx.QueryRowContext(ctx, `INSERT INTO payment_sessions(token_digest,customer_id,csrf_digest,environment,expires_at) VALUES($1,$2,$3,$4,now()+$5*interval '1 second') RETURNING expires_at`, digest(token), customer, digest(csrf), m.config.Environment, m.config.SessionTTL.Seconds()).Scan(&expires)
	if err != nil {
		return Session{}, failure("AUTHENTICATION_UNAVAILABLE")
	}
	if err = tx.Commit(); err != nil {
		return Session{}, failure("LOGIN_COMMIT_UNKNOWN")
	}
	return Session{token, expires, m.config.Environment}, nil
}
func bearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return strings.TrimPrefix(h, "Bearer ")
}
func (m *Manager) Authenticate(ctx context.Context, r *http.Request) (string, error) {
	if m.config.Environment == "production" && !m.ProductionReady() {
		return "", failure("IDENTITY_RELEASE_NOT_AUTHORIZED")
	}
	raw := bearer(r)
	if !tokenPattern.MatchString(raw) {
		return "", failure("UNAUTHENTICATED")
	}
	ctx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	var customer, csrf string
	err := m.db.QueryRowContext(ctx, `SELECT s.customer_id,s.csrf_digest FROM payment_sessions s JOIN payment_customers c USING(customer_id) WHERE s.token_digest=$1 AND s.environment=$2 AND s.expires_at>now() AND s.revoked_at IS NULL AND c.deleted_at IS NULL AND c.issuer=$3`, digest(raw), m.config.Environment, m.config.Issuer).Scan(&customer, &csrf)
	if err != nil {
		return "", failure("UNAUTHENTICATED")
	}
	if r.Method != "GET" && r.Method != "HEAD" && r.Method != "OPTIONS" {
		actual := r.Header.Get("X-CSRF-Token")
		if !tokenPattern.MatchString(actual) || subtle.ConstantTimeCompare([]byte(digest(actual)), []byte(csrf)) != 1 {
			return "", failure("CSRF_INVALID")
		}
	}
	return customer, nil
}
func (m *Manager) CustomerCountry(ctx context.Context, customer string) (string, error) {
	var country string
	err := m.db.QueryRowContext(ctx, `SELECT verified_country FROM payment_customers WHERE customer_id=$1 AND deleted_at IS NULL AND issuer=$2`, customer, m.config.Issuer).Scan(&country)
	if err != nil {
		return "", failure("ACCOUNT_UNAVAILABLE")
	}
	return country, nil
}
func (m *Manager) Logout(ctx context.Context, r *http.Request, deleteAccount bool) error {
	customer, err := m.Authenticate(ctx, r)
	if err != nil {
		return err
	}
	tx, err := m.db.BeginTx(ctx, nil)
	if err != nil {
		return failure("AUTHENTICATION_UNAVAILABLE")
	}
	defer tx.Rollback()
	if deleteAccount {
		if _, err = tx.ExecContext(ctx, `UPDATE payment_customers SET deleted_at=coalesce(deleted_at,now()) WHERE customer_id=$1`, customer); err != nil {
			return failure("AUTHENTICATION_UNAVAILABLE")
		}
		if _, err = tx.ExecContext(ctx, `UPDATE phase1_entitlements SET active=false,revoked_at=coalesce(revoked_at,now()),revocation_reason='ACCOUNT_DISABLED',revision=revision+1,updated_at=now() WHERE customer_id=$1 AND active`, customer); err != nil {
			return failure("AUTHENTICATION_UNAVAILABLE")
		}
		if _, err = tx.ExecContext(ctx, `INSERT INTO phase1_payment_audit(action,outcome,actor_hash) VALUES('ACCOUNT_DISABLE','ACCESS_REVOKED',$1)`, digest(customer)); err != nil {
			return failure("AUTHENTICATION_UNAVAILABLE")
		}

		_, err = tx.ExecContext(ctx, `UPDATE payment_sessions SET revoked_at=coalesce(revoked_at,now()) WHERE customer_id=$1`, customer)
	} else {
		_, err = tx.ExecContext(ctx, `UPDATE payment_sessions SET revoked_at=coalesce(revoked_at,now()) WHERE token_digest=$1`, digest(bearer(r)))
	}
	if err != nil {
		return failure("AUTHENTICATION_UNAVAILABLE")
	}
	if tx.Commit() != nil {
		return failure("AUTHENTICATION_UNAVAILABLE")
	}
	return nil
}
func DecodeConfig(raw []byte) (Config, error) {
	var wire struct {
		Environment       string `json:"environment"`
		Issuer            string `json:"issuer"`
		Audience          string `json:"audience"`
		ApprovalReference string `json:"approval_reference"`
		JWKSDigest        string `json:"jwks_sha256"`
		CountryClaim      string `json:"verified_country_claim"`
		SessionSeconds    int64  `json:"session_seconds"`
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if len(raw) > 16384 || d.Decode(&wire) != nil || d.Decode(new(any)) != io.EOF || wire.SessionSeconds < 300 || wire.SessionSeconds > 3600 {
		return Config{}, failure("IDENTITY_CONFIGURATION_UNAPPROVED")
	}
	return Config{wire.Environment, wire.Issuer, wire.Audience, wire.ApprovalReference, wire.JWKSDigest, wire.CountryClaim, time.Duration(wire.SessionSeconds) * time.Second}, nil
}

func (m *Manager) Ready(ctx context.Context) error {
	if m == nil || m.config.Environment == "production" && !m.ProductionReady() {
		return failure("IDENTITY_RELEASE_NOT_AUTHORIZED")
	}
	ctx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	var mode string
	if err := m.db.QueryRowContext(ctx, `SELECT environment FROM payment_environment_binding WHERE binding_id=1`).Scan(&mode); err != nil || mode != m.config.Environment {
		return failure("IDENTITY_DATABASE_ENVIRONMENT_MISMATCH")
	}
	rows, err := m.db.QueryContext(ctx, `SELECT s.token_digest,c.deleted_at,l.attempts FROM payment_sessions s LEFT JOIN payment_customers c USING(customer_id) LEFT JOIN payment_login_challenges l ON false LIMIT 0`)
	if err != nil {
		return failure("AUTHENTICATION_UNAVAILABLE")
	}
	rows.Close()
	return nil
}

func (m *Manager) NonProductionReady(environment string) bool {
	return m != nil && environment != "production" && m.config.Environment == environment
}
