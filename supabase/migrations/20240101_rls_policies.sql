-- =============================================================================
-- Labid Health — Row-Level Security Policies
-- =============================================================================
-- Apply with: supabase db push  (or paste into Supabase SQL Editor)
-- All tables use the same helper: current user must belong to the same lab.
-- =============================================================================

-- Helper function: returns the lab_id of the currently authenticated user.
CREATE OR REPLACE FUNCTION auth.lab_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$
    SELECT lab_id FROM public.lab_staff
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
  $$;

-- Helper function: returns the role of the currently authenticated user.
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS text
  LANGUAGE sql STABLE
  AS $$
    SELECT role::text FROM public.lab_staff
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1;
  $$;

-- =============================================================================
-- Enable RLS on all tables
-- =============================================================================
ALTER TABLE public.labs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_staff          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_visits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.samples            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.result_amendments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log          ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- labs — only staff of the lab can read it; only owner can update
-- =============================================================================
CREATE POLICY "lab_staff_can_read_own_lab"
  ON public.labs FOR SELECT
  USING (id = auth.lab_id());

CREATE POLICY "owner_can_update_lab"
  ON public.labs FOR UPDATE
  USING (id = auth.lab_id() AND auth.user_role() = 'owner');

-- =============================================================================
-- lab_staff — all staff can read their own lab; only owner manages
-- =============================================================================
CREATE POLICY "staff_can_read_same_lab"
  ON public.lab_staff FOR SELECT
  USING (lab_id = auth.lab_id());

CREATE POLICY "owner_can_insert_staff"
  ON public.lab_staff FOR INSERT
  WITH CHECK (lab_id = auth.lab_id() AND auth.user_role() = 'owner');

CREATE POLICY "owner_can_update_staff"
  ON public.lab_staff FOR UPDATE
  USING (lab_id = auth.lab_id() AND auth.user_role() = 'owner');

-- =============================================================================
-- patients — all active staff of the lab can read/write
-- =============================================================================
CREATE POLICY "staff_can_read_patients"
  ON public.patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.samples s
      WHERE s.labid = patients.labid AND s.lab_id = auth.lab_id()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.lab_staff ls
      WHERE ls.user_id = auth.uid() AND ls.lab_id = auth.lab_id() AND ls.is_active = true
    )
  );

CREATE POLICY "staff_can_insert_patients"
  ON public.patients FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND auth.lab_id() IS NOT NULL
  );

CREATE POLICY "staff_can_update_patients"
  ON public.patients FOR UPDATE
  USING (auth.lab_id() IS NOT NULL);

-- =============================================================================
-- patient_visits
-- =============================================================================
CREATE POLICY "staff_can_read_visits"
  ON public.patient_visits FOR SELECT
  USING (lab_id = auth.lab_id());

CREATE POLICY "staff_can_insert_visits"
  ON public.patient_visits FOR INSERT
  WITH CHECK (lab_id = auth.lab_id());

-- =============================================================================
-- price_list
-- =============================================================================
CREATE POLICY "staff_can_read_prices"
  ON public.price_list FOR SELECT
  USING (lab_id = auth.lab_id());

CREATE POLICY "manager_owner_can_write_prices"
  ON public.price_list FOR ALL
  USING (lab_id = auth.lab_id() AND auth.user_role() IN ('owner', 'manager'))
  WITH CHECK (lab_id = auth.lab_id() AND auth.user_role() IN ('owner', 'manager'));

-- =============================================================================
-- samples — all staff read; scientist/front_desk can insert; managers update
-- =============================================================================
CREATE POLICY "staff_can_read_samples"
  ON public.samples FOR SELECT
  USING (lab_id = auth.lab_id());

CREATE POLICY "staff_can_insert_samples"
  ON public.samples FOR INSERT
  WITH CHECK (lab_id = auth.lab_id());

CREATE POLICY "staff_can_update_samples"
  ON public.samples FOR UPDATE
  USING (lab_id = auth.lab_id());

-- =============================================================================
-- sample_events
-- =============================================================================
CREATE POLICY "staff_can_read_events"
  ON public.sample_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.samples s
      WHERE s.sample_id = sample_events.sample_id AND s.lab_id = auth.lab_id()
    )
  );

CREATE POLICY "staff_can_insert_events"
  ON public.sample_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.samples s
      WHERE s.sample_id = sample_events.sample_id AND s.lab_id = auth.lab_id()
    )
  );

