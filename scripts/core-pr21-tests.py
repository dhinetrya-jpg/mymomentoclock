#!/usr/bin/env python3
"""Adversarial source/fixture tests; integrity is distinct from astronomical acceptance."""
import contextlib,importlib.util,io,json,shutil,tempfile,unittest,sys
sys.dont_write_bytecode=True
from pathlib import Path
spec=importlib.util.spec_from_file_location('pr21',Path(__file__).with_name('core-pr21-reference.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
eop_spec=importlib.util.spec_from_file_location('eop',Path(__file__).with_name('core-pr21-eop.py'));eop=importlib.util.module_from_spec(eop_spec);eop_spec.loader.exec_module(eop)
class AdmissionTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.old=m.OUT;m.OUT=Path(self.temp.name)/'reference';shutil.copytree(self.old,m.OUT)
 def tearDown(self):m.OUT=self.old;self.temp.cleanup()
 def rejects(self):
  with contextlib.redirect_stdout(io.StringIO()):
   with self.assertRaises((AssertionError,FileNotFoundError,KeyError)):m.verify()
 def change(self,name,fn):
  p=m.OUT/name;x=json.loads(p.read_text());fn(x);p.write_text(json.dumps(x))
 def eop_rejects(self):
  old=eop.BASE;eop.BASE=m.OUT
  try:
   with self.assertRaises((AssertionError,FileNotFoundError,KeyError)):
    expected=json.dumps(eop.expected(),indent=2,sort_keys=True)+'\n'
    self.assertEqual((m.OUT/'iers-normalized.json').read_text(),expected)
  finally:eop.BASE=old
 def test_forged_observed_dut1(self):self.change('iers-normalized.json',lambda x:x['records'][0].update(dut1_seconds=0));self.eop_rejects()
 def test_missing_eop_original(self):(m.OUT/'originals/iers-finals2000A.all').unlink();self.eop_rejects()
 def test_intact(self):
  with contextlib.redirect_stdout(io.StringIO()):m.verify()
 def test_missing_kernel(self):(m.OUT/'originals/de421.bsp').unlink();self.rejects()
 def test_corrupt_kernel(self):
  p=m.OUT/'originals/de421.bsp'
  with p.open('r+b') as f:f.write(b'FAKE')
  self.rejects()
 def test_http_denial(self):self.change('source.json',lambda x:x.update(http_status=403));self.rejects()
 def test_altered_expected(self):self.change('normalized.json',lambda x:x['planetary'][0]['quantities'].update(tropical_longitude=0));self.rejects()
 def test_relabel_center(self):self.change('normalized.json',lambda x:x['planetary'][0].update(target_center=5));self.rejects()
 def test_loosened_policy(self):self.change('policy.json',lambda x:x['planetary_tolerances'].update(tropical_longitude=1));self.rejects()
 def test_relabel_j2000(self):self.change('normalized.json',lambda x:x['planetary'][0].update(jd_tt=2451545.0001));self.rejects()
if __name__=='__main__':unittest.main()
