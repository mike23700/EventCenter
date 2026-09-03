-- =====================================================================
-- EventCenter — Panel client : accès mariés à leur mariage
-- À exécuter dans le SQL Editor du Dashboard Supabase.
-- Ajoute un lien auth.users <-> weddings et les policies RLS associées.
-- =====================================================================

begin;

-- 1) Colonne owner (compte 'mariés' autorisé à configurer le mariage)
alter table public.weddings
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

create index if not exists weddings_owner_idx on public.weddings (owner_user_id);

-- 2) Helper : l'utilisateur courant est-il owner du mariage t_id ?
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

create or replace function public.is_owner_of(tid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.weddings w
    where w.id = tid and w.owner_user_id = public.current_user_id()
  )
$$;

-- 3) Policies : l'owner peut lire/écrire son mariage, mais pas en créer.
drop policy if exists "weddings_owner_all" on public.weddings;
create policy "weddings_owner_all" on public.weddings
  for all to authenticated
  using (public.is_owner_of(id))
  with check (
    -- L'owner ne peut pas créer un nouveau mariage, seulement modifier le sien.
    public.is_owner_of(id)
  );

-- 4) L'owner accède aussi aux tables liées (sections, events, etc.).
-- wedding_events
drop policy if exists "events_owner_all" on public.wedding_events;
create policy "events_owner_all" on public.wedding_events
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

-- sections
drop policy if exists "sections_owner_all" on public.sections;
create policy "sections_owner_all" on public.sections
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

-- guests
drop policy if exists "guests_owner_all" on public.guests;
create policy "guests_owner_all" on public.guests
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

-- attendance (via guest)
drop policy if exists "attendance_owner_all" on public.attendance;
create policy "attendance_owner_all" on public.attendance
  for all to authenticated
  using (
    public.is_owner_of((select wedding_id from public.guests where id = guest_id))
  )
  with check (
    public.is_owner_of((select wedding_id from public.guests where id = guest_id))
  );

-- guest_responses (via guest)
drop policy if exists "guest_responses_owner_all" on public.guest_responses;
create policy "guest_responses_owner_all" on public.guest_responses
  for all to authenticated
  using (
    public.is_owner_of((select wedding_id from public.guests where id = guest_id))
  )
  with check (
    public.is_owner_of((select wedding_id from public.guests where id = guest_id))
  );

-- tables_plan
drop policy if exists "tables_owner_all" on public.tables_plan;
create policy "tables_owner_all" on public.tables_plan
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

-- table_assignments (via table)
drop policy if exists "assignments_owner_all" on public.table_assignments;
create policy "assignments_owner_all" on public.table_assignments
  for all to authenticated
  using (
    public.is_owner_of((select wedding_id from public.tables_plan where id = table_id))
  )
  with check (
    public.is_owner_of((select wedding_id from public.tables_plan where id = table_id))
  );

-- media
drop policy if exists "media_owner_all" on public.media;
create policy "media_owner_all" on public.media
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

-- testimonials
drop policy if exists "testimonials_owner_all" on public.testimonials;
create policy "testimonials_owner_all" on public.testimonials
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

commit;