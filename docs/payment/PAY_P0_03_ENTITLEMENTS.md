# PAY-P0-03 — Entitlements

2026-11-06 (Asia/Kolkata). Local engineering evidence only. Live activation: **NO-GO**.

Verified provider state grants access only inside durable PostgreSQL transactions after customer/order/payment/value/currency and replay checks. Browser success/localStorage never grants access.

`Service.Protect` checks approved delivered policy and authenticated durable RequireAccess before invoking a real handler. Expired, revoked, refunded/reversed/review and deleted-customer access is denied. Cross-account order lookup returns no other customer's data. Fixtures test before/after paid access, two accounts, expiry, review, refund, revocation and logout.

Actual premium capability registry is deliberately empty. Unfinished calculation endpoints remain unavailable even when paid; no feature delivery is invented. Real approved paid handlers and capability delivery evidence are G23 external product decisions. G10 refers to local enforcement infrastructure, not actual premium astrology functionality.
