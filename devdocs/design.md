# Labora AI — Design System
## Single Source of Truth for Development

> This document governs every UI decision in the Labora AI codebase.
> When in doubt, this file wins. Do not deviate without updating this file first.

---

## 1. Product Identity

| Property | Value |
|---|---|
| Product name | Labora AI |
| Tagline | Lab Infrastructure for Africa |
| Product type | Progressive Web App (PWA) |
| Primary market | Nigerian diagnostic laboratories |
| Compliance standard | NDPA (Nigeria Data Protection Act) — never HIPAA |
| Currency | ₦ (Nigerian Naira) — always use the ₦ symbol |
| Phone format | +234 prefix for all Nigerian numbers |
| Date format | DD Mon YYYY (e.g. 24 Oct 2023) |
| Time format | 12-hour with AM/PM (e.g. 10:45 AM) |

---

## 2. Colour System

These are the only colours permitted in the application. No exceptions.

### Brand Colours

```css
--color-mint:         #00E5A0;   /* Primary brand accent — CTAs, active states, links */
--color-black:        #0A0A0A;   /* Primary background */
--color-surface:      #1A1A1A;   /* Card and panel background */
--color-surface-alt:  #242424;   /* Elevated surface, hover states */
--color-border:       #2C2C2C;   /* Default border colour */
--color-border-light: #383838;   /* Subtle dividers */
--color-forest:       #003D28;   /* Deep trust anchor — used sparingly */
```

### Text Colours

```css
--color-text-primary:   #FFFFFF;   /* Headings, primary content */
--color-text-secondary: #A0A0A0;   /* Labels, metadata, captions */
--color-text-tertiary:  #606060;   /* Placeholder text, disabled */
--color-text-mint:      #00E5A0;   /* Mint-coloured text (links, IDs, active) */
```

### Status Colours — STRICTLY FUNCTIONAL ONLY

These colours must NEVER be used for decoration, branding, or aesthetics.
They exist only to communicate system state.

```css
--color-status-success:  #00E5A0;   /* Mint — synced, delivered, paid, active */
--color-status-warning:  #FFB800;   /* Amber — pending, offline, low stock, partial */
--color-status-danger:   #FF4D4D;   /* Red — critical, error, unpaid, expired */
--color-status-info:     #3B8BD4;   /* Blue — processing, scheduled, informational */
```

### Status Background Fills (for badges and banners)

```css
--color-status-success-bg:  rgba(0, 229, 160, 0.12);
--color-status-warning-bg:  rgba(255, 184, 0, 0.12);
--color-status-danger-bg:   rgba(255, 77, 77, 0.12);
--color-status-info-bg:     rgba(59, 139, 212, 0.12);
```

### Landing Page Light Surface

```css
--color-light-bg:      #F5F5F0;   /* Landing page alternating sections only */
--color-light-text:    #0A0A0A;   /* Text on light backgrounds */
--color-light-surface: #FFFFFF;   /* Cards on light background */
```

---

## 3. Typography

### Font Stack

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Inter is the primary typeface across the entire application.

### Type Scale

```css
/* Display — hero headlines on landing page */
--text-display:    font-size: 48px; font-weight: 700; line-height: 1.1;

/* Heading 1 — page titles */
--text-h1:         font-size: 32px; font-weight: 700; line-height: 1.2;

/* Heading 2 — section headers */
--text-h2:         font-size: 24px; font-weight: 600; line-height: 1.3;

/* Heading 3 — card titles, panel headers */
--text-h3:         font-size: 18px; font-weight: 600; line-height: 1.4;

/* Body large — primary content */
--text-body-lg:    font-size: 16px; font-weight: 400; line-height: 1.6;

/* Body default */
--text-body:       font-size: 14px; font-weight: 400; line-height: 1.6;

/* Body small — secondary content, table rows */
--text-body-sm:    font-size: 13px; font-weight: 400; line-height: 1.5;

/* Label — field labels, column headers, metadata */
--text-label:      font-size: 11px; font-weight: 500; line-height: 1.4;
                   letter-spacing: 0.08em; text-transform: uppercase;

/* Caption — timestamps, footnotes */
--text-caption:    font-size: 12px; font-weight: 400; line-height: 1.4;
                   color: var(--color-text-secondary);

/* Mono — IDs, LAPIDs, sample numbers, code */
font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
--text-mono:       font-size: 13px; font-weight: 500;
                   color: var(--color-text-mint);
```

### Typography Rules

