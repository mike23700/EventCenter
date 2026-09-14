-- =====================================================================
-- EventCenter — schéma Postgres (o2switch), sans Supabase.
-- Dérivé de supabase/00_setup_complet.sql + migrations 08→17, en retirant
-- tout ce qui dépendait de Supabase (auth.*, storage.*, RLS, JWT claims).
--
-- Différences volontaires avec le schéma Supabase d'origine :
--  - Les id (uuid) ne sont PAS générés par la base (pas de dépendance à
--    l'extension pgcrypto, potentiellement indisponible en mutualisé) :
--    le serveur Node les génère (crypto.randomUUID()) avant chaque insert.
--  - L'autorisation (RLS) est entièrement portée côté serveur Express
--    (voir server/src/policies.ts) : cette base n'a aucune notion de
--    rôle/JWT, un seul utilisateur applicatif s'y connecte avec accès
--    complet aux tables ci-dessous.
--  - `owner_user_id` / `checked_in_by` référencent désormais `public.users`
--    (compte maison) au lieu de `auth.users` (Supabase).
-- =====================================================================

create table if not exists public.users (
  id            uuid primary key,
  email         text not null unique,
  password_hash text not null,
  role          text not null check (role in ('super_admin', 'client')),
  created_at    timestamptz not null default now()
);

create table if not exists public.sessions (
  token      text primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_idx on public.sessions (user_id);

create table if not exists public.weddings (
  id                 uuid primary key,
  slug               text not null unique,
  name               text not null,
  secondary_name     text,
  event_type         text,
  template           text not null default 'florale',
  theme              jsonb not null default '{}'::jsonb,
  logo               text,
  cover_image        text,
  contact_phone      text,
  access_start       timestamptz,
  access_end         timestamptz,
  is_active          boolean not null default false,
  owner_user_id      uuid references public.users(id) on delete set null,
  client_email       text,
  splash_media_url   text,
  splash_media_type  text check (splash_media_type is null or splash_media_type in ('video', 'gif')),
  audio_url          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists weddings_owner_idx on public.weddings (owner_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_weddings_updated on public.weddings;
create trigger trg_weddings_updated
  before update on public.weddings
  for each row execute procedure public.set_updated_at();

create table if not exists public.wedding_events (
  id                uuid primary key,
  wedding_id        uuid not null references public.weddings(id) on delete cascade,
  parent_id         uuid references public.wedding_events(id) on delete cascade,
  name              text not null,
  description       text,
  date              timestamptz,
  location_title    text,
  location_address  text,
  location_image    text,
  location_maps_url text,
  position          integer not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists wedding_events_wedding_idx on public.wedding_events (wedding_id);
create index if not exists wedding_events_parent_idx on public.wedding_events (parent_id);

-- Reprend exactement la règle publique côté Supabase (voir
-- supabase/17_audio_et_expiration_lien.sql) : mariage actif, dans sa fenêtre
-- d'accès, et — si `access_end` n'est pas fixé manuellement — pas plus de
-- 14 jours après la date du dernier évènement du programme. Utilisée par
-- server/src/policies.ts pour toute lecture/écriture anonyme.
create or replace view public.accessible_weddings as
select w.id
from public.weddings w
where w.is_active = true
  and (w.access_start is null or w.access_start <= now())
  and (
    (w.access_end is not null and w.access_end >= now())
    or (
      w.access_end is null
      and (
        not exists (
          select 1 from public.wedding_events e
          where e.wedding_id = w.id and e.date is not null
        )
        or now() <= (
          select max(e.date) from public.wedding_events e
          where e.wedding_id = w.id
        ) + interval '14 days'
      )
    )
  );

create table if not exists public.sections (
  id         uuid primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  type       text not null
             check (type in ('cover','location','countdown','save_the_date','program',
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
  id             uuid primary key,
  wedding_id     uuid not null references public.weddings(id) on delete cascade,
  name           text not null,
  phone          text,
  plus_ones      integer not null default 0,
  invited_events uuid[] not null default '{}'::uuid[],
  response       jsonb not null default '{}'::jsonb,
  qr_token       uuid not null,
  checked_in_at  timestamptz,
  checked_in_by  uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now()
);

create index if not exists guests_wedding_idx on public.guests (wedding_id);
create unique index if not exists guests_qr_token_key on public.guests (qr_token);

create table if not exists public.attendance (
  id               uuid primary key,
  guest_id         uuid not null references public.guests(id) on delete cascade,
  event_id         uuid not null references public.wedding_events(id) on delete cascade,
  status           text not null default 'pending'
                   check (status in ('pending','present','absent')),
  actual_plus_ones integer not null default 0,
  updated_at       timestamptz not null default now(),
  unique (guest_id, event_id)
);

create table if not exists public.guest_responses (
  id           uuid primary key,
  guest_id     uuid not null references public.guests(id) on delete cascade,
  question_key text not null,
  answer       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (guest_id, question_key)
);

create table if not exists public.tables_plan (
  id         uuid primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  event_id   uuid references public.wedding_events(id) on delete cascade,
  name       text not null,
  capacity   integer,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.table_assignments (
  id         uuid primary key,
  table_id   uuid not null references public.tables_plan(id) on delete cascade,
  guest_id   uuid not null references public.guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (table_id, guest_id)
);

-- Défense en profondeur (en plus de la vérification faite côté serveur
-- Express avant l'insert) : un invité ne peut être assis qu'à une table
-- rattachée à une partie du programme à laquelle il est convié (ou à une
-- table "Générale", event_id null, ouverte à tous).
create or replace function public.check_table_assignment_event()
returns trigger
language plpgsql
as $$
declare
  v_event_id uuid;
  v_invited  uuid[];
begin
  select event_id into v_event_id from public.tables_plan where id = new.table_id;
  if v_event_id is null then
    return new;
  end if;
  select invited_events into v_invited from public.guests where id = new.guest_id;
  if v_invited is null or not (v_event_id = any(v_invited)) then
    raise exception 'Cet invité n''est pas convié à la partie du programme associée à cette table.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_table_assignment_event_check on public.table_assignments;
create trigger trg_table_assignment_event_check
  before insert or update on public.table_assignments
  for each row execute procedure public.check_table_assignment_event();

create table if not exists public.media (
  id           uuid primary key,
  wedding_id   uuid not null references public.weddings(id) on delete cascade,
  type         text not null default 'image' check (type in ('image','video')),
  storage_path text,
  url          text,
  uploaded_by  text not null default 'invite',
  status       text not null default 'pending'
               check (status in ('pending','published','rejected')),
  created_at   timestamptz not null default now()
);

create index if not exists media_wedding_idx on public.media (wedding_id);

create table if not exists public.testimonials (
  id         uuid primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  guest_id   uuid references public.guests(id) on delete set null,
  author     text,
  content    text not null,
  status     text not null default 'pending'
             check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists testimonials_wedding_idx on public.testimonials (wedding_id);
