# Labora AI — Database Schema
## Complete PostgreSQL schema for Supabase — run migrations in order

---

## How to run these migrations

Paste each migration into the Supabase SQL Editor in order, or save each as a numbered file in `supabase/migrations/` and run `supabase db push`.

---

## Migration 001 — Core Tables

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy name search

-- ============================================================
-- LABS
-- ============================================================
CREATE TABLE labs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  mlscn_no      TEXT NOT NULL,
  logo_url      TEXT,
  pdf_footer    TEXT DEFAULT 'Results should be interpreted in conjunction with clinical findings.',
  pdf_disclaimer TEXT DEFAULT 'This report is confidential and intended only for the requesting physician.',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LAB STAFF
-- ============================================================
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'scientist', 'front_desk');

CREATE TABLE lab_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id      UUID REFERENCES labs(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lab_id)
);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lapid         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  name_search   TEXT GENERATED ALWAYS AS (lower(full_name)) STORED, -- for fuzzy search
  date_of_birth DATE,
  gender        TEXT CHECK (gender IN ('male', 'female', 'other')),
  phone         TEXT NOT NULL,
  address       TEXT,
  next_of_kin   TEXT,
  next_of_kin_phone TEXT,
  photo_url     TEXT,
  consent       BOOLEAN NOT NULL DEFAULT FALSE,
  consent_date  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast LAPID lookup
CREATE INDEX idx_patients_lapid ON patients(lapid);
-- Index for phone lookup (duplicate detection)
CREATE INDEX idx_patients_phone ON patients(phone);
-- Index for fuzzy name search
CREATE INDEX idx_patients_name_trgm ON patients USING gin(name_search gin_trgm_ops);

-- ============================================================
-- PATIENT VISITS (links patient to lab)
-- ============================================================
CREATE TABLE patient_visits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lapid       TEXT NOT NULL REFERENCES patients(lapid),
  lab_id      UUID NOT NULL REFERENCES labs(id),
  visited_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_patient_visits_lapid ON patient_visits(lapid);
CREATE INDEX idx_patient_visits_lab ON patient_visits(lab_id);

-- ============================================================
-- LAPID GENERATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_lapid()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_part  TEXT;
  counter   INT;
BEGIN
  year_part := EXTRACT(YEAR FROM NOW())::TEXT;
  SELECT COUNT(*) + 1 INTO counter
  FROM patients
  WHERE lapid LIKE 'LA-' || year_part || '-%';
  seq_part := LPAD(counter::TEXT, 5, '0');
  RETURN 'LA-' || year_part || '-' || seq_part;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PRICE LIST
-- ============================================================
CREATE TABLE price_list (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id        UUID NOT NULL REFERENCES labs(id),
  test_code     TEXT NOT NULL,
  test_name     TEXT NOT NULL,
  category      TEXT NOT NULL,
  standard_price  INTEGER NOT NULL DEFAULT 0, -- stored in kobo
  hmo_price       INTEGER NOT NULL DEFAULT 0, -- stored in kobo
  corporate_price INTEGER NOT NULL DEFAULT 0, -- stored in kobo
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lab_id, test_code)
);
```

---

## Migration 002 — Samples & Workflow

```sql
-- ============================================================
-- SAMPLES
-- ============================================================
CREATE TYPE sample_status AS ENUM (
  'received',
  'processing',
  'awaiting_approval',
  'ready',
  'delivered',
  'rejected'
);