-- =============================================================================
-- results — scientists can only enter; managers/owners can approve
--           CRITICAL: a scientist cannot approve their own result
-- =============================================================================
CREATE POLICY "staff_can_read_results"
  ON public.results FOR SELECT
  USING (lab_id = auth.lab_id());

CREATE POLICY "scientist_can_insert_results"
  ON public.results FOR INSERT
  WITH CHECK (lab_id = auth.lab_id());

-- UPDATE: scientists can update results they entered BUT only to draft/awaiting_approval.
-- Approving (setting status = 'approved') requires manager/owner AND must not be own result.
CREATE POLICY "staff_can_update_results"
  ON public.results FOR UPDATE
  USING (
    lab_id = auth.lab_id()
    AND (
      -- Manager or owner can update any result
      auth.user_role() IN ('owner', 'manager')
      OR
      -- Scientist can update only if not approving
      (
        auth.user_role() = 'scientist'
        -- Block: scientist cannot approve their own result
        AND NOT (
          entered_by = auth.uid()::text
          AND status = 'approved'
        )
      )
    )
  );

-- =============================================================================
-- result_amendments
-- =============================================================================
CREATE POLICY "staff_can_read_amendments"
  ON public.result_amendments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.results r
      WHERE r.id = result_amendments.result_id AND r.lab_id = auth.lab_id()
    )
  );

CREATE POLICY "manager_owner_can_amend"
  ON public.result_amendments FOR INSERT
  WITH CHECK (
    auth.user_role() IN ('owner', 'manager')
    AND EXISTS (
      SELECT 1 FROM public.results r
      WHERE r.id = result_amendments.result_id AND r.lab_id = auth.lab_id()
    )
  );

-- =============================================================================
-- invoices — front_desk can read/write; only owner sees revenue totals (enforced in UI)
-- =============================================================================
CREATE POLICY "staff_can_read_invoices"
  ON public.invoices FOR SELECT
  USING (lab_id = auth.lab_id());

CREATE POLICY "front_desk_can_insert_invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (lab_id = auth.lab_id());

CREATE POLICY "front_desk_can_update_invoices"
  ON public.invoices FOR UPDATE
  USING (lab_id = auth.lab_id());

-- =============================================================================
-- payments
-- =============================================================================
CREATE POLICY "staff_can_read_payments"
  ON public.payments FOR SELECT
  USING (lab_id = auth.lab_id());

CREATE POLICY "front_desk_can_insert_payments"
  ON public.payments FOR INSERT
  WITH CHECK (lab_id = auth.lab_id());

-- =============================================================================
-- inventory — only manager and owner can see and edit
-- =============================================================================
CREATE POLICY "manager_owner_can_read_inventory"
  ON public.inventory FOR SELECT
  USING (lab_id = auth.lab_id() AND auth.user_role() IN ('owner', 'manager'));

CREATE POLICY "manager_owner_can_write_inventory"
  ON public.inventory FOR ALL
  USING (lab_id = auth.lab_id() AND auth.user_role() IN ('owner', 'manager'))
  WITH CHECK (lab_id = auth.lab_id() AND auth.user_role() IN ('owner', 'manager'));

CREATE POLICY "manager_owner_can_read_inventory_events"
  ON public.inventory_events FOR SELECT
  USING (lab_id = auth.lab_id() AND auth.user_role() IN ('owner', 'manager'));

CREATE POLICY "manager_owner_can_write_inventory_events"
  ON public.inventory_events FOR INSERT
  WITH CHECK (lab_id = auth.lab_id() AND auth.user_role() IN ('owner', 'manager'));

-- =============================================================================
-- notifications
-- =============================================================================
CREATE POLICY "staff_can_read_notifications"
  ON public.notifications FOR SELECT
  USING (lab_id = auth.lab_id());

CREATE POLICY "staff_can_write_notifications"
  ON public.notifications FOR ALL
  USING (lab_id = auth.lab_id())
  WITH CHECK (lab_id = auth.lab_id());

-- =============================================================================
-- audit_log — owner/manager read only; all authenticated staff can insert
-- =============================================================================
CREATE POLICY "manager_owner_can_read_audit"
  ON public.audit_log FOR SELECT
  USING (lab_id = auth.lab_id() AND auth.user_role() IN ('owner', 'manager'));

CREATE POLICY "all_staff_can_insert_audit"
  ON public.audit_log FOR INSERT
  WITH CHECK (lab_id = auth.lab_id());
