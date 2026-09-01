ALTER TABLE visit_requests
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value)
VALUES
  ('client_pays_operator_fees', 'false'),
  ('operator_fee_percent', '1')
ON CONFLICT (key) DO NOTHING;
