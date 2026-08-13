-- Maresi demo seed (Abidjan sample listings)
-- Prerequisite: run pgadmin-full-setup.sql (+ 004_visit_request_id_card.sql if needed)
-- All demo accounts use password: Password123!
-- BCrypt cost 10 hash below is for that password.

-- Fixed UUIDs for idempotent re-runs
-- Owners
--   a1111111-1111-1111-1111-111111111001  owner@maresi.app   (Aminata K.)
--   a1111111-1111-1111-1111-111111111002  owner2@maresi.app  (Jean-Marc D.)
--   a1111111-1111-1111-1111-111111111003  owner3@maresi.app  (Sophie N.)
-- Client
--   a1111111-1111-1111-1111-111111111011  client@maresi.app
-- Extra raters
--   a1111111-1111-1111-1111-111111111021  kouadio@maresi.app
--   a1111111-1111-1111-1111-111111111022  fatou@maresi.app
-- Properties
--   b2222222-2222-2222-2222-222222222001 .. 004

INSERT INTO users (id, email, password_hash, full_name, role, phone)
VALUES
  (
    'a1111111-1111-1111-1111-111111111001',
    'owner@maresi.app',
    '$2b$10$PS4YwTioVGTzzL9RCljDLOYOquNjW8L4.VSSuxgo7GDNUy/DSgowC',
    'Aminata K.',
    'owner',
    '+2250700000001'
  ),
  (
    'a1111111-1111-1111-1111-111111111002',
    'owner2@maresi.app',
    '$2b$10$PS4YwTioVGTzzL9RCljDLOYOquNjW8L4.VSSuxgo7GDNUy/DSgowC',
    'Jean-Marc D.',
    'owner',
    '+2250700000002'
  ),
  (
    'a1111111-1111-1111-1111-111111111003',
    'owner3@maresi.app',
    '$2b$10$PS4YwTioVGTzzL9RCljDLOYOquNjW8L4.VSSuxgo7GDNUy/DSgowC',
    'Sophie N.',
    'owner',
    '+2250700000003'
  ),
  (
    'a1111111-1111-1111-1111-111111111011',
    'client@maresi.app',
    '$2b$10$PS4YwTioVGTzzL9RCljDLOYOquNjW8L4.VSSuxgo7GDNUy/DSgowC',
    'Client Demo',
    'client',
    '+2250700000011'
  ),
  (
    'a1111111-1111-1111-1111-111111111021',
    'kouadio@maresi.app',
    '$2b$10$PS4YwTioVGTzzL9RCljDLOYOquNjW8L4.VSSuxgo7GDNUy/DSgowC',
    'Kouadio M.',
    'client',
    '+2250700000021'
  ),
  (
    'a1111111-1111-1111-1111-111111111022',
    'fatou@maresi.app',
    '$2b$10$PS4YwTioVGTzzL9RCljDLOYOquNjW8L4.VSSuxgo7GDNUy/DSgowC',
    'Fatou B.',
    'client',
    '+2250700000022'
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  updated_at = NOW();

INSERT INTO properties (
  id, owner_id, title, description, price, location, property_type, images,
  is_active, latitude, longitude, virtual_tour_url, average_rating, rating_count,
  bedrooms, max_guests
)
VALUES
  (
    'b2222222-2222-2222-2222-222222222001',
    'a1111111-1111-1111-1111-111111111001',
    'Modern Apartment — Plateau',
    'Bright 2-bedroom apartment in the city center with balcony and parking.',
    425000,
    'Abidjan, Plateau',
    'apartment',
    ARRAY[
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'
    ],
    true,
    5.322,
    -4.016,
    'https://kuula.co/share/collection/7l9pT?logo=0&info=0&fs=1&vr=1&sd=1&thumbs=1',
    4.50,
    2,
    2,
    4
  ),
  (
    'b2222222-2222-2222-2222-222222222002',
    'a1111111-1111-1111-1111-111111111002',
    'Family House — Yopougon',
    'Spacious home with garden, 3 bedrooms and secure compound.',
    620000,
    'Yopougon, Abidjan',
    'house',
    ARRAY[
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80'
    ],
    true,
    5.336,
    -4.089,
    NULL,
    4.20,
    0,
    3,
    6
  ),
  (
    'b2222222-2222-2222-2222-222222222003',
    'a1111111-1111-1111-1111-111111111001',
    'Cozy Studio — Cocody',
    'Furnished studio near universities, ideal for students or young professionals.',
    285000,
    'Cocody, Abidjan',
    'studio',
    ARRAY[
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80'
    ],
    true,
    5.348,
    -3.986,
    NULL,
    4.80,
    0,
    1,
    2
  ),
  (
    'b2222222-2222-2222-2222-222222222004',
    'a1111111-1111-1111-1111-111111111003',
    'Villa with Pool — Bingerville',
    'Luxury villa with swimming pool and large terrace.',
    890000,
    'Bingerville',
    'house',
    ARRAY[
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80'
    ],
    true,
    5.356,
    -3.885,
    'https://my.matterport.com/show/?m=example',
    4.90,
    0,
    4,
    8
  )
ON CONFLICT (id) DO UPDATE SET
  owner_id = EXCLUDED.owner_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  location = EXCLUDED.location,
  property_type = EXCLUDED.property_type,
  images = EXCLUDED.images,
  is_active = EXCLUDED.is_active,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  virtual_tour_url = EXCLUDED.virtual_tour_url,
  average_rating = EXCLUDED.average_rating,
  rating_count = EXCLUDED.rating_count,
  bedrooms = EXCLUDED.bedrooms,
  max_guests = EXCLUDED.max_guests,
  updated_at = NOW();

INSERT INTO property_ratings (id, property_id, user_id, score, comment, created_at)
VALUES
  (
    'c3333333-3333-3333-3333-333333333001',
    'b2222222-2222-2222-2222-222222222001',
    'a1111111-1111-1111-1111-111111111021',
    5,
    'Excellent location and very clean apartment.',
    NOW() - INTERVAL '5 days'
  ),
  (
    'c3333333-3333-3333-3333-333333333002',
    'b2222222-2222-2222-2222-222222222001',
    'a1111111-1111-1111-1111-111111111022',
    4,
    'Great stay, responsive owner.',
    NOW() - INTERVAL '12 days'
  )
ON CONFLICT (property_id, user_id) DO UPDATE SET
  score = EXCLUDED.score,
  comment = EXCLUDED.comment;
