-- Guest pays the host (Wave / Orange Money). Maresi 10% is a host commission.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS wave_payment_url TEXT,
  ADD COLUMN IF NOT EXISTS orange_money_url TEXT;

ALTER TABLE visit_requests DROP CONSTRAINT IF EXISTS visit_requests_status_check;
ALTER TABLE visit_requests
  ADD CONSTRAINT visit_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'awaiting_payment', 'payment_sent', 'confirmed'));

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_checka;
ALTER TABLE payments
  ADD CONSTRAINT payments_type_check
  CHECK (type IN ('subscription', 'reservation', 'commission'));
