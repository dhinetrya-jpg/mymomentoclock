#!/usr/bin/env python3
"""Generate the complete numerical table from executed Go records; never invent a PASS."""
import argparse,json,math,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('log');p.add_argument('--require-pass',action='store_true');a=p.parse_args()
rows=[]
for line in Path(a.log).read_text().splitlines():
 if 'PR21_NUMERICAL_RESULT ' in line:rows.append(json.loads(line.split('PR21_NUMERICAL_RESULT ',1)[1]))
assert rows,'No executed native records'
assert len({(r['mode'],r['id'],r['quantity']) for r in rows})==len(rows),'Duplicated comparisons'
groups={}
for r in rows:
 if 'residual' in r:
  quantity=r['quantity'].split('_transition')[0]
  if quantity=='latitude':quantity='sun_latitude' if r.get('body')=='sun' else 'latitude_other_bodies'
  groups.setdefault((r['mode'],quantity),[]).append(r)
stats=[]
for (mode,q),v in sorted(groups.items()):
 errors=sorted(abs(r['residual']) for r in v)
 stats.append(dict(mode=mode,quantity=q,samples=len(v),maximum=errors[-1],median=statistics.median(errors),p95_nearest_rank=errors[math.ceil(.95*len(errors))-1],failures=sum(r['status']=='FAIL' for r in v),status='FAIL' if any(r['status']=='FAIL' for r in v) else ('DIAGNOSTIC' if any(r['status'].startswith('DIAGNOSTIC') for r in v) else 'PASS'),tolerance=v[0]['tolerance']))
out=ROOT/'docs/core/evidence/pr21';out.mkdir(parents=True,exist_ok=True)
(out/'numerical-results.json').write_text(json.dumps(dict(rows=rows,statistics=stats),indent=2)+'\n')
md=['# PR21 independent planetary and chart evaluation','', '**Scientific verdict: FAILED — required Moshier Moon comparisons exceed the unchanged predeclared band.** No customer release authorization. See the repair matrix for other missing scientific evidence.','', 'Source: immutable JPL DE421 binary published by official Skyfield repository, independently evaluated with Skyfield 1.54 / jplephem 2.24. This is an independent evaluator, not independent observational data or a direct NASA server capture. Original binary, SPK comments, provenance, policy and normalized fixtures are committed under `tests/calculation/reference/pr21/`.','', 'Reference generation does not call Swiss. The reference kernel has Sun, Moon, Mercury, Venus and Mars centers; Jupiter and Saturn barycenters are NOT admitted as planet centers. Nodes and Lahiri sidereal convention remain blocked. TT J2000 is exactly JD2451545.0. The 1910 UTC-labelled samples are rejected because Skyfield proleptic UTC and Swiss pre1972 UT1 labels do not identify the same instant; 1975 provides admitted historical coverage. No location-duplicated geocentric samples.','', 'Tolerances were declared in `policy.json` before native measurements. They are engineering comparison budgets, not observational uncertainties. Existing Sun tolerances are preserved. No residual was used to widen a band. P95 is nearest rank; sample counts include two distinct native modes and are not independent physical observations.','', '| Mode | Quantity | Samples | Maximum | Median | p95 | Tolerance | Status |','|---|---|---:|---:|---:|---:|---:|---|']
for s in stats:md.append('|'+ '|'.join(str(s[k]) for k in ['mode','quantity','samples','maximum','median','p95_nearest_rank','tolerance','status'])+'|')
md+=['','## Complete executed table','','| Body / case | Epoch | Mode | Source | Quantity | Expected | Actual | Residual | Tolerance | Result |','|---|---|---|---|---|---|---|---:|---:|---|']
for r in rows:md.append('|'+ '|'.join(str(r.get(k,'')) for k in ['id','epoch','mode','source','quantity','expected','actual','residual','tolerance','status'])+'|')
md+=['','## Reproduction','','`python3 -m venv /tmp/pr21-ref; /tmp/pr21-ref/bin/pip install -r scripts/requirements-pr21-reference.txt`','','`/tmp/pr21-ref/bin/python scripts/core-pr21-reference.py generate` (offline kernel evaluation; overwrites generated expectations only)','','`python3 scripts/core-pr21-reference.py verify`','','Run native `go test -count=1 -v ./internal/astronomy -run TestPR21` from backend with the pinned Swiss library. Normal execution evaluates and emits every scientific FAIL, while integration assertions still fail hard. It is NOT a scientific acceptance PASS. Set `CORE01_STRICT_SCIENCE=1` for required strict numerical acceptance; it returns nonzero for the retained Moshier discrepancies. Generate this report with `python3 scripts/core-pr21-report.py <native-log> --require-pass`; it also returns nonzero for any numerical FAIL or unadmitted record.','']
(ROOT/'docs/core/CORE_P0_01_PR21_PLANETARY_VALIDATION.md').write_text('\n'.join(md))
print(f'Executed records: {len(rows)}; numerical FAIL: {sum(r["status"]=="FAIL" for r in rows)}; not admitted: {sum(r["status"]=="NOT_ADMITTED" for r in rows)}')
if a.require_pass and any(r['status'] in ('FAIL','NOT_ADMITTED') for r in rows):raise SystemExit(1)
