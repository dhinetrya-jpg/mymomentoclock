-- PAY-P0-03 additive expansion; explicit operator transaction, no startup DDL.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS commercial_snapshot JSONB;
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS reconcile_state TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(reconcile_state IN ('ACTIVE','DEAD_LETTER'));
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS reconcile_lease_token TEXT;
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS reconcile_lease_until TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS phase1_one_pending_commercial ON phase1_orders(customer_id,capability_id) WHERE commercial_snapshot IS NOT NULL AND commercial_snapshot<>'null'::jsonb AND status IN ('CREATED','PENDING');
CREATE INDEX IF NOT EXISTS phase1_worker_claim ON phase1_orders(next_reconcile_at) WHERE reconcile_state='ACTIVE';
CREATE TABLE IF NOT EXISTS payment_customers(
 customer_id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject_digest TEXT NOT NULL,
 verified_country TEXT NOT NULL DEFAULT '', deleted_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(issuer,subject_digest)
);
CREATE TABLE IF NOT EXISTS payment_login_challenges(
 challenge_digest TEXT PRIMARY KEY, nonce_digest TEXT NOT NULL, csrf_digest TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0), expires_at TIMESTAMPTZ NOT NULL,
 consumed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_challenge_expiry ON payment_login_challenges(expires_at);
CREATE TABLE IF NOT EXISTS payment_sessions(
 token_digest TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES payment_customers(customer_id),
 csrf_digest TEXT NOT NULL, environment TEXT NOT NULL CHECK(environment IN ('local','test','sandbox','staging','production')),
 expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_session_owner ON payment_sessions(customer_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS payment_session_expiry ON payment_sessions(expires_at);
CREATE TABLE IF NOT EXISTS payment_environment_binding(binding_id INTEGER PRIMARY KEY CHECK(binding_id=1),environment TEXT NOT NULL CHECK(environment IN ('local','test','sandbox','staging','production')));
-- Empty intentionally: a privileged operator must bind the dedicated database, never app startup.
COMMIT;
