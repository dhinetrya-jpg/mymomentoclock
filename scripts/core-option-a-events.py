#!/usr/bin/env python3
"""Independent dated edge cases selected only from Skyfield/JPL events, never native residuals."""
import datetime as dt,hashlib,json,sys
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'tests/calculation/reference/option-a';KERNEL=ROOT/'tests/calculation/reference/pr21/originals/de421.bsp'
def generate():
 from skyfield.api import load,load_file,wgs84
 from skyfield.framelib import ecliptic_frame
 from skyfield import almanac
 import numpy as np
 assert hashlib.sha256(KERNEL.read_bytes()).hexdigest()=='a20a7139da04cbc462454634918e9a9ca69127044e2cc9d4f9c16e238d2deedc'
 k=load_file(str(KERNEL));ts=load.timescale(builtin=True);earth=k['earth'];t0,t1=ts.utc(2026,1,1),ts.utc(2027,1,1)
 def state(t):
  e=earth.at(t);sun=e.observe(k['sun']).apparent().frame_latlon(ecliptic_frame)[1].degrees;moon=e.observe(k['moon']).apparent().frame_latlon(ecliptic_frame)[1].degrees
  return np.floor(((moon-sun)%360)/12).astype(int)
 state.step_days=.15
 roots,values=almanac.find_discrete(t0,t1,state,epsilon=.05/86400);events=[(t.utc_datetime(),int(v)) for t,v in zip(roots,values)]
 cases=[]
 for label,zone,lat,lon in [('MIDNIGHT_KOLKATA','Asia/Kolkata',22.5726,88.3639),('MIDNIGHT_NEW_YORK','America/New_York',40.7128,-74.006)]:
  def distance(item):
   local=item[0].astimezone(ZoneInfo(zone));seconds=local.hour*3600+local.minute*60+local.second+local.microsecond/1e6
   return min(seconds,86400-seconds)
  event=min(events,key=distance);local=event[0].astimezone(ZoneInfo(zone));cases.append(dict(id=label,date=local.date().isoformat(),timezone=zone,latitude=lat,longitude=lon,transition_utc=event[0].isoformat().replace('+00:00','Z'),transition_local=local.isoformat(),target_angle=event[1]*12,selection='Smallest independently computed distance to local midnight in 2026; not selected against native residuals',distance_seconds=distance(event)))
 # Explicitly diagnostic conventional center horizon; selects an edge case but does not admit native sunrise accuracy.
 f=almanac.risings_and_settings(k,k['sun'],wgs84.latlon(22.5726,88.3639),horizon_degrees=-.8333333333333334)
 rises,states=almanac.find_discrete(t0,t1,f);sunrises=[t.utc_datetime() for t,s in zip(rises,states) if s]
 event,rise=min(((e,r) for e in events for r in sunrises),key=lambda pair:abs((pair[0][0]-pair[1]).total_seconds()))
 local=event[0].astimezone(ZoneInfo('Asia/Kolkata'));cases.append(dict(id='SUNRISE_ADJACENT_KOLKATA',date=local.date().isoformat(),timezone='Asia/Kolkata',latitude=22.5726,longitude=88.3639,transition_utc=event[0].isoformat().replace('+00:00','Z'),transition_local=local.isoformat(),target_angle=event[1]*12,selection='Nearest independent Tithi transition to independently defined conventional topocentric center-altitude sunrise in2026; NOT same-definition native solar acceptance',distance_seconds=abs((event[0]-rise).total_seconds()),diagnostic_sunrise_utc=rise.isoformat().replace('+00:00','Z')))
 for c in cases:
  local=dt.datetime.fromisoformat(c['date']).replace(tzinfo=ZoneInfo(c['timezone']));c['day_start_utc']=local.astimezone(dt.timezone.utc).isoformat().replace('+00:00','Z');c['day_end_utc']=(local+dt.timedelta(days=1)).astimezone(dt.timezone.utc).isoformat().replace('+00:00','Z')
 result=dict(schema_version=1,source_sha256=hashlib.sha256(KERNEL.read_bytes()).hexdigest(),generator_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),tolerance_seconds=10,scope='Independent apparent geocentric tropical elongation, true ecliptic of date; independent numerical epsilon0.05s, comparison budget10s unchanged. No sidereal or same-definition sunrise accuracy claim.',cases=cases)
 raw=json.dumps(result,indent=2,sort_keys=True)+'\n';(BASE/'events.json').write_text(raw);(BASE/'events.sha256').write_text(hashlib.sha256(raw.encode()).hexdigest()+'\n');print([(c['id'],c['date'],c['distance_seconds']) for c in cases])
def verify():
 raw=(BASE/'events.json').read_bytes();assert hashlib.sha256(raw).hexdigest()==(BASE/'events.sha256').read_text().strip();x=json.loads(raw)
 assert x['source_sha256']==hashlib.sha256(KERNEL.read_bytes()).hexdigest() and x['generator_sha256']==hashlib.sha256(Path(__file__).read_bytes()).hexdigest() and x['tolerance_seconds']==10 and len(x['cases'])==3
 print('PASS independent dated midnight/sunrise-adjacent Tithi fixtures and source bindings')
if __name__=='__main__':generate() if len(sys.argv)>1 and sys.argv[1]=='generate' else verify()
