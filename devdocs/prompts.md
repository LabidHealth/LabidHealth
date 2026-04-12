# Labora AI — Build Prompts
## The 40 sequential prompts that build the MVP from scaffold to launch

---

## How to use this file

Each prompt is self-contained. Paste it directly into Claude Code (or your AI coding assistant) in order. Do not skip prompts — each one builds on the previous. At the end of each prompt, verify the checklist before moving to the next.

All prompts reference `design.md`, `context.md`, and `architecture.md` as authoritative sources. If the AI suggests something that conflicts with those files, reject it and restate the rule.

---

## PHASE A — Foundation (Prompts 1–8)

---

### Prompt 1 — Project Scaffold & Global Styles

```
You are building Labora AI — a PWA for Nigerian diagnostic labs. 
Read design.md in full before writing any code.

Set up the following:

1. Configure `src/styles/globals.css` with ALL CSS variables from design.md sections 2, 3, and 4 — every colour, every font size, every spacing token, every border radius. Use the exact variable names from the design file.

2. Add a CSS reset: box-sizing border-box, margin 0, padding 0, font-family Inter.

3. Import Inter from Google Fonts in index.html (weights 400, 500, 600, 700).
   Import JetBrains Mono from Google Fonts (weight 500) for monospace IDs.

4. Import globals.css in main.tsx.

5. Verify: run `npm run dev`, open in Chrome, open DevTools → Elements → :root and confirm all CSS variables are present.

Do not create any components yet. Foundation only.
```

**Checklist before next prompt:**
- [ ] All CSS variables from design.md are in globals.css
- [ ] Inter and JetBrains Mono load correctly in browser
- [ ] No TypeScript errors

---

### Prompt 2 — TypeScript Types

```
Read architecture.md section 3 (Database Schema) and context.md section 7 (User Roles).

Create `src/types/index.ts` with TypeScript interfaces for every entity in the system:

- Lab
- LabStaff (with UserRole type: 'owner' | 'manager' | 'scientist' | 'front_desk')
- Patient (with LAPID field typed as string)
- PatientVisit
- Sample (with SampleStatus type for all 5 statuses)
- SampleEvent
- Result (with ResultStatus type, and parameters as a typed JSONB structure)
- ResultAmendment
- Invoice (with InvoiceStatus type)
- Payment (with PaymentMethod type for all 5 methods)
- InventoryItem
- InventoryEvent
- Notification (with NotificationChannel and NotificationStatus types)
- SyncQueueItem (for the offline sync queue)

For monetary values: always store as integers in kobo (multiply naira by 100). Add a comment on every monetary field: `// stored in kobo — divide by 100 for display`.

All fields should match the column names in architecture.md schema exactly.
Export all types and all union types.
```

**Checklist:**
- [ ] `npm run typecheck` passes with zero errors
- [ ] All monetary fields have the kobo comment

---

### Prompt 3 — Supabase Client & Dexie Setup

```
Read architecture.md sections 3, 5, and setup.md Step 3.

1. Create `src/lib/supabase.ts`:
   - Supabase client singleton using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from import.meta.env
   - Throw a clear error if env vars are missing
   - Export the typed client using the Database type (use `any` as placeholder until types are generated)

2. Create `src/lib/db.ts`:
   - Dexie database class named LaboraDatabase
   - Version 1 schema with all tables and indexes from architecture.md section 3
   - Export singleton instance as `db`
   - Add TypeScript table types for all 10 tables

3. Create `src/lib/formatters.ts`:
   - formatNaira(kobo: number): string — "₦182,500" / "₦1.82M" above ₦1,000,000 (remember input is kobo)
   - formatLAPID(raw: string): string — ensures LA-YYYY-NNNNN format
   - formatPhone(raw: string): string — always returns "+234 XXX XXX XXXX"
   - formatDate(date: Date | string): string — "24 Oct 2023"
   - formatDateTime(date: Date | string): string — "24 Oct 2023, 09:12 AM"
   - formatTimeAgo(date: Date | string): string — "2 mins ago" / "3 hrs ago" / "Yesterday"
   - formatSampleID(raw: string): string — "#LB-9821"
   - formatInvoiceID(raw: string): string — "#INV-9021"

Add unit tests for every formatter function using Vitest. Run `npm run test` to verify all pass.
```

**Checklist:**
- [ ] Supabase client initialises without error
- [ ] Dexie database opens without error in browser DevTools → Application → IndexedDB
- [ ] All formatter tests pass

---

### Prompt 4 — Auth Context & Login Page

```
Read design.md sections 2, 3, 5.1, 5.6, and context.md section 7.

1. Create `src/hooks/useAuth.ts`:
   - Custom hook wrapping Supabase auth
   - Returns: { user, session, role, labId, loading, signIn, signOut }
   - On sign-in, fetch the lab_staff record from Supabase to get role and lab_id
   - Cache the role in localStorage for offline access

2. Create `src/context/AuthContext.tsx`:
   - Provides auth state to the entire app
   - Wraps useAuth
   - Export useAuthContext hook

