#!/usr/bin/env python3
"""Adversarial offline tests of provenance admission, not astronomical accuracy."""
import contextlib,importlib.util,io,json,shutil,tempfile,unittest,sys
sys.dont_write_bytecode=True
from pathlib import Path
spec=importlib.util.spec_from_file_location('core_reference_acquire',Path(__file__).with_name('core-reference-acquire.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ProvenanceTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.original=module.OUT;module.OUT=Path(self.temp.name)/'acquired';shutil.copytree(self.original,module.OUT)
 def tearDown(self):module.OUT=self.original;self.temp.cleanup()
 def verify(self):
  with contextlib.redirect_stdout(io.StringIO()):module.verify()
 def test_originals_and_extraction_match(self):
  before={str(p.relative_to(module.OUT)):p.read_bytes() for p in module.OUT.rglob('*') if p.is_file()};self.verify();after={str(p.relative_to(module.OUT)):p.read_bytes() for p in module.OUT.rglob('*') if p.is_file()};self.assertEqual(before,after)
 def test_source_corruption_rejected(self):
  p=module.OUT/'originals/skyfield-test-against-horizons.py';p.write_bytes(p.read_bytes()+b'\n#tamper\n')
  with self.assertRaisesRegex(ValueError,'CHECKSUM_OR_SIZE'):self.verify()
 def test_forged_normalized_value_rejected_without_repair(self):
  p=module.OUT/'normalized.json';value=json.loads(p.read_text());value['planetary'][0]['longitude_deg']=309.320914;p.write_text(json.dumps(value));before=p.read_bytes()
  with self.assertRaisesRegex(ValueError,'NORMALIZED_VALUES_DISAGREE'):self.verify()
  self.assertEqual(before,p.read_bytes())
 def test_source_substitution_rejected(self):
  p=module.OUT/'acquisition_manifest.json';value=json.loads(p.read_text());value['resources'][0]['url']='https://untrusted.invalid/fake-nasa.txt';p.write_text(json.dumps(value))
  with self.assertRaisesRegex(ValueError,'UNEXPECTED_SOURCE_BINDING'):self.verify()
 def test_denied_capture_cannot_be_admitted(self):
  p=module.OUT/'acquisition_manifest.json';value=json.loads(p.read_text());value['resources'][0]['http_status']=403;p.write_text(json.dumps(value))
  with self.assertRaisesRegex(ValueError,'SOURCE_HTTP_OR_REDIRECT'):self.verify()
 def test_missing_capture_rejected(self):
  p=module.OUT/'originals/erfa-t_erfa_c.c';p.unlink()
  with self.assertRaises(FileNotFoundError):self.verify()
 def test_vendor_data_are_not_independent(self):
  value=json.loads((module.OUT/'acquisition_manifest.json').read_text());vendor=[r for r in value['resources'] if r['id'].startswith('swiss-data-')];self.assertEqual(len(vendor),2);self.assertTrue(all(r['kind']=='VENDOR_MODE_TEST_DATA_NOT_INDEPENDENT' for r in vendor));normalized=json.loads((module.OUT/'normalized.json').read_text());self.assertTrue(all(r['source_id']=='skyfield-horizons-tests' for r in normalized['planetary']))
 def test_direct_institution_failures_are_pending_not_pass(self):
  value=json.loads((module.OUT/'acquisition_attempts.json').read_text());attempts={r['id']:r for r in value['attempts']};self.assertTrue(all(attempts[r['id']]['status'] in {'EXTERNAL_REFERENCE_PENDING','CAPTURED_UNADMITTED'} for r in module.INSTITUTIONS))
if __name__=='__main__':unittest.main()
