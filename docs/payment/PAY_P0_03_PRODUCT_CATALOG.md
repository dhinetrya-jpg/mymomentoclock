# PAY-P0-03 — Product Catalog

2026-11-06 (Asia/Kolkata). Local engineering evidence only. Live activation: **NO-GO**.

No actual launch catalog is approved. ₹500 INR is only a proposal. Fixture test prices are not business defaults.

Strict schema_version2 catalog requires approval reference and product ID/version/capability, INR, integer amount_minor and commercial policy. Policy requires description/access disclosure, one_time billing, explicit lifetime XOR bounded access_seconds, tax/refund policy references and disclosures, availability/effective dates and eligible_countries exactly[IN]. Invalid/unknown fields, duplicate IDs, unbounded duration/value and purchase_country input reject.

Go checks verified customer country, availability/time window and existing entitlement. Immutable order snapshot retains version/price/country/full commercial policy; idempotent retry recovers it across catalog changes. Partial unique index prevents parallel pending commercial purchases of the same capability with different keys. Existing access returns ALREADY_PURCHASED. No subscriptions.

Authenticated catalog response exposes only available delivered capabilities. Production verifies signed catalog hash; config approval strings cannot enable unavailable features. Owner must approve exact price, features, duration, disclosures, tax/GST, refunds/cancellation, invoice responsibilities and effective dates.
