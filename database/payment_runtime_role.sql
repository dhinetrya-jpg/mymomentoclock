-- Privileged operator template, executed separately from application startup.
-- No login/password is created: bind an owner-approved login to this NOLOGIN group.
-- Schema migration owner must be a separate role. Review database/schema ownership first.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mymomentoclock_payment_runtime') THEN
 CREATE ROLE mymomentoclock_payment_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
 END IF;
END $$;
GRANT USAGE ON SCHEMA public TO mymomentoclock_payment_runtime;
GRANT SELECT,INSERT,UPDATE ON phase1_orders,phase1_payment_events,phase1_entitlements TO mymomentoclock_payment_runtime;
GRANT SELECT,INSERT ON phase1_payment_audit TO mymomentoclock_payment_runtime;
GRANT USAGE,SELECT ON SEQUENCE phase1_payment_audit_audit_id_seq TO mymomentoclock_payment_runtime;
COMMIT;
-- Database owner must separately review PUBLIC CONNECT/CREATE/TEMP grants. Never blindly
-- REVOKE shared database privileges in a migration without checking unrelated applications.
