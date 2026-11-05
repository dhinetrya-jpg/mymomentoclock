-- PAY-P0-01 additive expansion; explicit operator-run transaction, never startup DDL.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS product_version TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS capability_id TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS correlation_id TEXT NOT NULL DEFAULT '';
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 2;
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS provider_revision BIGINT NOT NULL DEFAULT 0;
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS next_reconcile_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS reconcile_attempts INTEGER NOT NULL DEFAULT 0;
-- NULL means provider creation has not yet been confirmed; existing data retained.
ALTER TABLE phase1_orders ALTER COLUMN provider_order_id DROP NOT NULL;
ALTER TABLE phase1_orders DROP CONSTRAINT IF EXISTS phase1_orders_status_check;
ALTER TABLE phase1_orders ADD CONSTRAINT phase1_orders_status_check CHECK(status IN ('CREATED','PENDING','COMPLETED','FAILED','CANCELLED','EXPIRED','REFUNDED','REVERSED'));
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='phase1_currency_valid') THEN
 ALTER TABLE phase1_orders ADD CONSTRAINT phase1_currency_valid CHECK(currency::text ~ '^[A-Z]{3}$') NOT VALID;
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS phase1_order_retry ON phase1_orders(customer_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS phase1_order_customer ON phase1_orders(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS phase1_order_reconcile ON phase1_orders(next_reconcile_at) WHERE status IN ('CREATED','PENDING','FAILED','COMPLETED');
ALTER TABLE phase1_payment_events ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE phase1_payment_events ADD COLUMN IF NOT EXISTS provider_order_id TEXT NOT NULL DEFAULT '';
ALTER TABLE phase1_payment_events ADD COLUMN IF NOT EXISTS provider_payment_id TEXT NOT NULL DEFAULT '';
ALTER TABLE phase1_payment_events ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE phase1_payment_events ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;
ALTER TABLE phase1_payment_events ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE phase1_payment_events ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'PROCESSED' CHECK(processing_status IN ('PENDING','PROCESSED','IGNORED','REJECTED','RETRY'));
ALTER TABLE phase1_payment_events ADD COLUMN IF NOT EXISTS processing_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE phase1_payment_events ADD COLUMN IF NOT EXISTS failure_class TEXT NOT NULL DEFAULT '';
ALTER TABLE phase1_payment_events ADD COLUMN IF NOT EXISTS safe_evidence JSONB NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS phase1_event_pending ON phase1_payment_events(received_at) WHERE processing_status IN ('PENDING','RETRY');
ALTER TABLE phase1_entitlements ADD COLUMN IF NOT EXISTS capability_id TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE phase1_entitlements ADD COLUMN IF NOT EXISTS granted_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE phase1_entitlements ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE phase1_entitlements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE phase1_entitlements ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;
ALTER TABLE phase1_entitlements ADD COLUMN IF NOT EXISTS revocation_reason TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS phase1_access_lookup ON phase1_entitlements(customer_id,capability_id) WHERE active;
CREATE TABLE IF NOT EXISTS phase1_payment_audit(
 audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id TEXT REFERENCES phase1_orders(order_id), action TEXT NOT NULL,
 outcome TEXT NOT NULL, correlation_id TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE phase1_payment_audit ADD COLUMN IF NOT EXISTS actor_hash TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS phase1_audit_order ON phase1_payment_audit(order_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS phase1_order_customer_identity ON phase1_orders(order_id,customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS phase1_order_provider_identity ON phase1_orders(order_id,provider);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='phase1_entitlement_owner') THEN
 ALTER TABLE phase1_entitlements ADD CONSTRAINT phase1_entitlement_owner FOREIGN KEY(order_id,customer_id) REFERENCES phase1_orders(order_id,customer_id) NOT VALID;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='phase1_event_provider') THEN
 ALTER TABLE phase1_payment_events ADD CONSTRAINT phase1_event_provider FOREIGN KEY(order_id,provider) REFERENCES phase1_orders(order_id,provider) NOT VALID;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='phase1_revision_valid') THEN
 ALTER TABLE phase1_orders ADD CONSTRAINT phase1_revision_valid CHECK(provider_revision>=0 AND reconcile_attempts>=0) NOT VALID;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='phase1_grant_valid') THEN
 ALTER TABLE phase1_entitlements ADD CONSTRAINT phase1_grant_valid CHECK(revision>0 AND (NOT active OR revoked_at IS NULL)) NOT VALID;
 END IF;
END $$;
COMMIT;
