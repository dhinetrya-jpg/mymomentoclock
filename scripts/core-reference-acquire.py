#!/usr/bin/env python3
"""Controlled online refresh and strict offline provenance verification. No institutional response is fabricated."""
import argparse,datetime,hashlib,json,re,sys,urllib.request,urllib.parse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/calculation/reference/acquired'
VERSION='core-reference-normalizer-v1'
SKY='31a6ed7584cd09b6e48e07546a4b5921e1cd5bb4'
ERFA='1a8044cde5b7763295d472a6443387239127c6c8'
TZ='6903dde39ed637adaafc352c4b6993739253f058'
SWISS='94621aba9f3ff9c32cb721eac0380c30dbb153fe'
def resource(id,repo,rev,path,file,kind,marker,expected=None):
 return dict(id=id,url=f'https://raw.githubusercontent.com/{repo}/{rev}/{path}',revision=rev,file=file,kind=kind,format_marker=marker,expected_sha256=expected)
RESOURCES=[
 resource('skyfield-horizons-tests','skyfielders/python-skyfield',SKY,'skyfield/tests/test_against_horizons.py','originals/skyfield-test-against-horizons.py','INDEPENDENT_UPSTREAM_PUBLISHED_TEST_VECTORS','Accuracy tests against data pulled from HORIZONS'),
 resource('skyfield-license','skyfielders/python-skyfield',SKY,'LICENSE','originals/skyfield-LICENSE','LICENSE','Permission'),
 resource('erfa-published-vectors','liberfa/erfa',ERFA,'src/t_erfa_c.c','originals/erfa-t_erfa_c.c','INDEPENDENT_PUBLISHED_STANDARD_TEST_VECTORS','eraUtctai'),
 resource('erfa-license','liberfa/erfa',ERFA,'LICENSE','originals/erfa-LICENSE','LICENSE','Copyright'),
 resource('iana-northamerica','eggert/tz',TZ,'northamerica','originals/tz-northamerica','IANA_MAINTAINER_PUBLISHED_RULES','Rule\tUS'),
 resource('iana-asia','eggert/tz',TZ,'asia','originals/tz-asia','IANA_MAINTAINER_PUBLISHED_RULES','Asia/Kolkata'),
 resource('iana-australasia','eggert/tz',TZ,'australasia','originals/tz-australasia','IANA_MAINTAINER_PUBLISHED_RULES','Australia/Lord_Howe'),
 resource('iana-leap-seconds','eggert/tz',TZ,'leap-seconds.list','originals/tz-leap-seconds.list','IANA_MAINTAINER_HISTORICAL_IERS_ARCHIVE','3692217600'),
 resource('swiss-data-planets','aloistr/swisseph',SWISS,'ephe/sepl_18.se1','native-data/sepl_18.se1','VENDOR_MODE_TEST_DATA_NOT_INDEPENDENT','sepl_18.se1','ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66'),
 resource('swiss-data-moon','aloistr/swisseph',SWISS,'ephe/semo_18.se1','native-data/semo_18.se1','VENDOR_MODE_TEST_DATA_NOT_INDEPENDENT','semo_18.se1','1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7'),
 resource('swiss-license','aloistr/swisseph',SWISS,'LICENSE','native-data/LICENSE','VENDOR_LICENSE_NOT_LEGAL_APPROVAL','AGPL'),
 resource('swiss-agpl','aloistr/swisseph',SWISS,'agpl-3.0.txt','native-data/agpl-3.0.txt','VENDOR_LICENSE_NOT_LEGAL_APPROVAL','GNU AFFERO')]
