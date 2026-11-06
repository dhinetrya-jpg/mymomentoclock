# PAY-P0-03 — Webhook Security

2026-11-06 (Asia/Kolkata). Local engineering evidence only. Live activation: **NO-GO**.

Commercial public mux exposes only /webhooks/razorpay, with method/raw-body size limits. HMAC verifies original bytes before parsing/provider lookup. Account/entity/event/order/payment/value/currency bindings remain mandatory. Signature validity alone is not capture proof: authentic notifications trigger authenticated API fetching.

Current secret plus max2 explicitly time-bounded previous secrets permit bounded rotation. All active MAC candidates compare without client-selected secret ID. Expired/future old keys reject. Remove retired versions after observed delivery. Never log secrets/raw sensitive payment bodies.

Durable event uniqueness makes identical replay idempotent and conflicting replay reject. Transactions serialize grants; out-of-order observations cannot regress terminal full-refund state or regrant manually revoked access. Pending risk notifications precede captured reconciliation snapshots.

Private8443 mTLS SAN routes and public8444 TLS1.3 webhook listener are separate. Real public provider delivery/ingress/retries are unverified; G19 is blocked.