- Sentence case everywhere — never ALL CAPS in body copy or headings
- Column headers in tables are the exception — use uppercase labels (`--text-label`)
- LAPIDs, Sample IDs, Invoice IDs always render in monospace mint
- Two font weights dominate: 400 (body) and 700 (headings). Use 500/600 sparingly for labels and subheadings
- No italic text in the application UI

---

## 4. Spacing & Layout

### Spacing Scale

```css
--space-1:   4px
--space-2:   8px
--space-3:   12px
--space-4:   16px
--space-5:   20px
--space-6:   24px
--space-8:   32px
--space-10:  40px
--space-12:  48px
--space-16:  64px
```

### Border Radius

```css
--radius-sm:   4px    /* Small pills, badges, tags */
--radius-md:   8px    /* Inputs, buttons, small cards */
--radius-lg:   12px   /* Cards, panels */
--radius-xl:   16px   /* Modals, large containers */
--radius-full: 9999px /* Avatar circles, round pills */
```

### Layout Structure

```
┌─ Sidebar (240px fixed) ─┬─ Main content area (fluid) ─────────────┐
│                          │  ┌─ Header bar (64px) ─────────────────┐ │
│  Logo + Lab name         │  │ Page title + sync status + actions  │ │
│  Navigation items        │  └─────────────────────────────────────┘ │
│                          │  ┌─ Content ────────────────────────────┐ │
│  [Support]               │  │ Padding: 24px all sides              │ │
│  [Logout]                │  │                                      │ │
└──────────────────────────┴──┴──────────────────────────────────────┘
```

- Sidebar: 240px wide, fixed, `background: var(--color-black)`, `border-right: 1px solid var(--color-border)`
- Main content padding: 24px
- Card gap: 16px
- Stat card grid: 4 columns on desktop, 2 on tablet, 1 on mobile
- Content max-width: none — fills available space

### Mobile Layout (< 768px)

- Sidebar collapses to bottom navigation bar (64px tall)
- Bottom nav shows 5 icons max: Dashboard, Patients, Samples, Results, More
- All tables become vertical card stacks
- All modals become full-screen bottom sheets

---

## 5. Components

### 5.1 Buttons

```css
/* Primary — mint fill */
.btn-primary {
  background: var(--color-mint);
  color: #000000;           /* Black text on mint background */
  font-weight: 600;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.btn-primary:hover { opacity: 0.88; }
.btn-primary:active { opacity: 0.76; transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.38; cursor: not-allowed; }

/* Secondary — ghost */
.btn-secondary {
  background: transparent;
  color: var(--color-text-primary);
  font-weight: 500;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: background 0.15s ease;
}
.btn-secondary:hover { background: var(--color-surface-alt); }

/* Danger — for destructive actions */
.btn-danger {
  background: transparent;
  color: var(--color-status-danger);
  border: 1px solid var(--color-status-danger);
  /* Same sizing as secondary */
}

/* Text button — no border */
.btn-text {
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  padding: 10px 16px;
  /* Hover: color shifts to --color-text-primary */
}
```

**Button rules:**
- Primary buttons always have black text (never white) on mint background
- Never use mint text on a dark button — use ghost style instead
- Loading state: replace text with a spinner, keep same dimensions
- Icon buttons: 36px × 36px, `border-radius: var(--radius-md)`

---

### 5.2 Status Badges

Badges are pill-shaped labels communicating state. They appear in tables and cards.

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
```

| Badge Name | Text Colour | Background | Usage |
|---|---|---|---|
| ACTIVE | `#00E5A0` | `rgba(0,229,160,0.12)` | Patient active, result delivered |
| SYNCED | `#00E5A0` | `rgba(0,229,160,0.12)` | System synced |
| READY | `#00E5A0` | `rgba(0,229,160,0.12)` | Result ready for delivery |
| DELIVERED | `#00E5A0` | `rgba(0,229,160,0.12)` | Result sent to patient |
| PAID | `#00E5A0` | `rgba(0,229,160,0.12)` | Invoice paid |
| PROCESSING | `#3B8BD4` | `rgba(59,139,212,0.12)` | Sample in processing |
| SCHEDULED | `#A0A0A0` | `rgba(160,160,160,0.12)` | Appointment scheduled |
| RECEIVED | `#A0A0A0` | `rgba(160,160,160,0.12)` | Sample received |
| AWAITING APPROVAL | `#FFB800` | `rgba(255,184,0,0.12)` | Pending manager sign-off |
| PARTIAL | `#FFB800` | `rgba(255,184,0,0.12)` | Partial payment |
| STAT | `#FFB800` | `rgba(255,184,0,0.12)` | Urgent/priority sample |
| OFFLINE | `#FFB800` | `rgba(255,184,0,0.12)` | System offline |
| CRITICAL | `#FF4D4D` | `rgba(255,77,77,0.12)` | Critical patient alert |
| UNPAID | `#FF4D4D` | `rgba(255,77,77,0.12)` | Invoice unpaid |
| EXPIRED | `#FF4D4D` | `rgba(255,77,77,0.12)` | Reagent expired |
| LOW STOCK | `#FFB800` | `rgba(255,184,0,0.12)` | Inventory below minimum |

