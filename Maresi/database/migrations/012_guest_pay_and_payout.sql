-- Guest pays Maresi (GeniusPay). Host wallet is credited the full stay. Host can request a payout.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_checka;
ALTER TABLE payments
  ADD CONSTRAINT payments_type_check
  CHECK (type IN ('subscription', 'reservation', 'commission', 'wallet_topup', 'payout'));

ALTER TABLE wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_entry_type_check;
ALTER TABLE wallet_ledger
  ADD CONSTRAINT wallet_ledger_entry_type_check
  CHECK (entry_type IN ('topup', 'commission', 'subscription', 'stay', 'payout'));
