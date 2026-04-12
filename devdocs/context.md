# Labora AI — Product Context
## The authoritative reference for what we are building and why

---

## 1. What Is Labora AI

Labora AI is an **offline-first Progressive Web App (PWA)** built for Nigerian diagnostic laboratories. It digitises every workflow in a diagnostic lab — patient registration, sample tracking, result entry, PDF generation, WhatsApp delivery, billing, and inventory — and delivers it on a ₦40,000 Android tablet with no app store required and full offline capability.

The product is not a health records system. It is not a hospital EMR. It is **lab infrastructure** — the operating system of a diagnostic laboratory.

**Tagline:** Lab Infrastructure for Africa

---

## 2. The Problem

Independent diagnostic labs in Nigeria operate almost entirely on paper in 2025. The daily reality inside most of these labs:

- Patient results are handwritten into ledgers and read out over the phone
- Sample mix-ups happen because there is no tracking between collection and analysis
- Patients wait hours or days to be told their result is ready — often by a phone call that never comes
- Lab owners have no idea how much revenue they made this week without physically counting receipt books
- Reagents expire in the fridge because nobody tracked the stock
- Referring doctors never receive results — the patient is the only courier
- There is no audit trail when a result is questioned

There are approximately **4,000 independent diagnostic labs** in Nigeria. Fewer than 8% have any form of digital system. The ones that do typically use generic clinic software not designed for lab workflows, or Excel spreadsheets that break during NEPA outages.

---

## 3. The Solution

Labora AI replaces every paper process in the lab with a structured digital workflow that:

- Works during power cuts and network failures (offline-first by design)
- Runs on the cheap Android tablets already in most labs
- Delivers results to patients via WhatsApp the moment they are approved
- Gives lab owners a real-time dashboard of their business
- Charges only when a test is processed — ₦150–₦250 per test — so labs with zero volume pay nothing

---

## 4. Target Customer — Phase 1

**Primary:** Independent diagnostic labs in Port Harcourt (GRA, Trans-Amadi, Rumuola)
- Annual test volume: 400–1,500 tests per month
- Staff: 2–10 people
- Device: Android tablet or phone, Chrome browser
- Connectivity: Intermittent — MTN/Airtel 4G with frequent drops, NEPA outages 4–12 hours daily
- Technical literacy: Moderate — staff use WhatsApp fluently but have never used lab software

**Secondary (Phase 2):** Labs in Lagos, Abuja, and South-East Nigeria

**Not the target customer (Phase 1):**
- Hospital in-house labs (different procurement process, longer sales cycles)
- Pathology departments in teaching hospitals (regulated differently)
- Large chains like Synlab or Clina-Lancet (enterprise sales, not MVP focus)

---

## 5. The LAPID — Core Data Architecture Concept

Every patient who registers at any Labora AI lab receives a permanent universal identifier called a **LAPID**:

```
Format: LA-YYYY-NNNNN
Example: LA-2025-00847
```

This is the foundational concept of the entire product. The LAPID:
- Is generated once, at first registration, and never changes
- Works across all Labora AI labs (with patient consent)
- Is the primary key linking all patient records, samples, results, and invoices
- Is delivered to the patient via WhatsApp alongside their first result
- Is printed as a QR code on every sample label
- Becomes, in Phase 4, the foundation of a portable Health Passport

Every feature in the system connects back to the LAPID.

---

## 6. Revenue Model

**Phase 1 — Pay-per-test only**
- ₦150–₦250 per test processed through Labora AI
- Hybrid option: ₦20,000–₦40,000/month base + ₦100/test
- Default alive at 3–5 paying labs

**Phase 2 additions**
- AI diagnostics add-on: ₦200–₦500 per advanced analysis
- HMO billing integration: ₦5,000–₦15,000/month per lab
- Platform fee shown separately in lab owner view — never hidden

**Phase 3+ additions**
- Home sample collection: 5–10% commission per collection
- Blockchain verified results: revenue share on premium tier
- QMS module: ₦10,000–₦25,000/month per lab
- Health data marketplace (anonymised, aggregated — see compliance rules)

---

## 7. The Six User Roles

These roles are enforced at the **Supabase Row Level Security layer** — not just hidden UI elements.

| Role | What they do | What they can never see |
|---|---|---|
| **Lab Owner / Admin** | Full access. Revenue, staff, billing, all patient records, all branches. Sees Labora AI platform fee. Mandatory 2FA. | Nothing — full access |
| **Lab Manager** | Approves results. Manages inventory. Oversees sample workflow. Views all active samples. | Revenue figures, billing totals, staff account creation |
| **Lab Scientist** | Enters results for assigned samples. Cannot approve their own results. | Other scientists' samples, billing, inventory values |
| **Front Desk / Receptionist** | Registers patients, prints QR labels, records payments, checks sample status. | Any test result, result entry forms |
| **Referring Physician** | Read-only on results of personally referred patients. Receives notification on result approval. | All other patients, any lab operational data |
| **Patient** | Read-only on own results via secure link or portal (Phase 2). Downloads PDFs, manages consent. | Every other patient's data |

---

## 8. The 8 MVP Modules

### Module 1 — Patient Registration & LAPID
Digital registration replacing paper forms. LAPID auto-generated. Duplicate detection via fuzzy name + phone search. NDPA consent captured. QR label printed. WhatsApp delivery of LAPID on first result.

### Module 2 — Sample Tracking & Workflow
QR scan at every station. Status: Received → Processing → Awaiting Approval → Ready → Delivered. Full chain-of-custody audit log. STAT flagging. Delay alerts. Real-time manager dashboard.

