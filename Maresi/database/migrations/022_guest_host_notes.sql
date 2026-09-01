ALTER TABLE visit_requests
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS guest_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_request_id UUID NOT NULL UNIQUE REFERENCES visit_requests(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_reviews_guest ON guest_reviews(guest_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS guest_rating_avg DECIMAL(3, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS guest_rating_count INTEGER DEFAULT 0;
