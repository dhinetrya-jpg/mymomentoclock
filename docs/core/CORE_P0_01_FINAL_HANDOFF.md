# CORE-P0-01 final handoff

## PR21 current acceptance update — 2026-11-07

**FAILED — REQUIRED ACCEPTANCE TESTS FAIL.** This supersedes the earlier PARTIAL verdict and limited numerical scope preserved below as a historical snapshot. Current evidence: [planetary report](CORE_P0_01_PR21_PLANETARY_VALIDATION.md), [Panchang/solar report](CORE_P0_01_PR21_PANCHANG_SOLAR_VALIDATION.md), [repair matrix](CORE_P0_01_PR21_REPAIR_MATRIX.md).

Independent JPL DE421/Skyfield evaluation admits 40 body/epochs per mode across five centers, exact TT J2000, historical 1975, modern, equinox/wrap, retrograde and full/new Moon. Each mode has 160 position/distance/speed scalar checks. SWISS_FILE passes all 160; MOSHIER Moon fails twice at unchanged 0.0002°: +0.000452369889814° (1975) and -0.000229132543495° (2026 full Moon). No expected value, tolerance or astronomical correction was fitted. Ten pre1972 mode/body records are NOT_ADMITTED due to UTC/UT1 epoch incompatibility.

Additional dated evidence: 42 Tithi/Karana boundaries, 14 solar noons, 14 tropical ascendants and 16 time-scale scalars from four observed IERS Bulletin A records. Rise/set remain different-definition diagnostics. Matched sidereal offset/nodes/Jupiter/Saturn centers, complete Panchang/chart/traditional acceptance remain incomplete. This is independent evaluation against shared underlying JPL theory, not independent observational confirmation; numerical budgets are not source observational uncertainty.

Optional native JPL mode is unsupported/NOT_TESTED with a real native kernel; its absence alone is not a mandatory release blocker. The reference SPK is not a compatible native Swiss JPL kernel. Native/data commercial-license choice and redistribution review still require owner/legal decisions. No legal approval is inferred.

Default Go evaluator execution emits every scientific FAIL and is not an accuracy PASS. `sh scripts/test-core-pr21-acceptance.sh` sets `CORE01_STRICT_SCIENCE=1` and fails on numerical discrepancies. The top-level verifier calls strict acceptance after engineering checks. Customer timing remains disabled; provider Load refuses admission; ranking/payment/auth/entitlements are unchanged. No merge or deployment.

## PR21 remaining blockers and exact next actions

| Blocker / root cause | Impact / missing evidence | Attempted | Exact next step / owner involvement |
|---|---|---|---|
| Moshier Moon model fails predeclared band | A04/A12 FAIL; 1975/2026 longitude discrepancy at identical TT | Real DE421/Skyfield comparisons; same Swiss-file reductions pass; strict failure retained | Upstream scientifically justified Moshier correction or separately approved architecture limiting production precision to validated file mode; no fitted correction/tolerance widening. Owner architecture decision needed if changing supported mode promise |
| Planet centers/nodes/Lahiri and sidereal chart/Panchang coverage incomplete | A03/A04/A06/A07 not full independent acceptance | Direct institutional endpoints denied; immutable JPL alternative obtained; incompatible barycenters rejected | Obtain compatible 599/699 center kernels/references, independent node/Lahiri definitions and source-compatible sidereal event/chart tables. Appropriate source/network access may need owner settings change |
| Same-definition solar/traditional references unavailable | No independent upper-limb/refraction/derived interval acceptance; near-midnight/sunrise-Vara cases pending | Independent noon/Tithi/Karana roots and explicit conventional-rise diagnostics | Acquire defined solar references with horizon/refraction/limb matched; authenticate selected traditional rules and obtain separate owner approval. Owner/tradition review needed |
| Pre1972 and broader historical/observed EOP coverage incomplete | Specific 1910 UTC/UT1 records rejected; no global historical claim | Four observed IERS records and 1975 historical epoch plus retained ERFA/leap tests | Establish matched TT-to-historical civil/UT1 convention and extend observed EOP ranges; no invented UTC conversion |
| Swiss/data/reference commercial governance | Commercial release terms unapproved | Actual artifact notices inspected; original licenses preserved | Owner/legal choose AGPL-compatible obligations or Professional contract and confirm data/kernel/source redistribution terms; no purchase or term change performed |

Native JPL absence is an optional unsupported-mode limitation, not a mandatory commercial release blocker by itself. The SPK reference kernel is not a Swiss native JPL kernel. No existing payment/auth/entitlement/ranking/provider implementation was changed.

