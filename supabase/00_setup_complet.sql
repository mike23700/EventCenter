-- =====================================================================
-- EventCenter — SETUP COMPLET (schéma + RLS + sécurité + comptes)
-- À coller en UNE fois dans le SQL Editor du Dashboard Supabase.
-- Projet : hrcpdqmxragasfmuswuu
--
-- NOUVEAU WORKFLOW :
--   • UN SEUL formulaire de connexion (/login).
--   • admin@event.om / 12345678  → accès au panel super-admin.
--   • Les comptes clients sont créés UNIQUEMENT par le super-admin
--     (fonction admin_create_client_user + lien owner_user_id).
--   • Le client ne s'inscrit pas et ne saisit aucun code/slug :
--     il se connecte avec l'email + mot de passe fournis par l'admin.
--   • Plus aucune réclamation par slug (claim_wedding supprimé).
--     Le slug ne sert plus qu'à construire l'URL publique /w/{slug}.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. EXTENSION & HELPERS
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;

-- Helper : l'utilisateur courant est-il super-admin ?
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'),
    '') = 'super_admin'
$$;

-- Helper : id de l'utilisateur courant (claim JWT "sub")
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

-- Trigger : mise à jour de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. SCHÉMA DE DONNÉES
-- ---------------------------------------------------------------------
create table if not exists public.weddings (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  secondary_name text,
  owner_user_id  uuid references auth.users(id) on delete set null,
  client_email   text,
  event_type     text,
  template       text not null default 'florale',
  theme          jsonb not null default '{}'::jsonb,
  logo           text,
  cover_image    text,
  contact_phone  text,
  access_start   timestamptz,
  access_end     timestamptz,
  is_active      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists weddings_owner_idx on public.weddings (owner_user_id);

-- Idempotent : permet de rejouer le script sur une base déjà créée.
alter table public.weddings add column if not exists client_email text;

drop trigger if exists trg_weddings_updated on public.weddings;
create trigger trg_weddings_updated
  before update on public.weddings
  for each row execute function public.set_updated_at();

create table if not exists public.wedding_events (
  id               uuid primary key default gen_random_uuid(),
  wedding_id       uuid not null references public.weddings(id) on delete cascade,
  name             text not null,
  date             timestamptz,
  location_title   text,
  location_address text,
  location_image   text,
  location_maps_url text,
  position         integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists wedding_events_wedding_idx
  on public.wedding_events (wedding_id);

create table if not exists public.sections (
  id         uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  type       text not null
             check (type in ('cover','location','countdown','program',
                             'image_video','mixed','rsvp','gallery',
                             'tables','testimonials')),
  enabled    boolean not null default true,
  position   integer not null default 0,
  title      text,
  content    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sections_wedding_idx on public.sections (wedding_id);

create table if not exists public.guests (
  id             uuid primary key default gen_random_uuid(),
  wedding_id     uuid not null references public.weddings(id) on delete cascade,
  name           text not null,
  phone          text,
  plus_ones      integer not null default 0,
  invited_events uuid[] not null default '{}'::uuid[],
  response       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists guests_wedding_idx on public.guests (wedding_id);

create table if not exists public.attendance (
  id               uuid primary key default gen_random_uuid(),
  guest_id         uuid not null references public.guests(id) on delete cascade,
  event_id         uuid not null references public.wedding_events(id) on delete cascade,
  status           text not null default 'pending'
                   check (status in ('pending','present','absent')),
  actual_plus_ones integer not null default 0,
  updated_at       timestamptz not null default now(),
  unique (guest_id, event_id)
);

create table if not exists public.guest_responses (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid not null references public.guests(id) on delete cascade,
  question_key text not null,
  answer       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (guest_id, question_key)
);

create table if not exists public.tables_plan (
  id         uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  event_id   uuid references public.wedding_events(id) on delete cascade,
  name       text not null,
  capacity   integer,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.table_assignments (
  id         uuid primary key default gen_random_uuid(),
  table_id   uuid not null references public.tables_plan(id) on delete cascade,
  guest_id   uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (table_id, guest_id)
);

create table if not exists public.media (
  id           uuid primary key default gen_random_uuid(),
  wedding_id   uuid not null references public.weddings(id) on delete cascade,
  type         text not null default 'image' check (type in ('image','video')),
  storage_path text,
  url          text,
  uploaded_by  text not null default 'invite',
  status       text not null default 'pending'
               check (status in ('pending','published','rejected')),
  created_at   timestamptz not null default now()
);

create table if not exists public.testimonials (
  id         uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id   uuid references public.guests(id) on delete set null,
  author     text,
  content    text not null,
  status     text not null default 'pending'
             check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. HELPERS DÉPENDANTS DU SCHÉMA (après création des tables)
-- ---------------------------------------------------------------------

-- Helper : l'utilisateur courant est-il owner (marié) de ce mariage ?
-- `security definer` est indispensable : cette fonction lit public.weddings
-- dans une politique RLS (weddings_owner_all). Sans cela elle se re-déclenche
-- elle-même → « stack depth limit exceeded ».
create or replace function public.is_owner_of(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.weddings w
    where w.id = tid and w.owner_user_id = public.current_user_id()
  )
$$;

-- Helper : le mariage est-il actif + dans sa période d'accès ?
-- `security definer` : évite la récursion RLS quand appelé depuis une politique.
create or replace function public.wedding_is_accessible(tid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.weddings w
    where w.id = tid
      and w.is_active = true
      and (w.access_start is null or w.access_start <= now())
      and (w.access_end   is null or w.access_end   >= now())
  )
$$;

-- Droits d'exécution des helpers RLS (utiles pour anon / authenticated)
revoke all on function public.is_owner_of(uuid) from public;
grant execute on function public.is_owner_of(uuid) to anon, authenticated;

revoke all on function public.wedding_is_accessible(uuid) from public;
grant execute on function public.wedding_is_accessible(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
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

-- weddings : admin tout, owner tout, public (anon) interne
drop policy if exists "weddings_admin_all" on public.weddings;
create policy "weddings_admin_all" on public.weddings
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "weddings_owner_all" on public.weddings;
create policy "weddings_owner_all" on public.weddings
  for all to authenticated
  using (public.is_owner_of(id))
  with check (public.is_owner_of(id));

drop policy if exists "weddings_public_read" on public.weddings;
create policy "weddings_public_read" on public.weddings
  for select to anon
  using (
    is_active = true
    and (access_start is null or access_start <= now())
    and (access_end   is null or access_end   >= now())
  );

-- wedding_events
drop policy if exists "events_admin_all" on public.wedding_events;
create policy "events_admin_all" on public.wedding_events
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "events_owner_all" on public.wedding_events;
create policy "events_owner_all" on public.wedding_events
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

drop policy if exists "events_public_read" on public.wedding_events;
create policy "events_public_read" on public.wedding_events
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id));

-- sections
drop policy if exists "sections_admin_all" on public.sections;
create policy "sections_admin_all" on public.sections
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "sections_owner_all" on public.sections;
create policy "sections_owner_all" on public.sections
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

drop policy if exists "sections_public_read" on public.sections;
create policy "sections_public_read" on public.sections
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id) and enabled = true);

-- guests
drop policy if exists "guests_admin_all" on public.guests;
create policy "guests_admin_all" on public.guests
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "guests_owner_all" on public.guests;
create policy "guests_owner_all" on public.guests
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

drop policy if exists "guests_public_read" on public.guests;
create policy "guests_public_read" on public.guests
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id));

-- attendance
drop policy if exists "attendance_admin_all" on public.attendance;
create policy "attendance_admin_all" on public.attendance
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "attendance_owner_all" on public.attendance;
create policy "attendance_owner_all" on public.attendance
  for all to authenticated
  using (
    public.is_owner_of((select wedding_id from public.guests where id = guest_id))
  )
  with check (
    public.is_owner_of((select wedding_id from public.guests where id = guest_id))
  );

drop policy if exists "attendance_public_insert" on public.attendance;
create policy "attendance_public_insert" on public.attendance
  for insert to anon, authenticated
  with check (public.wedding_is_accessible(
    (select wedding_id from public.guests where id = guest_id)));

-- guest_responses
drop policy if exists "guest_responses_admin_all" on public.guest_responses;
create policy "guest_responses_admin_all" on public.guest_responses
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "guest_responses_owner_all" on public.guest_responses;
create policy "guest_responses_owner_all" on public.guest_responses
  for all to authenticated
  using (
    public.is_owner_of((select wedding_id from public.guests where id = guest_id))
  )
  with check (
    public.is_owner_of((select wedding_id from public.guests where id = guest_id))
  );

drop policy if exists "guest_responses_public_insert" on public.guest_responses;
create policy "guest_responses_public_insert" on public.guest_responses
  for insert to anon, authenticated
  with check (public.wedding_is_accessible(
    (select wedding_id from public.guests where id = guest_id)));

-- tables_plan
drop policy if exists "tables_admin_all" on public.tables_plan;
create policy "tables_admin_all" on public.tables_plan
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "tables_owner_all" on public.tables_plan;
create policy "tables_owner_all" on public.tables_plan
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

drop policy if exists "tables_public_read" on public.tables_plan;
create policy "tables_public_read" on public.tables_plan
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id));

