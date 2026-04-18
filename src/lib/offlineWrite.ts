import { writeRecord } from './writeRecord'

export function offlineSuccessMessage(successMessage: string) {
  return navigator.onLine
    ? successMessage
    : `${successMessage} locally — will sync when connection returns`
}

/**
 * Wraps writeRecord and returns a message string appropriate to whether the
 * device is currently online. Callers should pass the returned message
 * straight to toast.push().
 */
export async function offlineWrite<T extends { id: string }>(
  table: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  payload: T,
  oldValue?: Partial<T> | null,
  successMessage = 'Saved'
): Promise<string> {
  await writeRecord(table, operation, payload, oldValue)
  return offlineSuccessMessage(successMessage)
}
