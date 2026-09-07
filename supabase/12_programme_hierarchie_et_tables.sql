-- =====================================================================
-- Phase 6 : sous-parties de programme (hiérarchie) + description.
-- Les tables de placement (tables_plan / table_assignments) existent déjà
-- depuis 00_setup_complet.sql et ne nécessitent pas de changement de
-- schéma : elles deviennent un onglet dédié côté client au lieu d'une
-- section du site public (changement purement applicatif).
-- =====================================================================

begin;

alter table public.wedding_events
  add column if not exists parent_id uuid references public.wedding_events(id) on delete cascade;

alter table public.wedding_events
  add column if not exists description text;

create index if not exists wedding_events_parent_idx
  on public.wedding_events (parent_id);

commit;
