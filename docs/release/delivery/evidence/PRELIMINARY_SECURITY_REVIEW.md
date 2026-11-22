# Preliminary security/design review — not acceptance

Base57a6bbe5cd2695fb7a69746ad322384009a6fbd2; current uncommitted delivery worktree. No exact candidate pinned; no PASS verdict or claim executable checks finished. Source read-only.

No additional confirmed material privacy defect found in inspected current implementation. Worker uses build-emitted integrity hashes and credentials:omit install fetches, no runtime cache writes, strict same-origin exact URL/static allowlist and query rejection. Worker code contributes to cache version; cache namespace includes scope path. Personal POST/API/auth/payment responses are outside the list and never saved by this worker. Historical public tree remains disabled. Root/subpath/mirror/browser tests are targeted in source, but their existence does not establish execution.

Pages build+deploy now both guard main/master refs; integration/feature dispatch cannot satisfy those conditions. Owner authorization/environment rules still separate; no live workflow dispatch or deployment should be performed for verification. F01 timeout now distinguishes genuine current request expiry from stale cancellation, and onboarding UNKNOWN refuses an exact chart rather than substituting a time.

Modal focus manager uses stack, background inert/aria-hidden restoration, bounded dialog scroll and hosted checkout exception. This warrants actual keyboard tests including stacked dialogs, hidden/disabled inputs, radio groups, focusreturn and synthetic provider iframe; no claim of real provider/screen-reader conformance. No concrete escaped-focus/privacy defect was established from source alone.

Necessary lifecycle regressions before final acceptance:
- Two controlled tabs: one accepts update while other has unsaved input. Nonconsenting tab must not reload/lose input; old-version referenced resources must remain viable or limitation be explicit. Activation immediately deletes predecessor cache and claims all clients; single-tab tests alone cannot assess this interaction.
- Failed integrity/install must preserve active predecessor and its usable offline shell; test partial new cache cleanup, no unrelated scope deletion. With content version bound to template+FILES, different workers should not accidentally delete a shared active cache on install failure.
- Actual new build with changed index/asset hashes (not only edited cache-name test script) should wait, cancel safely, then consent/reload and function offline. Existing test mutates sw.js cache name with unchanged files; useful lifecycle proof but not complete new-artifact compatibility proof.
- Nested/project scope, query-bearing navigation/assets, Authorization/private GET and POST, unknownnavigation, cross-origin and third-party responses stay uncached. Enumerate caches after synthetic birth/checkout calls and verify no input/results.
- Worker fetch failures/registration errors leave online app usable; initial controller claim must not cause unintended reload. Secure-context, physical mobile/Safari/WebKit/real-user gaps remain recorded.

Current PwaStatus requires explicit confirmation explaining birth/form/checkout data loss before local reload; only consenting tab installs controllerchange reload listener. Other tabs receive controller change without automatic reload, but predecessor cache deletion deserves multitab exercise above. A same-origin script can send update message; this is not a new security boundary against already executing same-origin code.

Final audit must inspect frozen SHA, emitted worker/manifests/artifacts and real production browser results. Domain rules/scientific acceptance/full approved inventory/private hosting gates remain unchanged.