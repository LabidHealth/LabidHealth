# Labora AI — Setup Guide
## Every external service, tool, and configuration needed before writing a line of feature code

---

## Prerequisites — Do These First

Before anything else, you need accounts on these platforms. All are free at the tier we need.

| Service | URL | Purpose |
|---|---|---|
| GitHub | github.com | Source control + Vercel deployment trigger |
| Supabase | supabase.com | Backend, database, auth, storage |
| Vercel | vercel.com | Frontend hosting |
| Meta for Developers | developers.facebook.com | WhatsApp Business API |
| Twilio | twilio.com | SMS fallback (dev/test only) |
| Termii | termii.com | SMS fallback (production — Nigerian provider) |

---

## Step 1 — Scaffold the Project

### 1.1 Create the Vite + React + TypeScript project

```bash
npm create vite@latest labora-ai -- --template react-ts
cd labora-ai
npm install
```

### 1.2 Install all dependencies upfront

```bash
# Core
npm install react-router-dom @supabase/supabase-js dexie

# PWA
npm install -D vite-plugin-pwa workbox-window

# UI
npm install lucide-react @react-pdf/renderer

# Forms + validation
npm install react-hook-form zod @hookform/resolvers

# Date utilities
npm install date-fns

# QR code
npm install qrcode react-qr-code html5-qrcode

# Dev utilities
npm install -D typescript @types/react @types/react-dom eslint prettier
```

### 1.3 Configure vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // Show "update available" prompt — never silently update
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Labora AI',
        short_name: 'Labora AI',
        description: 'Lab Infrastructure for Africa',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        // Cache the app shell — everything the UI needs to render offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Never cache API calls — data comes from IndexedDB when offline
        runtimeCaching: []
      }
    })
  ],
  resolve: {
    alias: { '@': '/src' }
  }
})
```

### 1.4 Set up TypeScript path aliases in tsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "strict": true,
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx"
  }
}
```

### 1.5 Create the folder structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # Primitive components (Button, Badge, Input, Modal)
│   ├── layout/          # Sidebar, Header, Layout wrapper
│   └── shared/          # Domain-aware shared components (PatientAvatar, LAPIDCell)
├── pages/               # One folder per module
│   ├── dashboard/
│   ├── patients/
│   ├── samples/
│   ├── results/
│   ├── billing/
│   ├── inventory/
│   ├── reports/
│   └── settings/
├── lib/
│   ├── supabase.ts      # Supabase client singleton
│   ├── db.ts            # Dexie IndexedDB schema and instance
│   ├── sync.ts          # Sync engine — IndexedDB → Supabase
│   └── formatters.ts    # All formatting utilities (currency, LAPID, phone, date)
├── hooks/               # Custom React hooks
│   ├── useOnlineStatus.ts
│   ├── useSyncQueue.ts
│   └── useAuth.ts
├── types/               # All TypeScript interfaces and types
│   └── index.ts
├── styles/
│   └── globals.css      # CSS variables, reset, base styles
└── main.tsx
```

---

## Step 2 — Supabase Setup

### 2.1 Create the project

1. Go to supabase.com → New Project
2. **Project name:** labora-ai-production
3. **Database password:** Generate a strong password and store it in a password manager
4. **Region:** CRITICAL — select **South Africa (Cape Town)** — this is the NDPA data residency requirement. Do not select any other region.
5. Wait 2–3 minutes for provisioning

### 2.2 Get your credentials

Dashboard → Settings → API

Copy these values into your `.env.local` file:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Never commit `.env.local` to Git. Add it to `.gitignore` immediately.

### 2.3 Create the Supabase client

`src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase' // generated types

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 }
  }
})
```

### 2.4 Run the database migrations

All migrations live in `supabase/migrations/`. Run them in order via the Supabase SQL editor or via the CLI:

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

See `schema.md` for the full database schema SQL.

### 2.5 Enable Authentication providers

Dashboard → Authentication → Providers:
- **Email** — enabled (for staff accounts)
- **Phone** — enabled (for patient portal Phase 2 — OTP via SMS)
- All others — disabled

Dashboard → Authentication → Settings:
- Site URL: your Vercel URL (add after deployment)
- Redirect URLs: add your Vercel URL + `http://localhost:5173` for development

### 2.6 Configure Storage buckets

Dashboard → Storage → New bucket:

| Bucket name | Public | Purpose |
|---|---|---|
| `result-pdfs` | No (private) | Generated PDF result reports |
| `lab-logos` | Yes (public) | Lab logo files for PDF headers |
| `patient-photos` | No (private) | Optional patient identity photos |
| `sample-labels` | No (private) | Printed QR label PDFs |

For `result-pdfs`, create a storage policy:
```sql
-- Lab staff can upload PDFs for their own lab
CREATE POLICY "Lab staff upload results"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'result-pdfs' AND
  auth.uid() IN (
    SELECT user_id FROM lab_staff WHERE lab_id = (
      SELECT lab_id FROM result_files WHERE id = name::uuid
    )
  )
);
```

### 2.7 Generate TypeScript types from your schema

