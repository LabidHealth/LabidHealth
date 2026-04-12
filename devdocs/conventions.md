# Labora AI — Coding Conventions
## Rules that keep the codebase consistent and maintainable

---

## 1. File & Folder Naming

```
PascalCase     → React components:     PatientListPage.tsx, RegisterSamplePage.tsx
camelCase      → Hooks, utilities:     useOnlineStatus.ts, formatters.ts, sync.ts
kebab-case     → CSS files (rare):     globals.css
UPPER_SNAKE    → Constants:            MAX_SYNC_ATTEMPTS, LAPID_PREFIX
```

One component per file. File name matches the exported component name exactly.

---

## 2. Component Structure

Every component follows this internal order:

```typescript
// 1. Imports (external libraries first, then internal)
import { useState } from 'react'
import { User } from 'lucide-react'
import { db } from '@/lib/db'
import { Button, Badge } from '@/components/ui'
import type { Patient } from '@/types'

// 2. Types & interfaces (local to this file)
interface PatientCardProps {
  patient: Patient
  onSelect: (lapid: string) => void
}

// 3. Component function (named export only — no default exports except pages)
export function PatientCard({ patient, onSelect }: PatientCardProps) {

  // 3a. Hooks first
  const [isExpanded, setIsExpanded] = useState(false)

  // 3b. Derived values
  const initials = patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)

  // 3c. Handlers
  const handleClick = () => {
    onSelect(patient.lapid)
  }

  // 3d. Render
  return (
    <div onClick={handleClick}>
      {/* ... */}
    </div>
  )
}
```

**No default exports except for page components.** All utility exports are named.

---

## 3. TypeScript Rules

- `strict: true` in tsconfig — no exceptions
- No `any` type except in generated Supabase types until schema is stable
- All props interfaces are explicitly typed — never inferred from usage
- All function return types are explicitly typed for functions longer than 3 lines
- Never use `as` type casting to force types — fix the type properly
- Enums for status values: use TypeScript union types, not `enum` keyword

```typescript
// ✅ Correct
type SampleStatus = 'received' | 'processing' | 'awaiting_approval' | 'ready' | 'delivered'

// ❌ Avoid
enum SampleStatus { Received = 'received', ... }
```

---

## 4. Data Writing Rules

**The only function allowed to write data is `writeRecord()`.**

```typescript
// ✅ Correct — all writes go through writeRecord
await writeRecord('patients', 'INSERT', newPatient)

// ❌ Never write directly to Supabase from a component
await supabase.from('patients').insert(newPatient)

// ❌ Never write directly to Dexie from a component
await db.patients.add(newPatient)
```

The only exception is the sync engine itself, which writes directly to Supabase by design.

---

## 5. Data Reading Rules

Always read from IndexedDB first. Fall back to Supabase if the local record is not found.

```typescript
// ✅ Correct read pattern
async function getPatient(lapid: string): Promise<Patient | null> {
  // 1. Check local first
  const local = await db.patients.where('lapid').equals(lapid).first()
  if (local) return local

  // 2. Fall back to Supabase if online
  if (!navigator.onLine) return null
  const { data } = await supabase.from('patients').select('*').eq('lapid', lapid).single()
  if (data) {
    await db.patients.add(data) // cache locally
    return data
  }

  return null
}
```

---

## 6. Monetary Values

All monetary values are stored and computed in **kobo** (integers). Display only in naira.

```typescript
// ✅ Storage: always kobo
const price: number = 350000 // ₦3,500

// ✅ Display: always formatNaira()
formatNaira(350000) // → "₦3,500"

// ❌ Never store as naira decimal
const price: number = 3500.00 // wrong — floating point errors in calculations

// ❌ Never display raw kobo
`₦${price}` // → "₦350000" — wrong
```

---

## 7. Date & Time Rules

All dates stored as ISO 8601 strings in UTC. All dates displayed using formatter functions.

```typescript
// Storage
created_at: new Date().toISOString() // "2025-10-24T09:12:00.000Z"

// Display
formatDate(patient.created_at)     // "24 Oct 2025"
formatDateTime(sample.collected_at) // "24 Oct 2025, 09:12 AM"
formatTimeAgo(result.approved_at)   // "2 hrs ago"
```

Never display raw ISO strings to users. Never use `new Date().toLocaleDateString()` — it produces locale-specific output that may not match the DD Mon YYYY format.

---

## 8. LAPID Rules

