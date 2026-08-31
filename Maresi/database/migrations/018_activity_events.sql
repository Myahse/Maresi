CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40),
  entity_id UUID,
  actor_id UUID,
  summary TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_created ON activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor ON activity_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_entity ON activity_events(entity_id);
