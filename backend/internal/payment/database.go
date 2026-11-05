package payment

import (
	"context"
	"database/sql"
	"net/url"
	"os"
	"strconv"
	"time"
)

type DatabaseConfig struct {
	DSN                   string
	MaxOpen, MaxIdle      int
	Lifetime, IdleTimeout time.Duration
}

func DatabaseConfigFromEnvironment() (DatabaseConfig, error) {
	dsn := os.Getenv("PAYMENT_DATABASE_URL")
	if file := os.Getenv("PAYMENT_DATABASE_URL_FILE"); file != "" {
		b, err := os.ReadFile(file)
		if err != nil {
			return DatabaseConfig{}, problem("PAYMENT_DATABASE_CONFIGURATION_INVALID")
		}
		dsn = string(b)
		for len(dsn) > 0 && (dsn[len(dsn)-1] == '\n' || dsn[len(dsn)-1] == '\r') {
			dsn = dsn[:len(dsn)-1]
		}
	}
	n := 20
	if raw := os.Getenv("PAYMENT_DB_MAX_OPEN"); raw != "" {
		var err error
		n, err = strconv.Atoi(raw)
		if err != nil || n < 1 || n > 100 {
			return DatabaseConfig{}, problem("PAYMENT_DATABASE_CONFIGURATION_INVALID")
		}
	}
	return DatabaseConfig{dsn, n, n / 2, 30 * time.Minute, 5 * time.Minute}, nil
}
func OpenDatabase(ctx context.Context, c DatabaseConfig) (*sql.DB, error) {
	u, err := url.Parse(c.DSN)
	if err != nil || u.Hostname() == "" || u.User == nil || (u.Scheme != "postgres" && u.Scheme != "postgresql") || u.Query().Get("sslmode") != "verify-full" || c.MaxOpen < 1 || c.MaxOpen > 100 || c.MaxIdle < 0 || c.MaxIdle > c.MaxOpen || c.Lifetime <= 0 || c.IdleTimeout <= 0 {
		return nil, problem("PAYMENT_DATABASE_CONFIGURATION_INVALID")
	}
	// Prevent a URL query password/host override; libpq URL parsing must have one unambiguous host.
	for _, k := range []string{"host", "hostaddr", "user", "password", "dbname", "sslmode"} {
		if len(u.Query()[k]) > 1 || k != "sslmode" && u.Query().Get(k) != "" {
			return nil, problem("PAYMENT_DATABASE_CONFIGURATION_INVALID")
		}
	}
	q := u.Query()
	q.Set("connect_timeout", "5")
	u.RawQuery = q.Encode()
	db, err := sql.Open("postgres", u.String())
	if err != nil {
		return nil, problem("PAYMENT_STORAGE_UNAVAILABLE")
	}
	db.SetMaxOpenConns(c.MaxOpen)
	db.SetMaxIdleConns(c.MaxIdle)
	db.SetConnMaxLifetime(c.Lifetime)
	db.SetConnMaxIdleTime(c.IdleTimeout)
	check, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err = db.PingContext(check); err != nil {
		db.Close()
		return nil, problem("PAYMENT_STORAGE_UNAVAILABLE")
	}
	return db, nil
}

// Ready verifies connectivity and migration 003 without executing any schema changes.
func (s *Service) Ready(ctx context.Context) error {
	if s == nil {
		return problem("PAYMENT_PROVIDER_UNAVAILABLE")
	}
	ctx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()
	rows, err := s.store.DB.QueryContext(ctx, `SELECT o.schema_version,o.provider_revision,o.evidence_model,o.provider_create_attempted,e.processing_status,g.capability_id,a.action FROM phase1_orders o LEFT JOIN phase1_payment_events e USING(order_id) LEFT JOIN phase1_entitlements g USING(order_id) LEFT JOIN phase1_payment_audit a USING(order_id) LIMIT 0`)
	if err != nil {
		return problem("PAYMENT_STORAGE_UNAVAILABLE")
	}
	rows.Close()
	return nil
}
func (s *Service) Close() error {
	if s == nil {
		return nil
	}
	return s.store.DB.Close()
}
