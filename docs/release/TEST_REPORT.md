# Private release test and audit report

Date:2026-11-22 Asia/Calcutta. Source baseline main/PR27 merge:
`03a5f5e7704c1e07aaa0de5bcbb9e301948bd4a8`.
Independently accepted code commit:
`2b5458a4565349cbdf5de3c1fb98e20f97bd054e`.
Branch:`feat/private-release-readiness`. Full private readiness:NOT_ESTABLISHED.

| Verification | Result | Evidence / limit |
|---|---|---|
| Main/PR27 GitHub CI | Latest observed workflows succeeded | BASELINE_GITHUB_CI.json; main full SHA bound, PR27 abbreviated head corroborated; not new-branch CI |
| F01 boundary contracts |12/12 pass, independently reexecuted | F01_BOUNDARY_REGRESSIONS.txt; adversarial mock upstream |
| Calculation regressions |91/91 pass | CALCULATION_REGRESSIONS.txt; no full scientific certification |
| Security/payment/timing/F01 Node suites |102/102 pass | BOUNDARY_REGRESSIONS.txt; genuine provider calls0 |
| Both Go modules native/noCGO/race/vet and TLS PostgreSQL lifecycle/restart |Pass | FINAL_INTEGRATED_GO_POSTGRES.txt at2ebe669; later reference guard covered by targeted exact-source runs |
| Reference and diagnostic parser native/race/vet/noCGO |Pass | UNICODE_FIX_REGRESSIONS.txt; includes exact12/null/sourcebinding/duplicate/case/Unicode/oversize cases |
| Auditor's original Unicode reproduction |Pass after repair | UNICODE_AUDITOR_REPRODUCTION.txt; original test unchanged |
| Actual Node→mTLS→Go→SWISS_FILE F01 |Four modes pass | NATIVE_F01_MTLS.txt; certless/malformed refusal; exploratory, no authorization |
| Actual empty-manifest reference CLI |Blocked, accepted0, exit2 | EMPTY_REFERENCE_CLI.txt; expected gate behavior |
| Source byte integrity/adversarial admission scripts |Pass | SOURCE_INTEGRITY.txt; provenance claims retain source limitations |
| Both frontend typechecks/builds |Pass | TYPECHECK/WEB_BUILD and ALTERNATE_* logs |
| Desktop/mobile browser flows |Pass | BROWSER_*; synthetic provider/rule states are fixtures |
| Fresh native/web container builds |Pass | *_CONTAINER_BUILD.txt; trusted CA, pinned Swiss installer, no registry push |
| Fresh web read-only/nonroot container smoke |Pass | WEB_CONTAINER_SMOKE.txt; loopback runtime only |
| Fresh native SWISS_FILE runtime and checksum/missing-file refusal |Pass | NATIVE_CONTAINER_SMOKE.txt;9 bodies/time-scales, Panchang/localdays, DST/leap/refusal contracts; accuracy limited |
| API Kubernetes token-minimization template |Static pass | KUBERNETES_STATIC_CHECK.json; no cluster applied |
| Independent exact-source engineering audit |Pass | ENGINEERING_AUDIT_PASS.md; earlier failures preserved and repaired |

Evidence is under `docs/release/evidence/`. Logs preserve original numerical
limitations: Moshier cross-mode residuals and body/time-scale mismatches are
not silently relabeled independent acceptance. Strict Option A/source gates
remain separate. No qualified Sripati case was admitted; no source-based external
tolerance was invented. Internal all12 geometry checks have narrower coverage.

See GATE_RECONCILIATION.json for current scoped Phase1 safety/UX/privacy gates,
and BACKLOG.json/SOURCE_REGISTER.json for original versions and dependencies.
A disabled local stateless preview does not require live activation approval.
Hosted private preview/full-product acceptance still needs approved scope and
actual access/TLS/runtime controls. Real rules/methods/reference acceptance,
identity/provider/catalog and data-specific retention/restore remain conditional
on the promised product scope. No production or live-payment action occurred.
