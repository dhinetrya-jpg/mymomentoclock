CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

CREATE TABLE payment_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    amount_charged NUMERIC(6, 2) NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'INR',
    status payment_status_enum DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_session ON payment_transactions(session_token);

CREATE TABLE physical_remedies_rvm (
    remedy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planet_target VARCHAR(20) NOT NULL,
    modality_type VARCHAR(20) NOT NULL,
    trigger_min NUMERIC(3, 2) NOT NULL,
    trigger_max NUMERIC(3, 2) NOT NULL,
    unique_code VARCHAR(50) UNIQUE NOT NULL,
    instruction_prose TEXT NOT NULL
);

INSERT INTO physical_remedies_rvm (planet_target, modality_type, trigger_min, trigger_max, unique_code, instruction_prose) VALUES
('SATURN', 'ACOUSTIC', 0.40, 0.70, 'SAT_147_MID', 'Listen to pure 147Hz acoustic resonance fields for exactly 11 minutes during your personal Saturn Hora window.'),
('SATURN', 'BEHAVIORAL', 0.40, 0.70, 'SAT_DISC_FIN', 'Enforce artificial friction into your wealth loop. Automate exactly 8% of your weekly earnings directly into a locked savings vault.');