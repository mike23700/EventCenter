-- Migration Phase 5 : RSVP public des invités.
--
-- Les invités sont saisis par le client (panel -> invités -> ajout). Sur le
-- site public, le formulaire RSVP retrouve l'invité par son nom/prénom parmi
-- les invités du mariage, puis enregistre sa présence pour chaque
-- sous-évènement (dot, mairie, église, soirée…).
--
-- Nécessite que storage policies (10_storage_policies.sql) soient appliquées
-- pour permettre l'upload des médias (couverture, galerie…).

-- Permettre à un invité anonyme de CORRIGER sa réponse de présence
-- (sans quoi il ne peut que la saisir une première fois).
drop policy if exists "attendance_public_update" on public.attendance;
create policy "attendance_public_update" on public.attendance
  for update to anon, authenticated
  using (
    public.wedding_is_accessible(
      (select wedding_id from public.guests where id = guest_id)
    )
  )
  with check (
    public.wedding_is_accessible(
      (select wedding_id from public.guests where id = guest_id)
    )
  );

-- Permettre à un invité anonyme de s'identifier simplement (lecture des
-- invités du mariage pour retrouver son nom) — déjà permis par
-- guests_public_read ; on garde la table lisible tant que le mariage est
-- accessible.