-- table_assignments
drop policy if exists "assignments_admin_all" on public.table_assignments;
create policy "assignments_admin_all" on public.table_assignments
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "assignments_owner_all" on public.table_assignments;
create policy "assignments_owner_all" on public.table_assignments
  for all to authenticated
  using (
    public.is_owner_of((select wedding_id from public.tables_plan where id = table_id))
  )
  with check (
    public.is_owner_of((select wedding_id from public.tables_plan where id = table_id))
  );

drop policy if exists "assignments_public_read" on public.table_assignments;
create policy "assignments_public_read" on public.table_assignments
  for select to anon, authenticated
  using (public.wedding_is_accessible(
    (select wedding_id from public.tables_plan where id = table_id)));

-- media
drop policy if exists "media_admin_all" on public.media;
create policy "media_admin_all" on public.media
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "media_owner_all" on public.media;
create policy "media_owner_all" on public.media
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

drop policy if exists "media_public_read" on public.media;
create policy "media_public_read" on public.media
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id) and status = 'published');

drop policy if exists "media_public_insert" on public.media;
create policy "media_public_insert" on public.media
  for insert to anon, authenticated
  with check (public.wedding_is_accessible(wedding_id));

-- testimonials
drop policy if exists "testimonials_admin_all" on public.testimonials;
create policy "testimonials_admin_all" on public.testimonials
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "testimonials_owner_all" on public.testimonials;
create policy "testimonials_owner_all" on public.testimonials
  for all to authenticated
  using (public.is_owner_of(wedding_id))
  with check (public.is_owner_of(wedding_id));

