# PAY-P0-03 baseline and gap matrix — 2026-11-05

Initial local clean branch fix/pay-p0-02-provider-sandbox-integration at d4046d89519fbaac24f7bacc67d9fb303b4594a6. Fetched main e8c65c1fb21d31a781d5d9314cf2722983558e2c matches requested baseline and includes PR13. New dedicated branch fix/pay-p0-03-live-commercial-readiness. No reset/rebase/force push/discard. No production activation, merge, deployment or migration authorized.

| Area | Existing verified foundation | Gap before source modification | Planned independent work / external gate |
|---|---|---|---|
| Identity | mTLS and injected verified identity interface; no header identity | No real session/issuer integration | Vendor-neutral pinned-key OIDC verification, durable sessions/revocation and cookie/CSRF gateway; owner issuer/audience/vendor approval remains blocked |
| Provider | Test-only Razorpay HTTP/signature/status adapter, durable create intent, no fabricated revisions | Production capability/rotation/readiness absent; current hosted docs403 | Separate cryptographically gated production constructor, bounded key rotation and conservative review; real account/current docs/sandbox remain blocked |
| Catalog | Approved server price/version/capability and integer snapshots | No explicit commercial duration/tax/refund/geography/effective dates | Versioned commercial policy snapshot; no approved ₹500 catalog supplied |
| Premium | Durable RequireAccess with active/revoked/expiry checks | No approved deliverable premium list | Configured capability guard; do not enable disabled/unvalidated astrology |
| Webhook | Raw HMAC/account/value checks and snapshot transaction | No rotation/tracing/bounded concurrency/operational signals | Add those controls, retain fail-closed unsupported dispute handling |
| Reconciliation | DB lease/batch/backoff and durable retries | Fixed batch lease, no retry ceiling/jitter/dead-letter or scheduler | Bounded per-job lease/deadline, jitter, review queue, supervised worker |
| Operations | Actual internal count query; no public admin | No observer CLI/full telemetry/proposed alert config | Read-only DB-role tool and fixed-label metrics; no manual paid override |
| Release | Production hard disabled | No machine-readable signed readiness contract |26 mandatory gates and separately pinned release trust; no real approval artifact |
| External | No genuine provider sandbox evidence | Merchant, legal/tax/refund/support policy, identity and premium delivery approval absent | Explicit blocked gates, no claims of readiness |

Reviewed payment/domain/provider/sandbox, Node, both React trees, migrations, deployment/CI and predecessor reports. Preserve PAY01 fingerprint and PAY02 lattice/recovery protections. Commercial one-time ₹500 is a proposal only; access duration, tax and refund terms are not invented.
