-- =====================================================================
-- Migration 20 — Modèles, réservation par catégorie, nouvelles sections
-- (novembre 2026). À exécuter UNE FOIS après les migrations 18 et 19.
-- Idempotente : peut être relancée sans risque.
--
--  - sections : nouveaux types « gifts » (espace cadeaux) et « closing »
--    (clôture : photo + mot des familles) ;
--  - guests.category : catégorie choisie à la réservation (Famille, Amis,
--    Collègues… définies dans la section RSVP), pour la jauge de places.
-- Les réglages des modèles (page de garde, animations, fonds de bloc,
-- cadres photo…) sont rangés dans weddings.theme / sections.content (jsonb) :
-- aucune autre modification de structure.
-- =====================================================================

alter table public.sections drop constraint if exists sections_type_check;

alter table public.sections
  add constraint sections_type_check
  check (type in ('cover','location','countdown','save_the_date','program',
                  'image_video','mixed','rsvp','gallery',
                  'tables','testimonials',
                  'story','quote','info','thanks','dress_code','snapchat',
                  'gifts','closing'));

alter table public.guests add column if not exists category text;

create index if not exists guests_wedding_category_idx on public.guests (wedding_id, category);
