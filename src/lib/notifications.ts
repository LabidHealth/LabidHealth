import { db } from './db'
import { writeRecord } from './writeRecord'
import type { Notification } from '@/types'

/**
 * Queue a result-ready notification for delivery to the patient via WhatsApp
 * (with SMS fallback). The Supabase Edge Function picks it up from the
 * notifications table once it's synced.
 */
export async function queueNotification(
  resultId: string,
  labid: string,
  labId: string,
  pdfUrl: string | null,
  patientPhone: string | null
): Promise<Notification> {
  const now = new Date().toISOString()
  const notification: Notification = {
    id: crypto.randomUUID(),
    labid,
    result_id: resultId,
    lab_id: labId,
    channel: 'whatsapp',
    status: 'queued',
    recipient_phone: patientPhone,
    secure_link: pdfUrl,
    link_token: null,
    link_expires_at: null,
    sent_at: null,
    delivered_at: null,
    opened_at: null,
    failure_reason: null,
    is_doctor_copy: false,
    doctor_name: null,
    superseded_by: null,
    created_at: now
  }
  await writeRecord('notifications', 'INSERT', notification)
  return notification
}

/**
 * Get the latest delivery status for a result from local IndexedDB.
 */
export async function getDeliveryStatus(resultId: string): Promise<Notification | undefined> {
  const all = await db.notifications
    .where('result_id')
    .equals(resultId)
    .sortBy('created_at')
  return all[all.length - 1]
}

/**
 * Resend — supersedes the previous notification and creates a new queued one.
 */
export async function resendNotification(
  previous: Notification,
  pdfUrl: string | null
): Promise<Notification> {
  const now = new Date().toISOString()

  // Mark old notification as superseded
  const superseded: Notification = { ...previous, superseded_by: 'resend', updated_at: now } as Notification & { updated_at: string }
  await writeRecord('notifications', 'UPDATE', superseded, previous)

  // Create new queued notification
  const fresh: Notification = {
    ...previous,
    id: crypto.randomUUID(),
    status: 'queued',
    secure_link: pdfUrl ?? previous.secure_link,
    sent_at: null,
    delivered_at: null,
    opened_at: null,
    failure_reason: null,
    superseded_by: null,
    created_at: now
  }
  await writeRecord('notifications', 'INSERT', fresh)
  return fresh
}
