#!/bin/sh
# Isolated real database tests. No production connection is read or migrated.
set -eu
repo=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$repo"
docker_local() { env -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
name="mymomentoclock-phase1-$(openssl rand -hex 6)"
config=$(mktemp)
cleanup(){ docker_local rm -f -v "$name-db" >/dev/null 2>&1 || true; docker_local network rm "$name" >/dev/null 2>&1 || true; rm -f "$config"; }
trap cleanup EXIT HUP INT TERM
set -- build --target root-tests -t mymomentoclock:phase1-go-tests
if [ -n "${PHASE1_CA_BUNDLE:-}" ];then set -- "$@" --secret "id=proxy_ca,src=$PHASE1_CA_BUNDLE";fi
docker_local "$@" .
docker_local network create "$name" >/dev/null
password=$(openssl rand -hex 24)
printf 'PHASE1_TEST_DATABASE_URL=postgres://phase1_test:%s@%s-db:5432/phase1_test?sslmode=disable\n' "$password" "$name" > "$config"
chmod 600 "$config"
docker_local run -d --name "$name-db" --network "$name" -e POSTGRES_USER=phase1_test -e POSTGRES_DB=phase1_test -e "POSTGRES_PASSWORD=$password" postgres:16-alpine >/dev/null
ready=false
for attempt in $(seq 1 30);do if docker_local exec "$name-db" pg_isready -U phase1_test -d phase1_test >/dev/null 2>&1;then ready=true;break;fi;sleep 1;done
[ "$ready" = true ] || { echo 'Isolated PostgreSQL failed readiness' >&2;exit 1; }
docker_local run --rm --network "$name" --env-file "$config" -v "$repo:/repo" -w /repo mymomentoclock:phase1-go-tests sh -c 'set -e; go version; go test -count=1 -mod=readonly ./...; go test -count=1 -mod=readonly -race ./...; go vet ./...; CGO_ENABLED=0 go test -count=1 -mod=readonly ./...; cd backend; go test -count=1 -mod=readonly -v ./...; go test -count=1 -mod=readonly -race ./...; go vet ./...; CGO_ENABLED=0 go test -count=1 -mod=readonly ./...'
docker_local restart "$name-db" >/dev/null
ready=false
for attempt in $(seq 1 30);do if docker_local exec "$name-db" pg_isready -U phase1_test -d phase1_test >/dev/null 2>&1;then ready=true;break;fi;sleep 1;done
[ "$ready" = true ] || exit 1
docker_local run --rm --network "$name" --env-file "$config" -e PHASE1_TEST_RESTART_CHECK=1 -v "$repo:/repo" -w /repo/backend mymomentoclock:phase1-go-tests go test -count=1 -mod=readonly -v ./internal/payment -run '^TestRecoveryAfterRestart$'
