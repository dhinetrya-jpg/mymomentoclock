#!/usr/bin/env python3
"""Matched default Swiss target policy: compare planetary-system barycenters to barycenters.
The original five-body expectations are preserved; DE421's zero center aliases
are verified explicitly. A real Jupiter COB reference is NOT substituted.
"""
import hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'tests/calculation/reference/option-a';OLD=ROOT/'tests/calculation/reference/pr21';KERNEL=OLD/'originals/de421.bsp'
def generate():
 from skyfield.api import load,load_file
 from skyfield.framelib import ecliptic_frame
 import importlib.metadata
 assert importlib.metadata.version('skyfield')=='1.54'
 assert hashlib.sha256(KERNEL.read_bytes()).hexdigest()=='a20a7139da04cbc462454634918e9a9ca69127044e2cc9d4f9c16e238d2deedc'
 k=load_file(str(KERNEL));ts=load.timescale(builtin=True);original=json.loads((OLD/'normalized.json').read_text());epochs=[r for r in original['planetary'] if r['body']=='sun'];rows=[];aliases=[]
 for r in epochs:
  t=ts.tt_jd(r['jd_tt'])
  for center,body in [(1,199),(2,299),(4,499)]:
   segment=next(s for s in k.segments if s.center==center and s.target==body)
   for offset in [-60/86400,0,60/86400]:
    at=segment.at(ts.tt_jd(t.tt+offset));assert (at.position.au==0).all() and (at.velocity.au_per_d==0).all()
   aliases.append(dict(epoch=r['id'],jd_tt=r['jd_tt'],system_target=center,reference_body_alias=body,position_offset_au=[0,0,0],velocity_offset_au_per_day=[0,0,0],meaning='Original DE421 segment explicitly represents this center alias as a zero vector at every compared epoch and velocity sample; not a claim of physical Mars COB accuracy'))
  for body,target in [('jupiter',5),('saturn',6)]:
   def position(t):
    lat,lon,d=k['earth'].at(t).observe(k[target]).apparent().frame_latlon(ecliptic_frame);return float(lon.degrees),float(lat.degrees),float(d.au)
   lon,lat,d=position(t);before=position(ts.tt_jd(t.tt-60/86400))[0];after=position(ts.tt_jd(t.tt+60/86400))[0]
   rows.append(dict(id=r['id'].rsplit('_',1)[0]+'_'+body,body=body,target_code=target,target_definition='PLANETARY_SYSTEM_BARYCENTER',observer_code=399,utc=r['utc'],jd_tt=r['jd_tt'],quantities=dict(tropical_longitude=lon,latitude=lat,distance_au=d,longitude_speed_deg_per_day=((after-before+180)%360-180)*720),tolerances=dict(tropical_longitude=.0002,latitude=.0002,distance_au=.000001,longitude_speed_deg_per_day=.0002)))
 x=dict(schema_version=1,source_sha256=hashlib.sha256(KERNEL.read_bytes()).hexdigest(),generator_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),target_policy='Default Swiss 2.10.03 planet flags use planetary-system barycenters; observer Earth center. No COB flag/additional center files requested. Official documentation sections2.4 and Test6 confirm. JUP310 target599 remains non-admitted as a comparison to native target5.',rows=rows,original_reference_alias_proofs=aliases,coordinate_policy='Geocentric apparent true ecliptic/equinox of date; same independent Skyfield DE421 reduction as existing five-body vectors; +/-60TTsec central difference speed',uncertainty='Original DE421 SPK has no per-row observational uncertainty; original PR21 comparison budgets unchanged, no physical confidence claim')
 raw=json.dumps(x,indent=2,sort_keys=True)+'\n';(BASE/'outer-planets.json').write_text(raw);(BASE/'outer-planets.sha256').write_text(hashlib.sha256(raw.encode()).hexdigest()+'\n');print('Generated18 matched outer-planet barycenter epochs,27 verified original center-alias equivalences')
def verify():
 raw=(BASE/'outer-planets.json').read_bytes();assert hashlib.sha256(raw).hexdigest()==(BASE/'outer-planets.sha256').read_text().strip();x=json.loads(raw)
 assert x['generator_sha256']==hashlib.sha256(Path(__file__).read_bytes()).hexdigest() and x['source_sha256']==hashlib.sha256(KERNEL.read_bytes()).hexdigest()=='a20a7139da04cbc462454634918e9a9ca69127044e2cc9d4f9c16e238d2deedc'
 assert len(x['rows'])==18 and len(x['original_reference_alias_proofs'])==27
 for r in x['rows']:assert r['target_code']=={'jupiter':5,'saturn':6}[r['body']] and r['observer_code']==399 and r['tolerances']==dict(tropical_longitude=.0002,latitude=.0002,distance_au=.000001,longitude_speed_deg_per_day=.0002)
 print('PASS matched target5/6 barycenter source and explicit zero-transform admission for original1/2/4 aliases')
if __name__=='__main__':generate() if len(sys.argv)>1 and sys.argv[1]=='generate' else verify()