### Module 3 — Result Entry & PDF Generation
Structured validated entry per test type. Reference ranges (age/gender/pregnancy-adjusted). Auto red-bold for out-of-range values. Critical value mandatory acknowledgment. One-click manager approval. PDF with embedded QR verification code. 50+ test types at launch.

### Module 4 — WhatsApp & SMS Result Delivery
Auto-notification on approval. Secure time-limited download link. SMS fallback. Delivery status tracking (Sent → Delivered → Opened). Referring doctor separate notification. Re-send capability.

### Module 5 — Basic Inventory Management
Manual stock entry. Low stock alerts. Auto decrement per test. Expiry tracking (30/14/7 day alerts). Wastage log. Purchase order log. Monthly usage report.

### Module 6 — Billing & Payments
Configurable price list. Auto invoice at registration. Cash / POS / transfer / OPay / PalmPay. Receipt printing. Partial payments. Daily reconciliation. Revenue per test type. Outstanding invoices aging.

### Module 7 — Offline-First Architecture
All critical functions work with zero internet. IndexedDB local storage via Dexie.js. Auto-sync to Supabase on reconnect. Conflict resolution strategy. Sync status always visible. PWA installable on Android.

### Module 8 — Operations Dashboard
Tests processed (daily/weekly/monthly). Average TAT per test type. Revenue summary. Top 10 tests by volume and revenue. Staff productivity. Pending approvals queue. Undelivered results. Low stock count.

---

## 9. Technology Decisions & Rationale

| Layer | Choice | Non-negotiable reason |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | PWA support, offline-first capable, type safety for complex data model |
| PWA / Service Worker | vite-plugin-pwa | Auto-generates Service Worker and caching strategy |
| Offline database | IndexedDB via Dexie.js | Browser-native storage, works offline, Dexie makes it usable |
| Backend + DB | Supabase (PostgreSQL) | Auth + RLS + real-time + storage + edge functions in one free-tier platform |
| DB region | Cape Town (af-south-1) | NDPA data residency requirement — Nigerian patient data must not leave Africa |
| Auth + permissions | Supabase RLS | Enforced at DB layer — cannot be bypassed from frontend |
| PDF generation | React-PDF | Client-side, fully offline, no server round-trip needed |
| WhatsApp | Meta WhatsApp Business API | 90%+ penetration in Nigerian urban markets |
| SMS fallback | Termii (dev: Twilio) | Lower cost to Nigerian numbers at scale |
| Hosting frontend | Vercel | Free tier, instant GitHub deploys |
| Icons | Lucide React | Sole icon library — no mixing |
| Type safety | TypeScript throughout | Complex data model requires compile-time safety |

---

## 10. Compliance & Legal Requirements

### NDPA (Nigeria Data Protection Act 2023)
- **Explicit informed consent** required before collecting any patient data
- Consent must be revocable by the patient at any time
- **Data Protection Impact Assessment (DPIA)** must be completed before go-live
- **Data breach notification** required within 72 hours to NDPC
- **Data residency**: all Nigerian patient PII must be stored in Africa — AWS af-south-1 (Cape Town) via Supabase satisfies this
- A named **Data Protection Officer** must be designated (founder at early stage)
- Fines: up to 2% of annual gross revenue or ₦10M, whichever is higher

### MLSCN (Medical Laboratory Science Council of Nigeria)
- Every PDF result report must display the lab's MLSCN registration number
- Result approval workflow must enforce a qualified scientist sign-off before delivery
- This is a regulatory requirement, not a product feature

### NDPA vs HIPAA
- This product is governed by **NDPA** — never HIPAA
- HIPAA is a US regulation and is completely inapplicable
- Any reference to HIPAA in code comments, documentation, or UI copy is incorrect and must be removed

---

## 11. The Network & Device Reality

Every feature must be designed for the actual environment it will run in — not a fibre-connected MacBook.

| Reality | Design implication |
|---|---|
| NEPA takes light 4–12 hours/day | Offline-first is not optional — it is the product |
| MTN/Airtel 4G drops frequently | Every write operation saves locally first, syncs second |
| Android tablets, ₦30,000–₦50,000 | Test on actual cheap hardware from Week 1 |
| 2GB RAM common | No heavy animations, no memory-intensive libraries |
| Chrome browser only (PWA) | No Safari-specific CSS, no Firefox-only features |
| Low-literacy front desk staff | Icon-heavy UI, minimal required reading |
| Busy lab, hands full | Large tap targets (44px minimum), no hover-dependent interactions |

---

## 12. What This Product Is Not

To prevent scope creep during development, be explicit about what is **not** being built in Phase 1:

- ❌ Not a telemedicine platform
- ❌ Not a hospital EMR or clinic management system
- ❌ Not a radiology or imaging system
- ❌ Not a pharmacy management system
- ❌ Not a patient appointment booking system (Phase 2)
- ❌ Not an AI diagnostic tool (Phase 2)
- ❌ Not a multi-branch management system (Phase 2)
- ❌ Not a public-facing patient portal with self-registration (Phase 2)

Phase 1 builds one thing: **a digital operating system for a single diagnostic lab**. Everything else waits.

---

## 13. Definition of Done — Phase 1 MVP

The MVP is complete when a lab can:

1. Register a patient digitally and generate a LAPID
2. Track a sample from reception to result delivery with a full audit log
3. Enter a result with validated fields and generate a branded PDF
4. Deliver that PDF to the patient via WhatsApp automatically on approval
5. Record a payment and print a receipt
6. Check inventory levels and receive low-stock alerts
7. Do all of the above with zero internet connection
8. See a real-time dashboard of today's activity

When all 8 work on a ₦40,000 Android tablet with the internet off, Phase 1 is done.

---

*Last updated: April 2026*
*This document is the single source of truth for product decisions.*
*When a feature request conflicts with the Phase 1 scope defined here, defer it to the backlog.*
