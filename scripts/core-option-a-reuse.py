#!/usr/bin/env python3
"""Temporary source-audit runner. No upstream application code is copied into product files.
Executes only inspected, explicitly named pure rule functions from local immutable audit checkouts.
Outputs are mathematical convention comparisons, never independent Swiss accuracy evidence.
"""
import argparse,ast,datetime,hashlib,json,math,subprocess,types
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/calculation/reference/option-a'
PROJECTS={'pyjhora':('naturalstupid/PyJHora','48e57d29b47a3143519910a24866758116467485','src/jhora/panchanga/drik.py','LICENSE'),'drik':('bdsatish/drik-panchanga','3d12545d56266ebd4a0a6b008a55097e972a6300','panchanga.py','LICENSE'),'vedic':('jantech/vedicpanchanga','d938fa174d465b15d2f7285a5c4e7f72c6a7f4a1','backend/advanced_panchang.py','LICENSE')}
def execute(tree,names,env):
 nodes=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names];assert {n.name for n in nodes}==set(names)
 for node in nodes:
  # Source reviewed before execution; reject imports or dynamic-code primitives.
  assert not any(isinstance(n,(ast.Import,ast.ImportFrom)) or isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id in {'exec','eval','open','compile','__import__'} for n in ast.walk(node))
 exec(compile(ast.Module(body=nodes,type_ignores=[]),'<inspected-upstream-rule-functions>','exec'),env)
