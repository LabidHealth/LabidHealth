# Labora AI — Architecture
## System design, data flow, and technical decisions

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ANDROID TABLET (Chrome)                   │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │  React App   │   │ Service      │   │  IndexedDB      │  │
│  │  (UI Layer)  │◄──│ Worker       │   │  via Dexie.js   │  │
│  │              │   │ (Cache App   │   │  (Local Data    │  │
│  │  All reads   │   │  Shell)      │   │   Store)        │  │
│  │  from local  │   └──────────────┘   └────────┬────────┘  │
│  └──────┬───────┘                               │           │
│         │                                  Sync Engine      │
│         │ writes                                │           │
│         └──────────────────────────────────────┘           │
└───────────────────────────────────┬─────────────────────────┘
                                    │ HTTPS (when online)
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (Cape Town)                      │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Auth +   │  │PostgreSQL│  │ Storage  │  │  Edge      │  │
│  │ RLS      │  │ Database │  │ (PDFs,   │  │  Functions │  │
│  │          │  │          │  │  Logos)  │  │ (WhatsApp, │  │
│  └──────────┘  └──────────┘  └──────────┘  │  SMS)      │  │
│                                             └────┬───────┘  │
└─────────────────────────────────────────────────┼───────────┘
                                                  │
              ┌───────────────────────────────────┤
              │                                   │
              ▼                                   ▼
    WhatsApp Business API                    Termii SMS API
    (Result delivery)                        (SMS fallback)
```

---

## 2. The Offline-First Data Flow

This is the most critical architectural decision in the system. Every single write operation follows this exact pattern — no exceptions.

```
USER ACTION (e.g. Register Patient)
         │
         ▼
1. VALIDATE locally (React Hook Form + Zod)
         │
         ▼
2. WRITE to IndexedDB immediately (Dexie.js)
         │
         ▼
3. UPDATE UI from IndexedDB state (instant — no spinner)
         │
         ▼
4. ADD to Sync Queue (table: syncQueue, op: INSERT, record: patientId)
         │
         ▼
5. SHOW "Saved locally" toast if offline / "Saved" if online
         │
         ▼
6. SYNC ENGINE runs (every 30s or on connection restore)
         │
         ├── ONLINE: Push syncQueue items to Supabase → mark as synced
         │
         └── OFFLINE: Items stay in queue, retry on next connection
```

**The UI never waits for Supabase.** If Supabase is unreachable, the user never knows — they just keep working.

---

## 3. Database Schema

### Core Tables

```sql
-- LABS: One row per lab using Labora AI
CREATE TABLE labs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  mlscn_no    TEXT NOT NULL,  -- MLSCN registration number — required on all PDFs
  logo_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- LAB_STAFF: Users linked to labs with roles
CREATE TABLE lab_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id      UUID REFERENCES labs(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner','manager','scientist','front_desk')),
  full_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lab_id)
);

-- PATIENTS: One row per unique patient (identified by LAPID)
CREATE TABLE patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lapid         TEXT UNIQUE NOT NULL,  -- LA-2025-00847
  full_name     TEXT NOT NULL,
  date_of_birth DATE,
  gender        TEXT CHECK (gender IN ('male','female','other')),
  phone         TEXT NOT NULL,
  address       TEXT,
  next_of_kin   TEXT,
  photo_url     TEXT,
  consent       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- PATIENT_VISITS: Each visit to any lab (links patient to lab)
CREATE TABLE patient_visits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lapid       TEXT REFERENCES patients(lapid),
  lab_id      UUID REFERENCES labs(id),
  visited_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES auth.users(id)
);

