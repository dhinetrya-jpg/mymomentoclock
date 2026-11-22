# Independent security and quality audit — candidate

Exact requested SHA: `6c55a7b0c4e1d22d4c850a125d743c107bf44d7e`.
Baseintegration57a6bbe5cd2695fb7a69746ad322384009a6fbd2.
**FAIL: P1 candidate reproducibility/feature integration finding.**

## Finding SEC01 — root PWA integration is outside pinned commit

`git status --short` shows modified vite.config.ts. `git diff -- vite.config.ts` adds import privateShellPwa from ./tooling/pwa.ts and changes plugin array from react()/tailwindcss() to include privateShellPwa(). `git show HEAD:vite.config.ts` lacks both. Thus root production build from the exact committed candidate does not emit manifest/worker/icons, while precommit browser/build checks using dirty working tree can pass. Candidate root PWA is not implemented in pinned SHA despite mirror integration and plugin code being committed. This fails exact-SHA reproducibility and root manifest/cache acceptance.

Reproduction: compare `git show 6c55a7b:vite.config.ts` to working file or fresh checkout build. Required fix: commit intended root config; pin new SHA; verify clean source tree, rebuild root and mirrored frontend, rerun affected real root/subpath/mirror PWA checks on the committed content. Independently revalidate new SHA. I did not edit source.

## Other inspected scope — no additional confirmed material defect

Inspected complete tooling/pwa.ts, PwaStatus, modal focus manager and affected components; browser/timeout/guard tests and evidence; original retained W3C/MDN source excerpts backing secure-context/scope/cache/skipWaiting and keyboard semantics. Worker allowlist contains only emitted immutable shell assets/index/icons/manifest, integrity-checked fetch with credentials omitted and redirects rejected; no normal-use cache writes. Cache identity includes full worker source+asset digests. Failed installs preserve preexisting cache, scoped cleanup excludes foreign namespaces, update checks scoped window clients and refuses multitab activation. No personal API/POST/query data cache was introduced. Default historical public tree remains disabled.

Current changed-build tests cover actual new artifact bytes, failed integrity install, foreign-cache preservation, two-tab refusal/input retention and explicit consent. Versioned script URLs accelerate browser update discovery; they do not establish unmodified production same-URL polling timing. Install control synthetic events are separate from CDP eligibility; no physical OS install claim. Full device/WebKit/Firefox/screen-reader/UAT and hosted rollback remain unverified.

Independent pages_guard_test.py execution:1test PASS. Both build/deploy workflow ref guards prevent integration/feature manual-dispatch publishing, while owner release authorization remains separate. Modal source/tests cover dynamic focusables, background inert/aria state, stacking and synthetic external Razorpay overlay. F01 source distinguishes active deadline from silent unmount/supersession, preserves no-substituted-result gate; browser logs label accelerated timer/synthetic APIs truthfully.

Broader candidate149Node/browser logs are implementer evidence inspected, not full independent reruns by this security reviewer; independent QA is executing browser coverage separately. Their source attribution cannot resolve SEC01 until committed config is pinned and affected checks renewed.

No main merge/deployment/livepayment performed. Missing full approved matrix/CERS/ASCR/rulebook/methods/independent scientific references, owner device/UAT/performance requirements, hosting/access/data policy and verified GitHub administration remain open. No full private readiness verdict follows from scoped engineering checks.
