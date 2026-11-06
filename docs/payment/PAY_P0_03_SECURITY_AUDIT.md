# PAY-P0-03 — Security audit

2026-11-06, scoped code review and automated local tests; no independent penetration certification or production verification.

| Threat | Control / validation |
|---|---|
| Authentication bypass / forged identity | Pinned RS256 issuer/audience/nonce verification, opaque hashed sessions, no authoritative X-User-ID; negative token matrix |
| IDOR/account substitution | Node session→Go durable customer ownership, another customer404; no browser customer IDs |
| CSRF/login replay | Secure host-only cookies, exact HTTPS Origin/double-submit/session CSRF, bounded single-use nonce challenge |
| XSS/script/redirect | React text escaping, fixed official hosted SDK, restricted CSP sources, no innerHTML/token storage; fixture malicious disclosure; auth origin rejects credentials/path/query |
| SSRF | Fixed provider API base, no redirects, closed mTLS path allowlist, pinned local JWKS, no token-selected remote keys |
| Forgery/replay/price/currency | Raw HMAC, event uniqueness/conflict detection, merchant/order/payment/value/currency binding; server catalog and immutable policy snapshots |
| Environment confusion/activation | Separate constructors/artifacts, prefix+namespace/session+DB binding, baked trust and expiring signed26-gate approval; ordinary flags insufficient |
| SQL injection/races/double grants | Parameterized queries, unique pending commercial capability, transaction/event constraints, PG concurrency tests/race detector |
| DoS/retry storm | Provider timeout/bounded retry, request/body/header limits, webhook8 concurrent/600minute per-process bound, leased bounded worker/dead-letter; auth/global edge rate policy still requires deployment review |
| Privilege/audit tampering | Runtime nonowner/no DDL/delete/audit update, observer SELECT-only/no sessions, separate migration operator; role grant tests |
| Privacy/secrets | Hash subject/session/nonce/CSRF, financial retention tombstone, no card/CVV/birth/provider raw-body logs, no customer metric labels |

Second-pass confirmed fixes: initial integration test shared-error race; durable pending dispute held before captured reconciliation; deletion revokes grants as well as sessions; issuer/environment checks on restored sessions; identity session TTL bounds; distinct web/observer SAN config; strict HTTPS Origin; final web image now includes package-lock required by artifact verification; build key validation exits on malformed length; UI exposes explicit server-status retry and keeps existing order on retry. A final retry-policy edge case could overflow time.Duration when max attempts and base delay were both large; saturating multiplication and a dedicated race-enabled regression now bound the result. Readiness also denies expired owner authorization. Evidence is in TEST_REPORT.

No deliberate fixture signer, `_fixture` route or fake SDK is registered by production bootstrap. They exist only in test files/processes. Search of runtime sources found no payment-success setter, public financial correction path, raw-secret logging or hardcoded customer identity. Production key-ID strings in tests are nonfunctional fixtures, not actual live credentials.

Remaining P0 external blockers: real identity integration and SDK review, merchant/current API/genuine sandbox proof, approved catalog/legal/tax/refund terms, real delivered premium functionality, actual deployment/monitoring/rate/PKI/secret-store review, backup restore and incident rehearsal, owner release authorization. These are NO-GO gates, not waived findings. Application roles can necessarily mutate financial rows through trusted service code; protection against compromise/DB owner tampering also needs operational isolation, restricted credentials, backups and external audit retention.

No production migration/deployment, live charge, real provider transaction or unsolicited third-party message was executed.
