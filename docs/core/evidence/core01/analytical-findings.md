# Analytical audit findings — not astronomical acceptance

Baseline cc3ab8245ea5d6bced19f5fed200da1528d13154. Direct baseline runs pass: astronomical_accuracy20, independent_planetary_accuracy6, temporal_reference_accuracy8, panchang_accuracy8. This proves the existing fake-source acceptance could pass despite errors.

Confirmed source contradictions:
- Legacy astronomical_reference fixture J2000 Mars tropical333.178/sidereal309.3209; new32-scenario/raw purportedJPL export Mars tropical309.320914/sidereal285.463822. Analytical335.1214 is sidereal. Claimed25.8005° error uses old309.3209; using new285.463822 produces49.657578°. Neither is admitted as authentic independently sourced truth. No expected astronomical number was changed by this audit.
- Fake source Sun280.460618 matches a commonly used J2000 Greenwich sidereal angle; the Moon218.324205 is near mean lunar longitude. This is suspicious and requires genuine source acquisition, not convenient selection.
- TT−UTC=TAI−UTC+32.184 does not equal ΔT=TT−UT1 unless DUT1=0. A universal69.184s DeltaT in timezoneResolver falsely supplied TT at every year.
- Legacy exact180° Tithi fixture expects index14, contradicting stated half-open12° intervals. Selected mathematical convention now explicitly uses index15 at180; test asserts before/at/after independently of the bad scenario26.

Repairs in owned TS source:
- Date.now removed from solved transition timestamps; converted actual solved JD to UTC ISO. Same fixed input produces identical output irrespective of wall clock.
- Polar day and polar night both suppress sunrise and sunset; no fake event is emitted.
- Solar UTC outputs include full ISO dates; rollover is retained. Seconds normalization cannot emit :60.
- Explicit finite/date/coordinate/clock/transition-option checks, bounded root bracket and iteration limits. Unwrapped angular crossing rather than opposite-point discontinuity; no root throws typed TRANSITION_NOT_BRACKETED instead of invented end-of-search estimate.
- Report numerical bracket width/tolerance separately from astronomical accuracy=null. Preview reports state ANALYTICAL_APPROXIMATION/NOT_PERFORMED; timingGuidanceAuthorized=false; traditional interpretation remains UNAPPROVED.
- timezoneResolver exposes nominal UTC JD distinctly, retains deprecated julianDayUT alias explicitly as nominal UTC, and returns TT/UT1=null unless caller supplies DUT1 and ΔT. No fabricated universalDeltaT. Correct years0–99 Date.UTC coercion and strict nonfinite-offset rejection. Privacy errors omit supplied wall-clock details.
- Legacy fixture numerical assertions/thresholds retained as QUARANTINED LEGACY REGRESSION ONLY, explicitly not independent acceptance. No broadened thresholds. No original JSON fixtures/raw files modified by this agent.

Final focused results: legacy suites20+6+8+8 and6 new safety tests all pass, zero failures/skips. Both root and alternate TypeScript lints pass. Logs /tmp/core01-analytical/*-final.log. Parent should invoke new analytical_safety.test.ts in verification orchestrator. Changes are source-visible and uncommitted; no payment/auth/ranking edits, no Docker builds or deployment.

Divisional repair: D2/D9/D60 used two-decimal display degrees, causing a longitude14.9999° to map as15°, and0.4999° as0.5°. They now use the existing four-decimal longitude; inconsistent longitude/sign boundary input fails safely. Original41 integrity/API tests still pass; no chart position numeric was changed. New sixth safety test covers D2/D9 display-rounding cases and every D60 halfdegree boundary.
