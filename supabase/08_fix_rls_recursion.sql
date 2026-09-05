-- ============================================================================
-- FIX — RLS « stack depth limit exceeded » (récursion infinie)
-- Projet : hrcpdqmxragasfmuswuu
--
-- POURQUOI cette erreur :
--   public.is_owner_of() et public.wedding_is_accessible() sont des fonctions
--   `security invoker` (défaut) qui lisent la table public.weddings, protégée
--   par RLS. Or la politique "weddings_owner_all" appelle justement is_owner_of().
--   Résultat : SELECT * FROM weddings → politique → is_owner_of() → SELECT weddings
--   → politique → is_owner_of() → ... → « stack depth limit exceeded ».
--
-- CORRECTIF : passer ces deux helpers en `security definer` (comme is_super_admin()).
--   Elles s'exécutent alors avec les droits du créateur (qui outrepasse le RLS)
--   pour leur lecture interne, cassant la boucle. On restreint l'exécution aux
--   rôles anon/authenticated (nécessaire, wedding_is_accessible sert aussi aux
--   lectures publiques).
--
-- À exécuter en UNE FOIS dans le SQL Editor du Dashboard Supabase.
-- ============================================================================

-- ---- 1) is_owner_of : security definer + search_path ----------------------
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

-- ---- 2) wedding_is_accessible : security definer + search_path ------------
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

-- ---- 3) Droits d'exécution ------------------------------------------------
revoke all on function public.is_owner_of(uuid) from public;
grant execute on function public.is_owner_of(uuid) to anon, authenticated;

revoke all on function public.wedding_is_accessible(uuid) from public;
grant execute on function public.wedding_is_accessible(uuid) to anon, authenticated;

-- ---- 4) Vérification ------------------------------------------------------
-- Doit renvoyer : true / true / true
select public.is_super_admin(), public.current_user_id() is not null, true;

-- Après application, rechargez /app : le tableau de bord client s'affiche.
-- (Rappel : pour l'instant aucune ligne dans weddings, donc « Aucun mariage ».
--  Une fois le mariage camille-olive créé par l'admin, il apparaîtra ici.)