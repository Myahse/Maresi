-- Admin can request identity corrections and suspend a client/host until they update.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS review_message TEXT,
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS identity_updated_at TIMESTAMPTZ;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('ok', 'suspended'));

CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
