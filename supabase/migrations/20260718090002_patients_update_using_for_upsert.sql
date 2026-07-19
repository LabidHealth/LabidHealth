-- Intermediate step (superseded by 20260718090003). Kept for migration-history
-- fidelity with the remote project.
--
-- An ON CONFLICT upsert also evaluates the UPDATE policy's USING clause, so a
-- visit-scoped USING likewise rejected fresh registrations. This relaxed USING;
-- it was later restored once INSERT ops moved to plain inserts.
alter policy patients_update on public.patients
  using (public.my_lab_id() is not null);
