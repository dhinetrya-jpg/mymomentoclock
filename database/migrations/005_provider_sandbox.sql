-- Explicit additive operation, never startup DDL. No production activation.
BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS provider_create_attempted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS evidence_model TEXT NOT NULL DEFAULT 'ORDERED_REVISION';
ALTER TABLE phase1_orders ADD COLUMN IF NOT EXISTS provider_review_required BOOLEAN NOT NULL DEFAULT false;
COMMIT;
