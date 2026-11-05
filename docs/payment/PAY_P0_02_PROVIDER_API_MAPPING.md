# Official contract references and implementation mapping

Reference revision: [official Razorpay Go SDK23677d8](https://github.com/razorpay/razorpay-go/tree/23677d8c4eb27673b2eeff06317cd12f7a7cf6ad). Retrieved via authenticated normal Git transport; no vendored SDK/test credentials were copied into production.

| Adapter operation | Official source | Local behavior |
|---|---|---|
| HTTP auth/base API | requests/request.go, constants/constants.go | Fixed https://api.razorpay.com/v1; Basic key/secret auth; no caller-supplied base URL or redirect |
| Create/order receipt lookup | documents/order.md, resources/order.go | GET orders filtered by40-character SHA256-derived receipt, count2; POST orders integer amount/INR/receipt/partial_payment=false only when durable first-attempt permission exists |
| Order/payment retrieval | documents/order.md, documents/payment.md, resources/payment.go | GET order and its payments, bounded collection; validate receipt, IDs, exact values, captured flag/state and scope |
| Refund reconciliation | documents/refund.md, resources/payment.go FetchMultipleRefund | GET payment refunds; sum distinct processed refunds, require exact full value for REFUNDED; partial/pending discrepancies hold fulfillment for review |
| Raw signature | utils/utils.go VerifyWebhookSignature/VerifySignature | HMAC-SHA256 over exact raw bytes, decoded64-character hex signature, constant-time comparison; separate webhook secret |
| Provider checkout | https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/ | Prepared official https://checkout.razorpay.com/v1/checkout.js integration only; hosted current docs and actual widget/payment NOT verified here |

Source links use the pinned revision above (append /documents/order.md etc). The hosted API page returned403. SDK references are evidence of the implemented request/shape/signature contract, not a substitute for current API/test-method/account verification. Actual API responses may expose additional fields; only required financial fields are consumed, no raw sensitive body persisted.

No idempotency-key guarantee or monotonic revision was established from these sources. The adapter does NOT assume either. No API POST retry, no timestamp-derived/local counter revision. Payment/refund methods are read-only except the explicit first order POST. Authorized is PENDING; only captured+order paid can complete. Refund processing verifies the refund collection rather than trusting a browser or a single refund notification. Reversal/dispute semantics are unsupported pending authoritative reviewed specification; no invented mapping.

GET retries at most twice with100ms cancellable backoff,4s HTTP timeout within8s application context,1MiB response cap, sanitized transient/permanent/ambiguous-create codes. POST once only; lost/5xx acknowledgement classified ambiguous. Maximum collection limits reject rather than silently page arbitrary amounts; provider pagination/consistency must be sandbox-verified before activation.
