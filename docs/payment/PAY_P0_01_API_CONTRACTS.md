# API and adapter contracts

Public Node and Go routes are still unavailable by default. This is an integrated foundation, not an activated checkout. Current executables register no real authentication/provider adapters. No setting of a client key/header/query/local-storage flag can change that.

## Authenticated application handlers (injected internal service)

All requests require verified mTLS service client SAN plus separately verified user bearer/session. No arbitrary customer query/body selector. Safe JSON/no-store responses. Unknown fields, malformed/trailing JSON, over4096byte order bodies and any query string are rejected. Handler context8s, DB/event operation deadlines, TLS server HTTP timeouts. Public Node body limit64KB remains.

| Route | Request | Authorized success | Failure |
|---|---|---|---|
| POST /api/payment/orders | product_id and opaque idempotency_key16..200 only |200 order_id,status,amount_minor,currency,product_id,product_version,capability_id |503 missing real dependencies;401 identity/mTLS;422 invalid/tampered input;409 key conflict |
| GET /api/payment/orders/:id | verified owner, no selectors |200 own durable snapshot; no provider secret/IDs |404 missing or other owner's order (same response);503 storage |
| GET /api/payment/entitlements | verified caller, no query |200 caller's active unrevoked unexpired grants with source_order/capability/expiry |401 invalid identity;503 unavailable |
| ProcessWebhook (internal Go method) | original raw bytes+headers into configured Provider verifier | only durable verified state application | no public direct JSON-to-VerifiedEvent path |
| RequireAccess (internal Go method) | request authenticated by configured Identity plus server-selected capability |nil only if durable valid grant exists |UNAUTHENTICATED,ENTITLEMENT_REQUIRED or fail-closed storage error |

No user-facing entitlement query returns other customers' records. Read access is auditable in the database (order access or pseudonymous actor hash). Node passes only original verified bearer over mTLS, fixed path/method/body and strips internal metadata/credentials from results. HTTPS mandatory, certificate/host verification on, no redirect following,5s request timeout,64KB upstream response bound, safe error mapping, max8 sockets. Transport credentials come from configured secret paths; no tokens in logs.

Current /api/payment/* default503, simulate-webhook404. Public /api/v1/webhook/payment remains503 in both Go copies and Node. No SSE/simulation fulfillment exists. The future selected provider ingress must verify raw protocol semantics before calling Service; no handler wraps arbitrary JSON as verified evidence. Root generic HMAC is not a provider implementation.

## Provider and Identity interface obligations

Identity.Authenticate must verify issuer/audience/expiry/signature/revocation or real session and return an authenticated known customer; it must never trust X-User-ID/body. Provider namespace includes brand/account/environment. CreateOrder must be retry-safe across process crashes using durable internal order ID. VerifyAndParseWebhook must validate exact raw signature, timestamp/replay window, event type, provider IDs, currency/minor units, customer/order binding and full-refund semantics. GetPaymentStatus must return authoritative stable revision/timestamp and exact bindings; no locally invented revision. Service retrieves/apply latest state before original callback. ProductionReady() is a reviewed adapter assertion, not proof of sandbox compatibility; owner review remains mandatory.

## UI preparation

Both paymentClient.ts copies use same-origin credentials, no-store and server JSON contracts. createOrder sends only product ID and opaque retry key; order and entitlements query durable server state. checkoutMessage covers unavailable, created/pending, complete-but-access-separate, failure/retry, cancelled, expired, refunded/reversed and already purchased. No callback sets paid/unlock, no localStorage or query authorization. Existing CheckoutModal always renders UNAVAILABLE and never calls createOrder, collects no PII and shows no guessed price. Real provider UI and server-confirmed price display require an approved integration; the client/model do not create one.
