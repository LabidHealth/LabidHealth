-- Server-authoritative updated_at.
-- The device clock cannot be trusted (lab PCs frequently have dead CMOS
-- batteries and drift by years). Last-write-wins must resolve on server time,
-- so stamp updated_at here and ignore whatever the client sent.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before insert or update on public.labs      for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.lab_staff for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.patients  for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.price_list for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.samples   for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.results   for each row execute function public.set_updated_at();
create trigger set_updated_at before insert or update on public.invoices  for each row execute function public.set_updated_at();

-- Approved results are clinically signed-out documents.
-- A device that was offline while a result got approved elsewhere could still
-- hold a stale draft in its outbox; without this guard that draft would
-- silently overwrite the signed result on sync. Raising here parks the op as
-- "stuck" in Sync Health so a human adjudicates it, rather than losing either
-- version. approved -> amended is the legitimate correction path.
create or replace function public.guard_approved_results()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'approved' and new.status in ('draft','awaiting_approval') then
    raise exception 'Result % is already approved and cannot be overwritten by a % version', old.id, new.status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger guard_approved_results
  before update on public.results
  for each row execute function public.guard_approved_results();
