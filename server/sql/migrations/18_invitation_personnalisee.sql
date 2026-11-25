-- =====================================================================
-- Migration 18 — Invitation personnalisée (novembre 2026)
-- À exécuter UNE FOIS sur la base Postgres de production (phpPgAdmin /
-- psql), après sauvegarde. Idempotente : peut être relancée sans risque.
--
-- Ajoute les nouveaux types de section du site public :
--   story       → « Notre histoire » à deux voix
--   quote       → Citation / verset
--   info        → Informations pratiques
--   thanks      → Remerciements
--   dress_code  → Code vestimentaire (palette + photos d'inspiration)
--   snapchat    → Filtre Snapchat (lien → QR code + bouton)
--
-- Aucune autre modification de structure : le lien personnel utilise la
-- colonne existante guests.qr_token, le nombre de places guests.plus_ones,
-- la table via table_assignments/tables_plan, et les réglages d'enveloppe /
-- message d'invitation sont rangés dans weddings.theme (jsonb).
-- =====================================================================

alter table public.sections drop constraint if exists sections_type_check;

alter table public.sections
  add constraint sections_type_check
  check (type in ('cover','location','countdown','save_the_date','program',
                  'image_video','mixed','rsvp','gallery',
                  'tables','testimonials',
                  'story','quote','info','thanks','dress_code','snapchat',
                  -- gifts / closing (migration 20) : déjà inclus pour que cette
                  -- migration puisse être rejouée sur une base qui en contient.
                  'gifts','closing'));

-- (L'ouverture d'un lien personnel /w/slug?i=<qr_token> s'appuie sur l'index
-- unique existant guests_qr_token_key : aucun index à ajouter.)
