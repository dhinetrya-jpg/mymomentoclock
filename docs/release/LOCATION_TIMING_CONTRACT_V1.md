# Location timing contract v1

This records the implemented private-preview boundary and the remaining
launch decisions. The launch acceptance baseline is [PR #45 at
`429cadf`](https://github.com/dhinetrya-jpg/mymomentoclock/blob/429cadf599af9fc6369545c4e6bdb434e9a04860/docs/release/LAUNCH_BACKLOG.md).

## Inputs and coverage

The direct form and deterministic guided template submit the same four
fields to `POST /api/v1/timing/location-only`: `schema_version` (1),
`city`, `date`, and `activity`. City is a case-sensitive catalog name on
the wire. The gateway derives its IANA zone from the catalog. The date
is a Gregorian civil date in that zone, written `YYYY-MM-DD`. The
implemented validation range is inclusive from 2000-01-01 through
2100-12-31. The validation range establishes accepted input syntax.
Verified calculation coverage still requires its own approval.

| IANA zone | Catalog cities |
| --- | --- |
| Asia/Kolkata | New Delhi, Mumbai, Bengaluru, Kolkata, Hyderabad, Ahmedabad, Chennai, Pune |
| Europe/London | London |
| America/New_York | New York |
| Asia/Dubai | Dubai |
| Asia/Singapore | Singapore |

Activity identifiers are `general`, `interview`, `shop_opening`,
`proposal`, `trading`, `property_purchase`, and `property_sale`.
Guided text stays in the form, and suggestions require user confirmation.
Calendar browsing selects a day for this same request. The location-only
path uses manual choice and has no birth fields or coordinate payload.
The optional personal timing flow is separate.

## Result and claims

Valid selections currently return HTTP 503, `mode: LOCATION_ONLY`,
`status: UNAVAILABLE`, `code: LOCATION_RULES_UNAVAILABLE`, and
`windows: []`. The response also contains the validated city, date,
activity, and catalog zone. The response is marked `no-store`. Malformed
selections and unsupported cities return 422.

Unavailable means timing guidance cannot be evaluated for that selection.
The date-picker action returns the user to the date field for an explicit
new selection. Auspicious, non-auspicious, neutral, and next-window
outputs require reviewed rules and qualified inputs.

## Approval record required for rule activation

Record the activity and applicability, precise source and edition,
exclusions and precedence, weekday boundary and uncertainty policy,
qualified provider and supported period/location, and approved claims.
Attach independent domain review and worked reference cases before
activating the rule. Geographic pilot approval, private staging and
release signoff are separate decisions. This contract records observed
behavior and does not grant authorization.

Implementation anchors are
`src/engine/locationTiming.ts`, `server/timingBoundary.ts`,
`tests/timing/contracts.test.tsx`, and `tests/timing/browser.mjs`.