drop policy if exists "testimonials_public_read" on public.testimonials;
create policy "testimonials_public_read" on public.testimonials
  for select to anon, authenticated
  using (public.wedding_is_accessible(wedding_id) and status = 'published');

drop policy if exists "testimonials_public_insert" on public.testimonials;
create policy "testimonials_public_insert" on public.testimonials
  for insert to anon, authenticated
  with check (public.wedding_is_accessible(wedding_id));

-- ---------------------------------------------------------------------
-- 5. STORAGE & GRANTS
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('media',  'media',  true),
  ('covers', 'covers', true),
  ('logos',  'logos',  true)
on conflict (id) do nothing;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. COMPTE SUPER-ADMIN (admin@event.om / 12345678)
-- Si le compte a déjà été créé (console Supabase, dashboard…), on lui
-- ajoute simplement le rôle super_admin dans app_metadata (indispensable
-- pour le panel /admin). Sinon on le crée de toutes pièces.
-- ---------------------------------------------------------------------
do $$
declare
  v_email text := 'admin@event.om';
begin
  if exists (select 1 from auth.users where email = v_email) then
    update auth.users
    set raw_app_meta_data = jsonb_set(
          coalesce(raw_app_meta_data, '{}'::jsonb),
          '{role}', '"super_admin"'
        ),
        email_confirmed_at = coalesce(email_confirmed_at, now())
    where email = v_email;
  else
    insert into auth.users (
      id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    )
    values (
      gen_random_uuid(),
      'authenticated', 'authenticated', v_email,
      crypt('12345678', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"role":"super_admin"}'::jsonb,
      '{"full_name":"Super Admin"}'::jsonb,
      now(), now()
    );
  end if;
end $$;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id, u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
from auth.users u
where u.email = 'admin@event.om'
  and not exists (
    select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
  );

-- ---------------------------------------------------------------------
-- 7. CRÉATION DE COMPTES CLIENTS PAR LE SUPER-ADMIN
--    admin_create_client_user(email, password) → uuid du compte créé.
--    L'email est confirmé d'office : le client se connecte dès que
--    l'admin lui a transféré le mariage (owner_user_id).
-- ---------------------------------------------------------------------
drop function if exists public.admin_create_client_user(text, text);

create or replace function public.admin_create_client_user(
  p_email text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id        uuid;
  v_email     text;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  v_email := lower(trim(p_email));

  if v_email = '' or p_password is null or length(p_password) < 6 then
    raise exception 'invalid_input';
  end if;

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'email_taken';
  end if;

  v_id := gen_random_uuid();

  insert into auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values (
    v_id,
    'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(), now()
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  values (
    v_id, v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    'email', now(), now(), now()
  );

  return v_id;
end;
$$;

revoke all on function public.admin_create_client_user(text, text) from public;
grant execute on function public.admin_create_client_user(text, text) to authenticated;

-- L'ancien flux de réclamation par slug n'existe plus → on le supprime au cas où.
drop function if exists public.claim_wedding(text);

commit;

-- =====================================================================
-- RÉSUMÉ DU NOUVEAU WORKFLOW
-- =====================================================================
-- SUPER-ADMIN (admin@event.om / 12345678) :
--   1. Se connecte via le formulaire unique → redirection /admin.
--   2. Crée le compte client : RPC admin_create_client_user(email, mdp)
--      → récupère l'uuid du compte, puis crée le mariage en renseignant
--      owner_user_id = cet uuid.
--   3. L'admin ne communique au client que son email + mot de passe.
--
-- CLIENT (marié) :
--   1. Se connecte via le MÊME formulaire → redirection /app.
--   2. Ne saisit aucun code/slug : il voit directement le(s) mariage(s)
--      dont il est owner et peut configurer sections / thème / programme.
--   3. Terminé. Le slug ne sert plus qu'à l'URL publique /w/{slug}.
-- =====================================================================