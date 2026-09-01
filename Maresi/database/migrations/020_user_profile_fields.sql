ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

UPDATE users
SET
  first_name = COALESCE(NULLIF(first_name, ''), NULLIF(split_part(full_name, ' ', 1), '')),
  last_name = COALESCE(
    NULLIF(last_name, ''),
    NULLIF(btrim(regexp_replace(full_name, '^[^ ]+\s*', '')), '')
  )
WHERE full_name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);
