-- ── Identity helpers ─────────────────────────────────────────────────────────
-- SECURITY DEFINER so that reading lab_staff from inside a lab_staff policy
-- does not recurse. search_path is pinned to defeat search_path hijacking.
create or replace function public.my_lab_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lab_id from public.lab_staff
  where user_id = auth.uid() and is_active
  limit 1
$$;

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.lab_staff
  where user_id = auth.uid() and is_active
  limit 1
$$;

revoke execute on function public.my_lab_id() from public;
revoke execute on function public.my_role() from public;
grant execute on function public.my_lab_id() to authenticated;
grant execute on function public.my_role() to authenticated;

alter table public.labs               enable row level security;
alter table public.lab_staff          enable row level security;
alter table public.patients           enable row level security;
alter table public.patient_visits     enable row level security;
alter table public.price_list         enable row level security;
alter table public.catalog_tests      enable row level security;
alter table public.catalog_parameters enable row level security;
alter table public.samples            enable row level security;
alter table public.sample_events      enable row level security;
alter table public.results            enable row level security;
alter table public.result_amendments  enable row level security;
alter table public.invoices           enable row level security;
alter table public.payments           enable row level security;
alter table public.notifications      enable row level security;
alter table public.audit_log          enable row level security;

-- ── Labs ─────────────────────────────────────────────────────────────────────
-- No insert policy: labs are provisioned by us during onboarding (service role),
-- never self-serve from the client.
create policy labs_select on public.labs for select to authenticated
  using (id = public.my_lab_id());
create policy labs_update on public.labs for update to authenticated
  using (id = public.my_lab_id() and public.my_role() in ('owner','manager'))
  with check (id = public.my_lab_id() and public.my_role() in ('owner','manager'));

-- ── Staff ────────────────────────────────────────────────────────────────────
create policy lab_staff_select on public.lab_staff for select to authenticated
  using (lab_id = public.my_lab_id());
create policy lab_staff_insert on public.lab_staff for insert to authenticated
  with check (lab_id = public.my_lab_id() and public.my_role() in ('owner','manager'));
create policy lab_staff_update on public.lab_staff for update to authenticated
  using (lab_id = public.my_lab_id() and public.my_role() in ('owner','manager'))
  with check (lab_id = public.my_lab_id() and public.my_role() in ('owner','manager'));

-- ── Patients ─────────────────────────────────────────────────────────────────
-- patients has no lab_id (a LABID is permanent and follows the patient across
-- labs), so visibility is scoped through patient_visits: a lab sees only the
-- patients that have actually visited it. Required for NDPA isolation.
create policy patients_select on public.patients for select to authenticated
  using (exists (
    select 1 from public.patient_visits v
    where v.labid = patients.labid and v.lab_id = public.my_lab_id()
  ));
create policy patients_insert on public.patients for insert to authenticated
  with check (public.my_lab_id() is not null);
create policy patients_update on public.patients for update to authenticated
  using (exists (
    select 1 from public.patient_visits v
    where v.labid = patients.labid and v.lab_id = public.my_lab_id()
  ))
  with check (exists (
    select 1 from public.patient_visits v
    where v.labid = patients.labid and v.lab_id = public.my_lab_id()
  ));

create policy patient_visits_select on public.patient_visits for select to authenticated
  using (lab_id = public.my_lab_id());
create policy patient_visits_insert on public.patient_visits for insert to authenticated
  with check (lab_id = public.my_lab_id());

-- ── Pricing & catalog (owner/manager write, everyone reads) ──────────────────
create policy price_list_select on public.price_list for select to authenticated
  using (lab_id = public.my_lab_id());
create policy price_list_write on public.price_list for all to authenticated
  using (lab_id = public.my_lab_id() and public.my_role() in ('owner','manager'))
  with check (lab_id = public.my_lab_id() and public.my_role() in ('owner','manager'));

create policy catalog_tests_select on public.catalog_tests for select to authenticated
  using (lab_id = public.my_lab_id());
create policy catalog_tests_write on public.catalog_tests for all to authenticated
  using (lab_id = public.my_lab_id() and public.my_role() in ('owner','manager'))
  with check (lab_id = public.my_lab_id() and public.my_role() in ('owner','manager'));

