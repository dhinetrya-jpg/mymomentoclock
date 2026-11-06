-- Explicit operator action AFTER006, with existing separate migration/runtime roles.
BEGIN;
GRANT SELECT,INSERT,UPDATE ON payment_customers,payment_login_challenges,payment_sessions TO mymomentoclock_payment_runtime;
GRANT SELECT ON payment_environment_binding TO mymomentoclock_payment_runtime;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='mymomentoclock_payment_observer') THEN
 CREATE ROLE mymomentoclock_payment_observer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
 END IF;
END $$;
GRANT USAGE ON SCHEMA public TO mymomentoclock_payment_observer;
GRANT SELECT ON phase1_orders,phase1_payment_events,phase1_entitlements,phase1_payment_audit TO mymomentoclock_payment_observer;
COMMIT;
-- No auth-session/token table access for observer, no DDL/DELETE/financial correction privilege.