---

### 5.3 Sync Status Indicator

This component is ALWAYS visible in the top header of every app page. It is the most important trust signal in the application.

```
● SYNCED        — mint dot, mint text
● WORKING OFFLINE — 4 CHANGES PENDING SYNC    — amber dot, amber text (shown as banner below header)
● OFFLINE       — red dot, red text
● SYNCING...    — animated pulsing mint dot
```

**Implementation rules:**
- The dot is 8px diameter, filled circle
- Never hide this indicator — it must be present on every authenticated page
- When offline, additionally show a full-width amber banner immediately below the header:
  `"● WORKING OFFLINE — N CHANGES PENDING SYNC"` with a "Force upload" action on the right
- The sync state must be derived from actual Supabase connection status + IndexedDB queue count

---

### 5.4 Metric / Stat Cards

Used in dashboard and section headers to show key numbers.

```css
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
}

.stat-card__label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.stat-card__value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.stat-card__sub {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 6px;
}

.stat-card__trend-up   { color: var(--color-status-success); }
.stat-card__trend-down { color: var(--color-status-danger); }
.stat-card--warning    { border-color: var(--color-status-warning); }
.stat-card--danger     { border-color: var(--color-status-danger); }
```

**Rule:** When a stat card requires attention (e.g. Low Stock Items, Undelivered Results), apply the appropriate status border colour. Never change the card background colour — only the border.

---

### 5.5 Data Tables

```css
.table-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.table th {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  white-space: nowrap;
}

.table td {
  font-size: 14px;
  color: var(--color-text-primary);
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.table tr:last-child td { border-bottom: none; }

.table tr:hover td { background: var(--color-surface-alt); }

/* LAPID and ID columns */
.table td.id-cell {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--color-text-mint);
}
```

**Table rules:**
- IDs (LAPID, Sample ID, Invoice ID) always render in monospace mint
- Status column always contains a badge — never raw text
- Action column: show a `⋮` (three-dot) menu icon aligned right
- Out-of-range medical values: `color: var(--color-status-danger); font-weight: 600;`
- STAT/urgent rows: add `border-left: 2px solid var(--color-status-warning)` to the row

---

### 5.6 Form Inputs

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.form-input {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: 14px;
  padding: 10px 14px;
  outline: none;
  transition: border-color 0.15s ease;
  width: 100%;
}

.form-input::placeholder { color: var(--color-text-tertiary); }
.form-input:focus        { border-color: var(--color-mint); }
.form-input:disabled     { opacity: 0.5; cursor: not-allowed; }
.form-input--error       { border-color: var(--color-status-danger); }

