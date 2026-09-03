-- =====================================================================
-- EventCenter — Rattachement d'un client (marié) à SON mariage par slug.
-- À exécuter dans le SQL Editor du Dashboard Supabase (après 04).
--
-- Flow : le super-admin crée le mariage (il obtient un slug).
--        Le client s'inscrit (email/mdp), puis saisit ce slug depuis /app
--        → il devient owner_user_id du mariage (accès à son espace).
-- Le mariage ne peut être rattaché qu'une fois (owner_user_id déjà pris => refus).
-- =====================================================================

-- Petit helper : le mariage est déjà "rattachable" (libre).
create or replace function public.claim_wedding(p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_owner  uuid;
  v_me     uuid := public.current_user_id();
begin
  if v_me is null then
    raise exception 'not_authenticated';
  end if;

  select id, owner_user_id into v_id, v_owner
  from public.weddings
  where slug = p_slug;

  if v_id is null then
    raise exception 'not_found';
  end if;

  if v_owner is not null and v_owner <> v_me then
    raise exception 'already_owned';
  end if;

  update public.weddings
  set owner_user_id = v_me
  where id = v_id;

  return v_id;
end;
$$;

revoke all on function public.claim_wedding(text) from public;
grant execute on function public.claim_wedding(text) to authenticated;

-- Le client peut lire le(s) mariage(s) qu'il possède (une fois rattaché),
-- via la policy weddings_owner_all créée en 04 (is_owner_of). Rien d'autre nécessaire.