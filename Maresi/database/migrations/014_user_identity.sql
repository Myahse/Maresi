-- Identity documents collected at registration (client and host).
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS id_card VARCHAR(50),
  ADD COLUMN IF NOT EXISTS selfie_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS id_card_photo_url VARCHAR(500);
