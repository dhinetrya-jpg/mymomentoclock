#!/bin/sh
# Isolated real database tests. No production connection is read or migrated.
set -eu
repo=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
cd "$repo"
[ -d node_modules/tsx ] || { echo "Run npm ci before the cross-service gate" >&2;exit 1; }
docker_local() { env -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock "$@"; }
name="mymomentoclock-phase1-$(openssl rand -hex 6)"
config=$(mktemp)
certdir=$(mktemp -d)
nodebin=$(mktemp -d)
state=$(mktemp -d)
cleanup(){ docker_local rm -f -v "$name-db" >/dev/null 2>&1 || true; docker_local network rm "$name" >/dev/null 2>&1 || true; rm -f "$config"; rm -rf "$certdir" "$nodebin" "$state"; docker_local rm -f "$name-node" >/dev/null 2>&1 || true; }
trap cleanup EXIT HUP INT TERM
set -- build --target root-tests -t mymomentoclock:phase1-go-tests
if [ -n "${PHASE1_CA_BUNDLE:-}" ];then set -- "$@" --secret "id=proxy_ca,src=$PHASE1_CA_BUNDLE";fi
if [ "${PHASE1_REUSE_TEST_IMAGE:-}" != 1 ];then docker_local "$@" .;fi
# Test-only Node binary enables actual Node->Go->PostgreSQL integration, not in production images.
docker_local create --name "$name-node" node:22-bookworm-slim >/dev/null
docker_local cp "$name-node:/usr/local/bin/node" "$nodebin/node"
docker_local rm "$name-node" >/dev/null
chmod 755 "$nodebin/node"
docker_local network create "$name" >/dev/null
password=$(openssl rand -hex 24)
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$certdir/server.key" -out "$certdir/server.crt" -days 1 -subj /CN=isolated-payment-db -addext "subjectAltName=DNS:$name-db" >/dev/null 2>&1
chmod 600 "$certdir/server.key"
chmod 644 "$certdir/server.crt"
printf 'PHASE1_TEST_DATABASE_URL=postgres://phase1_test:%s@%s-db:5432/phase1_test?sslmode=verify-full&sslrootcert=/test-tls/server.crt\n' "$password" "$name" > "$config"
printf 'PAY03_RESTART_SESSION_FILE=/test-state/session-token\n' >> "$config"
chmod 600 "$config"
docker_local run -d --name "$name-db" --network "$name" -e POSTGRES_USER=phase1_test -e POSTGRES_DB=phase1_test -e "POSTGRES_PASSWORD=$password" -v "$certdir:/tls-source:ro" --user root --entrypoint sh postgres:16-alpine -c 'cp /tls-source/server.key /tmp/payment.key; cp /tls-source/server.crt /tmp/payment.crt; chown postgres:postgres /tmp/payment.key /tmp/payment.crt; chmod 600 /tmp/payment.key; exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/payment.crt -c ssl_key_file=/tmp/payment.key' >/dev/null
ready=false
for attempt in $(seq 1 30);do if docker_local exec "$name-db" pg_isready -U phase1_test -d phase1_test >/dev/null 2>&1;then ready=true;break;fi;sleep 1;done
[ "$ready" = true ] || { echo 'Isolated PostgreSQL failed readiness' >&2;exit 1; }
docker_local run --rm --network "$name" --mount "type=bind,src=${PHASE1_CA_BUNDLE:-/etc/ssl/certs/ca-certificates.crt},dst=/run/task-ca.pem,readonly" -e SSL_CERT_FILE=/run/task-ca.pem --env-file "$config" -v "$state:/test-state" -v "$certdir:/test-tls:ro" -v "$nodebin/node:/usr/local/bin/node:ro" -v "$repo:/repo" -w /repo mymomentoclock:phase1-go-tests sh -c 'set -e; go version; go test -count=1 -mod=readonly ./...; go test -count=1 -mod=readonly -race ./...; go vet ./...; CGO_ENABLED=0 go test -count=1 -mod=readonly ./...; cd backend; go test -count=1 -mod=readonly -v ./...; go test -count=1 -mod=readonly -race ./...; go vet ./...; CGO_ENABLED=0 go test -count=1 -mod=readonly ./...'
docker_local restart "$name-db" >/dev/null
ready=false
for attempt in $(seq 1 30);do if docker_local exec "$name-db" pg_isready -U phase1_test -d phase1_test >/dev/null 2>&1;then ready=true;break;fi;sleep 1;done
[ "$ready" = true ] || exit 1
docker_local run --rm --network "$name" --mount "type=bind,src=${PHASE1_CA_BUNDLE:-/etc/ssl/certs/ca-certificates.crt},dst=/run/task-ca.pem,readonly" -e SSL_CERT_FILE=/run/task-ca.pem --env-file "$config" -v "$state:/test-state" -v "$certdir:/test-tls:ro" -e PHASE1_TEST_RESTART_CHECK=1 -v "$repo:/repo" -w /repo/backend mymomentoclock:phase1-go-tests go test -count=1 -mod=readonly -v ./internal/payment ./internal/payment/providers/razorpay ./internal/payment/authn -run '^(TestRecoveryAfterRestart|TestRazorpayRecoveryAfterRestart|TestSessionRecoveryAfterRestart)$'
