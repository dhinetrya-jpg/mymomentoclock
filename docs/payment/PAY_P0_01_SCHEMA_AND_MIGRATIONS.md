# Schema, migration and recovery plan

Authoritative tables remain phase1_orders, phase1_payment_events and phase1_entitlements; additive audit table phase1_payment_audit. Monetary values use BIGINT minor units. No card/PAN/CVV, birth chart, relationship, delivery address or raw provider payload is stored. Operator-controlled product catalog has approval_reference, unique product/version/capability, positive safe-integer amount, uppercase currency and optional bounded access duration. No live manifest is supplied.

| Record | Added fields / guarantees |
|---|---|
| Order | product_version, capability_id, idempotency_key, correlation_id, schema_version2, provider_revision, expiry/access-expiry, next_reconcile_at, reconcile_attempts; existing price/currency/customer/provider snapshot retained |
| Event | event_type, provider order/payment IDs, occurred_at, verified_at, received_at, processing_status, attempts, failure_class, safe_evidence JSON containing typed business fields only |
| Entitlement | capability, grant/revoke/expiry timestamps, revision, revocation_reason; active row alone never authorizes access |
| Audit | identity-generated key, order reference or pseudonymous actor hash, bounded action/outcome, correlation and timestamp |

Unique provider order/payment IDs and provider/event IDs use the provider NAMESPACE (`provider/account/environment`), not a global brand. Existing unscoped legacy namespaces are retained but cannot construct the new application service; reconcile them before any real import. A provider ID cannot serve unrelated orders inside one namespace. Existing uniqueness may be more restrictive than some provider payment-attempt models; this foundation intentionally binds one payment attempt per order. New attempts need a new order, not reassignment of paid IDs.

Unique(customer,idempotency_key) ensures retry-safe order identity; key reused for another product/provider conflicts. Price changes do not alter an existing snapshot. Product AccessDuration defines fixed access expiry measured from order creation, not a sliding lifetime on retries; owner must approve that policy or adapt it before deployment. No access_duration means no expiry. Provider order expiry is reserved metadata until an actual provider binds it. Cancellation/order expiration require authoritative provider evidence; access expiry is enforced by database time on every lookup.

Composite foreign keys enforce entitlement owner and event provider/order identity. Positive amounts, currency, status, revision and grant consistency constraints; customer/access/expiration-reconciliation indexes. Refunding one source revokes only its grant; another active purchase still authorizes. Expired/revoked grants are excluded.

## Explicit versioned operations

1. Back up existing database and test restore. Inspect row counts, namespace mapping, invalid currencies/owner mismatches and legacy statuses. Verify application versions/role grants and maintenance window.
2. 001_secure_payments.sql retained unchanged: repeatable CREATE IF NOT EXISTS. Run in explicit transaction for fresh setup.
3. 002_remove_unsafe_legacy_defaults.sql retained unchanged: separate optional reviewed operation affecting nonpayment legacy defaults, not part of payment startup.
4. 003_payment_application.sql: additive expansion in one transaction,5s lock timeout/60s statement timeout. No rows/tables deleted. Provider order ID becomes nullable for CREATED recovery. Status constraint extends reviewed model. New legacy-sensitive constraints are NOT VALID (new writes enforced; existing rows preserved). Re-execution tested.
5. 004_payment_validate.sql: separate explicit validation after preflight.5s lock/120s statement timeout. Validate new constraints; never silently delete/fix old rows to make it pass.
6. payment_runtime_role.sql: NOLOGIN nonsuperuser group with SELECT/INSERT/UPDATE on financial tables and audit SELECT/INSERT plus sequence USAGE. No DELETE/DDL grants. Separate approved login/secret provisioning and schema ownership review required. Check inherited/PUBLIC privileges in the actual database; do not blindly revoke shared privileges.

Index builds in003 are transactional ordinary CREATE INDEX and can block writers on large existing tables. This is NOT a guaranteed zero-downtime migration. For large production tables, prepare a separate reviewed concurrent-index expansion with matching constraint bindings, staged rollout and measured locks. No production operation occurred.

Dockerfile.payment-migrations and scripts/migrate-payments.sh are explicit operator tools requiring PAYMENT_MIGRATION_APPROVED=operator-reviewed, secret PGSERVICEFILE [payment], forced verify-full and no password/DSN on argv. Optional validation requires PAYMENT_VALIDATE_EXISTING=reviewed. No startup or Compose job runs this tool. No role/login defaults or passwords are supplied.

## Rollback / forward recovery

Prefer forward repair. Roll back application routing to the previous disabled checkout version; retain all new rows/columns and stop reconciliation. Do not execute a DROP script against financial evidence. CREATED orders are reconciled using stable idempotency rather than deleted. If migration003 fails before COMMIT, PostgreSQL rolls back its DDL. On004 validation failure, repair through an approved audited data plan then rerun; new writes remain constrained. Restore backup to an isolated instance and reconcile provider state before any disaster failover to avoid duplicate financial effects. Provider order creation cannot be rolled back by SQL; its retry semantics are an activation prerequisite.

Retention requires owner/legal approval: keep statutory orders/payment/audit records for the required jurisdictional period; restrict access and backups accordingly. Do not retain raw signed bodies. Minimal verified event evidence is needed for replay/recovery; archive/delete only after the approved reconciliation/dispute window and preserve uniqueness tombstones so deletion cannot re-enable replay. Never blanket-delete customer financial rows on ordinary profile deletion. A retention scheduler is not active.
