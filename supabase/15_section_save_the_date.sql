-- Ajoute le type de section "save_the_date" (calendrier + cœur sur le jour J).
alter table public.sections drop constraint if exists sections_type_check;
alter table public.sections add constraint sections_type_check
  check (type in ('cover','location','countdown','save_the_date','program',
                  'image_video','mixed','rsvp','gallery',
                  'tables','testimonials'));
