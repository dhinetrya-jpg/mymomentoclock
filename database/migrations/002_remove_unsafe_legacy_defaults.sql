-- Optional additive hardening for an existing legacy database; owner review required before production use.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='astronomical_birth_data' AND column_name='city_name') THEN
  ALTER TABLE astronomical_birth_data ALTER COLUMN city_name DROP DEFAULT;
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='calculated_pillar_vectors' AND column_name='conflict_resolved') THEN
  ALTER TABLE calculated_pillar_vectors ALTER COLUMN conflict_resolved DROP DEFAULT;
 END IF;
END $$;
