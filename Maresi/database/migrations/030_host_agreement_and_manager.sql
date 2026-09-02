ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS host_agreement_full_name VARCHAR(200);
ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS host_agreement_accepted BOOLEAN;
ALTER TABLE visit_requests ADD COLUMN IF NOT EXISTS host_agreement_signed_at TIMESTAMPTZ;

ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager_name VARCHAR(200);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager_phone VARCHAR(50);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager_email VARCHAR(200);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS manager_role VARCHAR(80);

UPDATE properties SET property_type = 'villa' WHERE property_type = 'house';
UPDATE properties SET property_type = 'apartment' WHERE property_type = 'residence';
