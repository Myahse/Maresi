-- Host wallet: GeniusPay top-up, then Maresi debits commission / subscription.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE payments
  ADD CONSTRAINT payments_type_check
  CHECK (type IN ('subscription', 'reservation', 'commission', 'wallet_topup'));

CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_type VARCHAR(30) NOT NULL
    CHECK (entry_type IN ('topup', 'commission', 'subscription')),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  balance_after DECIMAL(12, 2) NOT NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  visit_request_id UUID REFERENCES visit_requests(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON wallet_ledger(user_id, created_at DESC);
