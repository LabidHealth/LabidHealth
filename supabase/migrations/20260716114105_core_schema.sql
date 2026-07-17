-- Labid Health core schema.
-- Mirrors the offline-first client model (src/types/index.ts). All ids are
-- client-generated UUIDs so the sync engine can upsert idempotently on `id`.
-- Money is stored in kobo (integer), never floating point.

-- ── Labs & staff ─────────────────────────────────────────────────────────────
create table public.labs (
  id            uuid primary key,
  name          text not null,
  address       text,
  phone         text,
  email         text,
  mlscn_no      text not null,
  logo_url      text,
  pdf_footer    text not null default '',
  pdf_disclaimer text not null default '',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.lab_staff (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  lab_id        uuid not null references public.labs(id) on delete cascade,
  role          text not null check (role in ('owner','manager','scientist','front_desk')),
  full_name     text not null,
  phone         text,
  two_factor_enabled boolean default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, lab_id)
);
create index lab_staff_user_id_idx on public.lab_staff (user_id);
create index lab_staff_lab_id_idx  on public.lab_staff (lab_id);

-- ── Patients ─────────────────────────────────────────────────────────────────
-- LABID (LB-YYYY-NNNNN) is the permanent patient identifier and is generated
-- client-side so registration works with zero internet.
create table public.patients (
  id            uuid primary key,
  labid         text not null unique,
  full_name     text not null,
  date_of_birth date,
  gender        text check (gender in ('male','female','other')),
  phone         text not null,
  address       text,
  next_of_kin   text,
  next_of_kin_phone text,
  photo_url     text,
  consent       boolean not null default false,
  consent_date  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index patients_phone_idx on public.patients (phone);

create table public.patient_visits (
  id            uuid primary key,
  labid         text not null references public.patients(labid) on update cascade,
  lab_id        uuid not null references public.labs(id) on delete cascade,
  visited_at    timestamptz not null default now(),
  created_by    uuid
);
create index patient_visits_labid_idx  on public.patient_visits (labid);
create index patient_visits_lab_id_idx on public.patient_visits (lab_id);

-- ── Pricing & test catalog ───────────────────────────────────────────────────
create table public.price_list (
  id            uuid primary key,
  lab_id        uuid not null references public.labs(id) on delete cascade,
  test_code     text not null,
  test_name     text not null,
  category      text not null,
  standard_price  bigint not null default 0,
  hmo_price       bigint not null default 0,
  corporate_price bigint not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (lab_id, test_code)
);

create table public.catalog_tests (
  id            uuid primary key,
  lab_id        uuid not null references public.labs(id) on delete cascade,
  code          text not null,
  name          text not null,
  category      text not null,
  specimen      text not null,
  result_type   text not null check (result_type in ('numeric','panel','qualitative','descriptive','narrative')),
  active        boolean not null default true,
  unique (lab_id, code)
);

create table public.catalog_parameters (
  id            uuid primary key,
  test_id       uuid not null references public.catalog_tests(id) on delete cascade,
  key           text not null,
  name          text not null,
  unit          text,
  ref_low       numeric,
  ref_high      numeric,
  ref_operator  text check (ref_operator in ('between','lt','gt')),
  qualitative_options jsonb,
  sex           text check (sex in ('male','female')),
  critical_low  numeric,
  critical_high numeric,
  sort          integer not null default 0
);
create index catalog_parameters_test_id_idx on public.catalog_parameters (test_id);

-- ── Samples ──────────────────────────────────────────────────────────────────
create table public.samples (
  id            uuid primary key,
  sample_id     text not null unique,
  labid         text not null references public.patients(labid) on update cascade,
  lab_id        uuid not null references public.labs(id) on delete cascade,
  status        text not null check (status in ('received','processing','awaiting_approval','ready','delivered','rejected')),
  is_stat       boolean not null default false,
  tests_ordered text[] not null default '{}',
  referring_doctor text,
  collected_at  timestamptz not null default now(),
  collected_by  uuid,
  rejection_reason text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index samples_lab_id_idx on public.samples (lab_id);
create index samples_labid_idx  on public.samples (labid);
create index samples_status_idx on public.samples (lab_id, status);

-- Note: sample_events.sample_id references the human-readable samples.sample_id
-- (e.g. "S-2026-0042"), not the uuid pk — this matches what the client writes.
create table public.sample_events (
  id            uuid primary key,
  sample_id     text not null references public.samples(sample_id) on update cascade on delete cascade,
  event_type    text not null check (event_type in ('received','processing_started','status_updated','approved','delivered','rejected','stat_flagged','label_printed','qr_scanned')),
  performed_by  uuid,
  station       text,
  notes         text,
  created_at    timestamptz not null default now()
);
create index sample_events_sample_id_idx on public.sample_events (sample_id, created_at);

-- ── Results ──────────────────────────────────────────────────────────────────
create table public.results (
  id            uuid primary key,
  sample_id     text not null references public.samples(sample_id) on update cascade,
  labid         text not null references public.patients(labid) on update cascade,
  lab_id        uuid not null references public.labs(id) on delete cascade,
  test_type     text not null,
  parameters    jsonb not null default '{}'::jsonb,
  comments      text,
  status        text not null check (status in ('draft','awaiting_approval','approved','amended','rejected')),
  entered_by    uuid,
  approved_by   uuid,
  approved_at   timestamptz,
  pdf_url       text,
  pdf_generated_at timestamptz,
  critical_acknowledged boolean not null default false,
  critical_acknowledged_by uuid,
  critical_acknowledged_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index results_lab_id_idx    on public.results (lab_id);
create index results_labid_idx     on public.results (labid);
create index results_sample_id_idx on public.results (sample_id);
create index results_status_idx    on public.results (lab_id, status);

create table public.result_amendments (
  id            uuid primary key,
  result_id     uuid not null references public.results(id) on delete cascade,
  previous_parameters jsonb not null default '{}'::jsonb,
  previous_comments text,
  amendment_reason text not null,
  amended_by    uuid,
  amended_at    timestamptz not null default now()
);
create index result_amendments_result_id_idx on public.result_amendments (result_id, amended_at);

-- ── Billing ──────────────────────────────────────────────────────────────────
-- `outstanding` is a plain column, NOT generated: the client computes it offline
-- and sends it in the upsert payload.
create table public.invoices (
  id            uuid primary key,
  invoice_id    text not null unique,
  labid         text not null references public.patients(labid) on update cascade,
  lab_id        uuid not null references public.labs(id) on delete cascade,
  sample_id     text references public.samples(sample_id) on update cascade,
  line_items    jsonb not null default '[]'::jsonb,
  subtotal      bigint not null default 0,
  platform_fee  bigint not null default 0,
  total         bigint not null default 0,
  amount_paid   bigint not null default 0,
  outstanding   bigint not null default 0,
  status        text not null check (status in ('unpaid','partial','paid','refunded','void')),
  notes         text,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index invoices_lab_id_idx on public.invoices (lab_id, created_at);
create index invoices_labid_idx  on public.invoices (labid);
create index invoices_status_idx on public.invoices (lab_id, status);

-- Append-only money ledger. payments.invoice_id references invoices.id (uuid).
create table public.payments (
  id            uuid primary key,
  invoice_id    uuid not null references public.invoices(id) on delete restrict,
  lab_id        uuid not null references public.labs(id) on delete cascade,
  amount        bigint not null,
  method        text not null check (method in ('cash','pos','bank_transfer','opay','palmpay')),
  reference     text,
  recorded_by   uuid,
  voided        boolean not null default false,
  void_reason   text,
  voided_by     uuid,
  created_at    timestamptz not null default now()
);
create index payments_invoice_id_idx on public.payments (invoice_id);
create index payments_lab_id_idx     on public.payments (lab_id, created_at);

-- ── Delivery ─────────────────────────────────────────────────────────────────
create table public.notifications (
  id            uuid primary key,
  labid         text not null references public.patients(labid) on update cascade,
  result_id     uuid not null references public.results(id) on delete cascade,
  lab_id        uuid not null references public.labs(id) on delete cascade,
  channel       text not null check (channel in ('whatsapp','sms','email')),
  status        text not null check (status in ('queued','sent','delivered','opened','failed')),
  recipient_phone text,
  secure_link   text,
  link_token    text,
  link_expires_at timestamptz,
  sent_at       timestamptz,
  delivered_at  timestamptz,
  opened_at     timestamptz,
  failure_reason text,
  is_doctor_copy boolean not null default false,
  doctor_name   text,
  superseded_by uuid,
  created_at    timestamptz not null default now()
);
create index notifications_lab_id_idx    on public.notifications (lab_id, created_at);
create index notifications_result_id_idx on public.notifications (result_id);
create unique index notifications_link_token_idx on public.notifications (link_token) where link_token is not null;

-- ── Audit ────────────────────────────────────────────────────────────────────
-- No FK on user_id: the audit trail must outlive the user record.
create table public.audit_log (
  id            uuid primary key,
  user_id       uuid,
  lab_id        uuid,
  action        text not null,
  table_name    text not null,
  record_id     text not null,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    text,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create index audit_log_lab_id_idx on public.audit_log (lab_id, created_at);