/* Phone number input with +234 prefix */
.phone-input-wrapper {
  display: flex;
  align-items: center;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.phone-prefix {
  padding: 10px 12px;
  color: var(--color-text-secondary);
  border-right: 1px solid var(--color-border);
  font-size: 14px;
  white-space: nowrap;
}
.phone-prefix + input {
  background: transparent;
  border: none;
  flex: 1;
}
```

**Form rules:**
- All phone number inputs use the prefixed +234 component — never a plain text input
- Date inputs use the format placeholder `DD/MM/YYYY`
- Required fields do NOT use asterisks (*) — mark them `(required)` in helper text if needed
- Error messages appear below the input in `--color-status-danger`, 12px
- Auto-save indicator: `● All changes autosaved` with a mint dot, shown in the bottom-left of forms

---

### 5.7 Modals

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 32px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}
```

**Modal rules:**
- Close button (×) always top-right
- Destructive modals: red icon in header, confirm button uses `btn-danger`
- Duplicate detection modal: three-button footer — left ghost, centre outline, right primary
- On mobile: modals become bottom sheets (slide up from bottom, full width, rounded top corners only)

---

### 5.8 Avatar / Initials

```css
.avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

/* Colour assignment: deterministic based on first letter of name */
/* A-E */ .avatar--a { background: rgba(0,229,160,0.2);  color: #00E5A0; }
/* F-J */ .avatar--b { background: rgba(59,139,212,0.2); color: #3B8BD4; }
/* K-O */ .avatar--c { background: rgba(255,184,0,0.2);  color: #FFB800; }
/* P-T */ .avatar--d { background: rgba(127,119,221,0.2);color: #7F77DD; }
/* U-Z */ .avatar--e { background: rgba(255,77,77,0.2);  color: #FF4D4D; }
```

Avatars render initials (max 2 characters: first + last name initial) when no photo is available.

---

### 5.9 Navigation Sidebar

```css
.sidebar {
  width: 240px;
  height: 100vh;
  position: fixed;
  background: var(--color-black);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: 0;
}

.sidebar__brand {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar__lab-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-mint);
}

.sidebar__lab-meta {
  font-size: 11px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.sidebar__nav {
  flex: 1;
  padding: 12px 12px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
}

.nav-item:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.nav-item--active {
  background: rgba(0, 229, 160, 0.1);
  color: var(--color-mint);
  font-weight: 500;
  border-left: 2px solid var(--color-mint);
  padding-left: 10px;
}

.nav-item svg { width: 18px; height: 18px; flex-shrink: 0; }

.sidebar__footer {
  padding: 12px;
  border-top: 1px solid var(--color-border);
}
```

**Navigation order:**
1. Dashboard
2. Patients
3. Sample Tracking
4. Results
5. Billing
6. Inventory
7. Reports
8. Settings
— (footer) —
9. Support
10. Logout

---

### 5.10 Alert Banners

```css
.banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 0; /* Full-width banners have no radius */
}

.banner--offline {
  background: rgba(255, 184, 0, 0.12);
  border-bottom: 1px solid rgba(255, 184, 0, 0.3);
  color: #FFB800;
}

.banner--critical {
  background: rgba(255, 77, 77, 0.12);
  border-bottom: 1px solid rgba(255, 77, 77, 0.3);
  color: #FF4D4D;
}

.banner__action {
  margin-left: auto;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
  opacity: 0.8;
}
```

---

## 6. Page-Specific Patterns

### 6.1 Patient LAPID Format

```
Format: LA-YYYY-NNNNN
Example: LA-2025-00847

Always render in:
  font-family: monospace
  color: var(--color-text-mint)
  font-weight: 500
```

Never truncate a LAPID. Always show the full string.

### 6.2 Result Entry — Out-of-Range Values

When a lab result value falls outside the reference range:

```css
.result-value--high {
  color: var(--color-status-danger);
  font-weight: 600;
  background: var(--color-status-danger-bg);
  padding: 4px 10px;
  border-radius: var(--radius-md);
}

.result-value--low {
  color: var(--color-status-warning);
  font-weight: 600;
  background: var(--color-status-warning-bg);
  padding: 4px 10px;
  border-radius: var(--radius-md);
}

.result-value--normal {
  color: var(--color-text-secondary);
  padding: 4px 10px;
}
```

Critical value acknowledgment banner (appears inline when a critical threshold is crossed):

```css
.critical-ack-banner {
  background: rgba(255, 184, 0, 0.1);
  border: 1px solid rgba(255, 184, 0, 0.3);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
/* Contains: warning icon + text on left, toggle switch on right */
/* Submit button is DISABLED until toggle is checked */
```

### 6.3 PDF Result Report (White Background)

The PDF preview and generated PDF use a white background with dark text — the only screen in the app that is light-themed.

```
PDF colour overrides:
  background:      #FFFFFF
  text-primary:    #0A0A0A
  text-secondary:  #4A4A4A
  out-of-range:    #CC0000 (red, bold)
  header accent:   #003D28 (forest green)
  border:          #E0E0E0
```

PDF layout must include:
- Lab logo + name + address + MLSCN number (header)
- Patient name (ALL CAPS, large) + LAPID + age + gender
- Referring doctor name
- Collection date and time
- Test name as section heading
- Parameters table: Parameter | Result | Unit | Reference Range
- Out-of-range values in red bold with ↑ or ↓ indicator
- Interpretation/scientist comments section with left red border accent
- QR code (bottom right) — links to verified online copy
- Page footer: generated timestamp + report ID

### 6.4 Duplicate Detection Modal

Three-column comparison table:

| Column | Style |
|---|---|
| ATTRIBUTE | `--text-label` — muted uppercase |
| CURRENT ENTRY | `--color-text-primary` — normal |
| EXISTING RECORD | Matching fields in `--color-status-danger`; exact matches in `--color-text-mint`; match confidence badge |

Match confidence badge: `98% Match` — mint text, mint background, pill shape.

Footer buttons (left to right):
1. "Go back & edit" — text button, no border
2. "This is a new patient" — ghost/outline button
3. "Use existing record" — primary mint button

### 6.5 Sample Tracking Pipeline

The status pipeline at the top of the Sample Tracking page is a horizontal 5-stage display:

```
RECEIVED → PROCESSING → AWAITING APPROVAL → READY → DELIVERED
```

Each stage card:
- Shows count of samples in that stage
- Active/current stage: highlighted with mint border
- AWAITING APPROVAL stage: amber border (requires action)
- Clicking a stage filters the worklist below

### 6.6 Chain of Custody Timeline

Right panel on Sample Tracking detail view. Vertical timeline:

```css
.timeline-item {
  position: relative;
  padding-left: 28px;
  padding-bottom: 20px;
  border-left: 1px solid var(--color-border);
  margin-left: 8px;
}

/* Dot on the timeline */
.timeline-item::before {
  content: '';
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  position: absolute;
  left: -7px;
  top: 0;
}

/* Completed step */
.timeline-item--complete::before {
  background: var(--color-mint);
  border-color: var(--color-mint);
}

/* Current/active step */
.timeline-item--active::before {
  background: var(--color-status-warning);
  border-color: var(--color-status-warning);
}
```

---

## 7. Data & ID Formatting Rules

These rules must be implemented in utility functions and used consistently:

```typescript
// Currency — always ₦ prefix, thousands separator
formatNaira(182500)        → "₦182,500"
formatNaira(1820000)       → "₦1.82M"    (abbreviate above ₦1M)
formatNaira(452800)        → "₦452,800"

// LAPID
formatLAPID("LA202500847") → "LA-2025-00847"

// Nigerian phone number
formatPhone("08031234567") → "+234 803 123 4567"
formatPhone("2348031234567") → "+234 803 123 4567"

// Date
formatDate(date)           → "24 Oct 2023"
formatDateTime(date)       → "24 Oct 2023, 09:12 AM"
formatTimeAgo(date)        → "2 mins ago" / "3 hrs ago" / "Yesterday"

// Sample ID
formatSampleID("LB9821")   → "#LB-9821"

// Invoice ID
formatInvoiceID("9021")    → "#INV-9021"
```

---

## 8. Icon System

Use **Lucide React** as the sole icon library. No mixing with other icon sets.

Key icon mappings:

| UI Element | Lucide Icon |
|---|---|
| Dashboard | `LayoutDashboard` |
| Patients | `Users` |
| Sample Tracking | `FlaskConical` |
| Results | `FileText` |
| Billing | `CreditCard` |
| Inventory | `Package` |
| Reports | `BarChart2` |
| Settings | `Settings` |
| Sync status | `RefreshCw` |
| Notifications | `Bell` |
| New patient | `UserPlus` |
| Search | `Search` |
| Filter | `SlidersHorizontal` |
| More options | `MoreVertical` |
| QR code | `QrCode` |
| WhatsApp | `MessageCircle` |
| Print | `Printer` |
| Warning/Alert | `AlertTriangle` |
| Critical | `AlertOctagon` |
| Approve/Check | `CheckCircle` |
| Upload/Export | `Upload` |
| Download | `Download` |
| Chain of custody | `Link` |
| Logout | `LogOut` |
| Support | `HelpCircle` |

Icon sizing:
- Navigation sidebar icons: 18px × 18px
- Button icons: 16px × 16px
- Stat card decorative icons: 24px × 24px (opacity 0.2 — background only)
- Alert/warning icons: 20px × 20px

---

## 9. Animation & Transitions

Keep animations minimal and purposeful. This is a clinical tool, not a marketing site.

```css
/* Default transition for interactive elements */
transition: all 0.15s ease;

/* Sidebar slide-in on mobile */
transition: transform 0.25s ease;

/* Modal appear */
animation: fadeIn 0.15s ease;
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}

/* Sync pulse (when actively syncing) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.sync-dot--syncing { animation: pulse 1.2s ease infinite; }

/* Page transitions: none — instant navigation */
/* Reason: fast page loads on low-spec Android tablets */
```

**Animation rules:**
- No page transition animations — instant navigation only
- No loading skeletons with shimmer — use a simple spinner instead
- Never animate layout shifts
- `prefers-reduced-motion` must be respected

---

## 10. Offline-First UI Rules

These UI states must be implemented for every data-fetching component:

| State | UI Treatment |
|---|---|
| Online + synced | Normal UI, green sync dot |
| Online + pending sync | Amber sync dot, count shown |
| Offline | Amber banner visible, all write operations still work, queued locally |
| Syncing | Pulsing mint dot, "SYNCING..." text |
| Sync conflict | Red dot, toast notification with manual resolution CTA |

**Write operation feedback (offline):**
When a user saves data while offline, immediately show:
`"Saved locally — will sync when connection returns"` as a toast notification (amber, bottom-right, 4 second auto-dismiss).

**Never block the UI for network operations.** Every action must respond instantly from local state.

---

## 11. Role-Based UI Visibility

| UI Element | Owner | Manager | Scientist | Front Desk |
|---|---|---|---|---|
| Revenue figures | ✓ | ✗ | ✗ | ✗ |
| Billing module | ✓ | ✗ | ✗ | ✓ (record only) |
| Approve results button | ✓ | ✓ | ✗ | ✗ |
| Result entry form | ✓ | ✓ | ✓ | ✗ |
| Patient registration | ✓ | ✓ | ✗ | ✓ |
| User management | ✓ | ✗ | ✗ | ✗ |
| Inventory management | ✓ | ✓ | ✗ | ✗ |
| Reports & analytics | ✓ | ✓ | ✗ | ✗ |
| Settings | ✓ | Limited | ✗ | ✗ |

Hidden elements must be absent from the DOM entirely, not just visually hidden.
Role is enforced at Supabase RLS layer — UI visibility is a secondary convenience only.

---

## 12. Error & Empty States

### Empty States

```
Every empty table or list must show:
  - A relevant icon (muted, 40px)
  - A short headline: "No patients yet" / "No samples today"
  - A single CTA if relevant: "Register first patient"
  
Never show a blank white space for an empty list.
```

### Error States

```
Network error toast:
  position: bottom-right
  background: var(--color-surface)
  border-left: 3px solid var(--color-status-danger)
  auto-dismiss: 5 seconds
  
Form validation errors:
  Red border on input: border-color: var(--color-status-danger)
  Error message below: font-size 12px, color: var(--color-status-danger)
  
Critical system error (full page):
  Centered card with AlertOctagon icon
  Clear message
  "Retry" primary button
```

---

## 13. Landing Page (Marketing)

The landing page is the only page that differs significantly from the app theme.

**Section structure:**
1. Nav — dark, logo left, links right
2. Hero — dark background, large headline, two CTAs, WhatsApp mockup visual
3. Problem — light background (#F5F5F0), three pain point cards
4. Solution — dark background, six feature cards (2×3 grid)
5. Built for Nigeria — dark background, three trust statements
6. Pricing — dark background, single pricing statement, waitlist CTA
7. Footer — dark, links, NDPA + Data hosted in Africa badges

**Landing page specific rules:**
- Headline font: 700 weight, larger than app (48px+)
- Light sections use `#F5F5F0` background with `#0A0A0A` text
- Feature card icons: mint coloured, 24px
- CTA hierarchy: "Request early access" (primary mint) + "See how it works" (ghost)
- Footer compliance badges: `● NDPA COMPLIANT` and `● DATA HOSTED IN AFRICA` — both in mint

---

## 14. Do Not Do List

These patterns are explicitly banned from the codebase:

- ❌ Never use HIPAA — always NDPA
- ❌ Never use $ currency symbol — always ₦
- ❌ Never use US phone format — always +234
- ❌ Never use amber or red for decoration — status only
- ❌ Never put white text on the mint (#00E5A0) button — always black
- ❌ Never hide the sync status indicator
- ❌ Never block UI while waiting for a network response
- ❌ Never use gradients anywhere in the application
- ❌ Never use box-shadow for decoration — flat surfaces only
- ❌ Never show an empty chart — use placeholder data or hide the chart
- ❌ Never abbreviate LAPID — always show the full string
- ❌ Never use ALL CAPS for body copy or headings — uppercase reserved for labels only
- ❌ Never use role-based hidden elements with `visibility: hidden` or `opacity: 0` — remove from DOM
- ❌ Never use stock photography in the application UI

---

*Last updated: April 2026*
*This document must be updated whenever a design decision changes.*
*Claude Code: treat this file as the authoritative design specification.*
