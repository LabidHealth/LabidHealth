# Labora AI — Sync Engine
## Detailed design for offline-first data synchronisation

---

## The Core Rule

**Every write in the app follows this order — no exceptions:**

```
1. Validate (client-side, Zod schema)
2. Write to IndexedDB (Dexie) → UI updates immediately
3. Add to syncQueue
4. If online → trigger sync immediately
5. If offline → queue waits, syncs on next connection
```

The user never waits for the network. The UI is always driven by local state.

---

## Sync Queue Structure

Every pending write is stored as a `SyncQueueItem` in Dexie:

```typescript
interface SyncQueueItem {
  id?: number           // auto-increment Dexie key
  table: string         // 'patients' | 'samples' | 'results' | 'invoices' | etc.
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  recordId: string      // UUID of the record
  payload: object       // the full record to insert/update
  timestamp: number     // Date.now() when queued
  attempts: number      // how many sync attempts have been made
  lastError?: string    // last error message for debugging
}
```

---

## Conflict Resolution Rules

| Table | Strategy | Reason |
|---|---|---|
| `patients` | Last-write-wins (timestamp) | Demographic edits are rare, conflicts unlikely |
| `samples` | Append-only (events) | Status is built from event log, never a mutable field |
| `results` | Version check + last-write-wins | One scientist per result — conflicts very rare |
| `invoices` | Last-write-wins on status | Status is computed from payments table |
| `payments` | Append-only | Each payment is a new event, never overwritten |
| `inventory` | Last-write-wins | Reconciled during physical stock takes |
| `sample_events` | Append-only | Audit log — never modified |
| `audit_log` | Append-only | Compliance record — never modified |

---

## Sync Engine States

The sync engine is always in one of these states, visible in the Header:

| State | Dot colour | Text | When |
|---|---|---|---|
| SYNCED | Mint | SYNCED | Online, queue empty |
| SYNCING | Mint pulsing | SYNCING... | Actively pushing to Supabase |
| PENDING | Amber | N CHANGES PENDING | Online, queue has items |
| OFFLINE | Amber | WORKING OFFLINE | navigator.onLine = false |
| CONFLICT | Red | SYNC CONFLICT | A write was rejected by Supabase |

---

## Error Handling

| Error type | Behaviour |
|---|---|
| Network error (fetch failed) | Retry in 30 seconds. Increment attempt counter. |
| 401 Unauthorized | Refresh Supabase session token, retry once |
| 409 Conflict (duplicate key) | Mark as conflict in queue, surface to owner via red sync dot |
| 422 Validation error | Remove from queue (invalid data won't succeed on retry), log to audit |
| 500 Server error | Retry up to 5 times with exponential backoff, then mark as failed |
| After 5 failures | Remove from queue, log to KNOWN_ISSUES, show error toast to user |

---

## The writeRecord Helper

All feature code must use this single function for any data write:

```typescript
// src/lib/writeRecord.ts

import { db } from './db'
import { supabase } from './supabase'
import { syncEngine } from './sync'
import { logAuditEvent } from './auditLog'

export async function writeRecord<T extends { id: string }>(
  table: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: T,
  oldValue?: Partial<T>
): Promise<T> {

  // Step 1: Write to IndexedDB immediately
  const dexieTable = db.table(table)

  if (operation === 'INSERT') {
    await dexieTable.add(payload)
  } else if (operation === 'UPDATE') {
    await dexieTable.update(payload.id, payload)
  } else if (operation === 'DELETE') {
    await dexieTable.delete(payload.id)
  }

  // Step 2: Add to sync queue
  await db.syncQueue.add({
    table,
    operation,
    recordId: payload.id,
    payload,
    timestamp: Date.now(),
    attempts: 0
  })

  // Step 3: Log to audit trail (local first, syncs same as other records)
  await logAuditEvent(operation, table, payload.id, oldValue, payload)

  // Step 4: Trigger immediate sync if online
  if (navigator.onLine) {
    syncEngine.push().catch(console.error)
  }

  // Return the locally written record immediately
  return payload
}
```

---

## What Happens During a Conflict

A conflict occurs when two devices edit the same record while both offline, then both sync.

**Example:** Front Desk A and Front Desk B both update the same patient's phone number while offline. Front Desk A syncs first (wins). Front Desk B syncs second — Supabase updates the row again with B's version.

For patient demographics (last-write-wins): this is acceptable. The most recent edit wins. No data is lost — the audit_log has both edits with timestamps.

For results (version check): if a result was approved while a scientist was still editing an offline draft, the scientist's draft cannot overwrite the approved result. The sync engine checks the current status in Supabase before applying an UPDATE. If the status has moved forward, it rejects the update and surfaces a conflict notification.

**Conflict notification format:**
```
"Sync conflict on [Patient Name]'s result — a newer version exists.
Your offline changes were not applied.
[View current version] [Dismiss]"
```

---

## Testing the Sync Engine

Manually test these scenarios before launch (also covered in Prompt 26):

### Scenario 1: Basic offline write
1. DevTools → Network → Offline
2. Register a new patient
3. Verify patient in IndexedDB (DevTools → Application → IndexedDB → LaboraAI → patients)
4. Verify syncQueue has 1 item
5. DevTools → Network → Online
6. Wait 5 seconds
7. Verify patient in Supabase table
8. Verify syncQueue is empty

### Scenario 2: Multiple offline writes
1. Go offline
2. Register 3 patients, 2 samples, 1 payment
3. Come online
4. All 6 items should sync within 30 seconds in order

### Scenario 3: App closed while offline, reopened online
1. Go offline
2. Register a patient
3. Close Chrome tab completely
4. Reopen Chrome, navigate to the app
5. Come online
6. Sync engine restarts from the queue (items still in IndexedDB)
7. Patient syncs correctly

### Scenario 4: Sync failure and retry
1. Temporarily break the Supabase connection (invalid URL in env)
2. Register a patient
3. Come "online" with broken Supabase
4. Verify attempt counter increments every 30 seconds
5. Fix the Supabase connection
6. Verify patient syncs on next successful attempt

---

## Monitoring in Production

For the lab owner, a simplified sync health view is in Settings:

- Last successful sync: timestamp
- Items currently pending: count
- Failed items (stuck): count + "Contact support" if > 0
- Total synced lifetime: count

---

*Last updated: April 2026*
