-- Migration Phase 8 : QR d'invitation + pointage de présence, splash
-- d'accueil (GIF/vidéo), limite de poids du bucket média.
--
-- Nécessite 00_setup_complet.sql (tables + RLS + wedding_is_accessible).
-- Aucune nouvelle policy n'est requise pour le pointage : les policies
-- `guests_owner_all` / `guests_admin_all` existantes couvrent déjà la
-- lecture par `qr_token` et la mise à jour de `checked_in_at` depuis /app
-- (marié) comme /admin (super-admin).

-- QR d'invitation : jeton opaque (pas l'id, pour éviter de fuiter l'ordre
-- d'insertion) + pointage de présence à l'entrée.
alter table public.guests
  add column if not exists qr_token uuid not null default gen_random_uuid(),
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_in_by uuid references auth.users(id) on delete set null;

create unique index if not exists guests_qr_token_key on public.guests (qr_token);

-- Splash GIF/vidéo affiché avant le site public.
alter table public.weddings
  add column if not exists splash_media_url text,
  add column if not exists splash_media_type text
    check (splash_media_type is null or splash_media_type in ('video', 'gif'));

-- Plafond de poids du bucket média (filet de sécurité en plus de la
-- validation côté client : 10 Mo photo / 100 Mo vidéo).
update storage.buckets set file_size_limit = 104857600 where id = 'media';
