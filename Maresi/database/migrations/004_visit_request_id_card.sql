-- National ID / card number for residence requests
ALTER TABLE visit_requests
  ADD COLUMN IF NOT EXISTS id_card VARCHAR(50);
