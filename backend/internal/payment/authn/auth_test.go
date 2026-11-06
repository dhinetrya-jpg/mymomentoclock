package authn

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func keys(t *testing.T) (*rsa.PrivateKey, []byte, Config) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(map[string]any{"keys": []any{map[string]any{"kty": "RSA", "kid": "fixture-key", "use": "sig", "alg": "RS256", "n": base64.RawURLEncoding.EncodeToString(key.N.Bytes()), "e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes())}}})
	sum := sha256.Sum256(raw)
	return key, raw, Config{Environment: "test", Issuer: "https://identity.fixture.invalid", Audience: "fixture-client", ApprovalReference: "fixture-only-approval", JWKSDigest: hex.EncodeToString(sum[:]), CountryClaim: "verified_country", SessionTTL: 30 * time.Minute}
}
func signed(t *testing.T, key *rsa.PrivateKey, c Config, nonce, subject string, change func(jwt.MapClaims)) string {
	t.Helper()
	now := time.Now()
	claims := jwt.MapClaims{"iss": c.Issuer, "aud": c.Audience, "sub": subject, "iat": now.Unix(), "exp": now.Add(15 * time.Minute).Unix(), "nonce": nonce, "verified_country": "IN", "email": "ignored@example.invalid"}
	if change != nil {
		change(claims)
	}
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = "fixture-key"
	raw, err := token.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return raw
}
func TestPinnedOIDCVerification(t *testing.T) {
	key, _, c := keys(t)
	m := &Manager{config: c, keys: map[string]*rsa.PublicKey{"fixture-key": &key.PublicKey}}
	nonce := strings.Repeat("a", 64)
	subject, country, err := m.verify(signed(t, key, c, nonce, "stable-subject", nil), nonce)
	if err != nil || subject != "stable-subject" || country != "IN" {
		t.Fatal(err)
	}
	for name, change := range map[string]func(jwt.MapClaims){"issuer": func(c jwt.MapClaims) { c["iss"] = "https://wrong.invalid" }, "audience": func(c jwt.MapClaims) { c["aud"] = "wrong" }, "expired": func(c jwt.MapClaims) { c["exp"] = time.Now().Add(-time.Hour).Unix() }, "future": func(c jwt.MapClaims) { c["iat"] = time.Now().Add(time.Hour).Unix() }, "nonce": func(c jwt.MapClaims) { c["nonce"] = "wrong" }, "missing expiry": func(c jwt.MapClaims) { delete(c, "exp") }, "missing issued": func(c jwt.MapClaims) { delete(c, "iat") }, "subject": func(c jwt.MapClaims) { c["sub"] = "" }, "multiple audiences": func(c jwt.MapClaims) { c["aud"] = []string{"fixture-client", "other"} }, "excess lifetime": func(c jwt.MapClaims) { c["exp"] = time.Now().Add(24 * time.Hour).Unix() }} {
		t.Run(name, func(t *testing.T) {
			if _, _, err := m.verify(signed(t, key, c, nonce, "subject", change), nonce); err == nil {
				t.Fatal("untrusted identity accepted")
			}
		})
	}
	wrong, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err = m.verify(signed(t, wrong, c, nonce, "subject", nil), nonce); err == nil {
		t.Fatal("bad signature")
	}
	hs := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "subject"})
	raw, _ := hs.SignedString([]byte("fixture-only-secret"))
	if _, _, err = m.verify(raw, nonce); err == nil {
		t.Fatal("algorithm confusion")
	}
}
func authDB(t *testing.T, reset bool) *sql.DB {
	t.Helper()
	raw := os.Getenv("PHASE1_TEST_DATABASE_URL")
	if raw == "" {
		t.Skip("isolated PostgreSQL required")
	}
	u, err := url.Parse(raw)
	if err != nil || u.Path != "/phase1_test" {
		t.Fatal("refusing non-test database")
	}
	admin, err := sql.Open("postgres", raw)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	var exists bool
	if err = admin.QueryRow(`SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname='pay03_auth_fixture')`).Scan(&exists); err != nil {
		t.Fatal(err)
	}
	if !exists {
		if _, err = admin.Exec(`CREATE DATABASE pay03_auth_fixture`); err != nil {
			t.Fatal(err)
		}
	}
	u.Path = "/pay03_auth_fixture"
	db, err := sql.Open("postgres", u.String())
	if err != nil {
		t.Fatal(err)
	}
	db.SetMaxOpenConns(8)
	t.Cleanup(func() { db.Close() })
	if reset {
		for _, file := range []string{"001_secure_payments.sql", "003_payment_application.sql", "005_provider_sandbox.sql", "006_commercial_readiness.sql"} {
			data, err := os.ReadFile("../../../../database/migrations/" + file)
			if err != nil {
				t.Fatal(err)
			}
			for i := 0; i < 2; i++ {
				if _, err = db.Exec(string(data)); err != nil {
					t.Fatal(err)
				}
			}
		}
		if _, err = db.Exec(`TRUNCATE payment_sessions,payment_customers,payment_login_challenges;INSERT INTO payment_environment_binding(binding_id,environment) VALUES(1,'test') ON CONFLICT(binding_id) DO UPDATE SET environment='test'`); err != nil {
			t.Fatal(err)
		}
	}
	return db
}
func request(method, token, csrf string) *http.Request {
	r := httptest.NewRequest(method, "/", nil)
	r.Header.Set("Authorization", "Bearer "+token)
	r.Header.Set("X-CSRF-Token", csrf)
	r.Header.Set("X-User-ID", "attacker-supplied")
	return r
}
func TestDurableSessions(t *testing.T) {
	db := authDB(t, true)
	key, jwks, c := keys(t)
	m, err := New(db, c, jwks, nil)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	login := func(subject string) (Session, Challenge) {
		t.Helper()
		challenge, err := m.Challenge(ctx)
		if err != nil {
			t.Fatal(err)
		}
		s, err := m.Login(ctx, challenge.ID, challenge.Nonce, challenge.CSRF, signed(t, key, c, challenge.Nonce, subject, nil))
		if err != nil {
			t.Fatal(err)
		}
		return s, challenge
	}
	a, ca := login("customer-a")
	b, cb := login("customer-b")
	aid, err := m.Authenticate(ctx, request("GET", a.Token, ""))
	if err != nil || strings.Contains(aid, "@") || aid == "attacker-supplied" {
		t.Fatal(aid, err)
	}
	bid, _ := m.Authenticate(ctx, request("GET", b.Token, ""))
	if aid == bid {
		t.Fatal("account substitution")
	}
	if _, err = m.Authenticate(ctx, request("POST", a.Token, "")); err == nil {
		t.Fatal("missing CSRF accepted")
	}
	if _, err = m.Authenticate(ctx, request("POST", a.Token, ca.CSRF)); err != nil {
		t.Fatal(err)
	}
	if _, err = m.Authenticate(ctx, request("POST", a.Token, cb.CSRF)); err == nil {
		t.Fatal("cross-session CSRF")
	}
	if _, err = m.Login(ctx, ca.ID, ca.Nonce, ca.CSRF, signed(t, key, c, ca.Nonce, "customer-a", nil)); err == nil {
		t.Fatal("nonce reuse")
	}
	// The same challenge cannot create multiple sessions under concurrent login.
	challenge, err := m.Challenge(ctx)
	if err != nil {
		t.Fatal(err)
	}
	jwtToken := signed(t, key, c, challenge.Nonce, "concurrent-subject", nil)
	var count atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := m.Login(ctx, challenge.ID, challenge.Nonce, challenge.CSRF, jwtToken); err == nil {
				count.Add(1)
			}
		}()
	}
	wg.Wait()
	if count.Load() != 1 {
		t.Fatal("duplicate session", count.Load())
	}
	second, secondChallenge := login("customer-a")
	if err = m.Logout(ctx, request("POST", a.Token, ca.CSRF), false); err != nil {
		t.Fatal(err)
	}
	if _, err = m.Authenticate(ctx, request("GET", a.Token, "")); err == nil {
		t.Fatal("logout failed")
	}
	if _, err = m.Authenticate(ctx, request("GET", second.Token, "")); err != nil {
		t.Fatal("independent session revoked")
	}
	if _, err = db.Exec(`INSERT INTO phase1_orders(order_id,customer_id,product_id,provider,provider_order_id,amount_minor,currency,status) VALUES('retained-financial-row',$1,'fixture','fixture/account/test','fixture-order',12345,'INR','PENDING') ON CONFLICT(order_id) DO NOTHING`, aid); err != nil {
		t.Fatal(err)
	}
	if err = m.Logout(ctx, request("POST", second.Token, secondChallenge.CSRF), true); err != nil {
		t.Fatal(err)
	}
	if _, err = m.Authenticate(ctx, request("GET", second.Token, "")); err == nil {
		t.Fatal("deleted account active")
	}
	var rows int
	db.QueryRow(`SELECT count(*) FROM phase1_orders WHERE order_id='retained-financial-row'`).Scan(&rows)
	if rows != 1 {
		t.Fatal("financial retention lost")
	}
	deletedChallenge, err := m.Challenge(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = m.Login(ctx, deletedChallenge.ID, deletedChallenge.Nonce, deletedChallenge.CSRF, signed(t, key, c, deletedChallenge.Nonce, "customer-a", nil)); err == nil {
		t.Fatal("account resurrected")
	}
	if _, err = db.Exec(`UPDATE payment_sessions SET expires_at=now()-interval '1 second' WHERE token_digest=$1`, digest(b.Token)); err != nil {
		t.Fatal(err)
	}
	if _, err = m.Authenticate(ctx, request("GET", b.Token, "")); err == nil {
		t.Fatal("expired session")
	}
	// Failed login attempts are durable and bounded.
	ch, err := m.Challenge(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 5; i++ {
		_, _ = m.Login(ctx, ch.ID, ch.Nonce, ch.CSRF, "invalid")
	}
	if _, err = m.Login(ctx, ch.ID, ch.Nonce, ch.CSRF, signed(t, key, c, ch.Nonce, "subject", nil)); err == nil {
		t.Fatal("attempt limit bypassed")
	}
	// Explicit private test state for the external restart; never a report or production credential.
	if file := os.Getenv("PAY03_RESTART_SESSION_FILE"); file != "" {
		session, _ := login("restart-subject")
		if err = os.WriteFile(file, []byte(session.Token), 0600); err != nil {
			t.Fatal("restart state file")
		}
	}
}
func TestSessionRecoveryAfterRestart(t *testing.T) {
	if os.Getenv("PHASE1_TEST_RESTART_CHECK") != "1" {
		t.Skip("explicit post-restart check")
	}
	db := authDB(t, false)
	_, jwks, c := keys(t)
	m, err := New(db, c, jwks, nil)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := os.ReadFile(os.Getenv("PAY03_RESTART_SESSION_FILE"))
	if err != nil {
		t.Fatal("private restart state missing")
	}
	if _, err = m.Authenticate(context.Background(), request("GET", string(raw), "")); err != nil {
		t.Fatal("session recovery failed", err)
	}
}
