ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS arrival_time TIME;
ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS departure_time TIME;
