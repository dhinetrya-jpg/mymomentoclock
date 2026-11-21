# Independent integrated audit — exact head

Reviewed SHA `2ebe669574a4b470bb4c8b2c3ebda7587e1eff90`, base `03a5f5e7704c1e07aaa0de5bcbb9e301948bd4a8`.

**Scoped engineering verdict: FAIL pending one P2 parser repair. Full product/private release readiness remains NOT_ESTABLISHED.**

## R1 residual: Unicode aliases still permit ambiguous evidence

Reference `rejectDuplicateKeys` rejects keys changed by strings.ToLower, but Go encoding/json uses Unicode case folding. Lowercase long-s U+017F remains unchanged by ToLower and folds to ASCII s. Thus a manifest containing `"house_system":"BAD","houſe_system":"SRIPATI_S_CUSP_START_1_BASED"` passes Load and Admit against the normal original source. Last-match decoding silently discards the conflicting convention claim. The same family of aliases may affect other fields/source objects.

Independently reproduced without source edits using `/tmp/audit-reference-unicode.go`, `/tmp/audit-unicode-overlay.json` and existing phase1-go-tests image: CGO_ENABLED=0 go test with overlay and -run TestAuditUnicodeCaseAlias -count=1. Output:
```
--- FAIL: TestAuditUnicodeCaseAlias (0.00s)
 reference_test.go:297: Unicode case-aliased conflicting house system admitted
FAIL astroengine-core/backend/internal/f01reference
```

Action: apply ASCII canonical key validation like the diagnostic scanner (`^[a-z][a-z0-9_]*$`), and regress conflicting and alias-only Unicode fields in manifests and original chart objects. Reverify changed exact head. Crossengine ASCII scanner already rejects this family.

## Independently passing evidence and inspected integration

I reran the original uppercase conflicting coordinate overlay against this SHA: PASS. I independently ran complete reference and crossengine no-CGO package suites: PASS. These do not catch the new Unicode case above.

I inspected source diff and tests for crossengine exact12/non-null cusp decoding, numeric metadata presence, bounded+duplicate/canonical-key JSON scan. Fail-closed diagnostic labels and separate empty real reference manifest remain intact. No actual source admission, production eligibility or independent scientific acceptance was introduced.

I inspected the genuine cross-service regression source: Go serves real native SWISS_FILE uncertainty Handler with pinned hashes over TLS1.3 requiring verified client certificates. Node uses the actual environment-configured gateway and verified server CA/client credentials. Four certainty modes are exercised, native malformed JSON is rejected, missing certificate is rejected by both Go and Node probes, public raw samples/birth/authority are absent, authorization remains false. `/tmp/release-final-native-f01.log` reports PASS with EXACT1sample and the other three17samples. This establishes local fixture transport/native/projection integration, not deployed infrastructure or scientific correctness.

Inspected durable integrated Go/PostgreSQL output ends with successful payment/provider/session restart recovery; initial dependency preparation failure is distinguished from subsequent successful isolated run. Final exact-head full-script rerun was in progress when review began; no unobserved final completion is asserted here. Other supplied durable evidence includes calculation91pass, boundary102pass, reference native/race/vet/no-CGO, diagnostic integrity, source integrity, both frontend builds/typechecks and fixture browser sizes. These are observed logs, not all independently reexecuted by this auditor.

## Inventory, release gates and next eligible work

Durable backlog now enumerates historical CFR001–018, F01 milestones, CORE activity categories, PAY03 gates and missing methods. It retains pending independent review and blocked approvals rather than promoting safety refusals to delivered capabilities. Source register preserves versions/hashes and explicit missing owners/specifications. Generic `implemented` text on unknown/blocked items should be read only as pointer to repository scope, not proof the item is implemented; stronger per-item implemented=false/unknown would improve bookkeeping.

Next eligible action is the specific R1 ASCII-key repair, targeted reproductions and exact-head review. After that, finish/capture current integrated results and reconcile every genuinely executable historical safety gate against that head. Existing local successes do not justify blocking all further independent repository audits behind missing product matrix; domain-dependent work remains blocked individually.

No approved complete product matrix/CFR005–018 definitions; no approved real six-activity rulebook or Dasha/certified BTR/resolver/graph/remedies methods; no qualified independent end-to-end Sripati reference and incomplete other independent scientific acceptance; no genuine sandbox evidence or merchant/legal/catalog/identity approvals; no actual private deployment/TLS/restore/PITR/on-call evidence. These blockers remain open. No production or live-payment action was performed or authorized by this review.
