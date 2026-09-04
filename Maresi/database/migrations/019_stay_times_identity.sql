-- Optional time-based listing rates, stay clock, identity back photo, stay reminders.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS id_card_back_url VARCHAR(500);

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS check_in_time TIME,
  ADD COLUMN IF NOT EXISTS check_out_time TIME;
