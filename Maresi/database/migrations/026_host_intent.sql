-- Remember that this account asked to become a host until email is confirmed.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS host_intent BOOLEAN NOT NULL DEFAULT FALSE;