-- SAMPLES: One row per sample collected
CREATE TABLE samples (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id       TEXT UNIQUE NOT NULL,  -- #LB-9821
  lapid           TEXT REFERENCES patients(lapid),
  lab_id          UUID REFERENCES labs(id),
  status          TEXT NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received','processing','awaiting_approval','ready','delivered')),
  is_stat         BOOLEAN DEFAULT FALSE,
  tests_ordered   TEXT[] NOT NULL,  -- array of test type codes
  collected_at    TIMESTAMPTZ DEFAULT NOW(),
  collected_by    UUID REFERENCES auth.users(id),
  referring_doctor TEXT,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- SAMPLE_EVENTS: Chain of custody log — append only, never update
CREATE TABLE sample_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id   TEXT REFERENCES samples(sample_id),
  event_type  TEXT NOT NULL,  -- 'received', 'scanned', 'processing', 'approved', 'delivered', 'rejected'
  performed_by UUID REFERENCES auth.users(id),
  station     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RESULTS: One row per test result (a sample may have multiple)
CREATE TABLE results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id       TEXT REFERENCES samples(sample_id),
  lapid           TEXT REFERENCES patients(lapid),
  lab_id          UUID REFERENCES labs(id),
  test_type       TEXT NOT NULL,
  parameters      JSONB NOT NULL,  -- { "haemoglobin": { "value": "11.2", "unit": "g/dL", "status": "low" } }
  comments        TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','awaiting_approval','approved','amended')),
  entered_by      UUID REFERENCES auth.users(id),
  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RESULT_AMENDMENTS: Preserves original when a result is amended
CREATE TABLE result_amendments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id       UUID REFERENCES results(id),
  previous_data   JSONB NOT NULL,
  amendment_reason TEXT NOT NULL,
  amended_by      UUID REFERENCES auth.users(id),
  amended_at      TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES: One invoice per visit
CREATE TABLE invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  TEXT UNIQUE NOT NULL,  -- #INV-9021
  lapid       TEXT REFERENCES patients(lapid),
  lab_id      UUID REFERENCES labs(id),
  line_items  JSONB NOT NULL,  -- [{ "test": "FBC", "price": 3500 }, ...]
  subtotal    INTEGER NOT NULL,  -- in kobo (multiply by 100)
  platform_fee INTEGER NOT NULL, -- Labora AI fee in kobo
  total       INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'unpaid'
              CHECK (status IN ('unpaid','partial','paid','refunded','void')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS: Each payment event against an invoice
CREATE TABLE payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  TEXT REFERENCES invoices(invoice_id),
  amount      INTEGER NOT NULL,  -- in kobo
  method      TEXT NOT NULL CHECK (method IN ('cash','pos','transfer','opay','palmpay')),
  recorded_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY: One row per reagent/consumable item
CREATE TABLE inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id          UUID REFERENCES labs(id),
  item_name       TEXT NOT NULL,
  category        TEXT,  -- 'reagent', 'consumable', 'control'
  current_stock   DECIMAL NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL,  -- 'tests', 'ml', 'units', 'packs'
  minimum_level   DECIMAL NOT NULL DEFAULT 0,
  expiry_date     DATE,
  supplier        TEXT,
  supplier_phone  TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY_EVENTS: Append-only log of all stock movements
CREATE TABLE inventory_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id      UUID REFERENCES labs(id),
  item_id     UUID REFERENCES inventory(id),
  event_type  TEXT NOT NULL CHECK (event_type IN ('usage','restock','wastage','adjustment','stocktake')),
  quantity    DECIMAL NOT NULL,  -- negative for usage/wastage, positive for restock
  reason      TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS: Delivery queue for WhatsApp + SMS
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lapid       TEXT REFERENCES patients(lapid),
  result_id   UUID REFERENCES results(id),
  channel     TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  status      TEXT NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued','sent','delivered','opened','failed')),
  sent_at     TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at   TIMESTAMPTZ,
  secure_link TEXT,
  link_expires_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### LAPID Generation Function

```sql
CREATE OR REPLACE FUNCTION generate_lapid()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_part TEXT;
  new_lapid TEXT;
  counter INT;
BEGIN
  year_part := EXTRACT(YEAR FROM NOW())::TEXT;
  SELECT COUNT(*) + 1 INTO counter FROM patients
  WHERE lapid LIKE 'LA-' || year_part || '-%';
  seq_part := LPAD(counter::TEXT, 5, '0');
  new_lapid := 'LA-' || year_part || '-' || seq_part;
  RETURN new_lapid;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Row Level Security Policies

Every table must have RLS enabled and explicit policies per role. The pattern:

```sql
-- Enable RLS on every table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Owners see all data in their lab
CREATE POLICY "owner_full_access" ON patients
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM lab_staff
    WHERE user_id = auth.uid()
    AND lab_id = patients.lab_id  -- lab_id must be on patient_visits, not patients
    AND role = 'owner'
  )
);

