import { db } from './db'

export async function logAuditEvent(
  action: string,
  tableName: string,
  recordId: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>
) {
  await db.audit_log.add({
    id: crypto.randomUUID(),
    action,
    table_name: tableName,
    record_id: recordId,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    created_at: new Date().toISOString()
  })
}
