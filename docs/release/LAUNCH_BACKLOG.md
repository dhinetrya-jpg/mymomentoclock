# MyMomentOclock launch backlog and implementation audit

Scope supplied by the owner on 23 November 2026. Audit basis: integration at
76f8106bc84fb6b2750d5967bc111bbfd1ecdf7f (through PR #44).
This launch tracker maps customer outcomes and required gates. The existing
BACKLOG.json remains the engineering register, including work beyond this launch.
Current verdict: NO-GO. Status below refers to this scope, with no live worker
assignments inferred from GitHub. Estimates are engineering days, not commitments.

## Product contract and working assumptions

- Give auspicious, non-auspicious and neutral/insufficient-evidence outcomes
  for the chosen activity or general mode, in the selected location's timezone.
  Cover day, week, month, year and a chosen date within the supported year.
  Working assumption: selected calendar year; validate the date and explain the
  range. Year/month summaries drill into the same canonical daily results.
- Make location-only the primary flow. Require no birth date, time or place
  in that mode. Accept manual city choice without device location permission.
  Offer optional current location and a separate birth-based personalization flow.
  Unknown birth time with partial birth data is a separate, limited situation.
- Explain applicable rules in plain language. For unfavorable timing, offer
  a reason, a later suitable window if available, and a practical alternative.
  Let uncovered activities return a clear unavailable result.
- Include colors, clothing, footwear (e.g. leather, sports or wooden where
  supported), metals and stones in guidance coverage. Each recommendation
  must be sourced and applicability stated. Availability is per category.
  Keep optional accessories and symbolic guidance separate from safety rules,
  guarantees, spending pressure and medical or investment recommendations.
- Chat accepts plain-language requests for interviews, shop openings,
  proposals, trading, property purchase and property sale. Confirm ambiguous
  activity, city, or date with the minimum clarification. All time windows
  and explanations come from the same deterministic service used by the UI.
  Start with structured intent routing and templates to avoid inference cost.
  A genuine AI layer stays in scope, gated on an approved model and budget.
  A template-only version must be described accurately.
- Preserve production deployment and live-payment authorization gates.
  Checkout is conditional on the launch being paid. Sripati acceptance
  gates only features that require it, subject to the approved rule design.

## Launch backlog

| ID | Deliverable and acceptance | Verified state | Dependency or blocker | Estimate |
|---|---|---|---|---|
| L01 | Version the selected launch scope, timing vocabulary, allowed claims, date range, supported cities, rule approval and validity policy | Scope stated by owner; engineering contract pending | Resolve interpretations in this document | 1–2d |
| L02 | Produce and review rulebook for general/location-only and personal modes across each named activity, with exact sources, exclusions, precedence and worked examples | In progress at foundations level; catalog currently returns unavailable activities | Domain R&D and review; unresolved rules disabled | 3–7d plus review |
| L03 | City search, explicit current/chosen location and IANA timezone, with denied-geolocation fallback and no guessed birth zone | Partial; current form requests coordinates and timezones | Approved location dataset and coverage | 2–4d |
| L04 | True no-birth mode end to end; no birth fields in request, UI or logs; direct and chat results agree | Pending; existing UNKNOWN still requests date, zone and coordinates | L02 for user guidance; API and UI work can proceed first | 3–5d |
| L05 | Optional natal and approximate modes with uncertainty disclosures and no guessed birth time | Partial; request controls and uncertainty groundwork exist; recommendations unavailable | L02 and per-rule scientific gates | 3–6d |
| L06 | Daily calculation and classification with justifications, missing-input handling and no fabricated intervals | Partial; daily preview, Go engine, and test scaffolding exist | L02; provider evidence | 3–6d |
| L07 | Week, month, year and selected-date views from shared daily results; correct DST, leap day, local boundaries and pagination | Pending as launch experience | L03, L06; measure request cost | 4–7d |
| L08 | Actions, alternatives and next window, with a clear result when none qualifies | Pending | Reviewed activity and fallback rules | 2–4d |
| L09 | Color, outfit, footwear, metal and stone cards with source, applicability and optional alternatives | Pending for launch; remedies code exists | Approved sources or explicit category unavailability | 3–6d |
| L10 | Conversational activity routing for six named intents, including separate purchase and sale; consistent output with form | Pending | L03/L04/L06 and activity catalog; parser can start early | 3–6d |
| L11 | AI-assisted understanding/explanation over validated outputs, model-agnostic harness, accuracy and safe fallback tests | Pending | Model choice, approved budget, evaluation fixtures | 3–6d after decision |
| L12 | Qualify astronomy inputs for the selected rules; admit independent reference cases only when conventions match | In progress; geometry, PAC charts and UT1 comparisons merged; full Sripati gate open | Clock/house frame/convention match and predeclared budget where Sripati is required | 3–7d evaluation; closure unbounded if evidence missing |
| L13 | PWA install, accessibility, privacy and responsive user journeys across launch scope | Partial; shell and scripted Chromium work merged | New-flow testing, real device and assistive tech coverage | 3–6d |
| L14 | Acceptance suite, security review, load/soak, failover and hosted recovery with published evidence | Partial; local preview load/restart and local PostgreSQL restore evidence exists | Approved thresholds, UAT group and private staging | 4–8d plus external scheduling |
| L15 | Swiss Ephemeris license scope and source-delivery evidence or an independently validated replacement | Open release decision | Owner selects AGPL route, Professional terms, or replacement | 1–3d to prepare AGPL evidence after decision; replacement extra |
| L16 | Private deployment smoke, observability, rollback and release checklist | Blocked | Approved host, access/TLS, retention, and recovery | 2–5d after access |
| L17 | Sandbox checkout, refunds and durable entitlement approval if paid launch is enabled | Partial; local recovery only | Approved identity, catalog and sandbox lifecycle | 3–6d after inputs |
| L18 | Exact integrated commit signoff, UAT, release review and go/no-go | Pending | All applicable gates and owner authorization | 1–3d after gates |

## Sequence and delivery estimate

Start L04 contract and location-only UX alongside L02 source research and review.
Run L12 independently. Next, join L03/L04/L06 into daily location-only timing,
then extend across periods, actions and guidance. The chat agent should consume
the same API. Build automated acceptance as features land and request the
owner-level decisions in one batch. Keep uncertainty and unavailable states real.

Planning range with parallel agents and prompt decisions: 2–3 calendar weeks
for a private location-only daily pilot with reviewed rules, 4–7 weeks for a
full-scope release candidate. Production readiness has no defensible fixed date
until the required domain evidence, model choice, licensing, hosting and UAT
are available. Existing approvals for live commerce and production remain separate.
Do not sum the raw item estimates because work can run in parallel.

## Codex execution follow-up

Use origin/integration as the development mainline. Read this plan plus the
current GitHub state, timing contracts, rule registry and evidence. Continue
eligible work when a dependency blocks a different item. First implement
the true no-birth request and UI path under L04, with synthetic fixtures and
explicit unavailable output until reviewed rules are wired. In parallel,
assign source research and contextual domain review for L02. Record the
independent verdict and use reviewed rules for production-facing behavior.

Use isolated feature branches from integration and PRs targeting integration.
Test at the candidate SHA, obtain independent review, verify CI and check
the integrated result. Update this ledger from observed evidence. Keep
production publishing and live payments outside development automation.