QUERY={'format':'text','COMMAND':"'499'",'EPHEM_TYPE':"'OBSERVER'",'CENTER':"'500@399'",'START_TIME':"'2000-01-01 12:00'",'STOP_TIME':"'2000-01-01 12:01'",'STEP_SIZE':"'1m'",'QUANTITIES':"'31'",'CSV_FORMAT':"'YES'",'ANG_FORMAT':"'DEG'",'TIME_TYPE':"'UT'"}
INSTITUTIONS=[
 dict(id='direct-nasa-horizons-mars-j2000',url='https://ssd-api.jpl.nasa.gov/horizons.api?'+urllib.parse.urlencode(QUERY),query_parameters=QUERY),
 dict(id='direct-usno-new-york-solar',url='https://aa.usno.navy.mil/api/rstt/oneday?date=2026-03-08&coords=40.7128,-74.006&tz=-5'),
 dict(id='direct-iers-earth-orientation',url='https://datacenter.iers.org/data/latestVersion/finals2000A.all'),
 dict(id='direct-iana-tzdata2024b',url='https://data.iana.org/time-zones/releases/tzdata2024b.tar.gz'),
 dict(id='direct-pac-publication-entry',url='https://mausam.imd.gov.in/imd_latest/contents/pac.php')]
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(data):return hashlib.sha256(data).hexdigest()
def dump(path,data):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,indent=2,sort_keys=True)+'\n')
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'MyMomentOclock-CORE01-evidence/1.0'}),timeout=25) as response:
  body=response.read(16*1024*1024+1)
  if len(body)>16*1024*1024:raise ValueError('REFERENCE_SIZE_LIMIT')
  return body,dict(http_status=response.status,final_url=response.geturl(),content_type=response.headers.get('Content-Type',''),etag=response.headers.get('ETag',''))
def validate(r,data):
 if r['format_marker'].encode() not in data or b'<html' in data[:300].lower():raise ValueError('SOURCE_FORMAT_MISMATCH: '+r['id'])
 if r.get('expected_sha256') and sha(data)!=r['expected_sha256']:raise ValueError('PINNED_CHECKSUM_MISMATCH')
 if r['id'].startswith('swiss-data-') and not data.startswith(b'SWISSEPH'):raise ValueError('INVALID_SWISS_FILE_HEADER')
def refresh():
 records=[];attempts=[]
 for r in RESOURCES:
  t=now()
  try:
   data,headers=fetch(r['url']);validate(r,data);p=OUT/r['file'];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
   records.append(dict(r,**headers,retrieved_at_utc=t,sha256=sha(data),size_bytes=len(data),status='CAPTURED_ORIGINAL'))
  except Exception as error:attempts.append(dict(r,attempted_at_utc=t,status='EXTERNAL_REFERENCE_PENDING',error_type=type(error).__name__,error=str(error)))
 for r in INSTITUTIONS:
  t=now()
  try:
   data,headers=fetch(r['url']);p=OUT/'unadmitted'/(r['id']+'-'+sha(data)+'.body');p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
   attempts.append(dict(r,**headers,attempted_at_utc=t,status='CAPTURED_UNADMITTED',sha256=sha(data),size_bytes=len(data),file=str(p.relative_to(OUT))))
  except Exception as error:attempts.append(dict(r,attempted_at_utc=t,status='EXTERNAL_REFERENCE_PENDING',error_type=type(error).__name__,error=str(error)))
 dump(OUT/'acquisition_attempts.json',dict(schema_version=1,attempts=attempts))
 if len(records)!=len(RESOURCES):raise ValueError('REFERENCE_REFRESH_INCOMPLETE; prior complete manifest retained; see acquisition_attempts.json')
 dump(OUT/'acquisition_manifest.json',dict(schema_version=1,normalizer_version=VERSION,resources=records,policy='Published tests/mirrors are not direct institutional captures; vendor files are not independent accuracy evidence.'))
 normalize(records);print(f'Captured {len(records)} original immutable resources; institutional failures/unadmitted payloads retained separately.')
def block(text,name,python=False):
 expr=(r'^def '+re.escape(name)+r'\(.*?(?=^def |\Z)') if python else (r'^static void t_'+re.escape(name)+r'\(.*?^\}')
 m=re.search(expr,text,re.M|re.S)
 if not m:raise ValueError('SOURCE_FUNCTION_NOT_FOUND: '+name)
 return m.group(),f'{name}; lines {text[:m.start()].count(chr(10))+1}-{text[:m.end()].count(chr(10))+1}'
