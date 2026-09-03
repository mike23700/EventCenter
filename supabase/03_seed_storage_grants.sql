-- =====================================================================
-- EventCenter — Compte admin, storage & grants (restauré)
-- NB : le super-admin est déjà créé manuellement (admin@eventcenter.com).
-- Ce script garantit buckets + grants ; le rôle super_admin du user
-- existant doit être géré via le dashboard ou la requête en bas.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Storage : buckets publics
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('media',  'media',  true),
  ('covers', 'covers', true),
  ('logos',  'logos',  true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

commit;

-- ---------------------------------------------------------------------
-- (Optionnel) Assurer le rôle super_admin sur un compte existant.
-- Remplacez l'email par le vôtre puis exécutez dans le SQL Editor.
-- ---------------------------------------------------------------------
-- update auth.users
-- set raw_app_meta_data = jsonb_set(
--   coalesce(raw_app_meta_data, '{}'::jsonb),
--   '{role}', '"super_admin"'
-- )
-- where email = 'admin@eventcenter.com';