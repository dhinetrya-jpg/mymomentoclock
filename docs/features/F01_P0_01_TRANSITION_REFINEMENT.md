# F01-P0-01: Observed Transition-Bracket Refinement

## Objective
Refine **observed** F01 factor changes using native Swiss astronomical calculations while preserving explicit uncertainty. This PR does not claim to have solved exhaustive transition isolation.

## Algorithm
1. Retain F01's initial 17 canonical native evaluations for an EXACT, APPROXIMATE, RANGE or UNKNOWN birth-time interval.
2. Find adjacent sampled instants where a factor's discrete value differs.
3. For each observed transition bracket, evaluate a midpoint through the **same pinned SWISS_FILE** server-authority provider.
4. If the midpoint matches either endpoint label, move that bracket endpoint to the midpoint; the new interval still bounds at least one observed change under the sampled discrete model.
5. If the midpoint has a third value, retain the original bracket, record the intermediate value and change the factor classification to **UNRESOLVED**.
6. Stop at the one-minute target, after at most **12 extra native evaluations**, or on any native/time-budget error. No silent fallback.

## Explicit limitations
- A finite number of samples or endpoint bisection steps **cannot prove** no additional crossings occurred, particularly when values return to the original state.
- The one-minute target is **not** an astronomical precision or accuracy guarantee.
- The native snapshots remain NOT_INDEPENDENTLY_VERIFIED, notwithstanding deterministic tests.
- Birth-time rectification, D60 interpretation, synthetic probability scores, personal timing, automated customer guidance and commerce remain disabled.
- A result called OBSERVED_STABLE_NOT_PROVEN must never be promoted to mathematically STABLE.
- Any native failure is fail-closed; do not silently switch to Moshier or the browser.

## Tests
- Synthetic known crossing, including exact-edge half-open behavior
- Maximum evaluation budget and unvisited brackets retained
- Intermediate-state classification and fail-closed provider errors
- Canceled context and empty-bracket no-op
- Existing F01 timezone, DST, Sripati geometry, web/privacy regressions

## Acceptance remaining
- Independent numerical Sripati reference evidence and culturally reviewed cusp/house conventions
- Root completeness for each numerical factor or an explicitly non-exhaustive product promise
- Measured service latency under actual pinned ephemeris/production hardware
- Review of privacy, scientific acceptance and commercial ephemeris license
- Native/customer release admission must remain false pending these gates
