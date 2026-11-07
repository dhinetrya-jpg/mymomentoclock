#!/usr/bin/env python3
"""Independent real Jupiter-center evaluation; no Swiss calls or generated native expectations."""
import datetime,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/calculation/reference/option-a'
def generate():
 from skyfield.api import load,load_file
 from skyfield.framelib import ecliptic_frame
 import importlib.metadata
 assert importlib.metadata.version('skyfield')=='1.54'
 source=json.loads((OUT/'jupiter-source.json').read_text());kernel=load_file(str(OUT/source['file']));ts=load.timescale(builtin=True);t=ts.utc(2015,3,2,12)
 def position(t):
  lat,lon,d=kernel['earth'].at(t).observe(kernel['jupiter']).apparent(deflectors=(10,)).frame_latlon(ecliptic_frame)
  return float(lon.degrees),float(lat.degrees),float(d.au)
 a=position(t);before=position(ts.tt_jd(t.tt-60/86400))[0];after=position(ts.tt_jd(t.tt+60/86400))[0]
 x=dict(schema_version=1,source_sha256=source['sha256'],generator_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),id='JUP310_CENTER_20150302_12',body='jupiter',target_center=599,observer_center=399,utc=t.utc_datetime().isoformat().replace('+00:00','Z'),jd_tt=float(t.tt),frame='APPARENT_GEOCENTRIC_TRUE_ECLIPTIC_OF_DATE',reduction='JUP310 original SPK includes SSB->Jupiter barycenter->599 AND SSB->Earth barycenter->399; Skyfield light time, aberration, Sun-only gravitational deflection, IAU2006 precession/IAU2000A nutation',source_uncertainty='No per-row observational uncertainty supplied; original PR21 comparison budgets retained, not claimed as source error bars',quantities=dict(tropical_longitude=a[0],latitude=a[1],distance_au=a[2],longitude_speed_deg_per_day=((after-before+180)%360-180)*720),tolerances=dict(tropical_longitude=.0002,latitude=.0002,distance_au=.000001,longitude_speed_deg_per_day=.0002),limitation='One Jupiter epoch only; Saturn centers/nodes/Lahiri still unverified')
 (OUT/'jupiter-normalized.json').write_text(json.dumps(x,indent=2,sort_keys=True)+'\n')
 (OUT/'jupiter-normalized.sha256').write_text(hashlib.sha256((OUT/'jupiter-normalized.json').read_bytes()).hexdigest()+'\n')
 print('Generated original JUP310 target599 / observer399 independent reference')
def verify():
 x=json.loads((OUT/'jupiter-source.json').read_text());data=(OUT/x['file']).read_bytes()
 assert hashlib.sha256(data).hexdigest()==x['sha256']=='0d315bf0d242530400cee1c9bc98974a7742e618a423953b49fb13cd6144e1cf'
 assert x['http_status']==200 and x['url']==x['final_url']=='https://raw.githubusercontent.com/skyfielders/python-skyfield/31a6ed7584cd09b6e48e07546a4b5921e1cd5bb4/skyfield/tests/data/jup310-2015-03-02.bsp'
 raw=(OUT/'jupiter-normalized.json').read_bytes();assert hashlib.sha256(raw).hexdigest()==(OUT/'jupiter-normalized.sha256').read_text().strip();v=json.loads(raw)
 assert v['target_center']==599 and v['observer_center']==399 and v['source_sha256']==x['sha256']
 assert v['generator_sha256']==hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
 assert v['tolerances']==dict(tropical_longitude=.0002,latitude=.0002,distance_au=.000001,longitude_speed_deg_per_day=.0002)
 print('PASS immutable Jupiter-center source/normalization; one epoch, not broad Jupiter/Saturn acceptance')
if __name__=='__main__':generate() if len(sys.argv)>1 and sys.argv[1]=='generate' else verify()
