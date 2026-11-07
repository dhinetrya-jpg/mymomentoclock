#!/usr/bin/env python3
"""Reproducible independent DE421 evaluation. Never imports or queries Swiss to generate expectations."""
import argparse, datetime as dt, hashlib, importlib.metadata, json, math, urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/calculation/reference/pr21'
def dump(p,x):p.write_text(json.dumps(x,indent=2,sort_keys=True)+'\n')
def check_source():
 s=json.loads((OUT/'source.json').read_text());b=(OUT/s['artifact']).read_bytes()
 assert s['http_status']==200 and s['final_url']==s['retrieval_url']=='https://raw.githubusercontent.com/skyfielders/python-skyfield/31a6ed7584cd09b6e48e07546a4b5921e1cd5bb4/ci/de421.bsp'
 assert s['revision']=='31a6ed7584cd09b6e48e07546a4b5921e1cd5bb4'
 assert s['sha256']==hashlib.sha256(b).hexdigest()=='a20a7139da04cbc462454634918e9a9ca69127044e2cc9d4f9c16e238d2deedc'
 assert len(b)==s['size_bytes'] and b.startswith(b'DAF/SPK')
 assert dt.datetime.fromisoformat(s['retrieved_at_utc']).utcoffset()==dt.timedelta(0)
 return s

def acquire():
 url='https://raw.githubusercontent.com/skyfielders/python-skyfield/31a6ed7584cd09b6e48e07546a4b5921e1cd5bb4/ci/de421.bsp'
 with urllib.request.urlopen(url,timeout=60) as response:
  data=response.read(20*1024*1024)
  assert response.status==200 and response.geturl()==url
 assert hashlib.sha256(data).hexdigest()=='a20a7139da04cbc462454634918e9a9ca69127044e2cc9d4f9c16e238d2deedc'
 source=json.loads((OUT/'source.json').read_text())
 source.update(retrieved_at_utc=dt.datetime.now(dt.timezone.utc).isoformat(),http_status=200)
 (OUT/'originals/de421.bsp').write_bytes(data);dump(OUT/'source.json',source)
 print('Captured immutable DE421 original; normalized expectations were not changed')

