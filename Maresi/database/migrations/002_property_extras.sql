-- Optional columns for map, VR tours, and ratings (run after schema.sql)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS virtual_tour_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS property_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_property_ratings_property ON property_ratings(property_id);
