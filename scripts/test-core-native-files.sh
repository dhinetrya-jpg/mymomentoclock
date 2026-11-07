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
{"mode":"SWISS_FILE","usage":"PRODUCTION_AUTHORITY","ephemeris_path":"/run/core01/ephe","file_sha256":{"sepl_18.se1":"ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66","semo_18.se1":"1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7"}}
JSON
chmod 0644 "$fixture/config.json"
docker_local run -d --name "$name" -p 127.0.0.1::8080 -v "$fixture:/run/core01:ro" -e ASTRONOMY_NATIVE_CONFIG_FILE=/run/core01/config.json mymomentoclock:core01-verify-native >/dev/null
port=$(docker_local port "$name" 8080/tcp | sed 's/.*://')
node tests/deployment/smoke.mjs engine "http://127.0.0.1:$port"
CORE01_TEST_MODE=SWISS_FILE node tests/calculation/native_api_contract.mjs "http://127.0.0.1:$port"
# The exact configured mode must fail closed after a data file disappears. No Moshier fallback.
# Corruption also refuses readiness; restore only the exact reviewed public fixture.
python3 - "$fixture/ephe/semo_18.se1" <<'PYDATA'
from pathlib import Path
import sys
p=Path(sys.argv[1]);data=bytearray(p.read_bytes());data[0]^=1;p.write_bytes(data)
PYDATA
node --input-type=module - "$port" <<'JS'
import assert from 'node:assert/strict';const r=await fetch('http://127.0.0.1:'+process.argv[2]+'/ready');assert.equal(r.status,503);const result=await fetch('http://127.0.0.1:'+process.argv[2]+'/api/v1/astronomy/snapshot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({schema_version:1,civil:{birth_date:'2000-01-01',birth_time:'12:00:00',timezone:'UTC',latitude:0,longitude:0,required_mode:'SWISS_FILE'}})});assert.equal(result.status,503);const body=await result.json();assert.equal(body.code,'EPHEMERIS_CHECKSUM_MISMATCH');assert.equal(body.native,undefined);assert.equal(body.customer_timing_authorized,false);console.log('Corrupt required checksum: readiness/API503, no fallback or numerical payload.');
JS
rm "$fixture/ephe/semo_18.se1"
node --input-type=module - "$port" <<'JS'
import assert from 'node:assert/strict';const r=await fetch('http://127.0.0.1:'+process.argv[2]+'/ready');assert.equal(r.status,503);console.log('Nonroot SWISS_FILE runtime, real public files, readonly mounts, then missing-file readiness refusal: passed.');
JS
