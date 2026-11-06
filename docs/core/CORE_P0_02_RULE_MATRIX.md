# CORE-P0-02 rule matrix

No real traditional activity rule or natal/Panchang classification is approved in this workstream. Inventing source passages or weights would defeat the accuracy requirement. All six registry entries are versioned `timing-rules-v1`, unavailable, with explicit OWNER_RULE_SOURCE_REQUIRED references rather than fabricated citations.

| Activity | Current implementation | Required source/evidence |
|---|---|---|
| Work/interviews/professional decisions | Typed category + rule applicability/predicate support | Owner-selected tradition, exact edition/passage and approved rule predicates |
| Purchases/transactions | Same registry, independent rule set possible | Source passage, applicability and exclusions |
| Travel/journeys | Same registry, location/day/solar dependency supported | Source passage, journey/location and solar constraints |
| Learning/exams/study | Same registry, independently versioned rules possible | Source passage and supported natal/transit factors |
| Family/personal occasions | Same registry, event-specific predicates possible | Source passage, occasion scope and exclusions |
| Finance/trading context | Same registry; explicit no-profit/no-predictive-accuracy disclosure | Owner/legal rule/disclosure review; traditional context only |

Rule schema requires stable ID/version/activity, source reference+locator+review status, applicability, limitation, INCLUDE/EXCLUDE, explicit priority, solar dependency and1–16 typed equality predicates. Registry max64 rules. INCLUDE requires at least one natal predicate: generic weekday timing cannot silently become a personalized recommendation. EXCLUDE may express general constraints. Source APPROVED text alone cannot bypass native/release gates.

Supported fact contracts: natal, transit, tithi, nakshatra, yoga, karana and weekday; each key/value has a provenance-bound interval. Optional sunrise/sunset inputs are checked before solar-dependent rules. Rahu Kaal can be supplied as a reviewed exclusion interval/fact, but no unverified weekday mapping or fabricated solar formula is implemented. No production sunrise/Panchang/Rahu algorithm is registered because independently verified inputs are absent.

Tests use `synthetic:algorithm-test` / `engine_test.go` references, toy natal/transit values and test priorities. These prove generic intersection/exclusion/ranking, NOT any astrological rule, astronomical accuracy or empirical predictive validity. They are not shipped in the native registry or served as recommendations. Owner must supply actual sources and uncertainty policy, then review generated classifications against independent references before release.
