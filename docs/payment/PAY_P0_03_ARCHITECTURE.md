# PAY-P0-03 — Architecture

2026-11-06 (Asia/Kolkata). Local engineering evidence only. Live activation: **NO-GO**.

The existing Go ledger remains the financial authority. Browser → Node cookie/CSRF gateway → private mTLS → Go identity/payment authority → PostgreSQL and authenticated Razorpay API. The separate public TLS listener accepts only the exact webhook route. The leased worker uses the same verified state engine; read-only operations and observer-SAN metrics remain private.

Go owns verified identity, prices, immutable policy snapshots, provider binding/state and transactional fulfillment. The browser opens hosted checkout and polls its own server order and grant. Callback data never grants access. Standard native/web artifacts remain disabled for production. Separate commercial artifacts require offline owner-signed, expiring Ed25519 authorization binding Go binary, web artifact, config, catalog, merchant, issuer and all26 gates. No approval/signing key is supplied.

PostgreSQL verify-full TLS, restricted roles and an explicitly operator-bound environment row isolate deployments.006 is additive, with no automatic migration. Actual premium feature registry remains empty: infrastructure cannot sell an unimplemented calculation. See deployment runbook for trust and network review.
