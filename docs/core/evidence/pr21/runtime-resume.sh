set -eu
root=/workspace/mymomentoclock
cd "$root"
docker_local(){ /tmp/check-docker.sh "$@"; }
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
