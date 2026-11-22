# PAY03-G25 — synthetic PostgreSQL restore rehearsal

A local logical backup and restore drill passed against payment migrations
001, 003, 005 and 006 from integration
`492793423edbef06f9f93b05d40273732a0278da`. The migration files are
identical at `a0e5f425953f78e71327ef19ec89fa7911d65c71`.

- Used two disposable PostgreSQL 16 containers with Docker networking off
  and no published ports. Image digest
  `sha256:f2f98726820d0342055351c6e9d36e705f5bfffb3dd53ff556325114b08afb6d`.
- Applied the migrations to the source and inserted a synthetic refunded
  order, refund event, inactive entitlement and audit row.
- Streamed `pg_dump -Fc` through OpenSSL AES-256-CBC with PBKDF2 and an
  ephemeral random password, then streamed the decrypted dump into
  `pg_restore --exit-on-error` against the empty target. The temporary
  ciphertext and password were removed after the run.
- Compared the restored ledger, event, entitlement and audit values to
  both the source rows and expected state. Compared primary, foreign,
  unique and check constraint counts for orders, events and entitlements.
  All checks passed. Local decrypt and restore elapsed 178 ms for the one
  synthetic record set.

The gate remains open for approved hosted key management and backup
integrity, WAL/PITR, target RPO/RTO, provider reconciliation, recovery
permissions and the incident rehearsal. The elapsed time is an observation
from this fixture and environment.

## Named-point recovery rehearsal

At integration `898382066f7cad10de4af4090662dc3398770f59`,
`bash scripts/test-local-payment-pitr.sh` passed using the same pinned
PostgreSQL image. The script takes a physical base backup before the
synthetic capture, then archives WAL containing the capture, a named
restore point, and the later refund. PostgreSQL confirmed that recovery
stopped at the named restore point. The recovered cluster had the capture,
active entitlement and capture audit row. The source also had the refund
event and audit row, the refunded order and the inactive entitlement.
The recovered cluster was promoted and replayed state was queried in 494 ms
for this one fixture.

The drill uses a disposable network-isolated container and ephemeral WAL
files. Hosted backup integrity, independent storage, access controls,
recovery objectives, provider reconciliation and incident rehearsal remain
open. A restored entitlement at a selected historical point requires
reconciliation before serving traffic.
