# Modal keyboard remediation

Base worktree: `/workspace/mymomentoclock-delivery`, integration baseline `57a6bbe5cd2695fb7a69746ad322384009a6fbd2`. No commit created by this agent.

## Defect and change

The BTR, Checkout and ConflictResolver dialogs declared aria-modal=true while lacking initial focus, Tab containment, Escape handling and invoker restoration. The new `useModalFocus` hook implements the WAI-ARIA APG modal keyboard pattern (https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): initial focus, live focusable/disabled-state lookup, forward/reverse wrap, fallback dialog focus, Escape, invoker restoration and inert/aria-hidden background suppression. Original attributes and overlay style values are restored. Logical modal stack bookkeeping handles React removing DOM before layout cleanup; StrictMode setup/cleanup does not leave traps. Nested modal layers/aria-modal state follow the active modal. Visible trusted Razorpay containers temporarily own keyboard/focus and background isolation rather than being trapped behind Checkout. No payment/authentication/BTR/resolver calculation behavior is enabled or changed.

Owned source: src/components/{BtrModal,CheckoutModal,ConflictResolverModal,useModalFocus}.tsx (hook is .ts), exact mirrored frontend copies; tests/accessibility/browser.mjs. Parent requested actual filename was confirmed ConflictResolverModal.tsx.

## Executed checks

- `npm run lint`: PASS.
- `npm --prefix frontend run lint`: PASS.
- `A11Y_WEB_URL=http://127.0.0.1:3101 CHROMIUM_PATH=/usr/bin/chromium node tests/accessibility/browser.mjs`: PASS; output `/tmp/modal-browser-third.log`.
- Both375px and1280px: all three actual React modal components bundled from current source in a StrictMode browser harness. Initial focus; Tab/ShiftTab; live added/disabled controls; background focus suppression; Escape and close button; reopen; exact original inert/aria state restoration; unchanged unavailable/refusal text. Nested modal restore, simulated hosted-provider external overlay handoff, removed invoker fallback all pass.
- Actual running app: associated onboarding labels; UNKNOWN preserves a recorded input disabled rather than inventing/replacing time; submitting UNKNOWN shows unavailable/refusal; outdated heuristic-candidate promise absent. Those Onboarding changes are parent-owned.
- First browser run exposed a real cleanup timing defect (DOM disconnected before useLayoutEffect cleanup); fixed via logical stack-top bookkeeping. A second run needed includeHidden:true for assertions on the intentionally hidden underlying dialog; not a product failure.

## Limits

This is keyboard/DOM/browser validation, not screen-reader or comprehensive WCAG conformance. Chromium only. Hosted Razorpay handoff uses a synthetic external container; no genuine provider checkout, iframe accessibility, payment success or sandbox approval is claimed. The component harness bundles live source; the actual application production bundle needs parent rebuild after final hook stabilization. Source stable following this report. No new dependencies, third-party service calls or release activation.
