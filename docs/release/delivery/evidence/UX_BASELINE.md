# Product / UX / PWA read-only audit

Pinned integration: `57a6bbe5cd2695fb7a69746ad322384009a6fbd2` in `/workspace/mymomentoclock-delivery`. Inspection date 2026-11-22. Source-only audit: no browser/device measurements, install prompts, screen-reader exercise, network experiment, or tests executed for this report. No source edited.

## Authority and sources

Latest owner brief: `/workspace/attachments/819a2f03-b9ba-4780-b15b-206a710dab35/Pasted text.txt`, headed GOAL — DEVELOP AND VERIFY MYMOMENTOCLOCK THROUGH PRIVATE RELEASE READINESS. Explicit anchors: mobile-first PWA; equal priority personal guidance and city-local timing; daily timeline; understandable Why this time rule trace; limited unknown birth mode. Acceptance section explicitly requires manifest/install/update/cache/offline/connectivity/personal-data caching, keyboard/screen-reader, approved device matrix and source-bound behavior. This brief authorizes work on those engineering properties, not activation of scientific/domain/payment gates. Browser/device matrix and formal performance thresholds are not specified.

Existing contracts: `docs/core/CORE_P0_02_ARCHITECTURE.md` (version named CORE-P0-02; civil-day timeline, explanations, stateless/privacy, UNKNOWN/APPROXIMATE insufficient), `docs/core/CORE_P0_02_HANDOFF.md` and `CORE_P0_02_TEST_REPORT.md` (historical 375/1280 Chromium synthetic browser evidence, not fresh tests), `docs/features/F01_BIRTH_TIME_UNCERTAINTY.md` (exploratory uncertainty only, not rectification; UNKNOWN entire local date; no raw natal samples), `docs/core/CORE_P0_01_BASELINE.md:15` (historical PWA intent), `docs/release/BACKLOG.json` and `HANDOFF.md` (existing blockers). Primary source-research agent should bind the historical document versions to original approved attachments; this audit does not upgrade draft claims to requirements.

## Eligible engineering findings and acceptance

### UX-PWA-01 — P1: PWA application metadata and install capability absent

Evidence: `index.html` and `frontend/index.html` have no manifest link, app icons or theme color. `src/main.tsx` and mirrored main only render React. `vite.config.ts` and `frontend/vite.config.ts` set publicDir=false; no worker or manifest source exists in tracked application files. Historical public/assets contains old implementation artifacts and must remain excluded from product builds.

Proposed scoped acceptance: provide a named, same-origin manifest with correct id/start_url/scope for both root and configured project base; standalone display, actual appropriately sized icons, accessible branded fallback; manifest and icon requests succeed from built artifact. Do not accidentally expose public/assets history. Registration must be restricted to secure contexts and intended scope. Chromium installability and Android/iOS install experience need actual separate evidence; a valid manifest alone is not install success. Manual instructions must be platform-honest; no fabricated universal install button. Browser/device policy remains open, but buildable metadata is eligible now.

### UX-PWA-02 — P1: no offline/degraded/update model or personal-data cache policy implemented

Evidence: no serviceWorker registration, Cache API, offline/online observers or install/update UI in application sources. Existing `src/engine/timingClient.ts:25`, `src/components/BirthTimeExplorer.tsx:51`, and paymentClient use no-store; no localStorage/sessionStorage/IndexedDB calls found. This is currently a positive minimization property, not evidence of an offline leak. Adding broad caching would create a regression risk.

Proposed scoped acceptance: cache only immutable same-origin shell assets explicitly emitted by build; never cache API routes, POSTs, credentials, birth/profile/calculation responses, checkout/entitlements, arbitrary navigations, query-bearing requests or authenticated HTML. Offline state must clearly say calculation and checkout require connectivity; it must never present previously obtained guidance as current or successful. First-visit-offline and repeat-visit-offline limitations must be explicit. Test CacheStorage contents after synthetic birth/payment requests, worker update/version replacement, cleanup of obsolete owned caches only, unavailable API response behavior, API network errors without SPA-fallback200, root and project base navigation. Updates should be announced and user-controlled; never silently reload an in-progress form or checkout. Product choice of any saved calculations/profile/offline history is NOT approved by these anchors and must stay absent.

### UX-A11Y-01 — P1: dialogs declare modality without modal keyboard/focus behavior

Evidence: `src/components/CheckoutModal.tsx:5`, `BtrModal.tsx:4`, `ConflictResolverModal.tsx:3` and mirror versions render role=dialog/aria-modal but no focus effect, key handler, focus boundary, inert background, Escape handling or return-focus. Background controls remain live DOM focus targets. No generic dialog utility exists.

