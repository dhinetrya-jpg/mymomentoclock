# PAY-P0-03 local evidence

2026-11-06. Baseline main e8c65c1fb21d31a781d5d9314cf2722983558e2c. Initial implementation a7f17e766f5b758565c6ebbf52e5e0eb2b71062a; final functional source `9dd0075b76cc4779863272fbce788222cd852d00` adds bounded-backoff regression. Full suite plus affected-code test provenance is recorded in TEST_REPORT/HANDOFF.

Host Node24.22.1 runs TypeScript/unit/browser checks; production web image and actual cross-service fixture use Node22. Native toolchain Go1.26.10 with pinned Swiss Ephemeris native library. Test script binds live repository source into the retained native toolchain image and downloads pinned JWT dependency using the trusted CA; no TLS verification bypass. Database16-alpine uses verified TLS and disposable names, never production DSN. All test-state secrets/keys/session marker files are outside Git and removed by traps.

The full Go gate exit0 covers both modules normal/race/vet/CGO-disabled and actual PostgreSQL restart, with three recovery checks. Initial verbose-stage restart-only skips are followed by dedicated post-restart PASS. The final full Go gate was rerun on9dd0075 including the bounded-backoff regression; a separate affected-code/race/vet check also passed. Node boundary/security73 plus calculation41 =114 passed,0 failed,0 skipped. Commercial browser12 scenarios and original375/1280 regression passed. Artifact logs identify local image/binary/web hashes and verify nonroot, safe production refusal, migration006 packaging and native/web functional smoke. Local provider fixture timing is not a production capacity claim.

pr-create.log preserves the GitHub GraphQL Forbidden response. A branch URL or PR-creation URL is not an existing PR. No merge, production migration/deployment, live key/charge or real Razorpay transaction occurred. Genuine sandbox verification remains BLOCKED_EXTERNAL_DEPENDENCY. This evidence directory contains only selected safe logs, no private fixture keys/tokens/config/DSNs.

Final native image/binary hashes in artifacts-native-final.log supersede the earlier native hashes in artifacts.log; web/migration artifacts are unchanged.
