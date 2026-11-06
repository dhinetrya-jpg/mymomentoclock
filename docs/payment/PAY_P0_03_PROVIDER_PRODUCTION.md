# PAY-P0-03 — Provider Production

2026-11-06 (Asia/Kolkata). Local engineering evidence only. Live activation: **NO-GO**.

The real Razorpay adapter has separate nonproduction and production constructors. Nonproduction accepts only test public key IDs. Production requires live-prefixed public key ID plus sealed release authorization for the exact merchant; it is not a boolean readiness shortcut. Sensitive calls recheck authorization expiry. Secret values come from mounted files; environment/account/provider namespace isolation remains enforced.

Authenticated state fetching, exact order/payment/account/amount/currency binding, deterministic receipt recovery and collision rejection preserve PAY02 behavior. Hosted checkout callback never settles orders. No production mock was added. Tests use nonfunctional shaped public IDs only, never actual live secrets or API calls.

Actual provider calls: zero. Hosted Razorpay docs returned403. Available official SDK source commit `23677d8c4eb27673b2eeff06317cd12f7a7cf6ad` was inspected, including documented GET /disputes/{id}. Local HTTP contract fixtures are not genuine sandbox evidence. Current provider/API review, merchant activation and real sandbox order/payment/webhook/refund remain required.
