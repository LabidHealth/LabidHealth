-- Intermediate step (superseded by 20260718090003). Kept for migration-history
-- fidelity with the remote project.
--
-- While the sync engine still wrote every row as an upsert, an existing UPDATE
-- policy's WITH CHECK was evaluated on the insert path, rejecting freshly
-- registered patients (no visit yet). This relaxed WITH CHECK to unblock that;
-- it was later restored once INSERT ops moved to plain inserts.
alter policy patients_update on public.patients
  with check (public.my_lab_id() is not null);
