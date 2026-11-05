This closes the unsafe Phase 1 paths across root/backend Go, Node, both browser trees and deployment configuration. Unsupported BTR/Dasha, graph/resolver, private AI and payment handlers now fail closed; the anonymous chart remains an explicitly unvalidated preview with actual native mode/version disclosure on the Go API.

Adds an inactive transactional PostgreSQL payment domain, tested for duplicate delivery, concurrent events, value/identity mismatches, reversals and restart recovery. It has no public fulfillment adapter. Real authentication, payment-provider integration, approved pricing and independent calculation reference data remain required.

Validation: Node 66/66; both Go modules test/race/vet on Go1.26.10; non-CGO refusal; real isolated PostgreSQL; production Docker/API contracts; Chromium375/1280; k6 smoke50/50 (unavailable-path checks, not capacity).

**Release decision: NO-GO.** No production deployment, payment activation or main merge. Review PHASE1_FINAL_RELEASE_GATE.md, PHASE1_FINAL_TEST_REPORT.md and committed evidence under docs/remediation. Historical docs preserved.