-- Managers see all patients in their lab
CREATE POLICY "manager_read_patients" ON patients
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM lab_staff
    WHERE user_id = auth.uid()
    AND role IN ('manager', 'scientist', 'front_desk')
  )
);

-- Scientists can read patients but not write
-- Front desk can read and write patients
-- Each needs its own policy
```

**Key rule:** Hidden UI elements are a convenience, not security. The RLS policy is the only real enforcement. Test every role with a dedicated test account before touching production.

---

## 5. Sync Engine Design

`src/lib/sync.ts`

```typescript
// The sync engine runs on two triggers:
// 1. Every 30 seconds (polling)
// 2. Immediately when the browser comes back online (event listener)

interface SyncQueueItem {
  id?: number
  table: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  recordId: string
  payload: Record<string, unknown>
  timestamp: number
  attempts: number
}

class SyncEngine {
  private isSyncing = false

  async push(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) return
    this.isSyncing = true

    try {
      const queue = await db.syncQueue.orderBy('timestamp').toArray()
      
      for (const item of queue) {
        try {
          await this.processItem(item)
          await db.syncQueue.delete(item.id!)
        } catch (error) {
          // Increment attempt counter — remove from queue after 5 failures
          const attempts = item.attempts + 1
          if (attempts >= 5) {
            await db.syncQueue.delete(item.id!)
            // TODO: log to error tracking
          } else {
            await db.syncQueue.update(item.id!, { attempts })
          }
        }
      }
    } finally {
      this.isSyncing = false
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    const { table, operation, payload } = item
    
    if (operation === 'INSERT') {
      const { error } = await supabase.from(table).insert(payload)
      if (error) throw error
    }
    if (operation === 'UPDATE') {
      const { error } = await supabase.from(table).update(payload).eq('id', item.recordId)
      if (error) throw error
    }
    if (operation === 'DELETE') {
      const { error } = await supabase.from(table).delete().eq('id', item.recordId)
      if (error) throw error
    }
  }
}

export const syncEngine = new SyncEngine()

// Start sync engine
window.addEventListener('online', () => syncEngine.push())
setInterval(() => syncEngine.push(), 30_000)
```

### Conflict Resolution Strategy

| Data type | Strategy | Reason |
|---|---|---|
| Patient demographics | Last-write-wins (timestamp) | Low conflict risk — rarely two staff editing same patient |
| Sample status | Append-only events | Status is a log, not a mutable field |
| Result parameters | Last-write-wins + version check | Only one scientist should be entering a result |
| Invoice payments | Append-only | Each payment is a new event, never overwrite |
| Inventory stock | Last-write-wins | Reconciled during stock takes |

---

## 6. Authentication Flow

```
User opens app
      │
      ▼
Check Supabase session (cached locally)
      │
      ├── Session valid → Load IndexedDB data → Render app
      │
      └── No session → Redirect to /login
                              │
                              ▼
                   Staff enters email + password
                              │
                              ▼
                   Supabase Auth validates
                              │
                              ├── Success → Cache session → Load lab_staff record
                              │            → Determine role → Render role-appropriate UI
                              │
                              └── Fail → Show error, stay on /login

Owner/Manager login additionally requires:
      │
      ▼
  2FA via TOTP (Supabase Auth MFA)
  (Enforced for owner and manager roles only)
```

---

## 7. PDF Generation Architecture

PDF generation runs **entirely client-side** using React-PDF. No server round-trip.

```
Manager clicks "Approve Result"
         │
         ▼
Result status updated to 'approved' in IndexedDB + sync queue
         │
         ▼
PDF generation triggered client-side (React-PDF)
         │
         ▼
PDF rendered from result data + lab branding (logo, MLSCN number)
         │
         ▼
