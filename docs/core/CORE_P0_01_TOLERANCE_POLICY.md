# CORE-P0-01 current tolerance policy

2026-11-07. Supersedes the prior fitted analytical tolerances. No tolerance is increased to accommodate an observed implementation error.

| Quantity | Predeclared acceptance budget | Basis and scope |
|---|---|---|
| Apparent geocentric Sun tropical longitude |0.0002degrees | Immutable upstream Skyfield Horizons-derived published test band; two UTC epochs in2005, not a general precision guarantee |
| Sun latitude |0.00001degrees | Same unchanged upstream test band/frame, two epochs |
| ERFA calendar Julian Day |Exact for published integral/half-day case | Original published standards vector |
| ERFA UTC/TAI/TT/UT1 | Original fractional-part tolerance plus one single-JD float64 ULP (~40microseconds) | Native API returns one double instead of ERFA split JD. Representation budget declared before execution, not observational uncertainty |
| ERFA leap-label quasi-JD | Original1e-6day tolerance plus representation ULP | Original whole-JD assertion precision; does not prove subsecond real-world ephemeris accuracy |
| Panchang root solver |Final bracket<=1second | Numerical convergence only. Underlying longitude/time/reference uncertainty remains unaccepted |
| Moon, other planets, distance, speeds, nodes, ayanamsa, houses, solar/Panchang dated events |No independent accuracy budget admitted | Missing compatible captured references; BLOCKED, not passed using broad tolerances |
| D2/D9/D60/nakshatra/pada segmentation |Mathematical boundary invariants only | Correct mapping does not validate input longitude or traditional interpretation |

Legacy0.5/6/30degree bands and their claimed Mars/Moon errors are quarantined regression assertions, not scientific acceptance criteria. The newly captured Mars vector has a barycenter/body-center and pre1972-time convention gap and is NOT admitted for native accuracy comparison. Analytical apparent-Sun diagnostic differences exceed the unchanged upstream band; they do not become authoritative timing inputs. No general confidence/success percentage is emitted.