After running migrations:
```bash
supabase gen types typescript --project-id your-project-ref > src/types/supabase.ts
```

Re-run this every time the schema changes.

### 2.8 Enable Realtime on tables that need live updates

Dashboard → Database → Replication → Enable for:
- `samples` (so manager dashboard updates live)
- `results` (so approval queue updates live)
- `notifications` (for delivery status updates)

---

## Step 3 — Dexie.js (IndexedDB) Setup

`src/lib/db.ts` — define the entire offline schema here:

```typescript
import Dexie, { type Table } from 'dexie'
import type { Patient, Sample, Result, Invoice, SyncQueueItem } from '@/types'

class LaboraDatabase extends Dexie {
  patients!: Table<Patient>
  samples!: Table<Sample>
  results!: Table<Result>
  invoices!: Table<Invoice>
  syncQueue!: Table<SyncQueueItem>

  constructor() {
    super('LaboraAI')
    this.version(1).stores({
      // Index fields that will be searched
      patients:   '++id, lapid, phone, name, labId, syncedAt',
      samples:    '++id, sampleId, lapid, status, labId, assignedTo, syncedAt',
      results:    '++id, sampleId, lapid, status, approvedBy, syncedAt',
      invoices:   '++id, invoiceId, lapid, status, labId, syncedAt',
      // Sync queue — operations waiting to be sent to Supabase
      syncQueue:  '++id, table, operation, recordId, timestamp, attempts'
    })
  }
}

export const db = new LaboraDatabase()
```

**Critical rule:** Every write to Supabase must first write to IndexedDB, then queue the sync. The sync engine picks up the queue and pushes to Supabase when online. See `sync.md` for the full sync engine design.

---

## Step 4 — Vercel Deployment

### 4.1 Connect GitHub to Vercel

1. Push your project to GitHub: `git remote add origin your-repo-url && git push`
2. Go to vercel.com → New Project → Import from GitHub
3. Select your `labora-ai` repository
4. Framework preset: **Vite** (auto-detected)
5. Build command: `npm run build`
6. Output directory: `dist`

### 4.2 Add environment variables in Vercel

Dashboard → Project → Settings → Environment Variables:

```
VITE_SUPABASE_URL         = your Supabase URL
VITE_SUPABASE_ANON_KEY    = your Supabase anon key
VITE_WHATSAPP_API_URL     = https://graph.facebook.com/v18.0
VITE_APP_ENV              = production
```

### 4.3 Add Vercel URL to Supabase auth

After first deploy, copy your `.vercel.app` URL and add it to:
- Supabase → Authentication → Settings → Site URL
- Supabase → Authentication → Settings → Redirect URLs

### 4.4 Custom domain (optional at MVP stage)

Vercel → Project → Settings → Domains → Add domain.
Point your DNS A record to `76.76.19.19` (Vercel).

---

## Step 5 — WhatsApp Business API

**Apply on Day 1. This takes 2–6 weeks.**

### 5.1 Prerequisites before applying

- A registered Nigerian business (CAC registration)
- A dedicated phone number — not your personal number, not currently on WhatsApp personal
- A Facebook Business Manager account verified with the business

### 5.2 Application steps

1. Go to developers.facebook.com → Create App → Business type
2. Add the **WhatsApp** product to your app
3. In Meta Business Manager → WhatsApp → Getting Started
4. Register your phone number — Meta will call it with a verification code
5. Submit business verification documents:
   - CAC certificate
   - Government-issued ID (director/founder)
   - Proof of address for the business

### 5.3 Create and pre-approve message templates

Templates must be approved before they can be sent. Submit these templates immediately:

**Template 1: result_ready**
```
Hello {{1}}, your lab result from {{2}} is ready.
Download securely: {{3}}
Your LAPID: {{4}}
Valid for 72 hours.
```

**Template 2: lapid_issued**
```
Welcome to {{1}}. Your patient ID (LAPID) is {{2}}.
Keep this safe — use it at any Labora AI lab.
```

**Template 3: result_reminder**
```
Reminder: Your lab result from {{1}} was not opened.
Download here: {{2}}
Contact the lab: {{3}}
```

**Template 4: doctor_notification**
```
Dr {{1}}, a result for your patient {{2}} is ready.
View result: {{3}}
```

### 5.4 Store credentials in environment variables

```env
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-permanent-access-token
WHATSAPP_BUSINESS_ACCOUNT_ID=your-waba-id
```

These go in Supabase Edge Function secrets, not in the frontend `.env`.

### 5.5 Development workaround during approval wait

Use the **WhatsApp Business API sandbox** via Twilio:

```bash
# In Twilio console: enable WhatsApp sandbox
# Send "join <your-sandbox-word>" from your test phone to +1 415 523 8886
# Then test message delivery using Twilio SDK
```

---

## Step 6 — SMS Fallback (Termii)

### 6.1 Create a Termii account

Go to termii.com → Sign up → Nigerian business account

### 6.2 Get API credentials

Dashboard → Settings → API → Copy API key

