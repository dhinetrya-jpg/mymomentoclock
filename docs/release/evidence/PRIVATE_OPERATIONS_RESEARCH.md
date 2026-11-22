# Private operations research

Pinned inspected head: 2ebe669574a4b470bb4c8b2c3ebda7587e1eff90. Research date2026-11-21 UTC. Read-only source inspection, no deployment/source edits. Sources below are repository blobs at that exact head; historical report dates are retained and are not current certification.

## Verdict

A payment-disabled, anonymous stateless engineering preview can be eligible without production/live-payment activation approval. Missing production signature/live credentials/merchant activation alone must not be described as blocking such a preview. Full approved product private readiness remains unestablished because the approved inventory/domain methods and applicable functionality acceptance are incomplete, and no actual chosen private hosting/access/TLS runtime has been verified.

Existing loopback Compose is an explicit limited preview, not full private-product deployment. Preserve disabled identities/profiles/payments/AI and unavailable personal timing. Eligible independent work includes runtime smoke/security checks, accurate scope docs, artifact/config validation and removal of unnecessary Kubernetes service-account mounts. Do not invent platform, production hostname, TLS issuer, identity issuer, RPO/RTO or live activation choices.

## Applicable gates by deployment scope

| Scope | Applicable evidence needed | Not required merely for this scope |
|---|---|---|
| Local loopback anonymous stateless preview | Exact artifact tests, nonroot/read-only runtime, input/privacy/refusal behavior, honest unavailable features, no birth persistence/logging, bounded requests, startup/shutdown | Merchant/KYC/live keys, signed production activation, payment DB restore, identity provider if protected data/features remain unavailable |
| Hosted restricted stateless preview | Above plus an approved access boundary (VPN/identity-aware proxy/platform access or approved app auth), real TLS/proxy config, limited ingress/internal networking, operational owner/rollback, retention/access logs reviewed, actual browser/runtime acceptance | Live-payment authorization and full commercial26-gate PASS if commerce stays disabled; financial PITR if no financial datastore exists |
| Preview including private stored profiles | Real identity/session ownership and privacy/retention/deletion controls, encrypted storage/backups/restore sized to approved recovery objective | Payment-specific merchant/catalog/live activation unless payments enabled |
| Genuine sandbox commerce | Identity/catalog/test account/source docs, exact-origin TLS/mTLS, secret provisioning, isolated verified DB/migrations, genuine order/payment/webhook/refund/recovery evidence, monitoring/restore | Live credentials and production authorization; sandbox success is not production readiness |
| Full approved product private acceptance | Approved complete feature inventory and all in-scope functionality/domain/scientific/security/operations acceptance, with honest exclusions explicitly approved | Production/live-payment activation unless expressly added to scope |

Historical PHASE1_FINAL_RELEASE_GATE.md (2026-11-05) G1-15 remains useful as a source of scoped boundaries. Its production NO-GO is not a blanket ban on disabled local preview: G5/G10 identity apply when protected profile/entitlement functionality is required; G8 astronomical acceptance and G7 actual personal timing apply if these are required by approved full-product scope; G11 operations and G14 privacy must be verified for the actual deployment, not inherited from old reports. G12/13 require current integrated regressions/UX. The historical wording 'any blocked required gate' requires determining scope, not mechanically requiring every activation gate for all previews.

PAY_P0_03_RELEASE_GATES.md (2026-11-06) is explicitly a LIVE activation report. G05/G21/G26 live secret/merchant/signed-production approval do not gate a disabled preview. G17-20 genuine sandbox evidence gates sandbox claims and live activation, not stateless anonymous previews. G01 identity, G02 catalog, G23 premium delivery are required if those capabilities are promised in private acceptance. G24 deploy review and G25 recovery/incident practices apply to actual persisted payment deployment; restart tests are not backups. PAY_P0_01_DEPLOYMENT_RUNBOOK.md requires encrypted backup/PITR with approvedRPO/RTO, isolated restore and financial consistency when ledger storage is used; it does not require creating a financial DB for a stateless preview.

## Actual configuration evidence

