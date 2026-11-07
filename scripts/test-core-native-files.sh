#!/bin/sh
# Local-only nonroot runtime test with public vendor fixtures; never an accuracy/source approval.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$root"
docker_local(){ env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
name="core01-files-$(openssl rand -hex 6)"
fixture=$(mktemp -d)
cleanup(){ docker_local rm -f "$name" >/dev/null 2>&1 || true;rm -rf "$fixture"; }
trap cleanup EXIT HUP INT TERM
# Only public ephemeris data/config are placed here; readable by the image's nonroot UID.
chmod 0755 "$fixture"
mkdir "$fixture/ephe"
cp tests/calculation/reference/acquired/native-data/sepl_18.se1 tests/calculation/reference/acquired/native-data/semo_18.se1 "$fixture/ephe/"
chmod 0755 "$fixture/ephe"
chmod 0644 "$fixture/ephe/"*.se1
cat > "$fixture/config.json" <<'JSON'
{"mode":"SWISS_FILE","ephemeris_path":"/run/core01/ephe","file_sha256":{"sepl_18.se1":"ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66","semo_18.se1":"1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7"}}
JSON
chmod 0644 "$fixture/config.json"
docker_local run -d --name "$name" -p 127.0.0.1::8080 -v "$fixture:/run/core01:ro" -e ASTRONOMY_NATIVE_CONFIG_FILE=/run/core01/config.json mymomentoclock:core01-verify-native >/dev/null
port=$(docker_local port "$name" 8080/tcp | sed 's/.*://')
node tests/deployment/smoke.mjs engine "http://127.0.0.1:$port"
CORE01_TEST_MODE=SWISS_FILE node tests/calculation/native_api_contract.mjs "http://127.0.0.1:$port"
# The exact configured mode must fail closed after a data file disappears. No Moshier fallback.
rm "$fixture/ephe/semo_18.se1"
node --input-type=module - "$port" <<'JS'
import assert from 'node:assert/strict';const r=await fetch('http://127.0.0.1:'+process.argv[2]+'/ready');assert.equal(r.status,503);console.log('Nonroot SWISS_FILE runtime, real public files, readonly mounts, then missing-file readiness refusal: passed.');
JS