```env
TERMII_API_KEY=your-termii-api-key
TERMII_SENDER_ID=LaboraAI   # Max 11 characters, approved by Termii
```

### 6.3 Register your Sender ID

In Termii dashboard → Sender IDs → Request new sender ID
- Name: `LaboraAI`
- Use case: Healthcare — lab result delivery
- Approval takes 24–48 hours

### 6.4 SMS message templates

```
Result ready: Your lab result from [LAB NAME] is ready. Get it here: [LINK] (Valid 72hrs). LAPID: [LAPID]

LAPID issued: Welcome to [LAB NAME]. Your LAPID is [LAPID]. Keep it safe for future visits.
```

---

## Step 7 — Set Up Local Development Environment

### 7.1 Create .env.local

```env
# Supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# App
VITE_APP_ENV=development
VITE_APP_VERSION=0.1.0

# WhatsApp (leave empty in dev — use Twilio sandbox)
VITE_WHATSAPP_MODE=sandbox
```

### 7.2 Create .gitignore

```
node_modules/
dist/
.env.local
.env.*.local
*.log
.DS_Store
```

### 7.3 Install the Supabase CLI for local development

```bash
npm install -g supabase
supabase start  # Starts a local Supabase instance with Docker
```

This gives you a local Postgres + Auth + Storage that mirrors production. Useful for testing migrations and RLS policies without touching production data.

### 7.4 Run the development server

```bash
npm run dev
```

App runs at `http://localhost:5173`. Open in Chrome — always Chrome, not Safari or Firefox, because the PWA you are building runs in Chrome on Android.

---

## Step 8 — Android Tablet Testing Setup

**This is mandatory, not optional. Do it in Week 1.**

### 8.1 Get the hardware

Buy a ₦35,000–₦50,000 Android tablet from Slot or Pointek. Target spec:
- Android 10 or higher
- 2GB RAM
- Chrome browser installed (comes pre-installed)

### 8.2 Access your local dev server from the tablet

Your tablet and laptop must be on the same WiFi network. Then:

```bash
# Find your laptop's local IP
ipconfig getifaddr en0   # macOS
ip addr show             # Linux/WSL

# Access the dev server from tablet browser
http://192.168.x.x:5173
```

Or use ngrok for a public tunnel:
```bash
npx ngrok http 5173
# Use the https URL on your tablet
```

### 8.3 Test the PWA install prompt

In Chrome on the tablet:
1. Open the app URL
2. Chrome shows "Add to Home Screen" banner — tap it
3. App installs to the home screen with the Labora AI icon
4. Open from home screen — should launch in full-screen standalone mode (no Chrome address bar)

### 8.4 Test offline mode

1. Open the installed app
2. Turn on Airplane Mode
3. All UI should load from Service Worker cache
4. Register a patient — should save to IndexedDB
5. Turn off Airplane Mode
6. Patient should sync to Supabase automatically

---

## Step 9 — Git & Deployment Workflow

### 9.1 Branch strategy

```
main          → Production (auto-deploys to Vercel)
develop       → Staging (deploy preview on Vercel)
feature/xxx   → Feature branches (merge to develop via PR)
```

### 9.2 Commit message convention

```
feat: add LAPID duplicate detection modal
fix: resolve offline sync conflict on patient registration
chore: update Supabase types after schema migration
refactor: extract formatNaira utility to formatters.ts
```

### 9.3 Pre-commit checks

```bash
# Add to package.json scripts
"lint": "eslint src --ext .ts,.tsx",
"typecheck": "tsc --noEmit",
"precommit": "npm run typecheck && npm run lint"
```

---

## Step 10 — Initial Supabase RLS Policies

These policies must be in place **before any patient data enters the system.** See `schema.md` for the full SQL, but the key pattern is:

```sql
-- Every table has lab_id — staff can only see data from their own lab
CREATE POLICY "Staff see own lab data"
ON patients FOR SELECT
TO authenticated
USING (
  lab_id = (SELECT lab_id FROM lab_staff WHERE user_id = auth.uid())
);

-- Lab owners see everything in their lab
-- Lab managers see operational data but not revenue
-- Scientists see only assigned samples
-- Front desk see patients and invoices but not results
-- All enforced at DB layer via separate policies per role
```

---

## Checklist — Ready to Build Features

Before writing any feature code, confirm all boxes are checked:

- [ ] `npm run dev` starts without errors
- [ ] TypeScript strict mode enabled with zero errors
- [ ] Supabase project created in Cape Town region
- [ ] `.env.local` configured with Supabase credentials
- [ ] Dexie.js database initialises without errors
- [ ] vite-plugin-pwa configured and Service Worker registers in Chrome
- [ ] App installs as PWA on Android tablet
- [ ] Offline mode: app loads with no internet
- [ ] GitHub repository created and connected to Vercel
- [ ] First deployment to Vercel successful
- [ ] WhatsApp Business API application submitted
- [ ] Termii account created and Sender ID submitted
- [ ] `.gitignore` includes `.env.local`
- [ ] Database migrations run and TypeScript types generated
- [ ] RLS policies in place before first test data entry

---

*Last updated: April 2026*
