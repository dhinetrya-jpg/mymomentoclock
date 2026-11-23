# Launch timing workstreams

Acceptance baseline is [PR #45](https://github.com/dhinetrya-jpg/mymomentoclock/pull/45)
head `429cadf599af9fc6369545c4e6bdb434e9a04860`.
Development and independent L12 verification began from
`76f8106bc84fb6b2750d5967bc111bbfd1ecdf7f`.

## L04 location-only flow

Daily Timing opens in location-only mode. The manual selector uses the
existing city names and IANA timezones. It makes no geolocation request.
Personal timing is an explicit separate view. The direct form and
the guided three-prompt template share an endpoint and payload:
`POST /api/v1/timing/location-only`, with schema version, selected city,
local date and activity only. The endpoint verifies its keys and
civil date, selects the zone from the server catalog and returns a
typed unavailable result with empty windows. It does not forward these
requests into the personalized service. L10 owns free-text routing.

Automated contract and Chromium scenarios exercise the initial UI,
direct/guided parity, unsupported input, alternate UI parity, no-store
response, the absence of birth payload fields and the existing separate
personal timing flow. No timing recommendation, permission grant,
production publish or live payment is part of this change.

## L02 rule research and review

The Researcher identified Govinda Jyotirvid's commentary to Rāma
Daivajña's *Muhūrtacintāmaṇi* 1.4, revised fifth edition (1945),
printed pp. 11–12. The independent Domain Reviewer issued
**APPROVE NARROWER SCOPE** for a disabled source-backed calendar
marker. The commentary pairs Nandā/Friday, Bhadrā/Wednesday,
Jayā/Tuesday, Riktā/Saturday and Pūrṇā/Thursday. The classifications
repeat across ordinal 1–5, 6–10 and 11–15 in each lunar half.
For example, on a synthetic Friday tithi 11 gives a match until a
verified change to tithi 12. Tithi 12 gives no match. A missing fact
or uncertain boundary yields unavailable. Waning ordinal 15 is
Pūrṇā in this classification even though it ends at new moon.
[Source text](https://jainqq.org/explore/002342/27) ·
[Commentary](https://jainqq.org/explore/002342/28)

This is a calendar marker only. Neighboring prohibitions and
variant precedence need an owner-approved interpretation. The
rule does not establish an activity recommendation or natal advice.
A sunrise-defined local weekday, verified tithi and a policy for
uncertain overlaps must be approved before activation.
[Variant discussion](https://jainqq.org/explore/002342/50)

## L12 independent astronomy evaluation

A separate agent ran five checked-in linked-native tests and a
source-only temporary overlay at the stated integration SHA.
The candidate needs geocentric Sun–Moon elongation and local
sunrise. The common zodiac zero point cancels in the elongation.
Sripati houses and natal data are outside the input dependency.

Five dated native tithi crossings in the PAC Chaitra and Ashadha
tables were within the predeclared 70-second source-resolution
screening band. Residuals were −7.881 s, −19.365 s, −11.748 s,
−17.314 s and +10.869 s. The tested native weekday handoff occurred
at native sunrise, without returning houses or customer
authorization. The largest checked sunrise difference was
37.678 s under a different native refraction model, so sunrise
admission remains open. The 11 July published sunrise and tithi
labels are one minute apart. Source rounding and model differences
matter for that interval and require an explicit uncertainty policy.
[PAC Chaitra](https://packolkata.imd.gov.in/panchang/en/chaitra) ·
[PAC Ashadha](https://packolkata.imd.gov.in/panchang/en/ashadha) ·
[PAC calculation conventions](https://packolkata.imd.gov.in/panchang/en/explanation)

Source file SHA-256 values for replay: Chaitra
`2e9b1ce2b9c362235a6cb689b2fa4b317b4486e13f8a23b297be5d52a18a84fe`,
Ashadha
`ac40842ec5a10627b42a32f14a99d4a2ea37be07f331d2e833ee31731f808d75`,
and conventions
`14eaabbb6d2e6b36915ef41f7b987e11bf66c72b653fbd55538bae9423d65d0e`.