3. Create `src/pages/login/LoginPage.tsx`:
   - Dark background (#0A0A0A)
   - Centred card (max-width 400px) on the surface colour
   - Labora AI logo/wordmark at top (text-based: "Labora AI" in mint, "Lab Infrastructure for Africa" in secondary)
   - Email input and Password input using design.md form styles
   - "Sign in" primary mint button
   - Loading state: spinner replaces button text, button stays same size
   - Error state: red error message below the form
   - No "forgot password" link at MVP stage — keep it minimal

4. Set up routing in App.tsx:
   - /login → LoginPage (public)
   - /app/* → Protected (redirect to /login if no session)
   - Default redirect: / → /app/dashboard

Do not create the dashboard yet — just confirm the auth flow works end-to-end.
```

**Checklist:**
- [ ] Can sign in with a Supabase test account
- [ ] Role is correctly loaded from lab_staff table
- [ ] Unauthenticated users are redirected to /login
- [ ] Loading spinner works correctly

---

### Prompt 5 — App Layout: Sidebar & Header

```
Read design.md sections 4, 5.9, 5.3, 5.10, and 8 (icons) in full.

1. Create `src/components/layout/Sidebar.tsx`:
   - Exactly 240px wide, fixed, full height
   - Background: --color-black, right border: 1px solid --color-border
   - Brand section at top: "Labora AI" in mint (15px 700), lab name below in secondary (11px uppercase)
   - Navigation items in the exact order from design.md section 5.9
   - Each nav item uses the exact Lucide icon from design.md section 8
   - Active state: mint background tint, mint text, 2px left border in mint
   - Role-based visibility: hide billing from scientists, hide inventory from front desk, etc. (see context.md section 7 for role access table)
   - Footer: Support (HelpCircle) and Logout (LogOut) items
   - On mobile (< 768px): render as bottom navigation bar instead (5 icons max)

2. Create `src/components/layout/Header.tsx`:
   - 64px tall, full width of content area
   - Left: page title (passed as prop)
   - Right: sync status indicator + notification bell + user avatar
   - Sync status indicator: dot (8px) + text, colour based on online/sync state
   - Must be visible on EVERY authenticated page — never hide it

3. Create `src/hooks/useOnlineStatus.ts`:
   - Returns { isOnline, pendingSyncCount }
   - Listen to window 'online'/'offline' events
   - Read pendingSyncCount from db.syncQueue.count()

4. Create `src/components/layout/OfflineBanner.tsx`:
   - Full-width amber banner, renders BELOW the header
   - Shows when offline: "● WORKING OFFLINE — N CHANGES PENDING SYNC" with "Force upload" action
   - Hidden when online
   - Matches design.md section 5.10 exactly

5. Create `src/components/layout/AppLayout.tsx`:
   - Composes Sidebar + Header + OfflineBanner + children
   - Children rendered in the main content area with 24px padding

All role-based hidden elements must be absent from the DOM — not just invisible.
```

**Checklist:**
- [ ] Sidebar renders with correct active state on current route
- [ ] Sync indicator shows correct state (test by going offline in DevTools)
- [ ] Offline banner appears/disappears correctly
- [ ] Mobile bottom nav renders at < 768px
- [ ] Role-based nav items hide correctly (test with scientist and front_desk accounts)

---

### Prompt 6 — Reusable UI Components

```
Read design.md sections 5.1 through 5.8 in full.

Build every primitive component listed in design.md. Each component must match the spec exactly — colours, sizing, states, and behaviour.

1. `src/components/ui/Button.tsx` — variants: primary, secondary, danger, text. Props: variant, size (sm/md/lg), loading (bool), icon (ReactNode), disabled. Loading state shows spinner and keeps button dimensions.

2. `src/components/ui/Badge.tsx` — all badge types from design.md table 5.2. Prop: status (typed union of all badge names). Renders correct text + colours automatically from the status prop.

3. `src/components/ui/StatCard.tsx` — label, value, sub text, optional trend (up/down/neutral), optional warning/danger border. Match design.md section 5.4 exactly.

4. `src/components/ui/Input.tsx` — all states: default, focus (mint border), error (red border), disabled. Error message prop renders below. Label prop renders above.

5. `src/components/ui/PhoneInput.tsx` — the +234 prefixed phone input from design.md section 5.6. Formats as "+234 XXX XXX XXXX" as user types.

6. `src/components/ui/Modal.tsx` — overlay, container, header slot, body slot, footer slot. Mobile: renders as bottom sheet. Close button top-right. Fade-in animation from design.md section 9.

7. `src/components/ui/Avatar.tsx` — initials-based with deterministic colour assignment from design.md section 5.8. Supports photo URL prop.

8. `src/components/ui/Table.tsx` — container, th, td, with ID cell variant (monospace mint), status cell (auto-renders Badge), action cell (MoreVertical icon), STAT row variant (amber left border).

9. `src/components/ui/EmptyState.tsx` — icon, headline, optional CTA button. Used for every empty table.

10. `src/components/ui/Toast.tsx` — bottom-right positioned, auto-dismiss (4 seconds). Variants: success (mint left border), warning (amber), error (red).

Export all from `src/components/ui/index.ts`.
```

**Checklist:**
- [ ] Every component renders without errors
- [ ] Button loading state tested
- [ ] Badge renders correct colours for all status types
- [ ] PhoneInput formats Nigerian numbers correctly
- [ ] Modal renders as bottom sheet on mobile viewport

---

### Prompt 7 — Sync Engine

```
Read architecture.md section 5 (Sync Engine Design) in full.

1. Create `src/lib/sync.ts`:
   - SyncEngine class exactly as specified in architecture.md
   - push() method: iterates syncQueue, processes each item against Supabase, removes on success, increments attempts on failure, removes after 5 failed attempts
   - processItem() handles INSERT, UPDATE, DELETE for any table
   - isSyncing guard prevents concurrent sync runs
   - Start the engine: window.addEventListener('online', ...) and setInterval every 30 seconds

2. Create `src/hooks/useSyncQueue.ts`:
   - Returns syncQueueCount: number (live count from Dexie)
   - Updates reactively when queue changes (use Dexie liveQuery)

3. Create `src/context/SyncContext.tsx`:
   - Provides { isOnline, syncQueueCount, isSyncing, forceSync }
   - forceSync() calls syncEngine.push() immediately
   - Used by Header sync indicator and OfflineBanner

4. Create a helper `src/lib/writeRecord.ts`:
   - Generic function: writeRecord(table, operation, payload)
   - Step 1: Write to IndexedDB (Dexie)
   - Step 2: Add to syncQueue
   - Step 3: If online, immediately trigger syncEngine.push()
   - Step 4: Return the locally-written record
   - This is the ONLY function that should be called for any data write in the app

Test the sync engine:
- Register a test patient while offline (Airplane Mode in DevTools)
- Confirm it appears in IndexedDB (DevTools → Application → IndexedDB → LaboraAI → patients)
- Come back online
- Confirm the patient appears in Supabase table within 30 seconds
```

**Checklist:**
- [ ] Patient registered offline syncs to Supabase on reconnect
- [ ] Sync queue count shows correctly in Header
- [ ] Force sync button in OfflineBanner works
- [ ] Multiple offline writes all sync correctly

---

### Prompt 8 — Dashboard Page

```
Read design.md section 5.4 (StatCards) and context.md section 8 (Module 8).
Read the role-based UI visibility table in design.md section 11.

Build `src/pages/dashboard/DashboardPage.tsx`:

1. Page title: "Dashboard"

2. Top row — 4 StatCards (2 columns on tablet, 1 on mobile):
   - Tests Today — value from samples created today, trend vs yesterday
   - Revenue Today — value in ₦ (owner only — hide entirely for other roles), trend vs yesterday
   - Pending Approvals — count of results in 'awaiting_approval', warning border if > 0
   - Undelivered Results — count of approved results not yet opened after 24hrs, danger border if > 0

3. Second row — 2 StatCards:
   - Average TAT — average hours from sample received to result approved today
   - Low Stock Items — count of inventory items below minimum level, warning border if > 0

4. Tests This Week — a simple bar chart (use recharts) showing tests per day for the last 7 days. If recharts is not installed, install it. Bar colour: --color-mint. Background: --color-surface. Never show an empty chart — show placeholder data if no tests yet.

5. Top 5 Tests by Volume — a simple table showing test name and count for the current month.

6. Pending Approvals Queue — list of results awaiting approval. Each row shows: Patient name, LAPID (monospace mint), test type, time elapsed since entry. "Approve" button routes to the result detail page. Empty state if none pending.

All data is read from IndexedDB (Dexie) first. If online, also fetch from Supabase and update IndexedDB.
Revenue figures are completely absent from the DOM for non-owner roles (not just hidden).
```

**Checklist:**
- [ ] Dashboard loads from IndexedDB when offline
- [ ] Revenue stat card is absent from DOM for scientist/front_desk roles
- [ ] Charts render correctly (no empty chart — show placeholder if no data)
- [ ] Pending approvals queue links to correct result pages

---

## PHASE B — Core Modules (Prompts 9–24)

---

### Prompt 9 — Patient Registration Form

```
Read design.md sections 5.6 (Form Inputs), 5.7 (Modals), 6.1 (LAPID Format), 6.4 (Duplicate Detection Modal).
Read context.md section 8 Module 1.

Build `src/pages/patients/RegisterPatientPage.tsx`:

1. Form fields (all using the Input component from design.md):
   - Full Name (required)
   - Date of Birth (DD/MM/YYYY format)
   - Gender (select: Male / Female / Other)
   - Phone Number (PhoneInput component — +234 prefix)
   - Address
   - Next of Kin name + phone
   - Optional: Patient photo upload button (camera or file)
   - NDPA consent checkbox — required before saving. Label: "I consent to my health data being stored and shared across Labora AI labs I visit. I can withdraw this consent at any time."

2. On form submit (before saving):
   - Search IndexedDB AND Supabase for patients with matching phone number OR similar name (fuzzy match — if name similarity > 70%, flag as potential duplicate)
   - If a potential duplicate is found: show the Duplicate Detection Modal (design.md section 6.4)
   - Modal shows three columns: attribute, current entry, existing record
   - Matching fields highlighted in red, exact matches in mint
   - Match confidence badge (e.g. "94% Match")
   - Three buttons: "Go back & edit" | "This is a new patient" | "Use existing record"

3. If no duplicate found OR "This is a new patient" chosen:
   - Generate LAPID using pattern LA-{YEAR}-{SEQUENCE}
   - Write to IndexedDB + sync queue via writeRecord()
   - Show success toast: "Patient registered — LAPID: LA-2025-00847"
   - Navigate to the new patient's detail page

4. If "Use existing record" chosen:
   - Create a new patient_visit linked to the existing LAPID
   - Navigate to the existing patient's detail page

Auto-save indicator bottom-left: "● All changes autosaved" in mint.
```

**Checklist:**
- [ ] Duplicate detection fires correctly on matching phone number
- [ ] Duplicate modal shows comparison correctly with colour coding
- [ ] LAPID is generated in correct format
- [ ] Form saves to IndexedDB when offline
- [ ] NDPA consent checkbox is required — form cannot submit without it

---

### Prompt 10 — Patient List Page

```
Build `src/pages/patients/PatientListPage.tsx`:

1. Page header: "Patients" title + "Register Patient" primary button (UserPlus icon)

2. Search bar: searches by name, phone number, or LAPID in real-time from IndexedDB. Uses fuzzy matching for names (handles Nigerian name variations). Lucide Search icon left-aligned inside the input.

3. Filter row (secondary): Today | This Week | All Time — filters by registration date

4. Patients table with columns:
   - Patient (Avatar initials + Full Name + LAPID in monospace mint below name)
   - Phone (+234 format)
   - Last Visit (formatTimeAgo)
   - Total Visits (count)
   - Consent (tick or cross)
   - Actions (MoreVertical → View, Edit, Print LAPID card)

5. Clicking any row navigates to PatientDetailPage

6. Empty state: Users icon (40px, muted) + "No patients yet" + "Register first patient" button

7. Pagination: 25 rows per page, previous/next buttons

All data read from IndexedDB. Sync from Supabase on mount if online.
```

---

### Prompt 11 — Patient Detail Page

```
Build `src/pages/patients/PatientDetailPage.tsx`:

1. Page header: patient full name + LAPID badge (monospace mint pill)

2. Patient info card: all demographics, consent status, edit button (role-gated — front_desk and manager only)

3. Visit History tab: table of all visits across all labs (if consent given), date, lab name, tests ordered

4. Results tab: all results linked to this LAPID, test type, date, status badge, download PDF button

5. Invoices tab: all invoices, date, total, status badge

6. "New Visit / Register Sample" button — primary mint, routes to sample registration with LAPID pre-filled

7. LAPID card print button: generates a printable card (credit card size) with the LAPID in large monospace mint and a QR code
```

---

### Prompt 12 — Sample Registration & QR Label

```
Read context.md section 8 Module 2. Read architecture.md section 9 (QR Code Architecture).

Build `src/pages/samples/RegisterSamplePage.tsx`:

1. LAPID lookup at top: scan QR code (using html5-qrcode library) OR type LAPID OR type patient name/phone. On match, show patient name + photo for identity confirmation.

2. Tests ordered: multi-select checkboxes grouped by category:
   - Haematology: FBC, Differential Count, ESR, Blood Group & Genotype, Malaria RDT, Malaria Microscopy
   - Biochemistry: LFT, RFT, Lipid Panel, Fasting Glucose, HbA1c
   - Microbiology: Culture & Sensitivity, Widal Test, VDRL/TPHA, HBsAg, HIV Screening
   - Urinalysis: Urinalysis, Urine Microscopy
   - Hormones: TSH, FT3, FT4, PSA, Pregnancy Test
   - Other: Stool Microscopy

3. Additional fields: Referring doctor name, collection date/time (defaults to now), STAT toggle (makes the sample urgent — amber highlight everywhere)

4. On submit:
   - Generate Sample ID: LB-{RANDOM 4 DIGITS}
   - Write sample to IndexedDB + sync queue
   - Write first sample_event: { type: 'received', performed_by: current user }
   - Auto-generate invoice with prices from lab price list
   - Trigger QR label PDF generation (see step 5)
   - Navigate to sample detail page

5. QR Label PDF (React-PDF, A6 size, portrait):
   - Lab logo + name top left
   - Sample ID in large monospace: #LB-9821
   - Patient name + LAPID below
   - QR code (encodes the Sample ID)
   - Tests ordered listed below QR
   - Date + time + STAT badge if urgent
   - Print dialog opens automatically
```

**Checklist:**
- [ ] QR scanner works in Chrome on Android tablet
- [ ] STAT samples are flagged everywhere they appear
- [ ] Invoice is auto-created on sample registration
- [ ] QR label PDF prints correctly

---

### Prompt 13 — Sample Tracking List & Pipeline

```
Read design.md sections 6.5 (Sample Tracking Pipeline) and 6.6 (Chain of Custody Timeline).

Build `src/pages/samples/SampleListPage.tsx`:

1. Status pipeline at top of page — 5 horizontal cards:
   RECEIVED | PROCESSING | AWAITING APPROVAL | READY | DELIVERED
   - Each card shows count of samples currently in that status
   - Active filter: mint border
   - AWAITING APPROVAL: always amber border (requires action)
   - Clicking a card filters the table below to that status

2. Filter bar: Today | This Week | search by Sample ID or patient name

3. Samples table columns:
   - Sample ID (monospace mint, #LB-9821 format)
   - Patient (avatar + name + LAPID)
   - Tests (comma-separated list, truncate if > 3: "FBC, LFT +2 more")
   - Status badge
   - Referring Doctor
   - Time elapsed since received (formatTimeAgo)
   - STAT badge if urgent
   - Actions: View, Update Status, Print Label

4. STAT rows: amber left border on the entire row (design.md table rules)

5. Empty state per status: e.g. "No samples awaiting approval"
```

---

### Prompt 14 — Sample Detail & Chain of Custody

```
Build `src/pages/samples/SampleDetailPage.tsx`:

Two-column layout (stack on mobile):

LEFT COLUMN (wider):
1. Sample header: Sample ID (large monospace) + STAT badge if urgent + status badge
2. Patient card: name, LAPID, phone
3. Tests ordered: each test as a card with current status
4. "Update Status" button — opens modal to move sample to next status stage. Logs a sample_event on every status change.
5. "Reject Sample" button (danger) — requires rejection reason, notifies patient to re-submit

RIGHT COLUMN:
6. Chain of Custody Timeline — vertical timeline (design.md section 6.6):
   - Each sample_event as a timeline item
   - Completed steps: mint dot
   - Current/active step: amber dot
   - Each item: event type, performed by, workstation, timestamp
   - "Who handled this sample and when" — never deletable

7. QR Scanner panel: scan a QR code to log current user at this workstation. Auto-updates status based on which workstation triggers the scan.
```

---

### Prompt 15 — Result Entry Form

```
Read design.md sections 6.2 (Out-of-Range Values) and context.md Module 3.

Build `src/pages/results/ResultEntryPage.tsx`:

1. Sample and patient info at top (read-only): Sample ID, patient name, LAPID, test type, referring doctor

2. For each test type, render the appropriate structured form. Start with these 5 most common:

   FBC (Full Blood Count):
   - Haemoglobin (g/dL) — reference: M: 13.5–17.5, F: 12.0–16.0
   - WBC (×10⁹/L) — reference: 4.0–11.0
   - Platelets (×10⁹/L) — reference: 150–400
   - PCV/Haematocrit (%) — reference: M: 40–52, F: 36–48
   - MCV (fL) — reference: 80–100
   - MCH (pg) — reference: 27–33
   - MCHC (g/dL) — reference: 32–36

   Fasting Blood Glucose:
   - Glucose (mmol/L) — reference: 3.9–5.5 (fasting)

   LFT (Liver Function Test):
   - Total Bilirubin, Direct Bilirubin, ALT, AST, ALP, Total Protein, Albumin (with respective ranges)

   RFT (Renal Function Test):
   - Urea, Creatinine, eGFR, Sodium, Potassium, Chloride, Bicarbonate

   Malaria RDT:
   - Result: Positive / Negative (select)
   - Species if positive (P. falciparum / P. vivax / Mixed / Not determined)

3. As each value is typed:
   - If within range: render as --color-text-secondary
   - If above range: red background pill, ↑ indicator, font-weight 600 (design.md section 6.2)
   - If below range: amber background pill, ↓ indicator, font-weight 600

4. Critical value detection: if any value exceeds critical threshold (e.g. Hb < 6 g/dL, Platelets < 50):
   - Show critical acknowledgment banner (design.md section 6.2)
   - Submit button is DISABLED until the toggle is confirmed
   - Log the acknowledgment with timestamp and user ID

5. Comments/interpretation field: free text, shown with a left red border accent in the PDF

6. "Save Draft" button (secondary) and "Submit for Approval" button (primary mint)
   - Save Draft: saves to IndexedDB only, status: 'draft'
   - Submit for Approval: status becomes 'awaiting_approval', manager is notified
```

**Checklist:**
- [ ] Out-of-range values highlight in real-time as user types
- [ ] Critical value banner blocks submission correctly
- [ ] Submit for approval triggers manager notification
- [ ] Form saves to IndexedDB when offline

---

### Prompt 16 — Result Approval & PDF Generation

```
Read architecture.md section 7 (PDF Generation Architecture) and design.md section 6.3 (PDF layout).

1. Build `src/pages/results/ResultApprovalPage.tsx`:
   - Shows result in read-only view with all values and highlighting
   - Out-of-range values highlighted in red (same as entry form)
   - Critical value acknowledgment shown if logged
   - Entered by (scientist name) + timestamp
   - Two buttons: "Reject — Send back for correction" (danger) | "Approve & Generate PDF" (primary mint)
   - Rejection: requires reason, sends notification back to scientist, status → 'draft'
   - Approval: triggers PDF generation (step 2)

2. Build `src/components/pdf/ResultPDF.tsx` using React-PDF:
   PDF layout exactly as specified in design.md section 6.3:
   - White background (#FFFFFF) — the only light-theme screen
   - Header: lab logo left, lab name + address + MLSCN number right
   - Patient section: NAME IN ALL CAPS (large), LAPID in monospace, age, gender
   - Referring doctor + collection date + result date
   - Test name as section heading (forest green #003D28)
   - Parameters table: Parameter | Result | Unit | Reference Range
   - Out-of-range: red bold with ↑ or ↓
   - Comments section with left red border accent
   - QR code bottom-right (links to verification page)
   - Footer: "Generated: 24 Oct 2023, 09:12 AM | Report ID: #RES-00123"

3. On approval:
   - Generate PDF using React-PDF
   - Convert to Blob
   - Upload to Supabase Storage (result-pdfs bucket) via sync queue if offline
   - Store URL in results.pdf_url
   - Update result status to 'approved'
   - Queue WhatsApp notification (or SMS fallback)
   - Log sample_event: { type: 'approved', approved_by: current user }
```

**Checklist:**
- [ ] PDF renders correctly with lab logo and MLSCN number
- [ ] Out-of-range values show in red bold in PDF
- [ ] QR code is present in PDF and links to correct URL
- [ ] PDF upload works (confirm file appears in Supabase Storage)
- [ ] WhatsApp notification is queued on approval

---

### Prompt 17 — Results List Page

```
Build `src/pages/results/ResultListPage.tsx`:

1. Two tabs: "Pending Approval" | "All Results"

2. Pending Approval tab:
   - Table: Patient, LAPID, Test Type, Scientist, Time Since Entry, Actions (Review button)
   - Sort by oldest first (urgent items at top)
   - Empty state: "No results awaiting approval" with CheckCircle icon

3. All Results tab:
   - Table: Patient, LAPID, Test Type, Status badge, Approved By, Date, Actions
   - Filter: by date range, by test type, by status
   - Actions: View, Download PDF, Resend to Patient, Amend

4. Result amendment flow:
   - "Amend" opens modal requesting amendment reason
   - On confirm: current result saved to result_amendments table, result reopened for editing
   - Amended result shows "AMENDED" badge in red next to the result
   - Amendment reason visible in result detail

Role enforcement: Approve button is absent from DOM for scientist and front_desk roles.
```

---

### Prompt 18 — WhatsApp & SMS Delivery

```
Read architecture.md section 8 (WhatsApp Edge Function) and context.md Module 4.

1. Create Supabase Edge Function `supabase/functions/send-result-notification/index.ts`:
   - Accepts: { notificationId, channel: 'whatsapp' | 'sms' }
   - Fetches notification + result + patient data from Supabase
   - If channel = 'whatsapp': calls WhatsApp Business API with result_ready template
   - If channel = 'sms': calls Termii API with SMS template
   - Updates notification status: 'sent' with sent_at timestamp
   - Handles errors: if WhatsApp fails, automatically retries with SMS

2. Create `src/lib/notifications.ts`:
   - queueNotification(resultId, lapid, pdfUrl): creates notification record in IndexedDB + sync queue
   - getDeliveryStatus(notificationId): returns current status from IndexedDB

3. Build delivery status display in ResultDetailPage:
   - "Delivery Status" section showing: channel (WhatsApp icon or SMS icon), status badge, sent_at, delivered_at, opened_at
   - "Resend" button: creates new notification if current one failed or older than 24hrs
   - "Patient has not opened result" warning badge (amber) if opened_at is null and sent_at > 24hrs ago

4. Test the full delivery flow:
   - Approve a test result
   - Confirm notification is queued in IndexedDB
   - Confirm Edge Function is triggered when online
   - Confirm WhatsApp message is received on test phone
   - Confirm notification status updates to 'delivered' and then 'opened'
```

**Checklist:**
- [ ] WhatsApp message received on test phone after result approval
- [ ] SMS fallback fires if WhatsApp fails
- [ ] Delivery status updates correctly (sent → delivered → opened)
- [ ] Resend button creates new notification correctly

---

### Prompt 19 — Billing: Invoice & Payment

```
Read context.md Module 6. Read design.md formatting rules for ₦.

1. Build `src/pages/billing/InvoiceDetailPage.tsx`:
   - Invoice header: #INV-9021 (monospace mint), patient name, LAPID, date
   - Line items table: Test Name | Price (₦) — auto-populated from lab price list
   - Subtotal, Labora AI platform fee (shown separately — owner view only), Total
   - Payment status badge: UNPAID / PARTIAL / PAID
   - Outstanding balance in red if > 0

2. Payment recording panel (right side):
   - Amount input (₦)
   - Payment method: Cash | POS | Bank Transfer | OPay | PalmPay — rendered as toggleable buttons, not a dropdown
   - "Record Payment" primary button
   - Partial payment: records against invoice, updates status to 'partial', shows remaining balance
   - On full payment: status → 'paid', generate receipt

3. Build Receipt PDF (React-PDF):
   - Lab name + logo + address
   - Receipt number, date, time
   - Patient name + LAPID
   - Tests paid for + amounts
   - Payment method + total paid
   - "PAID IN FULL" stamp in mint (or "PARTIAL PAYMENT" in amber)
   - Print button triggers browser print dialog

4. Build `src/pages/billing/InvoiceListPage.tsx`:
   - Tabs: All | Unpaid | Partial | Paid
   - Table: Invoice ID, Patient, Tests, Total, Outstanding, Status badge, Actions
   - Daily reconciliation summary at top (owner only): Total collected today, Total outstanding today
```

---

### Prompt 20 — Billing: Price List Management

```
Build `src/pages/settings/PriceListPage.tsx`:

1. Tests listed by category (same categories as sample registration)

2. Each test row: Test Name | Standard Price (₦) | HMO Price (₦) | Corporate Price (₦) | Edit

3. Edit inline: click price → input becomes editable → save on blur or Enter

4. "Add custom test" button: form to add a non-standard test with name + prices

5. All price changes saved to IndexedDB + synced to Supabase

6. The price list is used to auto-populate invoices on sample registration. When a sample is registered with 3 tests, the invoice is immediately created with the current prices for those 3 tests.

Store prices in kobo (multiply by 100). Display in naira with ₦ prefix.
```

---

### Prompt 21 — Inventory Management

```
Read context.md Module 5.

1. Build `src/pages/inventory/InventoryPage.tsx`:

   Top stat row:
   - Total Items in stock
   - Low Stock Items (amber border if > 0)
   - Expiring Soon — items expiring in < 30 days (amber/red based on urgency)

   Inventory table:
   - Item Name | Category | Stock Level | Unit | Min Level | Expiry Date | Supplier | Actions
   - Low stock rows: amber left border
   - Expired rows: red left border, EXPIRED badge
   - Expiring in < 7 days: red EXPIRING SOON badge
   - Expiring in 7–30 days: amber LOW STOCK badge

2. "Record Usage" action:
   - Opens modal: item, quantity used, date
   - Decrements stock in IndexedDB + logs inventory_event

3. "Restock" action:
   - Opens modal: item, quantity added, supplier, purchase price, new expiry date
   - Increments stock + logs inventory_event

4. "Add Item" button: form to add a new inventory item with all fields

5. Monthly usage report: button that generates a PDF report of all items consumed in the current month, with total cost. Uses React-PDF.
```

---

### Prompt 22 — Operations Dashboard (Complete)

```
Upgrade the dashboard built in Prompt 8 with complete data and remaining widgets.

Add to DashboardPage:

1. New vs Returning Patients ratio — donut chart (recharts). New = first visit, Returning = has previous visits. Show counts and percentages.

2. Staff Productivity table (manager/owner only): Scientist name | Tests entered today | Tests approved today. Read from sample_events where performed_by = user.

3. Revenue trend line chart (owner only): last 30 days, daily revenue as a line chart. Mint colour line on dark surface. Show ₦ values on y-axis.

4. Undelivered Results list: results where notification.opened_at IS NULL and approved_at > 24 hours ago. Patient name, LAPID, test type, approved time, "Resend" button inline.

5. Low Stock quick view: the 5 most critical inventory items (lowest relative to minimum). Item name, current stock, minimum, a narrow progress bar showing current/minimum ratio in amber/red.

All charts use recharts. All charts must show placeholder data if real data is empty (never show an empty chart frame).
```

---

### Prompt 23 — Reports Page

```
Build `src/pages/reports/ReportsPage.tsx`:

Four report cards, each with a date range picker and "Generate" button:

1. Revenue Report (owner only):
   - Total revenue by period
   - Revenue per test type (bar chart)
   - Payment method breakdown (donut chart)
   - Outstanding invoices aging (how many days overdue)
   - Export as PDF or CSV

2. Test Volume Report:
   - Tests processed by day (line chart)
   - Top 10 tests by volume (horizontal bar chart)
   - Average TAT per test type (table)
   - Export as PDF or CSV

3. Inventory Report:
   - Current stock levels vs minimum (for all items)
   - Items used this period (with quantities)
   - Wastage log
   - Purchase orders this period
   - Export as PDF or CSV

4. Patient Report:
   - New patients registered
   - Returning patient rate
   - Tests per patient average
   - Export as CSV

All PDF reports use React-PDF, matching the design system (dark header, lab logo, date range, table data). All CSV exports use the browser download API.
```

---

### Prompt 24 — Settings Page

```
Build `src/pages/settings/SettingsPage.tsx` with 4 tabs:

1. Lab Profile (owner only):
   - Lab name, address, phone, MLSCN registration number
   - Logo upload (stores in Supabase Storage lab-logos bucket)
   - PDF footer text and disclaimer text
   - Save changes button

2. Staff Management (owner only):
   - Table of all staff: name, role, email, last login, status (Active/Inactive)
   - "Invite Staff" button: email + role selector → sends Supabase auth invite email
   - Deactivate account (cannot deactivate self)
   - Role badge with colour per role

3. Price List — links to PriceListPage (Prompt 20)

4. Notifications:
   - Toggle: WhatsApp result delivery (on/off)
   - Toggle: SMS fallback (on/off)
   - Toggle: Doctor notifications (on/off)
   - Test WhatsApp button: sends a test message to the lab owner's phone
   - WhatsApp templates preview
```

---

## PHASE C — Polish & Launch (Prompts 25–40)

---

### Prompt 25 — QR Scanner Integration

```
Integrate html5-qrcode into the app for sample label scanning.

1. Build `src/components/shared/QRScanner.tsx`:
   - Uses html5-qrcode to access device camera
   - Shows camera preview in a modal
   - On successful scan: returns the decoded text to parent via onScan callback
   - Error handling: if camera permission denied, show instructions
   - Manual entry fallback: text input for typing Sample ID directly
   - Test on Android tablet — the camera quality matters here

2. Integrate QR scanner into:
   - Sample registration page (scan patient LAPID to pre-fill)
   - Sample detail page (scan to log chain-of-custody event)
   - Sample list page (scan to quickly find a sample)

3. QR code generation for sample labels:
   - Use react-qr-code library
   - QR code encodes the Sample ID string (#LB-9821)
   - Minimum size: 3cm × 3cm when printed (approximately 113px at 96dpi)
   - Test that the generated QR code scans successfully with the scanner component
```

---

### Prompt 26 — Offline State Testing & Hardening

```
This prompt is about testing and hardening — not building new features.

Test every critical flow in offline mode (use Chrome DevTools → Network → Offline):

1. Register a patient while offline → verify IndexedDB write → come online → verify Supabase sync
2. Register a sample while offline → verify IndexedDB write → come online → verify sync
3. Enter a result while offline → verify IndexedDB write → come online → verify sync
4. Record a payment while offline → come online → verify sync
5. Update inventory while offline → come online → verify sync

For each flow, verify:
- UI responds instantly (no spinner waiting for network)
- Correct toast: "Saved locally — will sync when connection returns"
- Sync status indicator shows correct state throughout
- Data appears in Supabase within 30 seconds of coming online

Fix any issues found. Document any edge cases in a KNOWN_ISSUES.md file.

Then test the PWA installation:
- On Android tablet, open the app in Chrome
- Confirm "Add to Home Screen" prompt appears
- Install the app
- Launch from home screen — confirm full-screen standalone mode
- Confirm the app loads from cache with no internet
```

---

### Prompt 27 — Role-Based Access Hardening

```
Read design.md section 11 (Role-Based UI Visibility) and architecture.md section 4 (RLS Policies).

1. Audit every page and component: verify that every role-restricted UI element is ABSENT FROM THE DOM (not just hidden) for unauthorised roles. Use React DevTools to inspect the DOM for each role.

2. Write and test all Supabase RLS policies:
   - patients: staff can only see patients from their own lab
   - samples: staff can only see samples from their own lab; scientists only see assigned samples
   - results: scientists can only see results for their own lab; cannot approve their own results
   - invoices: front_desk can see and create invoices; cannot see revenue totals
   - inventory: only manager and owner can see and edit
   - lab_staff: only owner can see the full list and manage accounts

3. Test each policy with a dedicated test account per role:
   - Create: owner@test.com, manager@test.com, scientist@test.com, frontdesk@test.com
   - Log in as each and attempt actions that should be blocked
   - Verify that blocked actions fail at the Supabase layer (not just the UI)

4. Add a test for the critical rule: a scientist cannot approve their own result.
   Set a result's entered_by to the scientist's user_id.
   Log in as that scientist. Confirm the Approve button is absent from the DOM.
```

---

### Prompt 28 — Performance Optimisation for Low-Spec Android

```
This prompt optimises the app for ₦40,000 Android tablets with 2GB RAM.

1. Bundle analysis: run `npm run build` then `npx vite-bundle-analyzer dist` to see what's large.
   Target: total JS bundle < 500KB gzipped.

2. Code splitting: implement React.lazy() and Suspense for every page component in the router.
   Each page should only load when navigated to — not on initial load.

3. Image optimisation: all images (lab logos, patient photos) should be compressed before upload.
   Add client-side compression using the browser Canvas API before uploading to Supabase.
   Target: images < 200KB.

4. React-PDF: defer the PDF generation library load until actually needed (first time a PDF is generated).
   Do not include it in the initial bundle.

5. recharts: ensure it's tree-shaken correctly — only import the components used.

6. Remove any console.log statements from production builds:
   Add to vite.config.ts: esbuild: { drop: ['console', 'debugger'] } for production builds.

7. Test on the actual Android tablet with CPU throttling at 4x slowdown in Chrome DevTools.
   Target: initial page load < 3 seconds on 4G connection, < 1 second from cache.
```

---

### Prompt 29 — Error Handling & Empty States

```
Audit the entire app for missing error and empty states. Implement all missing ones.

1. Every data table must have a specific empty state (design.md section 12):
   - Patients list: "No patients yet" + Register Patient button
   - Samples list: "No samples today" (or appropriate filter context)
   - Results pending approval: "Nothing waiting for approval" + CheckCircle icon
   - Inventory: "No inventory items" + Add Item button
   - Each empty state needs: relevant Lucide icon (40px, muted), headline, optional CTA

2. Every form must handle submission errors:
   - Network error: "Couldn't connect — your data is saved locally" (not "An error occurred")
   - Validation error: red border on field, specific error message below
   - Duplicate LAPID: specific message with link to existing patient

3. Every async operation must have:
   - Loading state: spinner (not skeleton shimmer — see design.md animation rules)
   - Error state: red bordered toast, bottom-right, 5-second auto-dismiss, retry option
   - Success state: mint toast, 4-second auto-dismiss

4. Add a global error boundary (React ErrorBoundary) wrapping the entire app:
   - Shows the critical system error state from design.md section 12
   - "Something went wrong" + Retry button
   - Logs error details to console in development

5. Network timeout: if a Supabase call hasn't responded in 8 seconds, cancel it and serve from IndexedDB cache. Never show an infinite spinner.
```

---

### Prompt 30 — Two-Factor Authentication

```
Implement 2FA (TOTP) for Owner and Manager roles using Supabase Auth MFA.

1. After sign-in for owner/manager roles:
   - Check if MFA is enrolled: supabase.auth.mfa.listFactors()
   - If not enrolled: redirect to 2FA setup page (mandatory — cannot skip)
   - If enrolled: prompt for TOTP code before granting access

2. Build `src/pages/login/TwoFactorSetupPage.tsx`:
   - Explains what 2FA is (one sentence: "An extra security step that protects your lab data")
   - Shows QR code for scanning with Google Authenticator or Authy
   - "I've scanned this — enter your 6-digit code to confirm" input
   - Verify and save button

3. Build `src/pages/login/TwoFactorVerifyPage.tsx`:
   - 6-digit OTP input (auto-focuses, auto-submits on 6th digit)
   - "Verify" button
   - Error: "Incorrect code — try again"

4. Scientists and front_desk are NOT required to set up 2FA — do not show them this flow.

5. Add "2FA Status" indicator in Settings → Staff Management table showing which staff have 2FA enabled.
```

---

### Prompt 31 — Notification Delivery Status Tracking

```
Build the full delivery status tracking system for WhatsApp notifications.

1. Update the Supabase Edge Function (from Prompt 18) to handle Meta webhooks:
   - Meta sends delivery receipts to a webhook URL when messages are delivered/read
   - Create endpoint: supabase/functions/whatsapp-webhook/index.ts
   - Handle: messages.delivered → update notification.delivered_at
   - Handle: messages.read → update notification.opened_at
   - Verify webhook signature using Meta's X-Hub-Signature-256 header

2. Update NotificationDetailView to show real-time status:
   - Use Supabase Realtime to subscribe to notification table changes
   - Status updates in real-time without page refresh
   - Timeline: Queued → Sent → Delivered → Opened (with timestamps for each)

3. Undelivered Results dashboard widget (from Prompt 22):
   - Now uses real delivery data from the notifications table
   - "Resend" button creates a new notification, marks old one as superseded
   - "Call patient" fallback: shows patient phone number formatted for dialling

4. 24-hour delivery failure check:
   - A scheduled Supabase Edge Function (cron: every hour) checks for notifications
     where sent_at is > 24 hours ago and opened_at is NULL
   - Creates an alert record in the database
   - This appears in the front desk's undelivered results list
```

---

### Prompt 32 — Print Functionality

```
Implement all print functions in the app. All printing uses the browser print dialog.

1. Result PDF print:
   - "Print" button on ResultDetailPage opens the PDF in a new tab + triggers print dialog
   - Also available as: download PDF to device

2. Receipt print:
   - "Print Receipt" on InvoiceDetailPage prints the receipt PDF
   - Paper size: 80mm thermal receipt width (common in Nigerian labs)
   - Reduced layout: no logo, just essential info, fits on small receipt paper

3. Sample QR label print:
   - "Print Label" on SampleDetailPage and SampleListPage
   - A5 format, multiple labels per page option (1, 2, or 4 per sheet)
   - Each label: Sample ID (large), QR code, patient name, LAPID, tests, date

4. LAPID card print:
   - Credit card size (85.6mm × 54mm)
   - Patient name, LAPID (large monospace), QR code
   - "Bring this card to any Labora AI lab" instruction
   - Lab name and logo

5. Daily summary print (for lab manager):
   - One page: all samples processed today, all results issued, total revenue (owner version)
   - Designed for end-of-day handover or record keeping
```

---

### Prompt 33 — Search Functionality

```
Build global search across the app.

1. Global search bar in the Header (replaces or expands from the bell icon area):
   - Keyboard shortcut: Cmd+K / Ctrl+K opens search
   - Search across: patients (name, LAPID, phone), samples (Sample ID), results (test type), invoices (Invoice ID)
   - Results appear instantly from IndexedDB as user types (no network request)
   - Grouped results: Patients | Samples | Results | Invoices
   - Click result → navigate to detail page
   - Recent searches stored in localStorage

2. Within each page, the existing search bars now use a shared `useSearch` hook:
   - Debounced input (200ms)
   - Fuzzy matching for names (handles "Chisom" matching "Chisom Obi" and "Chisomaga")
   - Highlight matched text in results
   - Clear button (×) when search has text

3. Patient duplicate search (already built in Prompt 9) should use this same fuzzy matching logic.
```

---

### Prompt 34 — Reference Range Database

```
Build the complete reference range database for the 50+ test types.

Create `src/lib/referenceRanges.ts`:

A typed data structure mapping test type + parameter + patient demographics → reference range.

Structure:
{
  "FBC": {
    "haemoglobin": {
      "unit": "g/dL",
      "ranges": [
        { "gender": "male", "ageMin": 18, "ageMax": 999, "low": 13.5, "high": 17.5 },
        { "gender": "female", "ageMin": 18, "ageMax": 999, "low": 12.0, "high": 16.0 },
        { "gender": "female", "pregnant": true, "low": 11.0, "high": 14.0 },
        { "ageMin": 0, "ageMax": 1, "low": 14.0, "high": 20.0 },
        { "ageMin": 1, "ageMax": 12, "low": 11.5, "high": 15.5 }
      ],
      "critical_low": 6.0,
      "critical_high": 20.0
    }
    // ... all other FBC parameters
  }
  // ... all other test types
}

Include ranges for: FBC (all 7 parameters), LFT (7 parameters), RFT (7 parameters), Lipid Panel (5 parameters), Thyroid (TSH, FT3, FT4), Fasting Glucose, HbA1c, PSA, Urinalysis parameters.

Add a function: getReferenceRange(testType, parameter, patientAge, patientGender, isPregnant) → { low, high, critical_low, critical_high, unit }

The result entry form (Prompt 15) uses this function to determine out-of-range highlighting in real-time.
```

---

### Prompt 35 — Data Formatting & Nigerian Localisation

```
Read design.md section 7 (Data & ID Formatting Rules) and context.md section 9.

Audit the entire app for formatting consistency. Fix every instance that doesn't match the rules:

1. Currency: every monetary value in the app must use formatNaira(). Search for any raw number rendering near ₦ symbols.

2. Phone numbers: every phone number displayed must use formatPhone(). Check patients list, sample registration, invoice detail.

3. Dates: every date must use formatDate() or formatDateTime(). No raw ISO strings visible to users.

4. LAPIDs: every LAPID must be rendered in the monospace mint style. Search for any LAPID displayed outside of the .id-cell class or without the monospace font.

5. Sample IDs: every sample ID must show as "#LB-9821" using formatSampleID().

6. Invoice IDs: every invoice ID must show as "#INV-9021" using formatInvoiceID().

7. Nigerian name handling: the fuzzy search must handle common patterns:
   - "Emeka" matches "Chukwuemeka" and "Emenike"
   - "Chisom" matches "Chisom Obi" and "Obichisomaga"
   - Double-barrelled names: "Obi-Nwosu" searchable by either part

8. Verify: no $ symbols anywhere in the app. No US date format (MM/DD/YYYY). No "HIPAA" anywhere. Find-and-replace all instances.
```

---

### Prompt 36 — Mobile & Tablet Responsive Audit

```
Full responsive audit targeting the primary device: Android tablet (~768px wide) and Android phone (~390px wide).

For every page in the app:

1. Test at 768px (tablet):
   - Sidebar: still visible at 240px
   - Stat cards: 2-column grid
   - Tables: all columns visible, not truncated
   - Forms: full width single column

2. Test at 390px (phone):
   - Sidebar: collapsed to bottom navigation bar (5 icons: Dashboard, Patients, Samples, Results, More)
   - Stat cards: 1-column stack
   - Tables: converted to vertical card stacks (each row becomes a card)
   - Modals: full-screen bottom sheets
   - Forms: all touch targets minimum 44px × 44px
   - Floating "Register" button: fixed position, bottom-right, mint background

3. Specific fixes needed for low-spec tablets:
   - All tap targets minimum 44px × 44px (fingers, not mouse cursors)
   - No hover-only interactions — everything must be tap-accessible
   - Text minimum 14px — no smaller text that requires zooming
   - Inputs: font-size minimum 16px to prevent iOS zoom (even though primary is Android)

4. Test the QR scanner on the actual tablet camera. Verify it focuses correctly on small QR codes.

Document any responsive issues that cannot be fixed without redesign in KNOWN_ISSUES.md.
```

---

### Prompt 37 — Secure Result Link System

```
Build the secure time-limited result sharing system.

1. Secure link generation (in Supabase Edge Function):
   - When a result is approved, generate a signed token: JWT signed with RESULT_SIGNING_SECRET
   - Token payload: { resultId, lapid, expiresAt: now + 72 hours }
   - Store token hash in notifications table (not the raw token — only the hash)
   - Full link: https://app.labora.ai/r/{resultId}?token={signedToken}

2. Build public result view page `src/pages/public/ResultViewPage.tsx`:
   - No authentication required — accessible to anyone with the link
   - Verify token signature and expiry server-side (Edge Function)
   - If valid: show result summary (patient first name only, test type, key values, PDF download button)
   - If expired: "This link has expired. Contact [lab name] for a new link."
   - If invalid: "This link is not valid."
   - Log view event to notifications table: opened_at = now

3. Build QR verification page `src/pages/public/VerifyResultPage.tsx`:
   - URL: https://verify.labora.ai/r/{resultId}
   - This page is linked from the QR code embedded in every PDF
   - Shows: lab name, patient first name only, test type, result date, "Issued by [lab name]"
   - Does NOT show the actual test values — verification only
   - Shows: "✓ This result was issued by [Lab Name] on [Date] and has not been altered."

4. Doctor notification link:
   - Referring doctor receives a separate link with a different token
   - Doctor link shows full result (all parameters) but is read-only
   - Doctor link expires after 7 days (not 72 hours like patient link)
```

---

### Prompt 38 — Audit Trail & Compliance

```
Read context.md section 10 (Compliance). Build the audit trail system.

1. Create `src/lib/auditLog.ts`:
   - logEvent(action, tableName, recordId, oldValue?, newValue?): writes to an audit_log table
   - Called automatically by writeRecord() for every data write
   - Never deletes from audit_log — append only

2. Create audit_log table in Supabase:
   CREATE TABLE audit_log (
     id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id      UUID REFERENCES auth.users(id),
     lab_id       UUID REFERENCES labs(id),
     action       TEXT NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'AMEND', 'VIEW_RESULT'
     table_name   TEXT NOT NULL,
     record_id    TEXT NOT NULL,
     old_value    JSONB,
     new_value    JSONB,
     created_at   TIMESTAMPTZ DEFAULT NOW()
   );
   -- RLS: owner can view their lab's audit log. No role can DELETE from audit_log.

3. Log these events specifically:
   - Patient registered / updated
   - Sample received / status changed / rejected
   - Result entered / submitted for approval / approved / amended
   - Invoice created / payment recorded / voided
   - Result delivered to patient / link opened
   - Staff account created / deactivated
   - 2FA enrolled / login with 2FA

4. Build `src/pages/settings/AuditLogPage.tsx` (owner only):
   - Table: Timestamp | User | Action | Record | Details
   - Filter by: date range, user, action type
   - Export to CSV for compliance reporting
   - Cannot be filtered to hide any record — no delete functionality at all

5. NDPA consent audit:
   - Every consent grant and revocation logged with timestamp and user IP
   - Consent history visible to owner in patient detail page
```

---

### Prompt 39 — End-to-End Testing

```
Write end-to-end tests for the 8 critical user journeys using Playwright.

Install: npm install -D @playwright/test
Configure for Chrome only (our target browser).

Test 1 — Complete patient registration:
- Open app → log in as front_desk → navigate to Patients → Register Patient
- Fill all fields → submit → verify LAPID generated → verify patient in list

Test 2 — Duplicate detection:
- Register a patient → register again with same phone number
- Verify duplicate modal appears → verify comparison table shows correct data → choose "Use existing record"
- Verify navigated to existing patient, not a new record

Test 3 — Sample to result delivery:
- Log in as front_desk → register sample for existing patient
- Log in as scientist → find sample in worklist → enter result → submit for approval
- Log in as manager → approve result → verify PDF generated → verify notification queued

Test 4 — Offline registration:
- Go offline (intercept network in Playwright)
- Register a patient → verify saved to IndexedDB
- Come back online → verify synced to Supabase

Test 5 — Role access:
- Log in as scientist → attempt to navigate to /billing → verify redirect
- Log in as front_desk → attempt to view results → verify blocked
- Log in as manager → attempt to approve own result → verify blocked

Test 6 — Invoice and payment:
- Register sample → verify invoice auto-created → record full payment → verify status = 'paid'

Test 7 — Inventory low stock alert:
- Set item minimum to 10, current stock to 5
- Navigate to inventory → verify LOW STOCK badge → verify amber border on stat card

Test 8 — PDF generation:
- Approve a result → verify PDF file exists in Supabase Storage → download and verify content

Run: npx playwright test
All 8 tests must pass before launch.
```

---

### Prompt 40 — Pre-Launch Checklist & Production Hardening

```
Final production hardening before the first lab pilot.

1. Environment:
   - Verify all environment variables are set in Vercel production
   - Verify Supabase project is in Cape Town region (critical for NDPA)
   - Verify all Edge Functions are deployed: send-result-notification, whatsapp-webhook, verify-result
   - Verify Supabase Storage bucket policies allow correct access

2. Security:
   - Run: npx audit → fix all high/critical vulnerabilities
   - Verify no API keys or secrets in frontend code: grep -r "secret\|key\|token" src/ --include="*.ts"
   - Verify all Supabase RLS policies are active: test as each role
   - Verify 2FA is enforced for all owner and manager accounts
   - Verify HTTPS is enforced (Vercel does this by default)

3. Performance:
   - Run Lighthouse audit on the production URL, targeting Android device
   - PWA score: > 90
   - Performance score: > 70 on simulated 4G
   - Accessibility score: > 80

4. Offline verification (on actual Android tablet):
   - Install PWA from production URL
   - Turn on Airplane Mode
   - Verify all 8 MVP flows work without internet
   - Turn off Airplane Mode
   - Verify all data syncs within 60 seconds

5. Data:
   - Verify audit_log table is append-only (no DELETE policy exists)
   - Verify NDPA consent is captured before any patient data is stored
   - Verify all monetary values are stored in kobo (check with a manual DB query)
   - Verify no test/seed data in production database

6. Create LAUNCH_CHECKLIST.md documenting:
   - First lab onboarding steps (create lab record, create owner account, upload logo, set price list)
   - How to create staff accounts for each role
   - How to test WhatsApp delivery with the lab's number
   - How to handle a data breach (NDPA 72-hour notification requirement)
   - Emergency contact procedure if the app goes down

7. Deploy and verify the production URL is accessible from a Nigerian mobile data connection (use a VPN or test from a Nigerian SIM).

The MVP is launch-ready when this prompt passes completely.
```

---

## Summary: Build Order

| Phase | Prompts | Deliverable |
|---|---|---|
| A — Foundation | 1–8 | Scaffold, types, auth, layout, sync engine, dashboard shell |
| B — Core Modules | 9–24 | All 8 MVP modules fully functional |
| C — Polish & Launch | 25–40 | QR, offline hardening, security, performance, testing |

Estimated build time: 8–14 weeks solo, 4–6 weeks with one additional engineer.

---

*Last updated: April 2026*
*Execute prompts in order. Do not skip. Verify each checklist before proceeding.*