def normalize(records,write=True):
 byid={r['id']:r for r in records};sky=(OUT/byid['skyfield-horizons-tests']['file']).read_text();erfa=(OUT/byid['erfa-published-vectors']['file']).read_text();planetary=[];temporal=[]
 common=dict(center='Earth center',frame='APPARENT_GEOCENTRIC_ECLIPTIC_OF_DATE',time_scale='UTC',ephemeris_context='DE421',source_id='skyfield-horizons-tests',source_sha256=byid['skyfield-horizons-tests']['sha256'],independence='UPSTREAM_PUBLISHED_HORIZONS_DERIVED_NOT_DIRECT_NASA_CAPTURE')
 text,locator=block(sky,'test_ecliptic_for_epoch_of_date',True)
 lat,tlat=re.search(r'compare\(hlat.degrees, ([\d.]+), ([\d.]+)\)',text).groups();lon,tlon=re.search(r'compare\(hlon.degrees, ([\d.]+), ([\d.]+)\)',text).groups()
 planetary.append(dict(common,id='SKYFIELD_MARS_19560114',body='mars',reference_body='Mars barycenter',utc='1956-01-14T06:00:00Z',longitude_deg=float(lon),latitude_deg=float(lat),longitude_tolerance_deg=float(tlon),latitude_tolerance_deg=float(tlat),source_locator=locator))
 text,locator=block(sky,'test_ecliptic_for_epoch_of_date_array',True)
 for index,hour in enumerate([7,8]):
  lat,tlat=re.search(r'compare\(hlat.degrees\['+str(index)+r'\], ([\d.]+), ([\d.]+)\)',text).groups();lon,tlon=re.search(r'compare\(hlon.degrees\['+str(index)+r'\], ([\d.]+), ([\d.]+)\)',text).groups()
  planetary.append(dict(common,id=f'SKYFIELD_SUN_20051001_{hour:02}',body='sun',reference_body='Sun',utc=f'2005-10-01T{hour:02}:00:00Z',longitude_deg=float(lon),latitude_deg=float(lat),longitude_tolerance_deg=float(tlon),latitude_tolerance_deg=float(tlat),source_locator=locator))
 base=dict(source_id='erfa-published-vectors',source_sha256=byid['erfa-published-vectors']['sha256'],independence='INDEPENDENT_PUBLISHED_ERFA_STANDARD_TEST_VECTOR')
 text,locator=block(erfa,'cal2jd');cal=[int(n) for n in re.search(r'eraCal2jd\((\d+), (\d+), (\d+),',text).groups()];first=float(re.search(r'vvd\(djm0,\s*([\d.]+),',text).group(1));second=float(re.search(r'vvd\(djm,\s*([\d.]+),',text).group(1))
 temporal.append(dict(base,id='ERFA_CAL2JD_20030601',operation='CAL2JD',calendar=cal,expected_jd1=first,expected_jd2=second,tolerance_days=0,source_locator=locator))
 for op in ['utctai','taitt','utcut1']:
  text,locator=block(erfa,op);fn={'utctai':'Utctai','taitt':'Taitt','utcut1':'Utcut1'}[op];nums=re.search('era'+fn+r'\(([\d.]+), ([\d.]+),'+(r' ([\d.]+),' if op=='utcut1' else ''),text).groups();p='t' if op=='taitt' else 'u'
  first,tol1=re.search(r'vvd\('+p+r'1,\s*([\d.]+),\s*([\de.-]+),',text).groups();second,tol2=re.search(r'vvd\('+p+r'2,\s*([\d.]+),\s*([\de.-]+),',text).groups()
  item=dict(base,id='ERFA_'+op.upper(),operation=op.upper(),input_jd1=float(nums[0]),input_jd2=float(nums[1]),expected_jd1=float(first),expected_jd2=float(second),tolerance_days=float(tol2),first_part_tolerance_days=float(tol1),source_locator=locator)
  if op=='utcut1':item['dut1_seconds']=float(nums[2])
  temporal.append(item)
 text,locator=block(erfa,'dtf2d');y,m,d,h,minute,second=re.search(r'eraDtf2d\("UTC", (\d+), (\d+), (\d+), (\d+), (\d+), ([\d.]+),',text).groups();value,tolerance=re.search(r'vvd\(u1\+u2,\s*([\d.]+),\s*([\de.-]+),',text).groups()
 temporal.append(dict(base,id='ERFA_DTF2D_LEAP_19940630',operation='DTF2D',scale='UTC_QUASI_JD',calendar=[int(y),int(m),int(d),int(h),int(minute),float(second)],expected_jd=float(value),tolerance_days=float(tolerance),source_locator=locator))
 result=dict(schema_version=1,normalizer_version=VERSION,planetary=planetary,temporal=temporal,limitations=['No direct NASA, USNO, IERS, IANA-server or PAC response was admitted.','Skyfield vectors are upstream-published Horizons-derived tests, not direct NASA authenticity proof; Mars barycenter differs from Mars center.','No independently retrieved J2000 Moon/Mars/PAC/Panchang/solar values were obtained; those remain pending.','Swiss vendor files prove mode availability only, never independent accuracy.','ERFA fractional two-part JD tolerances require split-part comparison or a predeclared float64 representation budget.'])
 if write:dump(OUT/'normalized.json',result)
 return result

