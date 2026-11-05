# Deployment specification — checkout remains disabled

Do not deploy or activate payments from this workstream. Default Docker/Compose/native service is stateless for payments. No production database, secrets, ingress or scheduler was created/applied. payment-isolation.yaml is an inactive future workload policy, not a payment Deployment. Current native ingress remains normalization-only.

## Prerequisites for a separate approved activation

Select real identity and provider adapters and sandbox accounts; approve server product/version/capability/pricing/currency, access duration and full/partial refund policy. Review provider idempotency and authoritative revision mapping. Obtain production approval after sandbox lifecycle, replay, refund/reversal and failure tests. Configure secret-manager mounted DSN with verify-full/sslrootcert, separate runtime login, internal service CA/client/server certs and allowed client SAN, real token verifier, registry/hosts and narrowly scoped provider egress. No default password/price exists.

PAYMENT_DATABASE_URL_FILE preferred (PAYMENT_DATABASE_URL also accepted by library), PAYMENT_DB_MAX_OPEN1..100 default20, idle half, lifetime30minutes, idle5minutes, connect5seconds. OpenDatabase forces TLS hostname/CA verification; invalid DSNs/duplicate override parameters fail with redacted codes. No fallback. NewService checks schema/readiness, not DDL. InternalTLS requires TLS1.3 client cert verification; NewInternalServer uses separate8443-style private listener,8s operation context and HTTP timeouts. Use actual approved hostname URLs and dedicated CA, never TLS bypass.

Node createMTLSTransport consumes approved URL/CA/cert/key paths and actual session verifier via reviewed bootstrap code, not an unsafe environment activation switch. Original bearer reverified by Go. Public clients never select service URL/customer ID/provider. No public payment ingress before separate review. Future egress policy must explicitly allow selected provider/proxy; current policy does not open Internet access. CNI enforcement itself must be validated live.

## Migration operation

Read SCHEMA_AND_MIGRATIONS first. Back up and restore-test, preflight existing data/locks/roles, choose maintenance window or concurrent-index rollout. Build Dockerfile.payment-migrations. Secret PGSERVICEFILE [payment] must identify migration-owner login and trusted database CA. Explicitly run operator tool with PAYMENT_MIGRATION_APPROVED=operator-reviewed; optionally PAYMENT_VALIDATE_EXISTING=reviewed after preflight. It forces sslmode=verify-full; never logs DSN. Runtime role grants are a separate privileged operation. No automatic startup migrations. No database public port required.

## Readiness / shutdown / recovery

Injected Go handler checks Service.Ready for payment DB schema/connectivity on ready requests; missing native stays not ready. Public default health truthfully says payments unavailable. Dedicated internal service should call Ready from its own private readiness wiring before traffic; no ready response asserts provider sandbox correctness. Service.Close releases the pool; owning bootstrap must drain http.Server.Shutdown before Close. Existing native and Node graceful shutdown remain. No live payment listener is started here.

No reconciliation scheduler enabled. A future approved internal worker invokes Reconcile with context, threshold>=1minute, batch1..100. Durable next_reconcile_at lease60seconds, exponential failed retries capped1024minutes, normal cadence24hours, provider retrieval deadlines/cancellation. Provider creates must be idempotent beyond that lease. Do not expose a public admin endpoint or manually mark orders paid. On ambiguous commit, retry original key/event and read durable state. Unknown/mismatched/partial-refund events require controlled investigation.

## Monitoring / backup / incident expectations

OperationalStats gives actual pending order, retry/rejected event and overdue reconciliation counts per namespace. Export only over approved private monitoring, never customer IDs/birth data/card payloads. Suggested initial alerts to approve: any replay/identity/value conflict; retry/rejected growth; pending age beyond provider SLA; overdue worker >5minutes; DB connection/readiness failures; pool saturation; TLS expiry/verification failures. These are definitions, not installed working dashboards or fabricated metrics.

Use encrypted backups/PITR with approved RPO/RTO, restore to isolated instance, compare orders/events/grants and provider state before resuming. A provider's external order survives SQL rollback; recover using stable idempotency, not reissue a fresh payment. Test actual role/CA rotation and restore drills in staging. Audit staff access, restrict financial export, define legal retention/tombstones and deletion policy. No backup/restore or live alert delivery is claimed tested in this workstream.
