-- Migration Phase 7 : auto-inscription des invités.
--
-- Jusqu'ici, un visiteur du site ne pouvait que SE RETROUVER parmi les
-- invités déjà saisis à la main par les mariés (RSVP + questionnaires de la
-- partie mixte). Or recevoir le lien du site vaut invitation : un visiteur
-- qui ne se trouve pas dans la liste doit pouvoir se déclarer lui-même
-- (nom, téléphone, étape(s) du mariage où il sera présent) — ce qui crée sa
-- fiche `guests` à la volée, comme s'il avait été saisi par les mariés.
--
-- Nécessite 00_setup_complet.sql (tables + wedding_is_accessible).

drop policy if exists "guests_public_self_register" on public.guests;
create policy "guests_public_self_register" on public.guests
  for insert to anon, authenticated
  with check (public.wedding_is_accessible(wedding_id));

-- Lecture publique de `attendance` et `guest_responses` manquante jusqu'ici
-- (seuls insert/update existaient) : un invité qui revient sur le site ne
-- pouvait donc pas voir/corriger ses réponses précédentes, la lecture RLS
-- renvoyant silencieusement 0 ligne.
drop policy if exists "attendance_public_read" on public.attendance;
create policy "attendance_public_read" on public.attendance
  for select to anon, authenticated
  using (
    public.wedding_is_accessible(
      (select wedding_id from public.guests where id = guest_id)
    )
  );

drop policy if exists "guest_responses_public_read" on public.guest_responses;
create policy "guest_responses_public_read" on public.guest_responses
  for select to anon, authenticated
  using (
    public.wedding_is_accessible(
      (select wedding_id from public.guests where id = guest_id)
    )
  );