def generate():
 from skyfield.api import load,load_file,wgs84
 from skyfield.framelib import ecliptic_frame
 from skyfield import almanac
 import numpy as np
 assert importlib.metadata.version('skyfield')=='1.54'
 source=check_source();policy=json.loads((OUT/'policy.json').read_text())
 ts=load.timescale(builtin=True);k=load_file(str(OUT/source['artifact']));earth=k['earth']
 def at(t,body):
  lat,lon,d=earth.at(t).observe(k[body]).apparent().frame_latlon(ecliptic_frame)
  return float(lon.degrees),float(lat.degrees),float(d.au)
 epochs=[('J2000_TT',ts.tt_jd(2451545.0)),('HISTORICAL_1910',ts.utc(1910,4,20,12)),('HISTORICAL_1975',ts.utc(1975,4,20,12)),('MODERN_2026',ts.utc(2026,1,15,12)),('EQUINOX_WRAP_BEFORE',ts.utc(2026,3,20,12)),('EQUINOX_WRAP_AFTER',ts.utc(2026,3,21,12)),('RETROGRADE_2026',ts.utc(2026,3,8,12)),('FULL_MOON_2026',ts.utc(2026,3,3,12)),('NEW_MOON_2026',ts.utc(2026,3,19,0))]
 planetary=[]
 for label,t in epochs:
  for body in ['sun','moon','mercury','venus','mars']:
   lon,lat,d=at(t,body);a=at(ts.tt_jd(t.tt-60/86400),body)[0];b=at(ts.tt_jd(t.tt+60/86400),body)[0];speed=((b-a+180)%360-180)*720
   planetary.append(dict(id=label+'_'+body,body=body,utc=t.utc_datetime().isoformat().replace('+00:00','Z'),jd_tt=float(t.tt),quantities={'tropical_longitude':lon,'latitude':lat,'distance_au':d,'longitude_speed_deg_per_day':speed},retrograde=speed<0,center='Earth center (399)',target_center={'sun':10,'moon':301,'mercury':199,'venus':299,'mars':499}[body],time_scale='TT input; TDB kernel evaluation by Skyfield; UTC label from Skyfield builtin leap table',frame='apparent geocentric true ecliptic/equinox of date',reduction='light time, aberration, gravitational deflection; IAU2000A nutation and IAU2006 precession via Skyfield ecliptic_frame',units='degree, AU, degree/day',source_sha256=source['sha256']))
 days=[];charts=[]
 locations=[('KOLKATA','2026-03-19','Asia/Kolkata',22.5726,88.3639),('NEW_YORK_DST_GAP','2026-03-08','America/New_York',40.7128,-74.006),('NEW_YORK_DST_FOLD','2026-11-01','America/New_York',40.7128,-74.006),('TORONTO_FULL_MOON','2026-03-03','America/Toronto',43.6532,-79.3832),('VANCOUVER','2026-03-19','America/Vancouver',49.2827,-123.1207),('TROMSO_POLAR_DAY','2026-06-21','Europe/Oslo',69.6492,18.9553),('TROMSO_POLAR_NIGHT','2026-12-21','Europe/Oslo',69.6492,18.9553)]
 for label,date,zone,lat,lon in locations:
  start=dt.datetime.fromisoformat(date).replace(tzinfo=ZoneInfo(zone));end=start+dt.timedelta(days=1)
  t0,t1=ts.from_datetime(start),ts.from_datetime(end);observer=earth+wgs84.latlon(lat,lon,elevation_m=0)
  f=almanac.risings_and_settings(k,k['sun'],wgs84.latlon(lat,lon),horizon_degrees=-0.8333333333333334)
  times,states=almanac.find_discrete(t0,t1,f);solar={}
  for t,state in zip(times,states):solar['sunrise' if state else 'sunset']=t.utc_datetime().isoformat().replace('+00:00','Z')
  times,states=almanac.find_discrete(t0,t1,almanac.meridian_transits(k,k['sun'],wgs84.latlon(lat,lon)))
  for t,state in zip(times,states):
   if state:solar['solar_noon']=t.utc_datetime().isoformat().replace('+00:00','Z')
  # Independent geometric horizon/ecliptic intersection. Select the eastern
  # intersection by its positive dot product with the local east vector.
  tc=ts.from_datetime(start+dt.timedelta(hours=12));theta=math.radians(float(tc.gast)*15+lon)
  eps=float(tc._mean_obliquity_radians+tc._nutation_angles_radians[1]);phi=math.radians(lat)
  A=math.cos(phi)*math.cos(theta);B=math.cos(phi)*math.sin(theta)*math.cos(eps)+math.sin(phi)*math.sin(eps)
  lam=math.atan2(-A,B)
  east=-math.sin(theta)*math.cos(lam)+math.cos(theta)*math.cos(eps)*math.sin(lam)
  if east<0:lam+=math.pi
  charts.append(dict(id=label,utc=tc.utc_datetime().isoformat().replace('+00:00','Z'),latitude=lat,longitude=lon,dut1_seconds=float(tc.dut1),tropical_ascendant=math.degrees(lam)%360,definition='geometric eastern intersection of true ecliptic of date and local astronomical horizon; Skyfield GAST, IAU2006 obliquity plus IAU2000A nutation; DUT1 modeled Skyfield builtin, not observed',units='degrees'))
  trans=[]
  for kind,step in [('tithi',12),('karana',6)]:
   def elongation(t):
    # Vectorized independent apparent longitudes; no Swiss sidereal offset.
    sun=earth.at(t).observe(k['sun']).apparent().frame_latlon(ecliptic_frame)[1].degrees
    moon=earth.at(t).observe(k['moon']).apparent().frame_latlon(ecliptic_frame)[1].degrees
    return (moon-sun)%360
   def state(t):return np.floor(elongation(t)/step).astype(int)
   state.step_days=0.15
   times,values=almanac.find_discrete(t0,t1,state,epsilon=0.05/86400)
   for t,val in zip(times,values):trans.append(dict(kind=kind,at_utc=t.utc_datetime().isoformat().replace('+00:00','Z'),new_index=int(val),target_angle_degrees=float(val*step)))
  days.append(dict(id=label,date=date,timezone=zone,latitude=lat,longitude=lon,elevation_meters=0,day_seconds=(end.astimezone(dt.timezone.utc)-start.astimezone(dt.timezone.utc)).total_seconds(),solar=solar,transitions=trans,solar_definition='geocentric apparent Sun center altitude -0.8333333333333334 deg, no variable refraction/elevation; diagnostic only against Swiss upper limb',dut1_source='Skyfield builtin DeltaT predictions; NOT observed IERS EOP'))
 result=dict(schema_version=1,source_sha256=source['sha256'],generator_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),policy_sha256=hashlib.sha256((OUT/'policy.json').read_bytes()).hexdigest(),packages={p:importlib.metadata.version(p) for p in ['skyfield','jplephem','numpy','sgp4']},planetary=planetary,days=days,charts=charts,source_uncertainty='DE421 numerical ephemeris; no per-row observational error bars supplied. Comparison bands are declared engineering budgets, not claimed source uncertainty.',normalization='Skyfield builtin timescale (no network update), apparent().frame_latlon(ecliptic_frame), central difference +/-60 TT seconds; almanac roots independent of Go solver.',blocked=policy['unadmitted'])
 dump(OUT/'normalized.json',result);dump(OUT/'normalization-manifest.json',dict(sha256=hashlib.sha256((OUT/'normalized.json').read_bytes()).hexdigest(),reproduction='scripts/core-pr21-reference.py generate; independent evaluator uses no Swiss outputs'));print(f'Generated {len(planetary)} five-body/epoch records and {len(days)} independent local days')

def verify():
 check_source();raw=(OUT/'normalized.json').read_bytes();assert hashlib.sha256(raw).hexdigest()==json.loads((OUT/'normalization-manifest.json').read_text())['sha256'];x=json.loads(raw)
 assert x['generator_sha256']==hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
 assert x['policy_sha256']==hashlib.sha256((OUT/'policy.json').read_bytes()).hexdigest()
 assert x['source_sha256']=='a20a7139da04cbc462454634918e9a9ca69127044e2cc9d4f9c16e238d2deedc'
 assert len(x['planetary'])==45 and len(x['days'])==7
 assert {r['body'] for r in x['planetary']}=={'sun','moon','mercury','venus','mars'}
 assert x['planetary'][0]['jd_tt']==2451545.0
 for r in x['planetary']:
  assert r['source_sha256']==x['source_sha256']
  assert all(math.isfinite(v) for v in r['quantities'].values())
 print('PASS PR21 kernel, generator/policy bindings, 45 body-epochs and 7 local days; unadmitted quantities remain blocked')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('command',choices=['acquire','generate','verify']);args=p.parse_args()
 {'acquire':acquire,'generate':generate,'verify':verify}[args.command]()
