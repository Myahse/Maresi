-- Payments + owner subscriptions (Genius Pay)
-- Also extends visit_requests statuses for reservation payment flow.

ALTER TABLE visit_requests DROP CONSTRAINT IF EXISTS visit_requests_status_check;
ALTER TABLE visit_requests
  ADD CONSTRAINT visit_requests_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'awaiting_payment', 'confirmed'));

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL CHECK (type IN ('subscription', 'reservation')),
  visit_request_id UUID REFERENCES visit_requests(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  commission_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  owner_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
  provider VARCHAR(30) NOT NULL DEFAULT 'geniuspay',
  provider_reference VARCHAR(100),
  checkout_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_reference
  ON payments(provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_visit ON payments(visit_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS owner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('inactive', 'active', 'expired')),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_subscriptions_status ON owner_subscriptions(status);
