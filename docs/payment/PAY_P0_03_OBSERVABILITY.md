# PAY-P0-03 — Observability

2026-11-06 (Asia/Kolkata). Local engineering evidence only. Live activation: **NO-GO**.

Fixed-name, no-customer-label counters/duration sums cover order attempts, provider create/API errors/latency, invalid/failed webhooks, duplicates, confirmation latency, entitlement denial/mismatch and reconciliation/dead-letter. Durable gauges cover pending, pending>1hour, retries/rejections, overdue recovery, dead letters and holds. In-memory counters reset on restart; durable audit/gauges remain authoritative. DB-error metric covers stats query failures, not every possible DB error. Sums/counts provide averages, not invented percentile histograms.

Private /internal/metrics requires observer mTLS SAN; no public exporter. `deploy/payment-alerts.proposed.yml` contains configurable proposal thresholds, not production baselines. No actual pager/dashboard/exporter was deployed. Inspect provider/network, DB pool and backlog age; pause new checkout under uncertainty while preserving verified webhook/recovery paths.

`payment-observer` is a SELECT-only CLI with verify-full DB TLS. It rejects elevated/financial write/session-read roles, prints aggregate backlog or a minimal order projection with hashed owner, bounded latest50 audit/event summaries and entitlement status. Actual CLI database execution still requires operator-environment validation. No admin HTTP/correction command. Runtime cannot update/delete audit; DB owner still can, so ownership/access review and durable external evidence remain required. Log only safe correlation/order/event refs; no tokens, birth details or raw payloads.
