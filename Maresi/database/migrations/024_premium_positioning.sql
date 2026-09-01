ALTER TABLE owner_subscriptions
  ADD COLUMN IF NOT EXISTS premium_positioning BOOLEAN NOT NULL DEFAULT FALSE;

-- The current paid host plan includes premium map and list placement.
UPDATE owner_subscriptions
SET premium_positioning = TRUE
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at > NOW();
