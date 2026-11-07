#!/bin/sh
# Reproducible engineering checks followed by strict independent acceptance (never silently green when evidence is pending).
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"
[ -d node_modules/tsx ] || { echo 'DEPENDENCY_MISSING: run npm ci before verification' >&2;exit 2; }
docker_local(){ env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
docker_local info >/dev/null
python3 scripts/core-reference-acquire.py verify
python3 scripts/core-reference-tests.py
python3 scripts/core-pr21-tests.py
npm run lint
npm run build
npm --prefix frontend run lint
npm --prefix frontend run build
for test_file in tests/calculation/integrity.test.tsx tests/calculation/astronomical_accuracy.test.ts tests/calculation/independent_planetary_accuracy.test.ts tests/calculation/temporal_reference_accuracy.test.ts tests/calculation/panchang_accuracy.test.ts tests/calculation/analytical_safety.test.ts tests/calculation/native_reference_diagnostics.test.ts tests/timing/contracts.test.tsx tests/payment/boundary.test.ts tests/payment/pay02.test.tsx tests/payment/pay03.test.tsx tests/phase1/security.test.ts; do
 node --import ./tests/calculation/register-assets.mjs --import tsx "$test_file"
done
# This existing script always recompiles current source and executes real native/PG/restart tests.
# Optional PHASE1_REUSE_TEST_IMAGE=1 reuses only the installed toolchain, never stale application binaries.
sh scripts/test-phase1-go.sh
# Native runtime and web image builds use the same verified code. Optional CA trust applies to networked build steps only.
# Acceptance repair can explicitly rebuild all layers after disk/cache recovery.
no_cache=''
if [ "${CORE01_DOCKER_NO_CACHE:-}" = 1 ]; then no_cache='--no-cache'; fi
if [ -n "${PHASE1_CA_BUNDLE:-}" ]; then
 docker_local build $no_cache --secret "id=proxy_ca,src=$PHASE1_CA_BUNDLE" -t mymomentoclock:core01-verify-native .
 docker_local build $no_cache --secret "id=proxy_ca,src=$PHASE1_CA_BUNDLE" -t mymomentoclock:core01-verify-web -f Dockerfile.web .
else
 docker_local build $no_cache -t mymomentoclock:core01-verify-native .
 docker_local build $no_cache -t mymomentoclock:core01-verify-web -f Dockerfile.web .
fi
name="core01-verify-$(openssl rand -hex 6)"
web_pid=''
cleanup(){ [ -z "$web_pid" ] || kill "$web_pid" 2>/dev/null || true;docker_local rm -f "$name-native" "$name-web" >/dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM
# Ephemeral loopback ports: no deployment or public exposure.
docker_local run -d --name "$name-native" -p 127.0.0.1::8080 mymomentoclock:core01-verify-native >/dev/null
docker_local run -d --name "$name-web" -p 127.0.0.1::3000 mymomentoclock:core01-verify-web >/dev/null
native_port=$(docker_local port "$name-native" 8080/tcp | sed 's/.*://')
web_port=$(docker_local port "$name-web" 3000/tcp | sed 's/.*://')
node tests/deployment/smoke.mjs engine "http://127.0.0.1:$native_port"
node tests/deployment/smoke.mjs web "http://127.0.0.1:$web_port"
PHASE1_WEB_URL="http://127.0.0.1:$web_port" PHASE1_ENGINE_URL="http://127.0.0.1:$native_port" node tests/phase1/contracts.mjs
CHROMIUM_PATH=${CHROMIUM_PATH:-$(command -v chromium || command -v google-chrome || true)}
[ -n "$CHROMIUM_PATH" ] || { echo 'DEPENDENCY_MISSING: Chromium for required browser verification' >&2;exit 2; }
export CHROMIUM_PATH
PHASE1_WEB_URL="http://127.0.0.1:$web_port" node tests/phase1/browser.mjs
CORE02_WEB_URL="http://127.0.0.1:$web_port" node tests/timing/browser.mjs
node tests/payment/pay03-browser.mjs
node tests/calculation/native_api_contract.mjs "http://127.0.0.1:$native_port"
sh scripts/test-core-native-files.sh
printf '%s\n' 'ENGINEERING_CHECKS_PASSED. Running independent scientific acceptance; engineering success cannot waive missing references.'
sh scripts/test-core-pr21-acceptance.sh
python3 scripts/core-reference-acquire.py accept
