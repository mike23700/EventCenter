-- 1) Musique d'ambiance : chemin du fichier audio (bucket "media"), optionnel.
alter table public.weddings add column if not exists audio_url text;

-- 2) Expiration automatique du lien public : si `access_end` n'est pas
-- renseigné manuellement, le site public se désactive tout seul 14 jours
-- après la date du dernier évènement du programme (wedding_events.date).
-- `access_end` reste prioritaire quand il est défini (override manuel admin).
-- Centralisé dans le helper `wedding_is_accessible`, déjà utilisé par toutes
-- les policies RLS publiques (events, sections, media, testimonials, rsvp…),
-- donc un seul endroit à modifier pour que tout le site se ferme ensemble.
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
      )
  )
$$;

-- La policy de lecture publique de `weddings` dupliquait la même logique en
-- ligne : on la fait pointer vers le helper pour ne plus avoir à la
-- maintenir à deux endroits.
drop policy if exists "weddings_public_read" on public.weddings;
create policy "weddings_public_read" on public.weddings
  for select to anon
  using (public.wedding_is_accessible(id));
