#!/usr/bin/env python3
"""Acquire pinned IANA data and build a deterministic stored ZIP for native calculations."""
import argparse,datetime,hashlib,json,subprocess,tempfile,urllib.request,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT/'tests/calculation/reference/option-a/tzdb-source';REV='e29969d3f327f129ec4aebaa9c7aee96c46f8e3b';FILES=['africa','antarctica','asia','australasia','europe','northamerica','southamerica','etcetera','backward','LICENSE'];ZIP=ROOT/'backend/internal/ephemeris/timezone.zip'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def acquire():
 BASE.mkdir(parents=True,exist_ok=True);records=[]
 for name in FILES:
  url=f'https://raw.githubusercontent.com/eggert/tz/{REV}/{name}'
  with urllib.request.urlopen(url,timeout=30) as response:
   data=response.read(2*1024*1024);assert response.status==200 and response.geturl()==url
  (BASE/name).write_bytes(data);records.append(dict(file=name,url=url,http_status=200,sha256=sha(BASE/name),retrieved_at_utc=datetime.datetime.now(datetime.timezone.utc).isoformat()))
 (BASE/'manifest.json').write_text(json.dumps(dict(revision=REV,resources=records),indent=2)+'\n');build()
def build():
 with tempfile.TemporaryDirectory() as tmp:
  subprocess.run(['zic','-b','fat','-d',tmp]+[str(BASE/n) for n in FILES if n!='LICENSE'],check=True)
  with zipfile.ZipFile(ZIP,'w',compression=zipfile.ZIP_STORED) as archive:
   for p in sorted(Path(tmp).rglob('*')):
    if p.is_file():
     info=zipfile.ZipInfo(str(p.relative_to(tmp)),date_time=(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_STORED;info.external_attr=0o100644<<16;archive.writestr(info,p.read_bytes())
 (BASE/'compiled.json').write_text(json.dumps(dict(sha256=sha(ZIP),version='IANA@'+REV,compiler=subprocess.check_output(['zic','--version']).decode().strip(),policy='fat TZif, default main data plus backward aliases, stored ZIP with sorted paths/fixed timestamps; immutable native input, no OS fallback',size_bytes=ZIP.stat().st_size),indent=2)+'\n');verify()
def verify():
 m=json.loads((BASE/'manifest.json').read_text());assert m['revision']==REV and {r['file'] for r in m['resources']}==set(FILES)
 for row in m['resources']:assert row['url']==f'https://raw.githubusercontent.com/eggert/tz/{REV}/'+row['file'] and row['http_status']==200 and sha(BASE/row['file'])==row['sha256']
 x=json.loads((BASE/'compiled.json').read_text());assert sha(ZIP)==x['sha256'] and ZIP.stat().st_size==x['size_bytes']
 with zipfile.ZipFile(ZIP) as archive:
  for name in ['Asia/Kolkata','America/New_York','America/Toronto','America/Vancouver','Asia/Kathmandu','Australia/Lord_Howe','Europe/Oslo']:
   assert archive.getinfo(name).compress_type==zipfile.ZIP_STORED and archive.read(name).startswith(b'TZif')
 print('PASS pinned native IANA data/ZIP; version',REV,'sha',x['sha256'])
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('command',choices=['acquire','build','verify']);a=p.parse_args();globals()[a.command]()
