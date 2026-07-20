import { writeRecord } from './writeRecord'
import { features } from './features'
import { supabase } from './supabase'
import type { Invoice, Notification, Patient, Result } from '@/types'

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1`

// wa.me click-to-send delivery. The front desk taps "Send via WhatsApp", which
// mints a secure per-result link and opens WhatsApp (their own number) with a
// message pre-filled to the patient. No Meta Business API — this uses the lab's
// existing WhatsApp. The token is stored on a notification row that the
// result-view Edge Function resolves for the patient.

/** Delivery is held while the invoice has an outstanding balance (config-gated). */
export function isDeliveryHeld(invoice: Invoice | null | undefined): boolean {
  if (!features.deliveryPaymentGate) return false
  return Boolean(invoice && invoice.outstanding > 0)
}

/** Unguessable link token. Uses the Web Crypto RNG. */
export function generateLinkToken(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  // URL-safe base64 without padding.
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** The patient-facing result URL (same origin the app is served from). */
export function resultLink(token: string): string {
  return `${window.location.origin}/r/${token}`
}

/**
 * Normalise a Nigerian phone number to wa.me form: country code + number,
 * digits only, no '+'. Handles 0803…, 234803…, +234803…, and bare 803… .
 */
export function toWaNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0')) return `234${digits.slice(1)}`
  if (digits.length === 10) return `234${digits}`
  return digits
}

export function buildWaMeUrl(phone: string, message: string): string {
  return `https://wa.me/${toWaNumber(phone)}?text=${encodeURIComponent(message)}`
}

function deliveryMessage(patientName: string, testName: string, labName: string, link: string): string {
  const name = patientName.split(' ')[0] || patientName
  return `Hello ${name}, your ${testName} result from ${labName} is ready. View it securely here: ${link}`
}

export interface DeliveryOutcome {
  notification: Notification
  waUrl: string
}

/**
 * Records a WhatsApp delivery for a result and returns the wa.me URL to open.
 * Creates a notification (INSERT → syncs) carrying the secure link token; the
 * caller opens `waUrl` so the sender's WhatsApp composes the message.
 * Callers must check isDeliveryHeld() first — this does not re-check the gate.
 */
export async function deliverViaWhatsApp(args: {
  result: Result
  patient: Patient
  testName: string
  labName: string
}): Promise<DeliveryOutcome> {
  const { result, patient, testName, labName } = args
  const now = new Date().toISOString()
  const token = generateLinkToken()
  const link = resultLink(token)
  const expires = new Date(Date.now() + 30 * 86_400_000).toISOString()

  const notification: Notification = {
    id: crypto.randomUUID(),
    labid: result.labid,
    result_id: result.id,
    lab_id: result.lab_id,
    channel: 'whatsapp',
    status: 'sent',
    recipient_phone: patient.phone,
    secure_link: link,
    link_token: token,
    link_expires_at: expires,
    sent_at: now,
    delivered_at: null,
    opened_at: null,
    failure_reason: null,
    is_doctor_copy: false,
    doctor_name: null,
    superseded_by: null,
    created_at: now
  }

  await writeRecord('notifications', 'INSERT', notification)

  return { notification, waUrl: buildWaMeUrl(patient.phone, deliveryMessage(patient.full_name, testName, labName, link)) }
}

export type SmsOutcome =
  | { status: 'sent'; notification: Notification }
  | { status: 'not_configured'; message: string }
  | { status: 'failed'; message: string }

/**
 * SMS fallback via the send-sms Edge Function (Termii). Staff-only: sends the
 * caller's session JWT. Only records a delivery notification on success — if
 * SMS is not configured yet, nothing is sent and no token is minted.
 * Callers must check isDeliveryHeld() first — this does not re-check the gate.
 */
export async function deliverViaSms(args: { result: Result; patient: Patient; testName: string }): Promise<SmsOutcome> {
  const { result, patient, testName } = args
  const token = generateLinkToken()
  const link = resultLink(token)
  const sms = `Labid Health: your ${testName} result is ready. View: ${link}`

  const { data } = await supabase.auth.getSession()
  const res = await fetch(`${FUNCTIONS_BASE}/send-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
    },
    body: JSON.stringify({ to: patient.phone, message: sms })
  })
  const payload = await res.json().catch(() => ({}) as { message?: string })
  if (res.status === 503) return { status: 'not_configured', message: payload.message ?? 'SMS is not enabled yet.' }
  if (!res.ok) return { status: 'failed', message: payload.message ?? 'SMS could not be sent.' }

  const now = new Date().toISOString()
  const notification: Notification = {
    id: crypto.randomUUID(),
    labid: result.labid,
    result_id: result.id,
    lab_id: result.lab_id,
    channel: 'sms',
    status: 'sent',
    recipient_phone: patient.phone,
    secure_link: link,
    link_token: token,
    link_expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    sent_at: now,
    delivered_at: null,
    opened_at: null,
    failure_reason: null,
    is_doctor_copy: false,
    doctor_name: null,
    superseded_by: null,
    created_at: now
  }
  await writeRecord('notifications', 'INSERT', notification)
  return { status: 'sent', notification }
}
