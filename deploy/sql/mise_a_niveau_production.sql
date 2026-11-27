-- =====================================================================
-- EVENTS ETAN — Mise à niveau de la base EN LIGNE (events.etan237.com)
-- vers la structure actuelle (local), en UN SEUL fichier.
--
-- Regroupe les migrations 18, 19, 20 et 21, jamais passées en ligne
-- (vérifié sur le dump event_center_actuel.sql du 25/11/2026 : guests n'a
-- ni « category » ni « short_code », wedding_events n'a pas « time_label »,
-- la table share_links n'existe pas).
--
-- Compatible PostgreSQL 9.6 (version de l'hébergement).
-- Idempotent : peut être relancé sans risque.
-- Transactionnel : soit tout passe, soit rien n'est modifié.
-- Aucune donnée existante n'est modifiée ni supprimée (sauf les sessions
-- de connexion déjà expirées).
--
-- AVANT : sauvegarder la base (pg_dump, ou phpPgAdmin → Exporter).
-- Exécution :
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f mise_a_niveau_production.sql
-- ou phpPgAdmin (connecté avec le compte cPanel = propriétaire des tables)
--   → base sc2biro3703_eventcenter → SQL : coller tout le fichier, Exécuter.
--
-- APRÈS : redémarrer l'application (cPanel → Setup Node.js App → Restart).
-- Au démarrage, l'API attribue un code court (lien /i/<code>) à chaque
-- invité existant (générateur aléatoire sûr côté Node : rien à faire ici).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Types de section autorisés (migrations 18 et 20)
--    story, quote, info, thanks, dress_code, snapchat, gifts, closing
-- ---------------------------------------------------------------------
alter table public.sections drop constraint if exists sections_type_check;

alter table public.sections
  add constraint sections_type_check
  check (type in ('cover','location','countdown','save_the_date','program',
                  'image_video','mixed','rsvp','gallery',
                  'tables','testimonials',
                  'story','quote','info','thanks','dress_code','snapchat',
                  'gifts','closing'));

-- ---------------------------------------------------------------------
-- 2. Nouvelles colonnes (facultatives, vides pour les lignes existantes)
-- ---------------------------------------------------------------------
-- Catégorie choisie à la réservation (Famille, Amis…) — migration 20
alter table public.guests add column if not exists category text;

-- Code du lien court personnel /i/<code> — migration 21
alter table public.guests add column if not exists short_code text;

-- Horaire en texte libre (« À la suite de la cérémonie ») — migration 21
alter table public.wedding_events add column if not exists time_label text;

-- ---------------------------------------------------------------------
-- 3. Nouvelle table : liens de partage « par étape » — migration 21
-- ---------------------------------------------------------------------
create table if not exists public.share_links (
  id         uuid primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  code       text not null,
  label      text not null default '',
  event_ids  uuid[] not null default '{}'::uuid[],
  message    text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Index (migrations 19, 20 et 21)
-- ---------------------------------------------------------------------
create index if not exists table_assignments_guest_idx     on public.table_assignments (guest_id);
create index if not exists tables_plan_wedding_idx         on public.tables_plan (wedding_id);
create index if not exists guest_responses_guest_idx       on public.guest_responses (guest_id);
create index if not exists media_wedding_status_idx        on public.media (wedding_id, status);
create index if not exists testimonials_wedding_status_idx on public.testimonials (wedding_id, status);
create index if not exists sessions_expires_idx            on public.sessions (expires_at);
create index if not exists guests_wedding_phone_idx        on public.guests (wedding_id, phone);
create index if not exists guests_wedding_category_idx     on public.guests (wedding_id, category);
create unique index if not exists guests_short_code_key    on public.guests (short_code);
create unique index if not exists share_links_code_key     on public.share_links (code);
create index if not exists share_links_wedding_idx         on public.share_links (wedding_id);

-- Index en double laissé par une version de travail de la migration 18.
drop index if exists public.guests_qr_token_idx;

-- ---------------------------------------------------------------------
-- 5. Ménage : sessions de connexion expirées (migration 19)
-- ---------------------------------------------------------------------
delete from public.sessions where expires_at < now();

-- ---------------------------------------------------------------------
-- 6. Droits de l'application (utilisateur sc2biro3703_eventcenter_app)
--    Ce fichier est exécuté par le PROPRIÉTAIRE des tables (compte cPanel,
--    via phpPgAdmin) : la nouvelle table lui appartient, l'application doit
--    pouvoir la lire et l'écrire. Les futures tables aussi (droits par défaut).
-- ---------------------------------------------------------------------
grant select, insert, update, delete on public.share_links to sc2biro3703_eventcenter_app;
alter default privileges in schema public
  grant select, insert, update, delete on tables to sc2biro3703_eventcenter_app;

-- ---------------------------------------------------------------------
-- 7. Suivi des migrations (comme « npm run migrate ») : 18 à 21 sont
--    notées comme appliquées, avec l'empreinte de leur fichier, pour ne
--    jamais être rejouées.
-- ---------------------------------------------------------------------
create table if not exists public.schema_migrations (
  name       text primary key,
  checksum   text not null,
  applied_at timestamptz not null default now()
);
insert into public.schema_migrations (name, checksum)
select v.name, v.checksum
  from (values
    ('18_invitation_personnalisee.sql', 'ea820afeb73bfb06a476f5c13750bdcaa14f3ae4b4c55208755c87e085c7ed09'),
    ('19_securite_performances.sql',    'c0cdc07cc8e6623c236285bfd58a77beab0fc4002b20fcc65544297a23a22d9b'),
    ('20_modeles_reservation.sql',      'a80c43ba07beb8cb58cf2ad507c2b72893591866873cc271c24e9d44e7f644e9'),
    ('21_liens_partage.sql',            '8f14a4fd213cbc95dec3fe8b217b0413f221f7a40a1b31fe6d939c268de11abf')
  ) as v(name, checksum)
 where not exists (select 1 from public.schema_migrations m where m.name = v.name);
grant select on public.schema_migrations to sc2biro3703_eventcenter_app;

commit;

-- ---------------------------------------------------------------------
-- Vérification (facultatif) : doit afficher 4 lignes.
--   select table_name, column_name from information_schema.columns
--    where table_schema = 'public'
--      and (table_name, column_name) in (('guests','category'), ('guests','short_code'),
--                                        ('wedding_events','time_label'), ('share_links','code'));
-- ---------------------------------------------------------------------
