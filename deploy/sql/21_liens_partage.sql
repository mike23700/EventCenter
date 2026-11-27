-- =====================================================================
-- Migration 21 — Liens courts et liens de partage par étape
-- (novembre 2026). À exécuter UNE FOIS après les migrations 18, 19 et 20.
-- Idempotente : peut être relancée sans risque.
--
--  - guests.short_code : code court personnel (8 caractères) du lien
--    /i/<code>, qui remplace le long /w/<slug>?i=<uuid> (toujours valable).
--    Les invités existants reçoivent leur code au démarrage de l'API
--    (générateur aléatoire cryptographique côté Node, pas random() SQL).
--  - share_links : liens de partage « par étape » (ex. Dot + Mairie, sans
--    l'Église). Celui qui ouvre /i/<code> ne voit que ces étapes du
--    programme, et s'il s'inscrit, il n'est convié qu'à celles-ci.
--  - wedding_events.time_label : horaire en texte libre affiché à la place
--    de l'heure (ex. « À la suite de la cérémonie »), facultatif.
-- Les réglages visuels (fond, motifs, styles de texte, décors des coins)
-- sont rangés dans weddings.theme / sections.content (jsonb) : aucune autre
-- modification de structure.
-- =====================================================================

alter table public.guests add column if not exists short_code text;

create unique index if not exists guests_short_code_key on public.guests (short_code);

create table if not exists public.share_links (
  id         uuid primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  code       text not null,
  label      text not null default '',
  event_ids  uuid[] not null default '{}'::uuid[],
  message    text,
  created_at timestamptz not null default now()
);

create unique index if not exists share_links_code_key on public.share_links (code);
create index if not exists share_links_wedding_idx on public.share_links (wedding_id);

alter table public.wedding_events add column if not exists time_label text;
