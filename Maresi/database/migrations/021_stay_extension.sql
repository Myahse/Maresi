ALTER TABLE visit_requests
  ADD COLUMN IF NOT EXISTS extension_check_out DATE,
  ADD COLUMN IF NOT EXISTS extension_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS extension_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS extension_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extension_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extension_note TEXT;
