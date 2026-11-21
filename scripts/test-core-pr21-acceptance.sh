#!/bin/sh
# Strict numerical acceptance, separate from engineering/evaluator execution.
# Known Moshier model discrepancies remain failing acceptance, never waived.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"
docker_local(){ env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
python3 scripts/core-pr21-reference.py verify
docker_local run --rm -e CORE01_STRICT_SCIENCE=1 -v "$root:/repo:ro" -w /repo/backend mymomentoclock:phase1-go-tests go test -count=1 -mod=readonly -v ./internal/astronomy -run '^Test(PR21|OptionA)'
