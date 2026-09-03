-- =====================================================================
-- EventCenter — Schéma de référence (restauré après suppression)
-- À exécuter dans le SQL Editor du Dashboard Supabase.
-- Projet : fkbwkvciilvcyrzpmvip (eu-central-1)
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Extension (crypt / gen_random_uuid)
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Helper de rôle admin
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Helper de fraîcheur updated_at
-- ---------------------------------------------------------------------
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
-- Helper accessibilité d'un mariage (actif + période d'accès)
-- ---------------------------------------------------------------------
create or replace function public.wedding_is_accessible(tid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.weddings w
    where w.id = tid
      and w.is_active = true
      and (w.access_start is null or w.access_start <= now())
      and (w.access_end   is null or w.access_end   >= now())
  )
$$;

-- ---------------------------------------------------------------------
-- Table weddings
-- ---------------------------------------------------------------------
create table if not exists public.weddings (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  secondary_name text,
  event_type    text,
  template      text not null default 'classic',
  theme         jsonb not null default '{}'::jsonb,
  logo          text,
  cover_image   text,
  contact_phone text,
  access_start  timestamptz,
  access_end    timestamptz,
  is_active     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_weddings_updated on public.weddings;
create trigger trg_weddings_updated
  before update on public.weddings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Table wedding_events (sous-évènements : dot, mairie, église, soirée)
-- ---------------------------------------------------------------------
create table if not exists public.wedding_events (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid not null references public.weddings(id) on delete cascade,
  name            text not null,
  date            timestamptz,
  location_title  text,
  location_address text,
  location_image  text,
  location_maps_url text,
  position        integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists wedding_events_wedding_idx
  on public.wedding_events (wedding_id);

-- ---------------------------------------------------------------------
-- Table sections (modules affichables du site)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Table guests
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Table attendance (présence par sous-évènement)
-- ---------------------------------------------------------------------
create table if not exists public.attendance (
  id              uuid primary key default gen_random_uuid(),
  guest_id        uuid not null references public.guests(id) on delete cascade,
  event_id        uuid not null references public.wedding_events(id) on delete cascade,
  status          text not null default 'pending'
                  check (status in ('pending','present','absent')),
  actual_plus_ones integer not null default 0,
  updated_at      timestamptz not null default now(),
  unique (guest_id, event_id)
);

-- ---------------------------------------------------------------------
-- Table guest_responses (réponses au questionnaire)
-- ---------------------------------------------------------------------
create table if not exists public.guest_responses (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid not null references public.guests(id) on delete cascade,
  question_key text not null,
  answer       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (guest_id, question_key)
);

-- ---------------------------------------------------------------------
-- Table tables_plan
-- ---------------------------------------------------------------------
create table if not exists public.tables_plan (
  id         uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  event_id   uuid references public.wedding_events(id) on delete cascade, -- null = commune
  name       text not null,
  capacity   integer,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Table table_assignments
-- ---------------------------------------------------------------------
create table if not exists public.table_assignments (
  id         uuid primary key default gen_random_uuid(),
  table_id   uuid not null references public.tables_plan(id) on delete cascade,
  guest_id   uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (table_id, guest_id)
);

-- ---------------------------------------------------------------------
-- Table media (galerie)
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Table testimonials
-- ---------------------------------------------------------------------
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

commit;