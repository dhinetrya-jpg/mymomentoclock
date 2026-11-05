# PAY-P0-02 test report — local evidence, real sandbox BLOCKED

Implementation `e22a04b4f57e450fd008677d3faac72e0784fb3d` (functional code commits cd9492a and e22a04b); base069587b0d9e4c273bf87b7b9c51431595aebc5b8. Branch fix/pay-p0-02-provider-sandbox-integration. Final documentation/delivery commits follow; final GitHub SHA is supplied in the handoff response.

## Actual sandbox verification status

**REAL_PROVIDER_SANDBOX_VERIFIED = BLOCKED_EXTERNAL_DEPENDENCY.**

- Genuine provider order API mutations:0.
- Genuine sandbox payments/captures:0.
- Genuine merchant-signed webhooks received:0.
- Genuine sandbox refunds/reversals:0.
- No approved provider/account/credentials, real identity, approved pricing or external webhook environment is configured.
- Current hosted Razorpay documentation retrieval returned HTTP403; official SDK source was fetched/pinned read-only at23677d8c4eb27673b2eeff06317cd12f7a7cf6ad. This is not a provider transaction.

All successful adapter interactions below target loopback HTTP fixtures with synthetic credentials. No local fixture PASS is a genuine sandbox PASS. ProductionReady=false and checkout remains unavailable by default. Overall release **NO-GO**.

## Executed commands and results

| Command / check | Actual result |
|---|---|
| `npm ci` | PASS |
| `npm run lint && npm run build` | PASS root frontend |
| `npm --prefix frontend run lint && npm --prefix frontend run build` | PASS alternate frontend |
| `node --import ./tests/calculation/register-assets.mjs --import tsx --test tests/calculation/integrity.test.tsx tests/phase1/security.test.ts tests/payment/boundary.test.ts tests/payment/pay02.test.tsx` |82 passed,0 failed,0 skipped,2791ms recorded final Node run |
| `PHASE1_REUSE_TEST_IMAGE=1 sh scripts/test-phase1-go.sh` | PASS final source against existing official native/Go toolchain image; all source mounted live, fresh-count1, no cached test outcomes |
| Go full gate |go1.26.10; root and backend test/race/vet plus CGO_ENABLED=0; actual TLS PostgreSQL16; actual Node22->mTLS->Go->PostgreSQL->Razorpay HTTP fixture; real DB restart |
| Verbose Go result lines in go-release-verified.log |289 PASS lines including nested subtests,0 FAIL,2 conditional recovery SKIP lines before external restart; both named recovery tests subsequently PASS after actual restart. Other normal/race/non-CGO package passes are not invented individual counts |
| Provider unit checks |Config, Basic auth, exact signature, missing/invalid/tampered signature, malformed/unsupported event, wrong merchant/order/amount/currency, captured/authorized/failed/refund/partial-review states, timeouts, bounded GET and no POST retry all pass |
| PAY01 continuity |Original state/ownership/value/concurrency/rollback/restart tests preserved; legacy event fingerprint golden test passes; default unavailable security/privacy paths unchanged |
| Native production Docker build |PASS `docker build --secret id=proxy_ca,src=/etc/ssl/certs/ca-certificates.crt -t mymomentoclock-native-pay02 .` |
| Web production Docker build |PASS corresponding `-f Dockerfile.web -t mymomentoclock-web-pay02` |
| Functional smoke |PASS `node tests/deployment/smoke.mjs engine http://127.0.0.1:18081` and `web http://127.0.0.1:13001` against actual constrained production images |
| Cross-service contracts |PASS `PHASE1_WEB_URL=http://127.0.0.1:13001 PHASE1_ENGINE_URL=http://127.0.0.1:18081 node tests/phase1/contracts.mjs` |
| Browser |PASS375px/1280px via `CHROMIUM_PATH=/usr/bin/chromium PHASE1_WEB_URL=http://127.0.0.1:13001 node tests/phase1/browser.mjs`: chart/input/divisions, BTR safe state, modals, festival/city/seal, disabled checkout, no overflow/cross-origin transfer/browser storage |
| Runtime sandbox/production refusal |Actual native image refuses production mode; refuses unapproved sandbox; approved sandbox flag without identity refuses before secret/DB/API access. startup-refusal.log |
| Shutdown |Web/native constrained containers stopped with exit0; all test containers/networks/temporary keys and DB credentials removed |
| Static configuration |Compose resolves; workflow/deployment YAML parses; no Kubernetes/production apply. git diff --check passes |

## Provider/application integration proof

A separate disposable pay02_fixture database isolates adapter tests from concurrent PAY01 tests in phase1_test. Test helper first refuses a non-test input DSN. A controlled test Identity (only _test.go) and real production adapter code target a local Basic-auth HTTP fixture. Node calls actual Go handler over verified mutual TLS; approved TEST catalog reserves PostgreSQL order before API. Real adapter creates/binds provider-shaped order, valid HMAC notification retrieves authoritative snapshot, durable grant becomes active, another customer cannot read it, duplicate produces no second grant, full processed-refund snapshot revokes. Twenty terminal notifications preserve no access. Actual DB restart preserves the provider-integrated refunded marker, alongside original domain/application markers.

Lost acknowledgement: fixture order POST persists then drops connection. Database keeps original CREATED order/create-attempt intent. Newly constructed adapter/application recovers the same internal order by receipt and binds it; exactly one POST was made. This proves application-object reconstruction/durable retry behavior, not a real provider consistency guarantee or arbitrary OS crash at every instruction. Empty ambiguous receipt lookup never causes another POST. Existing crash/connection-loss transaction tests remain green.

## Corrected defects / second sweep

First full run caught migration003 re-execution rejecting a new payment-status value.005 now uses separate fulfillment-review flag, preserving the old status constraint and original tests. New event fields initially would have changed old canonical fingerprints; omitempty plus golden regression preserves PAY01 hashes. Full signed-body digest prevents conflicting raw callbacks collapsing to the same typed fingerprint. Callback notifications cannot directly fulfill, and reconciliation marks them only after authoritative snapshot. Strict IDs/value/entity/captured/refund checks, no inferred revision, no unsafe POST retry, live-key forwarding rejection and default identity block reviewed.

Disposable Docker VFS exhausted disk in one verification attempt. Inspected image/cache ancestry and removed only specific superseded task artifacts, then reran the full source gate successfully. No broad prune, repository/user volume deletion or test weakening. Reused toolchain image is a test accelerator only; final production images were separately built from final functional source. Earlier failed logs are not presented as green evidence.

## Reproduction and unexecuted tests

Run npm ci, both lint/build commands and Node command above. On Docker/OpenSSL host run `PHASE1_CA_BUNDLE=/path/to/trusted-combined-ca.pem sh scripts/test-phase1-go.sh`; omit CA variable outside proxy environment. By default rebuilds root-tests toolchain. PHASE1_REUSE_TEST_IMAGE=1 requires an already-built trusted image; source tests still fresh and live-mounted. No TLS/checksum bypass. Bare Go tests without disposable DB skip integration cases and are insufficient. Full script creates CA/private DB/network/Node22 fixture and cleans them, then explicitly restarts DB and runs both recovery tests.

Genuine order/payment/webhook/refund tests are BLOCKED, not mocked successes or framework skips. No official widget transaction, provider dispute/reversal, real identity issuer/session, production migration/network/backup restore, installed alerts, live pagination/consistency or load capacity was verified. Optional sandbox UI is prepared/render-tested; actual official SDK interaction requires approved current docs/credentials/identity/environment. See gate table in HANDOFF.
