-- ============================================================================
-- MYMOMENTOCLOCK ENTERPRISE DATABASE SCHEMA (schema.sql)
-- Target: PostgreSQL 16+ with PostGIS / Temporal Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom Enums
CREATE TYPE ayanamsa_enum AS ENUM ('TRUE_LAHIRI', 'KP', 'RAMAN');
CREATE TYPE modality_enum AS ENUM ('ACOUSTIC', 'KINETIC', 'TEMPORAL', 'BEHAVIORAL');
CREATE TYPE pillar_category_enum AS ENUM ('WEALTH', 'HEALTH', 'CAREER', 'RELATIONSHIP');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- Payment Transactions Table (File 10: schema.sql & Paywall Unlock)
CREATE TABLE IF NOT EXISTS payment_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL, -- Payment gateway reference code
  amount_charged NUMERIC(6, 2) NOT NULL, -- e.g., 299.00 INR
  currency_code VARCHAR(3) DEFAULT 'INR',
  status payment_status_enum DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_session ON payment_transactions(session_token);

-- 1. User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(150),
  phone_whatsapp VARCHAR(30),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Astronomical Birth Data & Calibration Tracking Table
CREATE TABLE IF NOT EXISTS astronomical_birth_data (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  raw_input_time TIMESTAMP WITH TIME ZONE NOT NULL,
  rectified_time_utc TIMESTAMP WITH TIME ZONE,
  offset_seconds INT DEFAULT 0,
  concordance_rating NUMERIC(4, 3) DEFAULT 0.000,
  latitude NUMERIC(9, 6) NOT NULL,
  longitude NUMERIC(9, 6) NOT NULL,
  city_name VARCHAR(100) DEFAULT 'Kolkata',
  ayanamsa_applied ayanamsa_enum DEFAULT 'TRUE_LAHIRI',
  occupation_context VARCHAR(100) DEFAULT 'General',
  location_context VARCHAR(100) DEFAULT 'Global_Digital',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Physical Remedies & Remedial Vector Matrix (RVM) Table
CREATE TABLE IF NOT EXISTS physical_remedies_rvm (
  remedy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planet_target VARCHAR(20) NOT NULL,
  modality_type modality_enum NOT NULL,
  trigger_min NUMERIC(3, 2) NOT NULL,
  trigger_max NUMERIC(3, 2) NOT NULL,
  unique_code VARCHAR(50) UNIQUE NOT NULL,
  frequency_hz INT,
  duration_minutes INT DEFAULT 11,
  instruction_prose TEXT NOT NULL,
  scientific_rationale TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Calculated Pillar Vectors & Algebraic Synthesis Table
CREATE TABLE IF NOT EXISTS calculated_pillar_vectors (
  calculation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES astronomical_birth_data(profile_id) ON DELETE CASCADE,
  pillar_category pillar_category_enum NOT NULL,
  net_potency_score NUMERIC(6, 2) NOT NULL,
  net_auspiciousness_vector NUMERIC(5, 4) NOT NULL,
  dominant_vector VARCHAR(100) NOT NULL,
  suppressed_vector VARCHAR(100) NOT NULL,
  conflict_resolved BOOLEAN DEFAULT true,
  calculation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Seed Data for Remedial Vector Matrix
INSERT INTO physical_remedies_rvm (planet_target, modality_type, trigger_min, trigger_max, unique_code, frequency_hz, duration_minutes, instruction_prose, scientific_rationale)
VALUES
('SATURN', 'ACOUSTIC', 0.40, 0.70, 'SAT_147_MID', 147, 11, 'Listen to pure 147Hz acoustic resonance fields or deep, steady drone soundscapes for exactly 11 minutes during your personal Saturn Hora window.', '147Hz tone stabilizes parasympathetic nervous response to structural delays.'),
('SATURN', 'BEHAVIORAL', 0.40, 0.70, 'SAT_DISC_FIN', NULL, 5, 'Enforce artificial friction into your wealth loop. Automate exactly 8% of your weekly earnings directly into a locked long-term retirement index or automated digital savings vault.', 'Voluntary delayed liquidity channels Saturnian discipline into tangible asset security.'),
('MARS', 'KINETIC', 0.50, 0.90, 'MARS_ISO_SUNRISE', NULL, 8, 'Perform high-resistance isometric holds or focused physical training at local sunrise to channel active physical energy loops.', 'Isometric exercise releases adrenergic tension and dissipates impulsive reactions.'),
('JUPITER', 'ACOUSTIC', 0.30, 0.60, 'JUP_432_EXP', 432, 15, 'Engage with 432Hz golden harmonic resonance while reviewing strategic career and wealth objectives.', '432Hz induces cognitive coherence and expansive outlook.')
ON CONFLICT (unique_code) DO NOTHING;

-- Index Optimization
CREATE INDEX IF NOT EXISTS idx_birth_data_user ON astronomical_birth_data(user_id);
CREATE INDEX IF NOT EXISTS idx_pillar_vectors_profile ON calculated_pillar_vectors(profile_id);
CREATE INDEX IF NOT EXISTS idx_remedies_planet ON physical_remedies_rvm(planet_target);