CREATE TABLE samples (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id         TEXT UNIQUE NOT NULL, -- #LB-9821
  lapid             TEXT NOT NULL REFERENCES patients(lapid),
  lab_id            UUID NOT NULL REFERENCES labs(id),
  status            sample_status NOT NULL DEFAULT 'received',
  is_stat           BOOLEAN DEFAULT FALSE,
  tests_ordered     TEXT[] NOT NULL, -- array of test_code values
  referring_doctor  TEXT,
  collected_at      TIMESTAMPTZ DEFAULT NOW(),
  collected_by      UUID REFERENCES auth.users(id),
  rejection_reason  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_samples_lapid ON samples(lapid);
CREATE INDEX idx_samples_lab ON samples(lab_id);
CREATE INDEX idx_samples_status ON samples(status);
CREATE INDEX idx_samples_collected_at ON samples(collected_at);

-- ============================================================
-- SAMPLE ID GENERATION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_sample_id()
RETURNS TEXT AS $$
DECLARE
  random_part TEXT;
BEGIN
  random_part := LPAD((FLOOR(RANDOM() * 9999) + 1)::TEXT, 4, '0');
  -- Retry if collision (extremely rare)
  WHILE EXISTS (SELECT 1 FROM samples WHERE sample_id = 'LB-' || random_part) LOOP
    random_part := LPAD((FLOOR(RANDOM() * 9999) + 1)::TEXT, 4, '0');
  END LOOP;
  RETURN 'LB-' || random_part;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SAMPLE EVENTS (Chain of Custody — append only)
-- ============================================================
CREATE TABLE sample_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id     TEXT NOT NULL REFERENCES samples(sample_id),
  event_type    TEXT NOT NULL CHECK (event_type IN (
    'received', 'processing_started', 'status_updated',
    'approved', 'delivered', 'rejected', 'stat_flagged',
    'label_printed', 'qr_scanned'
  )),
  performed_by  UUID REFERENCES auth.users(id),
  station       TEXT, -- which workstation scanned
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Append only: no UPDATE or DELETE policy will be created for this table
CREATE INDEX idx_sample_events_sample ON sample_events(sample_id);
CREATE INDEX idx_sample_events_created ON sample_events(created_at);
```

---

## Migration 003 — Results

```sql
-- ============================================================
-- RESULTS
-- ============================================================
CREATE TYPE result_status AS ENUM (
  'draft',
  'awaiting_approval',
  'approved',
  'amended',
  'rejected'
);

CREATE TABLE results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id       TEXT NOT NULL REFERENCES samples(sample_id),
  lapid           TEXT NOT NULL REFERENCES patients(lapid),
  lab_id          UUID NOT NULL REFERENCES labs(id),
  test_type       TEXT NOT NULL,
  parameters      JSONB NOT NULL DEFAULT '{}',
  -- parameters structure: { "param_name": { "value": "11.2", "unit": "g/dL", "status": "low|normal|high|critical_low|critical_high" } }
  comments        TEXT,
  status          result_status NOT NULL DEFAULT 'draft',
  entered_by      UUID REFERENCES auth.users(id),
  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  pdf_url         TEXT,
  pdf_generated_at TIMESTAMPTZ,
  critical_acknowledged  BOOLEAN DEFAULT FALSE,
  critical_acknowledged_by UUID REFERENCES auth.users(id),
  critical_acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- CONSTRAINT: scientist cannot approve their own result
ALTER TABLE results ADD CONSTRAINT no_self_approval
  CHECK (entered_by != approved_by OR approved_by IS NULL);

CREATE INDEX idx_results_lapid ON results(lapid);
CREATE INDEX idx_results_lab ON results(lab_id);
CREATE INDEX idx_results_status ON results(status);
CREATE INDEX idx_results_sample ON results(sample_id);

-- ============================================================
-- RESULT AMENDMENTS (preserves original — append only)
-- ============================================================
CREATE TABLE result_amendments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id         UUID NOT NULL REFERENCES results(id),
  previous_parameters JSONB NOT NULL,
  previous_comments TEXT,
  amendment_reason  TEXT NOT NULL,
  amended_by        UUID REFERENCES auth.users(id),
  amended_at        TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migration 004 — Billing

```sql
-- ============================================================
-- INVOICES
-- ============================================================
CREATE TYPE invoice_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded', 'void');

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      TEXT UNIQUE NOT NULL, -- INV-9021
  lapid           TEXT NOT NULL REFERENCES patients(lapid),
  lab_id          UUID NOT NULL REFERENCES labs(id),
  sample_id       TEXT REFERENCES samples(sample_id),
  line_items      JSONB NOT NULL DEFAULT '[]',
  -- line_items: [{ "test_code": "FBC", "test_name": "Full Blood Count", "price": 350000 }] (kobo)
  subtotal        INTEGER NOT NULL DEFAULT 0, -- kobo
  platform_fee    INTEGER NOT NULL DEFAULT 0, -- kobo — Labora AI fee
  total           INTEGER NOT NULL DEFAULT 0, -- kobo
  amount_paid     INTEGER NOT NULL DEFAULT 0, -- kobo
  outstanding     INTEGER GENERATED ALWAYS AS (total - amount_paid) STORED, -- kobo
  status          invoice_status NOT NULL DEFAULT 'unpaid',
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_lapid ON invoices(lapid);
CREATE INDEX idx_invoices_lab ON invoices(lab_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

-- ============================================================
-- INVOICE ID GENERATION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_invoice_id()
RETURNS TEXT AS $$
DECLARE
  seq_part TEXT;
  counter  INT;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM invoices;
  seq_part := LPAD(counter::TEXT, 4, '0');
  RETURN 'INV-' || seq_part;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TYPE payment_method AS ENUM ('cash', 'pos', 'bank_transfer', 'opay', 'palmpay');

CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  TEXT NOT NULL REFERENCES invoices(invoice_id),
  lab_id      UUID NOT NULL REFERENCES labs(id),
  amount      INTEGER NOT NULL, -- kobo
  method      payment_method NOT NULL,
  reference   TEXT, -- bank transfer ref, POS receipt number
  recorded_by UUID REFERENCES auth.users(id),
  voided      BOOLEAN DEFAULT FALSE,
  void_reason TEXT,
  voided_by   UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_lab ON payments(lab_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- ============================================================
-- AUTO-UPDATE INVOICE STATUS ON PAYMENT
-- ============================================================
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  total_paid INTEGER;
  invoice_total INTEGER;
BEGIN
  SELECT SUM(amount) INTO total_paid
  FROM payments
  WHERE invoice_id = NEW.invoice_id AND voided = FALSE;

  SELECT total INTO invoice_total
  FROM invoices WHERE invoice_id = NEW.invoice_id;

  UPDATE invoices SET
    amount_paid = total_paid,
    status = CASE
      WHEN total_paid >= invoice_total THEN 'paid'::invoice_status
      WHEN total_paid > 0 THEN 'partial'::invoice_status
      ELSE 'unpaid'::invoice_status
    END,
    updated_at = NOW()
  WHERE invoice_id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_payment_insert
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_on_payment();
```

---

## Migration 005 — Inventory

```sql
-- ============================================================
-- INVENTORY
-- ============================================================
CREATE TABLE inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id          UUID NOT NULL REFERENCES labs(id),
  item_name       TEXT NOT NULL,
  category        TEXT CHECK (category IN ('reagent', 'consumable', 'control', 'equipment')),
  current_stock   DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL, -- 'tests', 'ml', 'units', 'packs', 'boxes'
  minimum_level   DECIMAL(10,2) NOT NULL DEFAULT 0,
  expiry_date     DATE,
  supplier        TEXT,
  supplier_phone  TEXT,
  cost_per_unit   INTEGER DEFAULT 0, -- kobo
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_lab ON inventory(lab_id);
CREATE INDEX idx_inventory_expiry ON inventory(expiry_date);

-- ============================================================
-- INVENTORY EVENTS (append only)
-- ============================================================
CREATE TYPE inventory_event_type AS ENUM (
  'usage', 'restock', 'wastage', 'adjustment', 'stocktake', 'expired'
);

CREATE TABLE inventory_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id        UUID NOT NULL REFERENCES labs(id),
  item_id       UUID NOT NULL REFERENCES inventory(id),
  event_type    inventory_event_type NOT NULL,
  quantity      DECIMAL(10,2) NOT NULL, -- negative for usage/wastage, positive for restock
  reason        TEXT,
  unit_cost     INTEGER DEFAULT 0, -- kobo — for restock events
  batch_number  TEXT,
  performed_by  UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventory_events_item ON inventory_events(item_id);
CREATE INDEX idx_inventory_events_lab ON inventory_events(lab_id);
CREATE INDEX idx_inventory_events_created ON inventory_events(created_at);

-- AUTO-UPDATE STOCK LEVEL ON INVENTORY EVENT
CREATE OR REPLACE FUNCTION update_stock_on_event()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory SET
    current_stock = current_stock + NEW.quantity,
    updated_at = NOW()
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_inventory_event
  AFTER INSERT ON inventory_events
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_event();
```

---

## Migration 006 — Notifications & Delivery

```sql
-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TYPE notification_channel AS ENUM ('whatsapp', 'sms', 'email');
CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'delivered', 'opened', 'failed');

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lapid           TEXT NOT NULL REFERENCES patients(lapid),
  result_id       UUID NOT NULL REFERENCES results(id),
  lab_id          UUID NOT NULL REFERENCES labs(id),
  channel         notification_channel NOT NULL,
  status          notification_status NOT NULL DEFAULT 'queued',
  recipient_phone TEXT,
  secure_link     TEXT,
  link_token      TEXT, -- hashed JWT token for verification
  link_expires_at TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  failure_reason  TEXT,
  is_doctor_copy  BOOLEAN DEFAULT FALSE,
  doctor_name     TEXT,
  superseded_by   UUID REFERENCES notifications(id), -- if resent
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_lapid ON notifications(lapid);
CREATE INDEX idx_notifications_result ON notifications(result_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_lab ON notifications(lab_id);
```

---

## Migration 007 — Audit Log

```sql
-- ============================================================
-- AUDIT LOG (append only — no UPDATE or DELETE ever)
-- ============================================================
CREATE TABLE audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  lab_id      UUID REFERENCES labs(id),
  action      TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'APPROVE', 'AMEND', 'DELETE', 'LOGIN', 'VIEW_RESULT', 'CONSENT_GRANT', 'CONSENT_REVOKE'
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_lab ON audit_log(lab_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_action ON audit_log(action);
```

---

## Migration 008 — Row Level Security

```sql
-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: get current user's lab_id and role
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_lab_id()
RETURNS UUID AS $$
  SELECT lab_id FROM lab_staff
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM lab_staff
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- LAB_STAFF POLICIES
-- ============================================================
CREATE POLICY "staff_see_own_lab_staff" ON lab_staff
  FOR SELECT TO authenticated
  USING (lab_id = get_my_lab_id());

CREATE POLICY "owner_manage_staff" ON lab_staff
  FOR ALL TO authenticated
  USING (lab_id = get_my_lab_id() AND get_my_role() = 'owner');

-- ============================================================
-- PATIENTS POLICIES
-- ============================================================
-- All staff can view patients in their lab (via patient_visits)
CREATE POLICY "staff_view_patients" ON patients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patient_visits
      WHERE lapid = patients.lapid
      AND lab_id = get_my_lab_id()
    )
    OR get_my_role() IN ('owner', 'manager', 'front_desk') -- can search before visit exists
  );

-- Only owner, manager, front_desk can register patients
CREATE POLICY "front_desk_register_patients" ON patients
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('owner', 'manager', 'front_desk'));

-- Owner, manager, front_desk can update patient demographics
CREATE POLICY "staff_update_patients" ON patients
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('owner', 'manager', 'front_desk'));

-- ============================================================
-- SAMPLES POLICIES
-- ============================================================
CREATE POLICY "staff_view_samples" ON samples
  FOR SELECT TO authenticated
  USING (lab_id = get_my_lab_id());

CREATE POLICY "front_desk_register_samples" ON samples
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = get_my_lab_id() AND get_my_role() IN ('owner', 'manager', 'front_desk'));

CREATE POLICY "staff_update_samples" ON samples
  FOR UPDATE TO authenticated
  USING (lab_id = get_my_lab_id() AND get_my_role() IN ('owner', 'manager', 'scientist'));

-- ============================================================
-- RESULTS POLICIES
-- ============================================================
CREATE POLICY "staff_view_results" ON results
  FOR SELECT TO authenticated
  USING (lab_id = get_my_lab_id());

CREATE POLICY "scientist_enter_results" ON results
  FOR INSERT TO authenticated
  WITH CHECK (
    lab_id = get_my_lab_id()
    AND get_my_role() IN ('owner', 'manager', 'scientist')
  );

CREATE POLICY "scientist_update_draft_results" ON results
  FOR UPDATE TO authenticated
  USING (
    lab_id = get_my_lab_id()
    AND get_my_role() IN ('owner', 'manager', 'scientist')
    AND (
      -- Scientists can only update their own drafts
      get_my_role() IN ('owner', 'manager')
      OR (entered_by = auth.uid() AND status = 'draft')
    )
  );

-- ============================================================
-- INVOICES POLICIES
-- ============================================================
CREATE POLICY "staff_view_invoices" ON invoices
  FOR SELECT TO authenticated
  USING (lab_id = get_my_lab_id());

CREATE POLICY "front_desk_create_invoices" ON invoices
  FOR INSERT TO authenticated
  WITH CHECK (lab_id = get_my_lab_id() AND get_my_role() IN ('owner', 'manager', 'front_desk'));

CREATE POLICY "front_desk_update_invoices" ON invoices
  FOR UPDATE TO authenticated
  USING (lab_id = get_my_lab_id() AND get_my_role() IN ('owner', 'manager', 'front_desk'));

-- ============================================================
-- INVENTORY POLICIES
-- ============================================================
CREATE POLICY "manager_view_inventory" ON inventory
  FOR SELECT TO authenticated
  USING (lab_id = get_my_lab_id() AND get_my_role() IN ('owner', 'manager'));

CREATE POLICY "manager_manage_inventory" ON inventory
  FOR ALL TO authenticated
  USING (lab_id = get_my_lab_id() AND get_my_role() IN ('owner', 'manager'));

-- ============================================================
-- AUDIT LOG POLICIES
-- No DELETE policy = append only
-- ============================================================
CREATE POLICY "owner_view_audit_log" ON audit_log
  FOR SELECT TO authenticated
  USING (lab_id = get_my_lab_id() AND get_my_role() = 'owner');

CREATE POLICY "system_insert_audit_log" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (TRUE); -- any authenticated user can insert audit events
```

---

## Migration 009 — Realtime & Indexes

```sql
-- ============================================================
-- ENABLE REALTIME on tables needing live updates
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE samples;
ALTER PUBLICATION supabase_realtime ADD TABLE results;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

-- ============================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ============================================================
-- Dashboard: tests today
CREATE INDEX idx_samples_lab_date ON samples(lab_id, collected_at DESC);
-- Dashboard: pending approvals
CREATE INDEX idx_results_lab_status ON results(lab_id, status);
-- Dashboard: undelivered results
CREATE INDEX idx_notifications_lab_opened ON notifications(lab_id, opened_at, sent_at);
-- Inventory alerts
CREATE INDEX idx_inventory_lab_active ON inventory(lab_id, is_active);
```

---

## Migration 010 — Seed Data (Development Only)

```sql
-- DO NOT RUN IN PRODUCTION
-- Run this only in the Supabase local dev environment or on a staging project

-- Sample lab
INSERT INTO labs (id, name, address, phone, mlscn_no) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'Labora Test Lab',
  '14 GRA Phase 2, Port Harcourt, Rivers State',
  '+234 802 000 0001',
  'MLSCN/L/00001'
);

-- Sample price list
INSERT INTO price_list (lab_id, test_code, test_name, category, standard_price, hmo_price) VALUES
('00000000-0000-0000-0000-000000000001', 'FBC', 'Full Blood Count', 'Haematology', 350000, 280000),
('00000000-0000-0000-0000-000000000001', 'LFT', 'Liver Function Test', 'Biochemistry', 450000, 360000),
('00000000-0000-0000-0000-000000000001', 'RFT', 'Renal Function Test', 'Biochemistry', 450000, 360000),
('00000000-0000-0000-0000-000000000001', 'FBG', 'Fasting Blood Glucose', 'Biochemistry', 150000, 120000),
('00000000-0000-0000-0000-000000000001', 'MALRDT', 'Malaria RDT', 'Microbiology', 200000, 160000),
('00000000-0000-0000-0000-000000000001', 'HBA1C', 'HbA1c', 'Biochemistry', 350000, 280000);
-- All prices in kobo (divide by 100 for ₦)
-- ₦3,500 = 350000 kobo
```

---

## Quick Reference: Monetary Values

All monetary values are stored as **integers in kobo** (1 Naira = 100 kobo).

```
₦3,500   = 350000 kobo
₦15,000  = 1500000 kobo
₦150     = 15000 kobo

formatNaira(350000)  → "₦3,500"
formatNaira(15000)   → "₦150"
```

This avoids floating-point arithmetic errors in financial calculations.

---

*Last updated: April 2026*
*Run migrations in order: 001 → 010*
*Never run migration 010 (seed data) in production*
