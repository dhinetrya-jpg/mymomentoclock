-- Explicit second-stage validation AFTER inspecting preexisting rows.
-- Not startup DDL. Do not execute until preflight and backup/restore review succeed.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='120s';
ALTER TABLE phase1_orders VALIDATE CONSTRAINT phase1_currency_valid;
ALTER TABLE phase1_orders VALIDATE CONSTRAINT phase1_revision_valid;
ALTER TABLE phase1_entitlements VALIDATE CONSTRAINT phase1_entitlement_owner;
ALTER TABLE phase1_entitlements VALIDATE CONSTRAINT phase1_grant_valid;
ALTER TABLE phase1_payment_events VALIDATE CONSTRAINT phase1_event_provider;
COMMIT;
