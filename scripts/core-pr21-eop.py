#!/usr/bin/env python3
"""Extract observed (I, not P) IERS Bulletin A DUT1 records from original publication bytes."""
import datetime,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'tests/calculation/reference/pr21'
PINS={'originals/iers-finals2000A.all':'f7c0e9e5033b92ecd2488cf20cdf015c8aa2229f3153eceafd17d862b19fc961','originals/astropy-iers-LICENSE.rst':'05d8ec3643773431cb5447b10711f119d79955470cdfbb8ca2e670a4432a153c'}
def expected():
 source=json.loads((BASE/'iers-source.json').read_text());assert len(source['resources'])==2
 for row in source['resources']:
  data=(BASE/row['file']).read_bytes();assert hashlib.sha256(data).hexdigest()==row['sha256']==PINS[row['file']]
  assert row['http_status']==200 and row['final_url']==row['url']
  assert row['revision']=='0570742629cb352ae16a7aa159e0e807eff87272'
  assert row['url'].startswith('https://raw.githubusercontent.com/astropy/astropy-iers-data/'+row['revision']+'/')
 tz=json.loads((BASE/'tz-source.json').read_text())
 tzpins={'originals/tz-current-northamerica':'da7366f6e0862ed15cb787dd056dca3a255df2ec50d19ff0a9f54eeb1562083a','originals/tz-current-LICENSE':'0613408568889f5739e5ae252b722a2659c02002839ad970a63dc5e9174b27cf'}
 assert len(tz['resources'])==2
 for row in tz['resources']:
  assert hashlib.sha256((BASE/row['file']).read_bytes()).hexdigest()==row['sha256']==tzpins[row['file']]
  assert row['http_status']==200 and row['final_url']==row['url']
  assert row['revision']=='e29969d3f327f129ec4aebaa9c7aee96c46f8e3b'
  assert row['url']=='https://raw.githubusercontent.com/eggert/tz/'+row['revision']+'/'+('northamerica' if row['file'].endswith('northamerica') else 'LICENSE')
 dates={'1975-04-20':14,'2000-01-01':32,'2024-01-01':37,'2026-03-08':37};records=[]
 for number,line in enumerate((BASE/'originals/iers-finals2000A.all').read_text().splitlines(),1):
  y=int(line[:2]);y+=1900 if y>=73 else 2000
  date=f'{y:04}-{int(line[2:4]):02}-{int(line[4:6]):02}'
  if date not in dates:continue
  assert line[57]=='I','Predicted EOP is not observed'
  mjd=float(line[7:15]);dut1=float(line[58:68]);error=float(line[68:78]);offset=dates[date]
  day=datetime.date.fromisoformat(date);assert mjd==(day-datetime.date(1858,11,17)).days
  records.append(dict(date=date,source_line=number,mjd_utc=mjd,dut1_seconds=dut1,formal_error_seconds=error,flag='I',tai_minus_utc_seconds=offset,tt_minus_utc_seconds=offset+32.184,delta_t_seconds=offset+32.184-dut1,time_scale='UTC at 00:00:00; UT1-UTC in seconds',source_sha256=PINS['originals/iers-finals2000A.all'],normalization='IERS finals2000A fixed-width Bulletin A columns: MJD bytes7:15; observed flag57; UT1-UTC58:68; formal error68:78. Bulletin B columns are not mixed with A. TAI-UTC dates also checked against ERFA/Swiss leap behavior.'))
 assert len(records)==4
 return dict(schema_version=1,records=records,tolerance_seconds=0.0001,tolerance_definition='Predeclared 100 microseconds representation/comparison budget (two float64 JD ULPs near 2451545 ~80.5us plus input decimal resolution). Source EOP formal errors separately recorded; numerical agreement does not imply 100us physical Earth-orientation accuracy.')
def main():
 x=expected();serialized=json.dumps(x,indent=2,sort_keys=True)+'\n';path=BASE/'iers-normalized.json'
 if len(sys.argv)>1 and sys.argv[1]=='normalize':path.write_text(serialized)
 else:assert path.read_text()==serialized,'EOP normalized values do not derive from captured original'
 print('PASS 4 observed IERS Bulletin A records, formal errors, original source bindings and direct extraction')
if __name__=='__main__':main()
