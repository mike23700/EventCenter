-- =====================================================================
-- EventCenter — Row Level Security (restauré)
-- À exécuter dans le SQL Editor après le schéma.
-- =====================================================================

begin;

alter table public.weddings          enable row level security;
alter table public.wedding_events    enable row level security;
alter table public.sections          enable row level security;
alter table public.guests            enable row level security;
alter table public.attendance        enable row level security;
alter table public.guest_responses   enable row level security;
alter table public.tables_plan       enable row level security;
alter table public.table_assignments enable row level security;
alter table public.media             enable row level security;
alter table public.testimonials      enable row level security;

-- ---------------------------- weddings ------------------------------
drop policy if exists "weddings_admin_all" on public.weddings;
create policy "weddings_admin_all" on public.weddings
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "weddings_public_read" on public.weddings;
create policy "weddings_public_read" on public.weddings
  for select to anon, authenticated
  using (
    is_active = true
    and (access_start is null or access_start <= now())
    and (access_end   is null or access_end   >= now())
  );

-- -------------------------- wedding_events --------------------------
drop policy if exists "events_admin_all" on public.wedding_events;
create policy "events_admin_all" on public.wedding_events
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "events_public_read" on public.wedding_events;
create policy "events_public_read" on public.wedding_events
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id));

-- ------------------------------ sections ----------------------------
drop policy if exists "sections_admin_all" on public.sections;
create policy "sections_admin_all" on public.sections
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "sections_public_read" on public.sections;
create policy "sections_public_read" on public.sections
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id) and enabled = true);

-- ------------------------------- guests -----------------------------
drop policy if exists "guests_admin_all" on public.guests;
create policy "guests_admin_all" on public.guests
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "guests_public_read" on public.guests;
create policy "guests_public_read" on public.guests
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id));

-- ----------------------------- attendance ---------------------------
drop policy if exists "attendance_admin_all" on public.attendance;
create policy "attendance_admin_all" on public.attendance
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "attendance_public_insert" on public.attendance;
create policy "attendance_public_insert" on public.attendance
  for insert to anon, authenticated
  with check (public.wedding_is_accessible(
    (select wedding_id from public.guests where id = guest_id)));

-- --------------------------- guest_responses ------------------------
drop policy if exists "guest_responses_admin_all" on public.guest_responses;
create policy "guest_responses_admin_all" on public.guest_responses
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "guest_responses_public_insert" on public.guest_responses;
create policy "guest_responses_public_insert" on public.guest_responses
  for insert to anon, authenticated
  with check (public.wedding_is_accessible(
    (select wedding_id from public.guests where id = guest_id)));

-- ----------------------------- tables_plan --------------------------
drop policy if exists "tables_admin_all" on public.tables_plan;
create policy "tables_admin_all" on public.tables_plan
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "tables_public_read" on public.tables_plan;
create policy "tables_public_read" on public.tables_plan
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id));

-- -------------------------- table_assignments -----------------------
drop policy if exists "assignments_admin_all" on public.table_assignments;
create policy "assignments_admin_all" on public.table_assignments
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "assignments_public_read" on public.table_assignments;
create policy "assignments_public_read" on public.table_assignments
  for select to anon, authenticated
  using (public.wedding_is_accessible(
    (select wedding_id from public.tables_plan where id = table_id)));

-- ------------------------------- media ------------------------------
drop policy if exists "media_admin_all" on public.media;
create policy "media_admin_all" on public.media
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "media_public_read" on public.media;
create policy "media_public_read" on public.media
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id) and status = 'published');

drop policy if exists "media_public_insert" on public.media;
create policy "media_public_insert" on public.media
  for insert to anon, authenticated
  with check (public.wedding_is_accessible(wedding_id));

-- ---------------------------- testimonials --------------------------
drop policy if exists "testimonials_admin_all" on public.testimonials;
create policy "testimonials_admin_all" on public.testimonials
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "testimonials_public_read" on public.testimonials;
create policy "testimonials_public_read" on public.testimonials
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id) and status = 'published');

drop policy if exists "testimonials_public_insert" on public.testimonials;
create policy "testimonials_public_insert" on public.testimonials
  for insert to anon, authenticated
  with check (public.wedding_is_accessible(wedding_id));

commit;