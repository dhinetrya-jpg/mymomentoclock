# PWA-P0-01: private static application shell

Source: owner delivery brief headed “GOAL — DEVELOP AND VERIFY MYMOMENTOCLOCK THROUGH PRIVATE RELEASE READINESS”, supplied 2026-11-22, product anchors and PWA/design acceptance sections. Historical CORE-P0-01 baseline also names the PWA. This contract covers application engineering and synthetic browser tests; it does not approve domain rules, hosting, customer activation, main/master publishing, payments, or scientific acceptance.

## Behavior

Both frontend builds emit a same-origin manifest, actual PNG192/512 icons, a maskable SVG icon, theme color and a service worker. Relative manifest URLs and worker registration honor the Vite base path, including a project subdirectory. `publicDir:false` remains; historical public implementation artifacts are not published. The optional browser install button exists only after a genuine beforeinstallprompt event. Browser-specific manual guidance makes no promise that every browser can install. A browser accepting an install request is distinguished from appinstalled reporting completion.

The UI reports observed connectivity without claiming server availability. Offline, only a previously prepared static shell may load. Server calculations and checkout need connectivity; local analytical previews remain unverified. No saved birth/profile/history/result data is introduced. First-visit offline cannot bootstrap an uncached shell. Existing computational/refusal/entitlement gates are unchanged.

## Cache boundary

The build plugin allowlists emitted index.html and assets plus its generated manifest/icons. Installation fetches those exact files without credentials and verifies SHA256 against build bytes before caching. A response obtained while using the application is never persisted. Only same-origin GETs with no query/hash and an exact allowlisted path are read from cache. API, POST, auth, checkout, unknown navigation, external and query-bearing requests are excluded; no opaque runtime cache exists. Offline navigation fallback is restricted to the scope root and index.html, not arbitrary routes. Online root navigation prefers network without writing that response into CacheStorage. Normal HTTP/browser caches, server responses and infrastructure remain independently governed by existing no-store controls.

Cache names include the deployment scope and a digest of the complete worker source, including protocol logic and asset digests. Failed installation removes only a newly created candidate cache. An existing cache with the same identity is preserved on failure; any writes into it have independently verified identical build bytes. Activation cleans only obsolete owned caches within the same deployment scope, preserving unrelated application caches.

## Update and data-loss boundary

No automatic skipWaiting or reload. A waiting update is announced only while an older active controller exists. Reload requires an explicit confirmation warning that unsaved birth details, other form inputs and checkout progress will be lost. Cancel leaves the current page and inputs intact. Before activation, the waiting worker checks scoped window clients: with multiple open windows/tabs, it refuses activation and returns instructions to close the other app tabs and retry. Only the consenting page attaches a reload listener. The worker does not broadcast a forced reload to other clients. Browser-managed routine update-check scheduling is not an application freshness SLA.

## Executable acceptance

`CHROMIUM_PATH=/usr/bin/chromium node tests/pwa/browser.mjs` builds temporary root, project-base and alternate frontend artifacts and serves them on ephemeral loopback ports. It uses fresh persistent Chromium profiles (incognito disables installability). Assertions cover:

- Browser-reported installability errors absent; manifest scope/start URL and actual icons available. Separately labelled synthetic beforeinstallprompt/userChoice/appinstalled events exercise keyboard install-control prompt/dismiss/accepted states without claiming an OS install.
- Actual worker install/control and scoped static cache contents after synthetic private GET/POST/query requests.
- Integrity-failed next-build precache preserves the working old cache and form.
- A genuine changed JS/HTML build produces a waiting update; no automatic input loss; cancel preserves input.
- Two controlled tabs retain different form inputs when one requests an update; activation refuses until the other tab closes.
- Explicit retry applies the new build, displays changed UI content and removes obsolete owned cache, preserving seeded foreign and other-scope caches. A worker-protocol-only build change with identical static bytes must produce a distinct cache identity.
- Offline root reload loads static shell, announces offline, has no saved birth input, and private API/query-bearing requests fail rather than return cached success; connectivity recovers.
- 375px viewport has no document horizontal overflow.

Tests accelerate same-scope update discovery using versioned worker script URLs; they test real browser worker lifecycle and actual changed build bytes, not a mocked registration. Physical Android/iOS installation, Safari/WebKit behavior, actual screen-reader and real-user signoff remain unverified. Chromium emulation is not a complete approved browser/device matrix. HTTPS deployment, service-worker scope headers and backend routing must be validated in any separately authorized hosting environment before deployment acceptance.

Rollback remains an operational gate: restoring an older server artifact does not forcibly reload controlled tabs. Users can finish their task and reload after closing other tabs, or clear/unregister the app in browser settings. A hosted emergency worker retirement/recovery procedure requires approved infrastructure and must not be claimed from these local tests.
