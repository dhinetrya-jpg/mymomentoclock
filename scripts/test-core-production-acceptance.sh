#!/bin/sh
# Option A: numerical subset PASS never overrides still missing scientific/domain/legal evidence.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"
docker_local(){ env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
python3 scripts/core-reference-acquire.py verify
python3 scripts/core-option-a-jupiter.py verify
python3 scripts/core-option-a-outer-planets.py verify
python3 scripts/core-option-a-reuse.py verify
python3 scripts/core-option-a-timezones.py verify
python3 scripts/core-option-a-events.py verify
log=$(mktemp)
trap 'rm -f "$log"' EXIT HUP INT TERM
result=0
docker_local run --rm -e CORE01_STRICT_SCIENCE=1 -e CORE01_SCIENCE_MODE=SWISS_FILE -v "$root:/repo:ro" -w /repo/backend mymomentoclock:phase1-go-tests go test -count=1 -mod=readonly -v ./internal/astronomy -run '^Test(PR21|OptionA)' > "$log" 2>&1 || result=$?
cat "$log"
[ "$result" -eq 0 ] || exit "$result"
# Optional evidence path is task-local, never a production approval input.
output=${CORE01_PRODUCTION_RESULT:-/tmp/core01-production-acceptance.json}
python3 scripts/core-option-a-results.py "$log" --output "$output"