create policy catalog_parameters_select on public.catalog_parameters for select to authenticated
  using (exists (
    select 1 from public.catalog_tests t
    where t.id = catalog_parameters.test_id and t.lab_id = public.my_lab_id()
  ));
create policy catalog_parameters_write on public.catalog_parameters for all to authenticated
  using (exists (
    select 1 from public.catalog_tests t
    where t.id = catalog_parameters.test_id and t.lab_id = public.my_lab_id()
  ) and public.my_role() in ('owner','manager'))
  with check (exists (
    select 1 from public.catalog_tests t
    where t.id = catalog_parameters.test_id and t.lab_id = public.my_lab_id()
  ) and public.my_role() in ('owner','manager'));

-- ── Samples ──────────────────────────────────────────────────────────────────
create policy samples_select on public.samples for select to authenticated
  using (lab_id = public.my_lab_id());
create policy samples_insert on public.samples for insert to authenticated
  with check (lab_id = public.my_lab_id());
create policy samples_update on public.samples for update to authenticated
  using (lab_id = public.my_lab_id())
  with check (lab_id = public.my_lab_id());

-- Event log: append-only, no update/delete policy.
create policy sample_events_select on public.sample_events for select to authenticated
  using (exists (
    select 1 from public.samples s
    where s.sample_id = sample_events.sample_id and s.lab_id = public.my_lab_id()
  ));
create policy sample_events_insert on public.sample_events for insert to authenticated
  with check (exists (
    select 1 from public.samples s
    where s.sample_id = sample_events.sample_id and s.lab_id = public.my_lab_id()
  ));

-- ── Results (clinical records: never deletable from the client) ──────────────
create policy results_select on public.results for select to authenticated
  using (lab_id = public.my_lab_id());
create policy results_insert on public.results for insert to authenticated
  with check (lab_id = public.my_lab_id());
create policy results_update on public.results for update to authenticated
  using (lab_id = public.my_lab_id())
  with check (lab_id = public.my_lab_id());

create policy result_amendments_select on public.result_amendments for select to authenticated
  using (exists (
    select 1 from public.results r
    where r.id = result_amendments.result_id and r.lab_id = public.my_lab_id()
  ));
create policy result_amendments_insert on public.result_amendments for insert to authenticated
  with check (exists (
    select 1 from public.results r
    where r.id = result_amendments.result_id and r.lab_id = public.my_lab_id()
  ));

-- ── Billing ──────────────────────────────────────────────────────────────────
create policy invoices_select on public.invoices for select to authenticated
  using (lab_id = public.my_lab_id());
create policy invoices_insert on public.invoices for insert to authenticated
  with check (lab_id = public.my_lab_id());
create policy invoices_update on public.invoices for update to authenticated
  using (lab_id = public.my_lab_id())
  with check (lab_id = public.my_lab_id());

-- Money ledger: append-only at the database level. Front desk records payments
-- (insert), but only owner/manager can void one, and nobody can delete one.
create policy payments_select on public.payments for select to authenticated
  using (lab_id = public.my_lab_id());
create policy payments_insert on public.payments for insert to authenticated
  with check (lab_id = public.my_lab_id());
create policy payments_void on public.payments for update to authenticated
  using (lab_id = public.my_lab_id() and public.my_role() in ('owner','manager'))
  with check (lab_id = public.my_lab_id() and public.my_role() in ('owner','manager'));

-- ── Delivery ─────────────────────────────────────────────────────────────────
create policy notifications_select on public.notifications for select to authenticated
  using (lab_id = public.my_lab_id());
create policy notifications_insert on public.notifications for insert to authenticated
  with check (lab_id = public.my_lab_id());
create policy notifications_update on public.notifications for update to authenticated
  using (lab_id = public.my_lab_id())
  with check (lab_id = public.my_lab_id());

-- ── Audit (append-only; owner/manager read) ──────────────────────────────────
create policy audit_log_select on public.audit_log for select to authenticated
  using (lab_id = public.my_lab_id() and public.my_role() in ('owner','manager'));
create policy audit_log_insert on public.audit_log for insert to authenticated
  with check (lab_id = public.my_lab_id());
