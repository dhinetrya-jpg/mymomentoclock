# F01-P0-02 — Sripati geometry validation

## Implementation

- Retain SWISS_FILE as the guarded native provider for F01.
- Request Swiss sidereal Porphyry house cusps separately (`swe_houses_ex(...,'O')`).
- Independently reconstruct each Sripati cusp in pure Go as the circular midpoint between the **previous** and current Porphyry cusp.
- Compare all 12 reconstructed cusps against native sidereal Swiss Sripati (`'S'`), using a defined **internal geometry tolerance of 1e-6 degrees**.
- Reject malformed, nonfinite, degenerate and noncyclic Porphyry geometry; reject mismatches and missing reference information.
- Apply the cross-check to **every F01 sample and every midpoint refinement**, not just the first natal snapshot.
- Include an explicitly non-certified `geometry_check` field in the sanitized gateway output. No customer timing or BTR activation.

## Evidence and limits

This is an independently implemented **geometry algorithm**, not an independent astronomical reference. Both underlying sets of astronomical inputs and house angles still originate from the same pinned Swiss library, so this test cannot detect a shared error in those inputs. This work must never be called JPL/USNO-verified or proof of astrological predictive accuracy.

Documentation basis:
- Official Swiss house-system description: https://www.astro.com/faq/fq_fh_owhouse_g.htm
- Swiss house source: https://github.com/aloistr/swisseph/blob/master/swehouse.c
- The native provider and its pinning remain governed by CORE-P0-01.

## Tests

- Deterministic pure-Go circular midpoint and wraparound.
- Corrupt cusp, nonfinite values and numerical tolerance rejection.
- Linked native cases: Delhi, Kolkata, Sydney, London, New York, equator, northern and southern latitudes, historical epochs.
- HTTP gateway blocks faked independent acceptance and never forwards raw birth data or complete natal samples.
- Both F01 native sampling and refined crossings refuse geometry failures.

## Outstanding independent-accuracy gates

- Obtain externally generated reference snapshots with explicit time scale, house system, ephemeris version, ayanamsa convention, provenance, independent source and latitude/longitude.
- Compare cusp positions and house membership to independently calculated published references, including boundary and high-latitude cases.
- Establish scientific/engineering tolerance and reproducible reference fixtures; no fabricated references.
- Perform native service latency and budget testing with real SWISS_FILE data on deployment-class hardware.
- A green CI result is *engineering test evidence*, not third-party numerical acceptance.