Proposed scoped acceptance: open each dialog with keyboard, move focus into named dialog, contain Tab/Shift+Tab inside it, close with Escape and explicit close control, restore focus to surviving trigger, prevent background interaction while open, preserve conditional checkout capability logic and refusal copy. Verify at 375/1280 plus 320 CSS px/reflow, including long content scroll and keyboard-only without paying or bypassing gates. Native HTML dialog or a small shared component are implementer choices; no new purchased package needed.

### UX-A11Y-02 — P1: birth-profile controls lack accessible label associations

Evidence: `src/components/OnboardingWizard.tsx:78–124`: Birth Date, Birth Time, City and Ayanamsa labels are siblings with neither htmlFor/id nor nesting; four controls consequently lack programmatic names. Mirror same. Other modern DailyTiming/F01 fields wrap controls in labels and are better structured.

Proposed scoped acceptance: exact visible labels name each native control, keyboard submission and browser validation retain behavior, error/status announced, both mirrors updated consistently. Confirm with browser accessible-name locators and keyboard. Do not change analytical calculations or claim historical IANA support for this legacy preview.

### UX-COPY-01 — P1: onboarding still advertises BTR heuristic candidates

Evidence: `src/components/OnboardingWizard.tsx:99` says “BTR offers heuristic candidates only”, contradicted by current `BtrModal.tsx:4` (“No candidate, confidence score or certification is generated”) and F01 contract. This is an actionable factual inconsistency, not a request for new BTR functionality.

Proposed scoped acceptance: onboarding consistently says rectification unavailable/unverified and directs unknown-time users to the supported Birth Time Explorer uncertainty path if navigation is supplied; no candidate/confidence/rectification promise. UNKNOWN mode must not invent a time. The existing required birth-time field also prevents submitting UNKNOWN without a time; review that flow with the restricted analytical-chart contract and expose clear limitation before submission rather than promising a chart.

### UX-FAIL-01 — P1: F01 timeout silently clears busy without showing failure

Evidence: `src/components/BirthTimeExplorer.tsx:45–56`: 12-second timer aborts controller; catch only sets error when !signal.aborted, so timeout produces no error and no result. Unmount abort should stay silent, but an active user's timed-out request needs a visible state.

Proposed scoped acceptance: force pending fetch past timeout; busy clears and an accessible nontechnical unavailable/retry message appears with no old result. Unmount/superseded request abort causes no stale error or response. No retry sends sensitive details without a deliberate user action. Apply mirrored component regression. This is eligible independently of astronomy approval.

## Existing behavior retained / scope limits

Daily timing `src/components/DailyTiming.tsx:5–18` already renders civil-day duration, offset-qualified labels and equivalent ordered textual explanations. It supports no-window/no-day states; `:34` declares guidance unavailable; `:55+` distinguishes synthetic and insufficient evidence. `src/engine/timingClient.ts` checks versions, classifications, rank, duration and limits. No defect established simply because “Why this time?” is not a literal heading: explanations already exist. A labelled explanation disclosure linking available rule IDs/version to prose would be an optional source-trace presentation improvement, not authorization to create rules. Test long explanations/empty explanation coverage before claiming usability acceptance.

UNKNOWN daily birth intentionally omits time/offset and yields insufficient evidence by CORE-P0-02 architecture; F01 UNKNOWN investigates entire local date without predicting actual time. These are different supported modes. Do not convert safety refusal into delivered personalized timing or automatically apply midday. A birth-free year-round city-local timing flow is a product anchor gap, but usable favorable windows depend on qualified astronomical/rule contracts and reconciliation of equal-priority city/personal scope; the current brief alone supplies no traditional rulebook. Geocoding provider, location permission, saved profiles and offline personal history are draft choices, not required or authorized implementation decisions.

Potential mobile issue needing reproduction: `src/App.tsx:80–95` profile quick bar has a single nonwrapping flex row containing several text segments and editor button; `src/index.css:body` hides horizontal overflow. Navigation horizontally scrolls by design. Test 320/375, long city names and 200/400% zoom before recording a clipping failure. Small text/button targets and contrast likewise require measurement; no invented WCAG pass/fail from class names. Reduced-motion behavior for ambient games needs scoped test if that feature survives product reconciliation.

## Suggested delivery order and evidence

One writer per overlapping frontend mirror. First tackle factual copy/accessibility/timeouts; these need no missing domain decision. Then manifest + static-shell-only worker/connectivity/update flow under a single PWA writer with explicit security review. Browser smoke should cover both built frontends and base paths; Chromium is a testable initial slice, not approved universal browser support. Run targeted accessibility regression for dialogs/onboarding, existing timing/F01 browser suites, typechecks/builds, and synthetic offline/cache/update tests. Independent audit must inspect final exact SHA and actual test output. Physical iOS/Android install, actual screen-reader use, real UAT and approved browser/device matrix remain open until separately evidenced. Hosting/deployment remains separately authorized; no main/master merge or publish.
