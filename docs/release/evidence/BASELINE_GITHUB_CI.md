# GitHub CI audit — 2026-11-21 UTC

Read-only public GitHub Actions HTML inspection. No workflow reruns, deployment, changes, or credential use. Sanitized machine evidence: `/tmp/release-ci-audit.json`.

Main full SHA: `03a5f5e7704c1e07aaa0de5bcbb9e301948bd4a8`. Four main run pages each include this full commit hyperlink and title `@03a5f5e`. PR #27 latest head: `33b9a70d56c5ecd764e23761d13d322a9a6a1db9`; four PR run-page titles identify `@33b9a70`, triggered via PR #27 synchronize. These public run pages do not expose the full PR head SHA or the actual synthetic pull-request merge SHA tested: full-head binding requires corroboration with PR/local Git history. Do not claim the title alone establishes exact checked-out head.

| Run | Scope | Workflow | Conclusion | Jobs |
|---|---|---|---|---|
| [44938605719](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44938605719) | PR27 @33b9a70 title | F01 Cross-Engine Diagnostic Evidence | SUCCESS | diagnostic: completed successfully |
| [44938605825](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44938605825) | PR27 @33b9a70 title | CI - Lint & Build | SUCCESS | build-and-test: completed successfully |
| [44938605841](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44938605841) | PR27 @33b9a70 title | Docker Image Build Test | SUCCESS | docker: completed successfully |
| [44938605859](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44938605859) | PR27 @33b9a70 title | Phase 1 native and durable payment security | SUCCESS | isolated-security-tests: completed successfully |
| [44939095470](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44939095470) | main full SHA linked | Deploy to GitHub Pages | SUCCESS | build: completed successfully, deploy: completed successfully |
| [44939095515](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44939095515) | main full SHA linked | Phase 1 native and durable payment security | SUCCESS | isolated-security-tests: completed successfully |
| [44939095546](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44939095546) | main full SHA linked | Docker Image Build Test | SUCCESS | docker: completed successfully |
| [44939095555](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44939095555) | main full SHA linked | CI - Lint & Build | SUCCESS | build-and-test: completed successfully |

No failed jobs were found among these eight latest main/PR27 runs. Main does not have an observed F01 Cross-Engine Diagnostic Evidence run in this latest merge set; PR27 does. Successful Pages build/deploy is an observed earlier external action, not an action taken by this audit, and proves neither production backend deployment nor live payment verification.

## Historical failures, distinct from current head

Three older PR27 runs title-bind to `@03686ec`, and all were superseded by successful later PR27/main runs:

- [44935827381](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44935827381): F01 diagnostic, failed step “Run pinned independent-astronomy input comparison”, exit 1. [Job136942110572](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44935827381/job/136942110572).
- [44935827331](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44935827331): Docker, failed “Build Docker image”; `CGO_ENABLED=1 go test -mod=readonly ./... && CGO_ENABLED=1 go build -mod=readonly -trimpath -o /app/astroengine_server ./cmd/server` failed exit 1. [Job136942110360](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44935827331/job/136942110360).
- [44935827307](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44935827307): isolated-security-tests, failed step “Native Go tests, race detection, vet and isolated PostgreSQL recovery”, exit 1. [Job136942110209](https://github.com/dhinetrya-jpg/mymomentoclock/actions/runs/44935827307/job/136942110209).

These HTML pages expose annotations only and require “Sign in to view logs”. The actual Go assertion/stack/compiler failure is unavailable from public HTML; do not infer a specific root cause. They also show Node20 action deprecation warnings (forced Node24) for checkout/setup-node/build-push/setup-buildx old majors; these warnings are not proof of failure cause. Actions listing also contains older failed run IDs44935727303/44935727302/44935727290/44935593243/44935593213/44935593167; not current latest-head failures.
