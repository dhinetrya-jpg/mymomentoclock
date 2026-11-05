# Provisional provider selection

Razorpay is a provisional implementation target for India/INR, permitted by this workstream, NOT an owner-approved provider. No second provider was added. ProductionReady always returns false; only rzp_test_ keys are accepted. No project-approved account, credentials, pricing or identity exists. Default checkout/callbacks remain unavailable. Library fixtures using approval=true do not constitute owner approval.

Official Razorpay Go SDK repository fetched read-only and pinned at23677d8c4eb27673b2eeff06317cd12f7a7cf6ad. See API_MAPPING for exact source links. Direct retrieval of https://razorpay.com/docs/api/orders/create/ returned HTTP403 in this environment. Current hosted documentation, dashboard test-method support, merchant binding, event ordering/retry guarantees and live API compatibility are therefore NOT fully verified. G02 is BLOCKED_EXTERNAL_DEPENDENCY. No provider API mutation or credential probing was performed.

Before any sandbox activation: owner must approve provider/account and obtain current official test-mode documentation, verify key/account ownership and webhook configuration, approve price/capability/access policy and integrate real identity. Do not treat this provisional adapter/local HTTP fixture as provider sandbox certification.