CORE-P0-02 real provider is technically available for scientific inspection and separate rule-review work; it is NOT ready for customer activation. Natal/day use the same engine, actual mode/uncertainty and UTC intervals propagate, and Load refuses unaccepted real inputs rather than relabeling them synthetic. No activity rules, guaranteed profits or financial-return predictions were enabled.

## PR21 licensing/source inventory

| Component | Exact source/version | Applicable notice and obligations / unresolved decision |
|---|---|---|
| Native Swiss reader | 2.10.03 /175e1fcb3108bcd5c0d146c803f51dcf23508012 | Preserved actual-image LICENSE + AGPL text; dual AGPL/Professional choice before distribution/public service. AGPL source/network obligations or a signed Professional contract require owner/legal choice; no legal approval |
| Swiss data | Official sepl_18/semo_18 at94621aba9f3ff9c32cb721eac0380c30dbb153fe | Original vendor notices retained; confirm actual data-use/redistribution terms separately, do not infer from evaluator MIT |
| JPL DE421 SPK | Original binary from official Skyfield31a6ed7584cd09b6e48e07546a4b5921e1cd5bb4 | SPK comments identify JPL/conversion but contain no explicit redistribution grant; test-data terms need confirmation. Not shipped as native production kernel |
| Independent evaluator | Skyfield1.54/jplephem2.24, pinned scientific-only dependencies | MIT upstream notices; not runtime dependencies. Preserve notices for redistribution; no data-license inference |
| IERS mirror | Astropy IERS-data0570742629cb352ae16a7aa159e0e807eff87272 | BSD-3-Clause project notice retained; attribution/nonendorsement conditions; confirm underlying data-specific terms |
| Current IANA rules | Official maintainer e29969d3f327f129ec4aebaa9c7aee96c46f8e3b | Original LICENSE retained (public-domain rules with file-specific exceptions); preserve applicable notices |
| Existing ERFA and source captures | Original pinned references remain | Existing license/provenance artifacts retained; numerical attribution does not grant blanket commercial legal approval |

## PR21 Git delivery and CI observation

Existing PR: https://github.com/dhinetrya-jpg/mymomentoclock/pull/21 . Existing branch: `fix/core-p0-01-complete-acceptance`. Starting PR ref and branch were fetched and both verified as `110ea5c2699f917bd928908516e1a92f8d33191a`. Tested implementation/evidence commit: `fac9687fd62f839ddf5f6af81df03643ab1a1480`, pushed to the same branch. Subsequent handoff-only commit adds metadata/evidence; exact delivered remote SHA and final-head live CI conclusions are reported in the final response (avoids self-referencing commit hashes).

GitHub API requests remain403, but normal PR/checks and workflow pages work. The SHA-bound observer verifies full PR head plus every workflow run title's commit prefix and retains no session-channel data. All four baseline workflows were independently observed SUCCESS. The first source-head observation below is timestamped historical evidence of four IN PROGRESS workflows, not a claim of final-head CI success. Continue observing the final head after the metadata push; do not substitute baseline or local results.

| Source-head workflow | URL | Observed status at 2026-11-07T09:28:27.836519+00:00 |
|---|---|---|
|Docker Image Build Test|https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/42359846820|This job is in progress|
|CI - Lint & Build|https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/42359846876|This job is in progress|
|Phase 1 native and durable payment security|https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/42359846915|This job is in progress|
|MymomentOclock API Smoke and Optional Load Validation|https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/42359846921|This job is in progress|

Complete changed-file inventory: `CORE_P0_01_PR21_FILES_CHANGED.txt`. All original publisher captures and license notices are preserved; selected safe execution logs are in `evidence/pr21/`. Working branch only; no merge, deployment or environment publication. No payment/auth/entitlement/ranking implementation changes.

## Historical implementation snapshot (superseded where above differs)

As of2026-11-07 (Asia/Kolkata). **CORE-P0-01 PARTIAL — BLOCKERS REMAIN.** Engineering is ready for review; independent scientific acceptance and customer timing release are NO-GO.

Starting main SHA: `cc3ab8245ea5d6bced19f5fed200da1528d13154`. Dedicated branch: `fix/core-p0-01-complete-acceptance`. Exact final remotely verified commit and publishing/CI outcomes are recorded below and in the final response. No main merge, branch overwrite, production deployment or payment/entitlement action.

Implemented: extended existing native Swiss engine and pinned-data modes, allnine bodies/coordinates/speeds, correct time-scale/leap-label contract, native houses/solar/polar/daylight, complete native Panchang factor intervals/enclosures/transition solver, explicit traditional schedule variants, full-input chart mappings and uncertainty safety, typed scientific APIs and CORE02 inspection adapter, genuine immutable source acquisition/verification, reproducible all-stage verification, and correction/supersession of unsupported prior claims. Detailed conventions, limitations and measured residuals: FINAL_ACCURACY_REPORT and capabilities.json.

