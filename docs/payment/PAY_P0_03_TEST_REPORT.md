# PAY-P0-03 — Test report

2026-11-06 (Asia/Kolkata). All provider interactions below are local fixtures. Genuine provider calls: **zero**. No production deployment/migration/charge.

| Executed command / scope | Result |
|---|---|
| npm run lint/build + npm --prefix frontend run lint/build | PASS, both frontend copies |
| node --import tsx --test tests/payment/{boundary.test.ts,pay02.test.tsx,pay03.test.tsx} tests/phase1/security.test.ts |73 passed,0 failed,0 skipped |
| node --import ./tests/calculation/register-assets.mjs --import tsx --test tests/calculation/integrity.test.tsx |41 passed,0 failed,0 skipped |
| PHASE1_REUSE_TEST_IMAGE=1 PHASE1_CA_BUNDLE=<trusted-system-bundle> sh scripts/test-phase1-go.sh | PASS (exit0); final output in evidence/pay03/go-final-complete.log: dual modules normal/race/vet/CGO-disabled, real TLS PostgreSQL and restart |
| CHROMIUM_PATH=/usr/bin/chromium PHASE1_WEB_URL=http://127.0.0.1:3101 node tests/phase1/browser.mjs |PASS at375/1280: original application regression |
| CHROMIUM_PATH=/usr/bin/chromium node tests/payment/pay03-browser.mjs |12/12 PASS,6 scenarios at375/1280; local fake SDK only |
| Default/separate Docker artifacts and refusal/smoke checks | See final artifacts.log and image-build logs |
| Genuine Razorpay order/payment/webhook/refund |BLOCKED_EXTERNAL_DEPENDENCY, not performed |
| Actual deployment, merchant/provider approval, real identity login, encrypted backup restoration |NOT_TESTED/BLOCKED_EXTERNAL_DEPENDENCY |

Go fixtures explicitly apply006 after PAY02 migrations, use isolated test database names, verified TLS, random test DB credentials, ephemeral signing/mTLS keys and private restart state. No production DSN is read/migrated. Parent tests cover transaction rollback, ownership, expiry/revocation/review, duplicate events, concurrent checkout, receipt recovery, key overlap, leases/dead letters and role grants. Three recovery tests execute after actual PostgreSQL container restart (ledger, provider recovery, durable session). Initial gated runs intentionally skip post-restart-only tests until the dedicated second stage; ordinary Docker build Go tests skip DB-only suites when no disposable DSN is supplied. These skips are not passed integrations.

The authenticated commercial cross-service fixture invokes actual Node gateway→mTLS→Go identity/ledger→PostgreSQL→HTTP Razorpay fixture.20 concurrent duplicate requests create exactly one provider order. Observed mean83.58ms, p95 114.66ms and full-flow238.45ms are recorded in the final Go log as local_fixture_only; these are a small idempotency reliability sample, not a production throughput/capacity benchmark. No500,000-user capacity claim. Staging sustained workloads/pool sizing/provider rate limits remain review work.

Defects found and fixed during validation: shared test error variable race; browser test selector needed explicit checkout button after adding recovery control. Cloud Docker VFS exhausted disk during builds and a concurrent regression; failed attempts were discarded, identified task caches cleaned and checks rerun serially. Node tests need local listener permission, not network/TLS bypass. No failing attempt is called a pass.

Evidence files are redacted/safe test output only. Actual production secret manager/PKI/edge behavior, current provider semantics and legal approvals remain unverified. See RELEASE_GATES and SECURITY_AUDIT.