A LAPID is always the full string `LA-YYYY-NNNNN`. Never truncate, never abbreviate.

```typescript
// Display
<span className="font-mono text-mint">{formatLAPID(patient.lapid)}</span>

// Never truncate
patient.lapid.slice(0, 10) + '...' // ❌ banned
```

---

## 9. Role Checking

Never check roles in rendering logic with inline ternaries. Use a `useRole()` hook.

```typescript
// src/hooks/useRole.ts
export function useRole() {
  const { role } = useAuthContext()
  return {
    isOwner: role === 'owner',
    isManager: role === 'manager',
    isScientist: role === 'scientist',
    isFrontDesk: role === 'front_desk',
    canApproveResults: role === 'owner' || role === 'manager',
    canViewRevenue: role === 'owner',
    canManageStaff: role === 'owner',
    canRegisterPatients: role !== 'scientist',
    canEnterResults: role !== 'front_desk',
  }
}

// In a component
const { canApproveResults } = useRole()
return canApproveResults ? <ApproveButton /> : null
// The element is absent from DOM when false (returning null, not hiding)
```

---

## 10. Error Messages

Never show technical error messages to users. Map errors to human-readable messages.

```typescript
// ✅ User-facing error messages
const ERROR_MESSAGES: Record<string, string> = {
  'Failed to fetch': 'No connection — your data is saved and will sync automatically',
  'JWT expired': 'Your session has expired — please sign in again',
  'duplicate key value': 'This record already exists',
  'violates row-level security': 'You do not have permission to do this',
}

function getUserFriendlyError(error: Error): string {
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (error.message.includes(key)) return message
  }
  return 'Something went wrong — please try again'
}
```

---

## 11. Loading States

Every async operation must have a loading state. Never leave the user staring at a blank space.

```typescript
// ✅ Correct loading pattern
function PatientListPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.patients.toArray().then(data => {
      setPatients(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <Spinner />
  if (patients.length === 0) return <EmptyState ... />
  return <PatientTable patients={patients} />
}
```

Use `<Spinner />` for loading states — not skeleton shimmer (design.md animation rules).

---

## 12. Forbidden Patterns

These are banned from the codebase:

```typescript
// ❌ Direct Supabase write from component
supabase.from('patients').insert(data)

// ❌ localStorage for patient data (use Dexie)
localStorage.setItem('patients', JSON.stringify(data))

// ❌ CSS inline styles (use className and CSS variables)
style={{ color: '#00E5A0' }}

// ❌ Hardcoded colours (use CSS variables)
style={{ color: 'green' }}

// ❌ console.log in production (stripped by Vite build config)
console.log('debug data:', patient)  // use console.error for real errors only

// ❌ Any mention of HIPAA
'HIPAA compliant'  // always NDPA

// ❌ $ currency symbol
`$${amount}`  // always ₦

// ❌ Gradients (design.md rule)
background: 'linear-gradient(...)' // banned

// ❌ box-shadow for decoration (design.md rule)
boxShadow: '0 4px 12px rgba(0,0,0,0.2)' // banned

// ❌ Type assertion to force incorrect types
const patient = data as Patient  // fix the type instead
```

---

## 13. Import Order

```typescript
// 1. React core
import { useState, useEffect, useCallback } from 'react'

// 2. Third-party libraries
import { useNavigate } from 'react-router-dom'
import { User, Search } from 'lucide-react'

// 3. Internal — lib and utilities
import { db } from '@/lib/db'
import { writeRecord } from '@/lib/writeRecord'
import { formatLAPID, formatDate } from '@/lib/formatters'

// 4. Internal — hooks
import { useRole } from '@/hooks/useRole'
import { useAuthContext } from '@/context/AuthContext'

// 5. Internal — components
import { Button, Badge, Input } from '@/components/ui'
import { AppLayout } from '@/components/layout'

// 6. Types
import type { Patient, Sample } from '@/types'
```

---

## 14. Comments

```typescript
// ✅ Comment when explaining WHY, not WHAT
// Prices stored in kobo to avoid floating-point arithmetic errors in totals
const subtotal = lineItems.reduce((sum, item) => sum + item.price, 0)

// ✅ Comment NDPA-relevant decisions
// NDPA requires explicit consent before storing cross-lab history
if (!patient.consent) return null

// ❌ Never comment the obvious
// Loop through patients
patients.forEach(patient => ...)
```

---

*Last updated: April 2026*
*These conventions apply to every file in the src/ directory.*
*When in doubt: match what already exists in the codebase.*
