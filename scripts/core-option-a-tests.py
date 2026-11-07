#!/usr/bin/env python3
"""Adversarial Option A evidence integrity, independent of live runtime approval."""
import contextlib,importlib.util,io,json,shutil,tempfile,unittest,sys
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;ROOT=HERE.parent
modules={}
for name in ['jupiter','reuse','timezones','events','outer-planets']:
 spec=importlib.util.spec_from_file_location(name,HERE/('core-option-a-'+name+'.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);modules[name]=m
class EvidenceTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=Path(self.tmp.name)/'option-a';shutil.copytree(ROOT/'tests/calculation/reference/option-a',self.path);self.saved=[]
  for name,m in modules.items():
   attr='OUT' if name in ['jupiter','reuse'] else 'BASE';self.saved.append((m,attr,getattr(m,attr)));setattr(m,attr,self.path/'tzdb-source' if name=='timezones' else self.path)
  m=modules['timezones'];self.saved.append((m,'ZIP',m.ZIP));m.ZIP=Path(self.tmp.name)/'timezone.zip';shutil.copyfile(ROOT/'backend/internal/ephemeris/timezone.zip',m.ZIP)
 def tearDown(self):
  for m,key,value in self.saved:setattr(m,key,value)
  self.tmp.cleanup()
 def reject(self,name):
  with contextlib.redirect_stdout(io.StringIO()):
   with self.assertRaises((AssertionError,FileNotFoundError,KeyError)):modules[name].verify()
 def change(self,path,fn):
  p=self.path/path;v=json.loads(p.read_text());fn(v);p.write_text(json.dumps(v))
 def test_originals(self):
  with contextlib.redirect_stdout(io.StringIO()):
   for m in modules.values():m.verify()
 def test_missing_center_kernel(self):(self.path/'originals/jup310-2015-03-02.bsp').unlink();self.reject('jupiter')
 def test_forged_jupiter(self):self.change('jupiter-normalized.json',lambda x:x['quantities'].update(tropical_longitude=0));self.reject('jupiter')
 def test_changed_tolerance(self):self.change('jupiter-normalized.json',lambda x:x['tolerances'].update(tropical_longitude=1));self.reject('jupiter')
 def test_corrupt_tz_zip(self):modules['timezones'].ZIP.write_bytes(b'fake database');self.reject('timezones')
 def test_changed_tz_source(self):(self.path/'tzdb-source/northamerica').write_text('fake Vancouver fold');self.reject('timezones')
 def test_upstream_license_missing(self):(self.path/'licenses/pyjhora-LICENSE').unlink();self.reject('reuse')
 def test_forged_rule_output(self):self.change('reuse-rules.json',lambda x:x['rule_cases'][0].update(start_seconds=0));self.reject('reuse')
 def test_forged_outer_target(self):self.change('outer-planets.json',lambda x:x['rows'][0].update(target_code=599));self.reject('outer-planets')
 def test_forged_edge_time(self):self.change('events.json',lambda x:x['cases'][0].update(transition_utc='2000-01-01T00:00:00Z'));self.reject('events')
if __name__=='__main__':unittest.main()
