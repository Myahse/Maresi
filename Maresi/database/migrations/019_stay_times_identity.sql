-- Optional time-based listing rates, stay clock, identity back photo, stay reminders.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS id_card_back_url VARCHAR(500);

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS check_in_time TIME,
  ADD COLUMN IF NOT EXISTS check_out_time TIME,
  ADD COLUMN IF NOT EXISTS price_midday NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS price_full_day NUMERIC(12, 2);

ALTER TABLE visit_requests
  ADD COLUMN IF NOT EXISTS stay_rate VARCHAR(20) DEFAULT 'night',
  ADD COLUMN IF NOT EXISTS checkin_notified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checkout_notified_at TIMESTAMPTZ;
