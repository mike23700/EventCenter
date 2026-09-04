-- =====================================================================
-- EventCenter — Restreindre l'accès public aux seuls invités (anon).
-- À exécuter dans le SQL Editor (après 04 et 05).
--
-- Le site public /w/:slug est visité en anon (invités non connectés).
-- Avec la policy weddings_public_read couvrant "anon, authenticated",
-- un client connecté pouvait lire TOUS les mariages actifs depuis /app.
-- On la restreint à anon : les mariés enregistrés ne voient que leurs
-- propres mariages via weddings_owner_all.
-- =====================================================================

drop policy if exists "weddings_public_read" on public.weddings;
create policy "weddings_public_read" on public.weddings
  for select to anon
  using (
    is_active = true
    and (access_start is null or access_start <= now())
    and (access_end   is null or access_end   >= now())
  );