#!/usr/bin/env python3
"""Classify executed production numerical coverage without promoting partial evidence to release approval."""
import argparse,json,math,statistics
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('log');p.add_argument('--output',required=True);p.add_argument('--numerical-only',action='store_true');a=p.parse_args()
rows=[]
for line in Path(a.log).read_text().splitlines():
 if 'PR21_NUMERICAL_RESULT ' in line:rows.append(json.loads(line.split('PR21_NUMERICAL_RESULT ',1)[1]))
assert rows and len({(r['mode'],r['id'],r['quantity']) for r in rows})==len(rows),'Missing or duplicate measurements'
assert all(r['mode'] in ['SWISS_FILE','TIME_SCALE'] for r in rows),'Diagnostic mode cannot enter production acceptance'
planet=[r for r in rows if r.get('body')];assert len(planet)==224,'All original160 +64 matched Jupiter/Saturn barycenter scalars required'
assert {r['body'] for r in planet}=={'sun','moon','mercury','venus','mars','jupiter','saturn'}
failed=[r for r in rows if r['status']=='FAIL'];groups={}
for r in rows:
 if 'residual' in r:
  key=r['mode']+'/'+r['quantity'].split('_transition')[0]
  groups.setdefault(key,[]).append(abs(r['residual']))
stats=[]
for key,errors in sorted(groups.items()):
 errors.sort();stats.append(dict(quantity=key,samples=len(errors),maximum=errors[-1],median=statistics.median(errors),p95_nearest_rank=errors[math.ceil(.95*len(errors))-1]))
gaps=['Independent matched mean/true lunar nodes and selected Lahiri sidereal offset','Independent sidereal Nakshatra/Pada/Yoga/house/varga and remaining transitions','Same-definition upper-limb/refraction sunrise/set physical model','Domain-owner approval of versioned traditional variants; no efficacy inference','Commercial Swiss/data/reference redistribution license choice and legal review']
x=dict(schema_version=1,production_mode='SWISS_FILE',numerical_subset_status='FAIL' if failed else 'PASS',production_scientific_status='FAIL' if failed else 'PARTIAL',cross_mode_status='SEPARATE_COMMAND_PRESERVES_MOSHIER_FAILURES',customer_release_authorized=False,required_planetary_scalars=len(planet),rows=rows,statistics=stats,remaining_gates=gaps,scientific_gaps=gaps[:3],external_approval_gates=gaps[3:],licensing_status='OWNER_LEGAL_APPROVAL_PENDING',native_target_policy='DEFAULT_PLANETARY_SYSTEM_BARYCENTERS_NOT_COB',different_target_references_rejected=sum(r['status']=='NOT_ADMITTED_DIFFERENT_TARGET_CENTERS' for r in rows),optional_rejected_historical_rows=sum(r['status']=='NOT_ADMITTED' for r in rows))
Path(a.output).write_text(json.dumps(x,indent=2)+'\n');print(f"SWISS_FILE numerical subset: {x['numerical_subset_status']} ({len(planet)} planetary scalars); full production science: {x['production_scientific_status']}; customer admission DISABLED")
raise SystemExit(1 if failed else (0 if a.numerical_only else 2))
