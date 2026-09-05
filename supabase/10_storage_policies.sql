-- Migration Phase 4 : policies Storage pour l'upload de fichiers.
-- Sans ces policies, toute tentative d'upload (covers, logos, média de la
-- partie mixte / galerie) échoue avec "new row violates row-level security".

-- buckets : media (galerie / contenu), covers (photo de couverture), logos.
insert into storage.buckets (id, name, public)
values
  ('media',  'media',  true),
  ('covers', 'covers', true),
  ('logos',  'logos',  true)
on conflict (id) do nothing;

-- Tout utilisateur authentifié (super-admin, client marié) peut lire,
-- insérer, modifier et supprimer des objets.
create policy "media_authenticated_all" on storage.objects
  for all to authenticated using (bucket_id in ('media', 'covers', 'logos')) with check (bucket_id in ('media', 'covers', 'logos'));

-- Les invités anonymes peuvent lire (public) et déposer des médias dans le
-- bucket media uniquement (upload vers la galerie / témoignages le jour J).
create policy "media_anon_read" on storage.objects
  for select to anon using (bucket_id in ('media', 'covers', 'logos'));

create policy "media_anon_insert" on storage.objects
  for insert to anon with check (bucket_id = 'media');

-- lecture publique des objets (aucune règle particulière) : on s'appuie sur
-- la visibilité des buckets (public = true) pour l'accès de lecture anonyme.