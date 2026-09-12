-- Contrainte : un invité ne peut être assis qu'à une table rattachée à une
-- partie du programme (ou "Général") à laquelle il est convié. Jusqu'à
-- présent, cette règle n'était appliquée que côté interface (liste
-- déroulante filtrée) — ce trigger l'impose aussi au niveau base de
-- données, quel que soit le point d'entrée (admin, client, API directe).

create or replace function public.check_table_assignment_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_invited  uuid[];
begin
  select event_id into v_event_id from public.tables_plan where id = new.table_id;

  -- Table "Générale" (event_id null) : ouverte à tous les invités du mariage.
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
  for each row execute function public.check_table_assignment_event();