- docker-compose.yml:1-24: comments explicitly stateless/payment-disabled; only web+api. Ports bind127.0.0.1:3000 and127.0.0.1:8080. Read-only roots, bounded/tmp tmpfs, dropALL/no-new-privileges. No databases/workers/secrets/payment listener started.
- Dockerfile runtime stage: Debian CA/libstdc++/tzdata, USER65532, native8080. Default final target runtime, not commercial. Dockerfile.web runtime USERnode and final default excludes owner trust root. Both run as nonroot; no platform chosen.
- server.ts:5,39-40: anonymous stateless preview scope; health lists unavailable capabilities. Native backend main.go:257-274 uses plaintext8080 for standard service. This is acceptable only behind an appropriate internal boundary/termination; not a secure exposed private service by itself.
- server/f01Boundary.ts:99-106 requires configured HTTPS internal hostname plus CA/clientcertificate/key. Compose has none; native standard main has no F01 mTLS listener. Thus F01 is intentionally unavailable by default. Existing cross-service tests prove supplied test-TLS wiring, not a deployable production mTLS topology. Fixing this needs scoped architecture/config choice (native dedicated listener or reviewed mTLS proxy); do not silently downgrade gateway to plaintext.
- deploy/kubernetes/04-api-ingress.yaml:32 image is YOUR_CONTAINER_REGISTRY/...:latest;84-101 hostapi.mymomentoclock.production/TLSsecret are templates;91 exact normalization-only public route. No Node web workload or F01 internal mTLS path. This manifest cannot establish full-product private deployment. Replacing placeholders requires owner/platform configuration. Static registryplaceholder validation is eligible; choosing real registry/hostname is not established by evidence.
- deploy/kubernetes/06-network-policy.yaml permits API ingress only from ingress-nginx namespace and no egress; inactive DB ingress/egress closed. Effective CNI enforcement is untested. This intentionally prevents opening unsupported payment/database routes. Do not loosen to Internet access to make a probe pass.
- deploy/kubernetes/03-databases.yaml stores credentials only in referenced owner-managed Secrets; datastore pods are isolated by06 policy. No verifiedTLS/backup/migration orchestration exists; they are inactive future templates, not proof of current customer persistence.
- .github/workflows/deploy-pages.yml deploys Vite/dist only on main/master. A green Pages deploy is static SPA hosting, not Node/native/full API private acceptance. No claim that it supplies privacy/access restriction or server APIs is supported.

## Independently eligible concrete hardening

API pod template in deploy/kubernetes/04-api-ingress.yaml:26 has no automountServiceAccountToken:false. Kubernetes defaults to mounting its service-account credential unless disabled at account/workload level. Native API requires no Kubernetes API access; no use of in-cluster credentials was located. deploy/kubernetes/payment-commercial-review.md explicitly calls for no service-account token. Add false at spec.template.spec for API, optionally inactive PostgreSQL/Neo4j templates too. This reduces unnecessary credentials without selecting hosting platform, opening routes, altering application behavior or activating payments. Add a targeted static assertion for relevant workloads. This is unnecessary credential exposure/hardening, not evidence of a demonstrated exploitable Kubernetes privilege escalation; actual accountRBAC, admission policy and network behavior remain unknown.

No additional proven platform-independent runtime defect was established by this read-only pass. Normalization-only ingress, missing full F01 wiring, inactive database connectivity and trust-root absence are intentional scope limitations. Classifying them as accidental bugs would encourage unsafe activation. Full hosted private readiness still needs actual infrastructure choices plus executableTLS/access/runtime/recovery evidence appropriate to retained data.

## Precise unresolved inputs

1. Authoritative approved product inventory and approved exclusions for private acceptance; exact owner domain rules/reference sources remain missing.
2. For hosted preview, approved platform/access model/domain/TLS termination and allowed data policy. Anonymous app need not invent an identity provider if an approved outer private access boundary suffices.
3. If storing personal/financial records, approved retention/deletion/RPO/RTO and secret/backup controls followed by restore evidence. Stateless previews can document no retained application records instead.
4. If full F01 native UI functionality required, choose/review dedicatedmTLS native listener or proxy and data mounts; preserve scientificNOT_ESTABLISHED and customer authorizationfalse until qualified evidence exists.
