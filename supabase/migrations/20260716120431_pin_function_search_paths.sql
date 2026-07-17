-- Pin search_path so these cannot be hijacked by a caller-controlled path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_approved_results()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  if old.status = 'approved' and new.status in ('draft','awaiting_approval') then
    raise exception 'Result % is already approved and cannot be overwritten by a % version', old.id, new.status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
