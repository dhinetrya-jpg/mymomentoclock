#!/bin/bash
set -euo pipefail

image=postgres@sha256:f2f98726820d0342055351c6e9d36e705f5bfffb3dd53ff556325114b08afb6d
instance=mymomento-pitr-$(openssl rand -hex 5)
trap 'docker rm -fv "$instance" >/dev/null 2>&1 || true' EXIT

docker run -d --network none --name "$instance" -e POSTGRES_HOST_AUTH_METHOD=trust "$image" \
  -c wal_level=replica -c archive_mode=on \
  -c "archive_command=test ! -f /tmp/mymomento-wal/%f && cp %p /tmp/mymomento-wal/%f" >/dev/null
run() { docker exec -i -u postgres "$instance" "$@"; }
run mkdir /tmp/mymomento-wal /tmp/mymomento-socket
sql() { run psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -XAt "$@"; }
ready=false
for attempt in $(seq 1 45); do
  if run pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
"$ready"

for name in 001_secure_payments 003_payment_application 005_provider_sandbox 006_commercial_readiness; do
  sql < "database/migrations/$name.sql" >/dev/null
done
run pg_basebackup -h 127.0.0.1 -U postgres -D /tmp/mymomento-recovered --checkpoint=fast --wal-method=stream
sql <<'SQL' >/dev/null
BEGIN;
INSERT INTO phase1_orders(order_id,customer_id,product_id,provider,provider_order_id,amount_minor,currency,status)
VALUES ('fixture-order','fixture-customer','fixture-product','fixture-provider','fixture-provider-order',500,'INR','COMPLETED');
INSERT INTO phase1_payment_events(provider,event_id,order_id,fingerprint)
VALUES ('fixture-provider','fixture-capture','fixture-order','fixture-capture-fingerprint');
INSERT INTO phase1_entitlements(order_id,customer_id,active)
VALUES ('fixture-order','fixture-customer',true);
INSERT INTO phase1_payment_audit(order_id,action,outcome)
VALUES ('fixture-order','fixture-capture','applied');
COMMIT;
SQL
wal=$(sql -c "SELECT pg_walfile_name(pg_create_restore_point('before_fixture_refund'))")
sql <<'SQL' >/dev/null
BEGIN;
UPDATE phase1_orders SET status='REFUNDED' WHERE order_id='fixture-order';
UPDATE phase1_entitlements SET active=false WHERE order_id='fixture-order';
INSERT INTO phase1_payment_events(provider,event_id,order_id,fingerprint)
VALUES ('fixture-provider','fixture-refund','fixture-order','fixture-refund-fingerprint');
INSERT INTO phase1_payment_audit(order_id,action,outcome)
VALUES ('fixture-order','fixture-refund','applied');
COMMIT;
SELECT pg_switch_wal();
SQL
query="SELECT o.status::text || ':' || t.active::text || ':' ||
 (SELECT string_agg(event_id,',' ORDER BY event_id) FROM phase1_payment_events) || ':' ||
 (SELECT string_agg(action,',' ORDER BY action) FROM phase1_payment_audit)
 FROM phase1_orders o JOIN phase1_entitlements t USING (order_id)"
test "$(sql -c "$query")" = 'REFUNDED:false:fixture-capture,fixture-refund:fixture-capture,fixture-refund'

archived=false
for attempt in $(seq 1 45); do
  if run test -s "/tmp/mymomento-wal/$wal"; then archived=true; break; fi
  sleep 1
done
"$archived"
run sh -c 'cat >> /tmp/mymomento-recovered/postgresql.auto.conf
touch /tmp/mymomento-recovered/recovery.signal' <<'CONF'
restore_command = 'cp /tmp/mymomento-wal/%f %p'
recovery_target_name = 'before_fixture_refund'
recovery_target_action = 'promote'
archive_mode = off
CONF
start=$(date +%s%3N)
run pg_ctl -D /tmp/mymomento-recovered -l /tmp/mymomento-recovery.log -w \
  -o '-p 55432 -k /tmp/mymomento-socket -c listen_addresses=' start >/dev/null
recovered() { run psql -h /tmp/mymomento-socket -p 55432 -U postgres -v ON_ERROR_STOP=1 -XAt "$@"; }
promoted=false
for attempt in $(seq 1 30); do
  if test "$(recovered -c 'SELECT pg_is_in_recovery()' 2>/dev/null)" = f; then promoted=true; break; fi
  sleep 1
done
"$promoted"
test "$(recovered -c "$query")" = 'COMPLETED:true:fixture-capture:fixture-capture'
run grep 'recovery stopping at restore point "before_fixture_refund"' /tmp/mymomento-recovery.log
echo "PASS: named PITR replayed capture and stopped before refund; recovered in $(( $(date +%s%3N) - start ))ms"
