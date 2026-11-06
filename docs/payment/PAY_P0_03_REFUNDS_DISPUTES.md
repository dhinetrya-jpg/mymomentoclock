# PAY-P0-03 — Refunds Disputes

2026-11-06 (Asia/Kolkata). Local engineering evidence only. Live activation: **NO-GO**.

Authenticated full processed refunds revoke source access transactionally. Partial/ambiguous refunds enter review; pending/failed refunds do not pretend to be completed refunds. There is no refund-initiation endpoint or manual mark-paid command. Business refund policy remains unapproved.

Signed dispute notifications use authenticated documented dispute GET plus payment lookup with exact bindings. Supported risk signals enter PAYMENT_REVIEW and revoke access; ambiguous closed/won observations cannot auto-regrant. Durable pending risk holds are applied before captured reconciliation snapshots, preventing a grant window. Full verified refunds remain terminal.

Dispute won/lost/reversal resolution, partial-refund policy and real provider behavior require current documentation/owner review. No invented chargeback API or settlement promise. Local conservative hold is tested; G12 remains blocked. Operators preserve evidence and review provider dashboard under authorized policy, never SQL-mark paid or regrant merely to clear alerts.
