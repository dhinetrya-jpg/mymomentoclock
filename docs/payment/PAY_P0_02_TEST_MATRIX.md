# PAY-P0-02 test matrix

| Category | Local evidence | External distinction |
|---|---|---|
| Config | unapproved/missing secret/live key/invalid account rejected; environment alone no identity cannot enable checkout | owner-approved bindings absent |
| API client | Basic auth, receipt filter, integer INR order, strict response binding, bounded GET retry, no POST retry, timeout/error redaction | no api.razorpay.com payment call |
| Raw webhook | exact HMAC, missing/invalid/tampered signature, malformed/unsupported entity/event, wrong account/order/amount/currency | generated fixture secret, not real provider signature |
| Create lost acknowledgement | fixture HTTP order persists then connection drops; durable CREATED intent; reconstructed adapter/application recovers same internal order by receipt, one POST | no genuine provider consistency/idempotency claim |
| PostgreSQL |005 repeatability/readiness, same authority, grant/refund/review/terminal lattice, legacy fingerprint compatibility, existing full state/rollback/value/ownership tests | disposable database only |
| Node->Go->provider | actual Node boundary, real mutual TLS, Go, PostgreSQL, provisional adapter targeting local HTTP fixture | not a Razorpay sandbox transaction |
| Concurrency |20 duplicate terminal notifications plus inherited20 duplicate/conflicting deliveries, creation/refund races, one source-order grant | no throughput benchmark |
| Restart | original domain/application and PAY02 provider-integrated refunded marker verified after actual PostgreSQL restart | not production failover/restore |
| UI | default unavailable and test-mode initial presentation, no false initial success/live key forwarding; existing375/1280 browser flows | official SDK/payment interaction not executed live |
| Genuine sandbox | order, official payment, genuine signed webhook, refund/reversal | BLOCKED_EXTERNAL_DEPENDENCY; no substitution by mocks |

Exact commands/results/counts and corrected defects are in TEST_REPORT. No tests asserting calculation/privacy protections were weakened. Integration requires the full isolated gate: bare Go tests without disposable PG skip DB cases; no provider credentials means genuine tests remain explicitly blocked.
