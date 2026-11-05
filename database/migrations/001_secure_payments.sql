-- Additive provider-independent storage. Not applied automatically to any production database.
CREATE TABLE IF NOT EXISTS phase1_orders (
 order_id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, product_id TEXT NOT NULL,
 provider TEXT NOT NULL, provider_order_id TEXT NOT NULL,
 amount_minor BIGINT NOT NULL CHECK(amount_minor>0), currency CHAR(3) NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('PENDING','COMPLETED','FAILED','REFUNDED','REVERSED')),
 provider_payment_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(provider,provider_order_id), UNIQUE(provider,provider_payment_id)
);
CREATE TABLE IF NOT EXISTS phase1_payment_events (
 provider TEXT NOT NULL, event_id TEXT NOT NULL, order_id TEXT NOT NULL REFERENCES phase1_orders(order_id),
 fingerprint TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY(provider,event_id)
);
CREATE TABLE IF NOT EXISTS phase1_entitlements (
 order_id TEXT PRIMARY KEY REFERENCES phase1_orders(order_id), customer_id TEXT NOT NULL,
 active BOOLEAN NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
