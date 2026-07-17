-- This project ships without blanket DML grants, so RLS policies alone are not
-- enough — without these grants every query fails with "permission denied".
-- Grants open the door by role; RLS decides which rows. anon deliberately gets
-- nothing: the anon key ships inside the PWA bundle and must be worthless on its
-- own. Patient-facing result links are served by Edge Functions (service_role).

grant usage on schema public to authenticated, service_role;

grant select, insert, update on
  public.labs, public.lab_staff, public.patients, public.patient_visits,
  public.price_list, public.catalog_tests, public.catalog_parameters,
  public.samples, public.sample_events, public.results, public.result_amendments,
  public.invoices, public.payments, public.notifications, public.audit_log
to authenticated;

-- DELETE is granted only where a delete policy actually exists. Clinical records
-- and the money ledger get no delete grant AND no delete policy: two independent
-- reasons a result or payment can never be destroyed from a client.
grant delete on public.price_list, public.catalog_tests, public.catalog_parameters
to authenticated;

grant all on all tables in schema public to service_role;