PDF converted to Blob
         │
         ├── Uploaded to Supabase Storage (result-pdfs bucket)
         │
         ├── Secure time-limited URL generated (72 hours)
         │
         └── URL stored in results.pdf_url
                    │
                    ▼
         Notification queued in IndexedDB
                    │
                    ▼
         Sync engine pushes notification to Supabase
                    │
                    ▼
         Supabase Edge Function fires
                    │
         ├── WhatsApp API: Send result_ready template with URL
         └── Termii SMS: Send fallback if WhatsApp fails after 1 hour
```

---

## 8. WhatsApp Delivery via Supabase Edge Function

WhatsApp API credentials must never touch the frontend. They live in Supabase Edge Function secrets.

```typescript
// supabase/functions/send-whatsapp/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { phone, templateName, templateParams } = await req.json()

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [{
            type: 'body',
            parameters: templateParams.map((p: string) => ({ type: 'text', text: p }))
          }]
        }
      })
    }
  )

  const data = await response.json()
  return new Response(JSON.stringify(data), { status: 200 })
})
```

---

## 9. QR Code Architecture

Every sample gets a QR code label. Every result PDF contains a QR code.

**Sample label QR:** encodes the Sample ID (`#LB-9821`). Scanning at any workstation triggers a status update.

**Result PDF QR:** encodes a verification URL:
```
https://verify.labora.ai/r/{result_id}?token={signed_token}
```

The verification page:
- Loads the result from Supabase using the token
- Displays: lab name, patient name (first name only), test type, result date, hash match status
- Does **not** display the full result parameters — verification only, not full access
- Token is signed with a Supabase Edge Function secret — cannot be forged

---

## 10. Component Architecture

```
App
├── AuthProvider (Supabase session + user role context)
├── SyncProvider (online status + sync queue count context)
├── OfflineBanner (shows when offline — always rendered, conditionally visible)
└── Router
    ├── /login → LoginPage
    └── /app (requires auth)
        ├── AppLayout (Sidebar + Header + Content area)
        │   ├── Sidebar (role-based nav items)
        │   └── Header (sync status + notifications + user avatar)
        └── Pages
            ├── /dashboard → DashboardPage
            ├── /patients → PatientsPage
            │   ├── PatientListPage
            │   └── PatientDetailPage
            ├── /samples → SamplesPage
            │   ├── SampleListPage (with pipeline header)
            │   └── SampleDetailPage (with chain-of-custody timeline)
            ├── /results → ResultsPage
            │   ├── ResultEntryPage
            │   └── ResultDetailPage (with PDF preview)
            ├── /billing → BillingPage
            │   ├── InvoiceListPage
            │   └── InvoiceDetailPage
            ├── /inventory → InventoryPage
            ├── /reports → ReportsPage
            └── /settings → SettingsPage
```

---

## 11. State Management

No Redux. No Zustand. Three layers:

| Layer | What it holds | How |
|---|---|---|
| **Server state** | All data that persists | IndexedDB (Dexie) as primary, Supabase as sync target |
| **UI state** | Modal open/closed, selected tab, form values | React `useState` and `useReducer` |
| **Global context** | Auth session, user role, online status, sync queue count | React Context (3 contexts only) |

**Rule:** If a piece of state needs to survive a page refresh, it goes in IndexedDB. If it only matters for the current session's UI, it goes in React state. Never use localStorage directly — use Dexie.

---

## 12. Security Architecture

| Layer | Mechanism |
|---|---|
| Transport | TLS 1.3 enforced on all connections |
| At rest | AES-256 (Supabase default on AWS) |
| Auth | Supabase Auth — JWT tokens, auto-refresh |
| Permissions | Supabase RLS — enforced at PostgreSQL layer |
| 2FA | TOTP enforced for Owner and Manager roles |
| API secrets | Supabase Edge Function environment variables only — never in frontend code |
| PDF verification | Signed tokens — cannot be forged without server secret |
| Secure links | Time-limited (72 hours), single-use token per notification |
| Audit log | Every data write logs user_id + timestamp — append only, never deleted |
| NDPA | All data in Cape Town (af-south-1), explicit consent stored per patient, DPIA completed before go-live |

---

*Last updated: April 2026*