def generate(paths):
 OUT.mkdir(parents=True,exist_ok=True);(OUT/'licenses').mkdir(exist_ok=True);sources=[];rows=[];variants=[];segments=[]
 for key,(repo,rev,file,licensefile) in PROJECTS.items():
  path=Path(paths[key]);assert subprocess.check_output(['git','-C',str(path),'rev-parse','HEAD']).decode().strip()==rev
  raw=(path/file).read_bytes();lic=(path/licensefile).read_bytes();assert raw==subprocess.check_output(['git','-C',str(path),'show',rev+':'+file]);assert lic==subprocess.check_output(['git','-C',str(path),'show',rev+':'+licensefile]);(OUT/'licenses'/(key+'-LICENSE')).write_bytes(lic)
  sources.append(dict(project=key,repository='https://github.com/'+repo,revision=rev,url=f'https://raw.githubusercontent.com/{repo}/{rev}/{file}',source_file=file,source_sha256=hashlib.sha256(raw).hexdigest(),license_file=licensefile,license_sha256=hashlib.sha256(lic).hexdigest(),license_capture='licenses/'+key+'-LICENSE',inspected_at_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),license='AGPL-3.0 family for inspected backend; no product source copied',independence='SHARED_SWISS_ENGINE_NOT_INDEPENDENT_ASTRONOMICAL_EVIDENCE'))
  tree=ast.parse(raw)
  constants={}
  if key=='vedic':
   constraw=(path/'backend/constants.py').read_bytes();assert constraw==subprocess.check_output(['git','-C',str(path),'show',rev+':backend/constants.py']);sources[-1]['constants_sha256']=hashlib.sha256(constraw).hexdigest()
   for node in ast.parse(constraw).body:
    if isinstance(node,ast.Assign) and isinstance(node.targets[0],ast.Name) and node.targets[0].id.endswith('_SEGMENT'):
     constants[node.targets[0].id]=ast.literal_eval(node.value)
   # This inspected table supplies the existing Wednesday Abhijit suppression variant.
   panchraw=(path/'backend/panchang_constants.py').read_bytes();assert panchraw==subprocess.check_output(['git','-C',str(path),'show',rev+':backend/panchang_constants.py']);sources[-1]['panchang_constants_sha256']=hashlib.sha256(panchraw).hexdigest()
   for node in ast.parse(panchraw).body:
    if isinstance(node,ast.Assign) and isinstance(node.targets[0],ast.Name) and node.targets[0].id in ['ABHIJIT_MUHURTA_INDEX','DUR_MUHURTA']:
     constants[node.targets[0].id]=ast.literal_eval(node.value)
  for hours in [10,12,14]:
   for weekday in range(7):
    rise=6.;night=24-hours;iso=7 if weekday==0 else weekday
    env={'utils':types.SimpleNamespace(to_dms=lambda x:x),'_iso':lambda x,tz:x,**constants}
    if key=='pyjhora':
     env.update(sunrise=lambda jd,p:[rise],sunset=lambda jd,p:[rise+hours],day_length=lambda jd,p:hours,night_length=lambda jd,p:night,vaara=lambda jd,p:weekday)
     execute(tree,['trikalam','abhijit_muhurta','brahma_muhurtha'],env)
     for name,option in [('RAHU_KAAL','raahu kaalam'),('YAMAGANDA','yamagandam'),('GULIKA_KAAL','gulikai')]:
      a,b=env['trikalam'](0,('test',0,0,0),option);rows.append(dict(source=key,weekday=weekday,daylight_hours=hours,name=name,start_seconds=a*3600,end_seconds=b*3600))
     a,b=env['abhijit_muhurta'](0,('test',0,0,0));rows.append(dict(source=key,weekday=weekday,daylight_hours=hours,name='ABHIJIT_MUHURTA',start_seconds=a*3600,end_seconds=b*3600))
     a,b=env['brahma_muhurtha'](0,None);variants.append(dict(source=key,weekday=weekday,daylight_hours=hours,name='BRAHMA_MUHURTA',upstream_start_seconds=a*3600,upstream_end_seconds=b*3600,native_fixed_start_seconds=(rise*60-96)*60,native_fixed_end_seconds=(rise*60-48)*60,disposition='SAME_ONLY_FOR_12_HOUR_NIGHT; DO_NOT_MERGE_VARIANTS'))
    elif key=='drik':
     env.update(sunrise=lambda jd,p:rise/24,sunset=lambda jd,p:(rise+hours)/24,vaara=lambda jd:weekday)
     execute(tree,['trikalam','abhijit_muhurta'],env)
     for name,option in [('RAHU_KAAL','rahu'),('YAMAGANDA','yamaganda'),('GULIKA_KAAL','gulika')]:
      a,b=env['trikalam'](0,None,option);rows.append(dict(source=key,weekday=weekday,daylight_hours=hours,name=name,start_seconds=a*86400,end_seconds=b*86400))
     a,b=env['abhijit_muhurta'](0,None);rows.append(dict(source=key,weekday=weekday,daylight_hours=hours,name='ABHIJIT_MUHURTA',start_seconds=a*86400,end_seconds=b*86400))
    else:
     execute(tree,['_eight_segments','_muhurta_timings'],env);slots=env['_eight_segments'](rise/24,(rise+hours)/24,None)
     for name,table in [('RAHU_KAAL','RAHU_KAAL_SEGMENT'),('YAMAGANDA','YAMAGANDA_SEGMENT'),('GULIKA_KAAL','GULIKA_SEGMENT')]:
      v=slots[constants[table][iso]-1];rows.append(dict(source=key,weekday=weekday,daylight_hours=hours,name=name,start_seconds=v['start']*86400,end_seconds=v['end']*86400))
     v=env['_muhurta_timings'](rise/24,(rise+hours)/24,(rise+24)/24,None,iso)
     if v['abhijit']:
      rows.append(dict(source=key,weekday=weekday,daylight_hours=hours,name='ABHIJIT_MUHURTA',start_seconds=v['abhijit']['start']*86400,end_seconds=v['abhijit']['end']*86400))
     else:variants.append(dict(source=key,weekday=weekday,daylight_hours=hours,name='ABHIJIT_MUHURTA',disposition='WEDNESDAY_SUPPRESSED_UPSTREAM; NATIVE_RETURNS_MEASUREMENT_WITHOUT_FAVORABLE_DAY_INTERPRETATION'))
  if key in ['pyjhora','drik']:
   fn='nakshatra_pada' if key=='pyjhora' else 'nakshatra_pada_equal_spacing';env={};execute(tree,[fn],env)
   for angle in [0,1e-8,360-1e-8]+[b+e for b in [360/108,360/27,40,180] for e in [-1e-8,0,1e-8]]:
    v=env[fn](angle);segments.append(dict(source=key,longitude=angle,nakshatra=int(v[0]),pada=int(v[1]),scope='Equal-spacing mathematical convention, not independently verified sidereal longitude; exact floating-point boundary disagreements remain explicit'))
 result=dict(schema_version=1,sources=sources,rule_cases=rows,variants=variants,segments=segments,rule_tolerance_seconds=.00001,scope='Source functions executed with supplied mathematical sunrise/daylength/weekday stubs, NOT live upstream astronomy. No AGPL product code or runtime dependency introduced.',generator_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
 raw=json.dumps(result,indent=2,sort_keys=True)+'\n';(OUT/'reuse-rules.json').write_text(raw);(OUT/'reuse-rules.sha256').write_text(hashlib.sha256(raw.encode()).hexdigest()+'\n');print(len(rows),'rule comparisons;',len(variants),'recorded variants;',len(segments),'segmentation probes')
def verify():
 raw=(OUT/'reuse-rules.json').read_bytes();assert hashlib.sha256(raw).hexdigest()==(OUT/'reuse-rules.sha256').read_text().strip();x=json.loads(raw)
 assert x['generator_sha256']==hashlib.sha256(Path(__file__).read_bytes()).hexdigest();assert len(x['sources'])==3 and len(x['rule_cases'])==249
 for s in x['sources']:assert s['revision']==PROJECTS[s['project']][1] and hashlib.sha256((OUT/s['license_capture']).read_bytes()).hexdigest()==s['license_sha256']
 print('PASS attributed upstream rule outputs/license bindings; shared-engine agreement is not independent astronomy')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('command',choices=['generate','verify']);p.add_argument('--pyjhora');p.add_argument('--drik');p.add_argument('--vedic');args=p.parse_args()
 generate(vars(args)) if args.command=='generate' else verify()
