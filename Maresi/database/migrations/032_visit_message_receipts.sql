ALTER TABLE visit_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE visit_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS visit_messages_receipt_idx
  ON visit_messages (visit_request_id, sender_id, delivered_at, read_at);