Acceptance matrix: COMPLETION_MATRIX covers allA01–A12 initial/final statuses, code/test scope and defects. OnlyA01 inventory andA08 safety/metadata are PASS; remaining areas are PARTIAL. They are not silently promoted by passing builds or a two-epoch Sun subset.

## Remaining blockers and actions

| Reason / attempted work | Impact | Evidence needed / next action | User intervention |
|---|---|---|---|
| Institutional NASA/USNO/IERS/IANA-server/PAC queries returned proxy403; queries/failures retained, genuine upstream publications captured instead |No direct institutional authenticity/full per-body/J2000 proof |Permit exact source domains or provide original captured responses/publications; run controlled refresh then review source-specific normalization/frame/epoch/body admission |Network policy or supplied evidence needed |
| Captured Mars is barycenter with pre1972 epoch conventions; compatible Moon/Mercury/Venus/Jupiter/Saturn/nodes/distance/speeds and PAC ayanamsa references absent |A04/ayanamsa/fullprecision acceptance incomplete; legacy J2000 contradictions remain unresolved authoritative values |Obtain matched apparent/geocentric/ecliptic-of-date data with UTC/TT/observer/correction definitions and independent tolerances; compare actual native quantities |Evidence/access needed |
| No genuine dated solar/Panchang boundaries/ascendant reference tables admitted |Model outputs/bracket convergence cannot certify real event/placement accuracy |Capture dated independent tables with site/elevation/refraction/limb/tradition, normalize separately and execute residual comparisons |Evidence/access needed |
| No actual supported local JPL kernel |JPL operational status NOT_TESTED, never claimed from reference-source name |Provision licensed compatible kernel + pinned checksum; execute mode/span/fallback and independent comparisons |Owner artifact/license decision needed |
| D60fulltraditional deity/sign interpretation, source-specific interval and uncertain-birth policy not approved |Only explicit mathematical segmentation/schedule variants; no personal interpretation |Select exact tradition/edition/passages and scope, review mappings and CORE02 activity rules, approve separately |Owner/traditional-rule decision needed |
| Reader/library/data distribution terms not independently legally approved |No commercial deployment compliance assertion |Review preserved AGPL/commercial reader terms and distinct data terms for actual deployment/distribution |Owner/legal review needed |
| Remote CI cannot be assumed from local output |No remote run PASS or invented CI URL |Use verified branch/PR and observe relevant Actions after API access is available |GitHub API access/review may be needed |

## CORE-P0-02 readiness

The versioned astronomy payload contains real natal positions/classifications, daily native Panchang/factor intervals/enclosing boundaries, solar/daylight/traditional measurements and actual-mode/time/data/uncertainty metadata. `NativeAstronomyProvider.Inspect` works as a scientific inspection contract. `Load` refuses missing independent acceptance and cannot relabel unverified real data Synthetic. Existing ranking and NativeEngine registration remain unchanged, no synthetic production rules installed. CORE02 rule approval and customer release remain separate NO-GO gates even after future astronomical acceptance.

## Changed files

Complete repository-relative inventory is in `CORE_P0_01_FILES_CHANGED.txt`; selected safe execution evidence and full residual statistics are in `evidence/core01/`. No private ephemeral keys, database credentials, session tokens or real customer birth records are committed.

Tested functional implementation commit: `f46d2dc8ce511677dd4d86c31d9b22b3eec68be5`. Subsequent commits may only add evidence/handoff metadata; exact delivered HEAD is verified in the final response.

## GitHub delivery

Branch: `fix/core-p0-01-complete-acceptance`, pushed to origin. Starting commit: `cc3ab8245ea5d6bced19f5fed200da1528d13154`. Functional implementation: `f46d2dc8ce511677dd4d86c31d9b22b3eec68be5`. Evidence commit: `86a6ffadb8346ad2055c3b6a35ac8abb8e3dd481`. Final delivered HEAD is reported separately to avoid a self-referencing commit hash.

Draft PR creation was attempted with `gh pr create --draft`; GitHub GraphQL returned `Forbidden`. No PR was created by this attempt. Manual creation link: https://github.com/dhinetrya-jpg/mymomentoclock/pull/new/fix/core-p0-01-complete-acceptance . This is a creation link, not an existing PR.

`gh run list --branch fix/core-p0-01-complete-acceptance --limit 5 --json url,headSha,status,conclusion` returned API `Forbidden`. Remote CI status is unverified; no remote PASS is claimed. No merge, deployment, environment publication or customer timing activation was performed.