def verify():
 manifest=json.loads((OUT/'acquisition_manifest.json').read_text());records=manifest['resources'];configs={r['id']:r for r in RESOURCES}
 if manifest.get('schema_version')!=1 or manifest.get('normalizer_version')!=VERSION or len(records)!=len(configs):raise ValueError('INVALID_OR_INCOMPLETE_MANIFEST')
 for r in records:
  c=configs.pop(r['id'])
  if any(r[k]!=c[k] for k in ['url','file','revision','kind']):raise ValueError('UNEXPECTED_SOURCE_BINDING')
  data=(OUT/c['file']).read_bytes();validate(c,data)
  if r['sha256']!=sha(data) or r['size_bytes']!=len(data) or r['status']!='CAPTURED_ORIGINAL':raise ValueError('SOURCE_CHECKSUM_OR_SIZE_MISMATCH')
  if r.get('http_status')!=200 or r.get('final_url')!=c['url']:raise ValueError('SOURCE_HTTP_OR_REDIRECT_MISMATCH')
  if datetime.datetime.fromisoformat(r['retrieved_at_utc']).tzinfo is None:raise ValueError('RETRIEVAL_TIME_REQUIRES_UTC_OFFSET')
 if configs:raise ValueError('MISSING_SOURCE')
 previous=(OUT/'normalized.json').read_bytes();expected=(json.dumps(normalize(records,write=False),indent=2,sort_keys=True)+'\n').encode()
 if expected!=previous:raise ValueError('NORMALIZED_VALUES_DISAGREE_WITH_ORIGINAL_SOURCE')
 value=json.loads(previous)
 if len(value['planetary'])!=3 or len(value['temporal'])!=5:raise ValueError('UNEXPECTED_VECTOR_COUNT')
 for row in value['planetary']:
  if not(-90<=row['latitude_deg']<=90 and 0<=row['longitude_deg']<360):raise ValueError('INVALID_ANGULAR_UNITS')
 print('PASS offline provenance:12 originals,3 upstream-published planetary vectors,5 ERFA temporal vectors. Direct institutional acceptance remains pending.')
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('command',choices=['refresh','verify','normalize','accept']);args=parser.parse_args()
 if args.command=='refresh':refresh()
 elif args.command=='verify':
  verify()
  import subprocess
  subprocess.run([sys.executable,str(ROOT/'scripts/core-pr21-reference.py'),'verify'],check=True)
  subprocess.run([sys.executable,str(ROOT/'scripts/core-pr21-eop.py'),'verify'],check=True)
 elif args.command=='accept':
  verify();raise ValueError('EXTERNAL_REFERENCE_PENDING: direct NASA/USNO/IERS/PAC source-specific admission and required per-body/Panchang/solar coverage have not been independently established; see acquisition_attempts.json')
 else:normalize(json.loads((OUT/'acquisition_manifest.json').read_text())['resources'])
if __name__=='__main__':
 try:main()
 except Exception as error:print(f'REFERENCE_VERIFICATION_FAILED: {type(error).__name__}: {error}',file=sys.stderr);sys.exit(1)
