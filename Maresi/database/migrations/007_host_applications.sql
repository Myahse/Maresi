-- Host applications: clients request owner (host) access; admin approves.

CREATE TABLE IF NOT EXISTS host_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  city VARCHAR(255),
  message TEXT,
  id_card VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_host_applications_user ON host_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_host_applications_status ON host_applications(status);
CREATE INDEX IF NOT EXISTS idx_host_applications_created ON host_applications(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_host_applications_one_pending
  ON host_applications(user_id)
  WHERE status = 'pending';

DROP TRIGGER IF EXISTS host_applications_updated_at ON host_applications;
CREATE TRIGGER host_applications_updated_at
  BEFORE UPDATE ON host_applications
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
