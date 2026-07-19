-- Final state for the patients UPDATE policy, superseding the two intermediate
-- relaxations above.
--
-- Root cause of those relaxations: Postgres makes INSERT ... ON CONFLICT (in any
-- form) also satisfy the SELECT and UPDATE policies so it can read the row for
-- conflict handling. A just-registered patient is not yet SELECT-visible under
-- the visit-scoped policy (their first visit has not synced), so every upsert
-- registration was rejected. The real fix was in the client: the sync engine now
-- issues a plain INSERT for INSERT ops (idempotency comes from the client-UUID
-- primary key), which only checks the INSERT policy. Registration therefore no
-- longer touches the UPDATE policy, so it is restored to strict visit-scoping:
-- a lab may modify only a patient it has actually seen. Editing an existing
-- patient still passes because that patient necessarily has a visit.
alter policy patients_update on public.patients
  using (exists (
    select 1 from public.patient_visits v
    where v.labid = patients.labid and v.lab_id = public.my_lab_id()
  ))
  with check (exists (
    select 1 from public.patient_visits v
    where v.labid = patients.labid and v.lab_id = public.my_lab_id()
  ));
