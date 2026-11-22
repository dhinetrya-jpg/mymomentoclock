# Independent exact-head audit

Reviewed SHA: `b12f7e4b88a60a20897549f979a4f216385e7ead`.
Base: `03a5f5e7704c1e07aaa0de5bcbb9e301948bd4a8`.
Verdict: **FAIL — one concrete P2 reference-parser ambiguity requires repair and re-verification.** This is a scoped engineering review, not full-product or scientific readiness certification.

## Confirmed finding R1 (P2): case aliases bypass strict evidence decoding

`backend/internal/f01reference/reference.go`, rejectDuplicateKeys, compares JSON names case-sensitively. Go encoding/json subsequently matches struct fields case-insensitively. A manifest containing `"latitude":999,"LATITUDE":22.57` is therefore accepted and admitted against an original chart at22.57 despite containing conflicting coordinate claims. This contradicts the documented rejection of ambiguous evidence and the strict source-binding intent. The same mechanism applies to original chart metadata and nested qualification fields.

Independent executable reproduction: appended `TestAuditCaseAliases` via an external Go overlay; no repository source edits. Temporary source `/tmp/audit-reference-test.go`, overlay `/tmp/audit-overlay.json`. Existing mymomentoclock:phase1-go-tests image, CGO_ENABLED=0, `go test -overlay=/tmp/overlay.json ./internal/f01reference -run TestAuditCaseAliases -count=1`.

Observed output:
```
--- FAIL: TestAuditCaseAliases (0.00s)
    reference_test.go:273: case-aliased conflicting latitude accepted
FAIL astroengine-core/backend/internal/f01reference
```

Required repair: enforce exact canonical JSON key spelling, or equivalently prevent every alias recognized by the downstream decoder. Reject mixed-case aliases in source and manifest at every schema layer; add regressions for conflicting alias pairs and alias-only fields, including null aliases. Re-run exact-head native/no-CGO/reference tests.

## Passing scoped observations

I inspected the original baseline sources, source diff, schema2 tests, durable backlog/source register, original JyotiPy houses.py and ayanamsa.py retained under /tmp/jyotipy-research, and the executable result logs requested by the implementer. JyotiPy original houses.py explicitly says the Sripati formula was transcribed from Swiss. The research verdict correctly retains unadmitted diagnostic status and does not invent a source-based tolerance.

The privacy repair explicitly projects four geometry scalar fields and requires pinned timezone metadata and request-associated normalized UTC intervals. Nested geometry private fields no longer cross the projection. Malformed/null list members trigger fail-closed handling, and invalid scalar metadata is rejected. Wall-time binding uses the host database conservatively: a disagreement makes the response unavailable, not scientifically accepted. This limitation is disclosed in code and does not claim pinned-native database verification.

Independently executed at the reviewed source content: `node_modules/.bin/tsx --test tests/f01/contracts.test.tsx`:12 passed,0 failed. Includes nested geometry metadata stripping, non-scalar/unbound interval rejection and EXACT/RANGE/UNKNOWN/offset endpoint cases. This is a local mock transport contract test, not deployed native mTLS end-to-end verification.

The schema2 changes otherwise improve mechanical integrity: exact12 non-null cusps, 1MiB+1 bounded manifest read, all admission before any calculation, original JSON numeric/convention binding, explicit coordinates and symlink rejection, qualification/precision/predeclared-tolerance records and defense in Compare against direct invalid inputs. Qualification strings are explicitly described as review claims rather than authentication or proof. Empty checked-in manifest remains blocked and no scientific/customer release flags are enabled.

Inspected implementer executable evidence: /tmp/release-reference-final.log shows final targeted native/no-CGO reference tests passed including missing/null/symlink regressions; /tmp/release-go-focused.log contains focused race/native/no-CGO passes but predates last additions; /tmp/release-calculation.log reports91passed; /tmp/release-boundaries.log reports102passed. These broader logs were inspected, not independently rerun by this reviewer, and cannot replace repairing reproduced R1. Integrated script was still running when review requested; no full integrated PASS is asserted here.

## Inventory and readiness

Durable BACKLOG.json has IDs, priorities, dependencies, acceptance/evidence and statuses; SOURCE_REGISTER.json pins base and SHA256 and identifies missing approved matrix, real rulebook, methods, references and operations approvals. Its in-progress/pending-review statuses are honest at this reviewed commit and should be refreshed after exact-head review. It does not claim the known repo inventory exhausts the full approved product.

Residual blockers remain: no complete approved matrix/CFR005–018 definitions; six actual activity rule categories lack owner-approved sources; Dasha/certified BTR/resolver/graph/remedies methods missing; independent end-to-end Sripati acceptance absent; current independent sidereal/node/same-definition solar scientific acceptance incomplete; genuine sandbox/payment and merchant/legal/catalog/identity gates unresolved; private deployment/TLS/restore/PITR/on-call evidence absent. Full private release readiness is NOT_ESTABLISHED. No production deployment or live-payment activation is authorized by this review.
