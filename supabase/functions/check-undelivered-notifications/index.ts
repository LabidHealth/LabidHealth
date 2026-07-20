// check-undelivered-notifications — scheduled SMS fallback.
//
// Runs hourly (pg_cron). For every WhatsApp delivery that was sent more than
// 24 hours ago and the patient still has not opened, it texts the same secure
// result link via SMS (Termii) so the result still reaches them.
//
// Safe by construction:
//  - Dormant: if Termii is not configured it selects eligible rows but sends
//    nothing and marks nothing, so they are picked up once SMS is enabled.
//  - Idempotent: skips any result that already has an SMS notification, and
//    marks the WhatsApp row once an SMS is sent, so a result is texted at most
//    once by this job.
//  - Service-role invocation only (verify_jwt on); intended to be called by the
//    scheduled pg_cron job with the project service key.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse } from '../_shared/cors.ts'
import { sendTermiiSms, termiiConfig } from '../_shared/termii.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BATCH_LIMIT = 200

interface WaRow {
  id: string
  labid: string
  result_id: string
  lab_id: string
  recipient_phone: string | null
  secure_link: string | null
}

// New URL-safe token for the SMS notification (mirrors the client generator).
function newToken(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Reuse the origin the WhatsApp link was minted with, so the SMS link resolves
// on the same host. Returns null when we cannot build a valid link.
function linkFor(secureLink: string | null, token: string): string | null {
  if (!secureLink) return null
  try {
    return `${new URL(secureLink).origin}/r/${token}`
  } catch {
    return null
  }
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // WhatsApp deliveries older than 24h, still unopened, not already failed/superseded.
  const { data: rows, error } = await supabase
    .from('notifications')
    .select('id, labid, result_id, lab_id, recipient_phone, secure_link')
    .eq('channel', 'whatsapp')
    .eq('status', 'sent')
    .is('opened_at', null)
    .is('failure_reason', null)
    .is('superseded_by', null)
    .not('recipient_phone', 'is', null)
    .lt('sent_at', cutoff)
    .limit(BATCH_LIMIT)

  if (error) return jsonResponse({ error: 'query_failed', message: error.message }, 500)

  const candidates = (rows ?? []) as WaRow[]

  // Drop any result that already has an SMS notification (idempotency across runs).
  const eligible: WaRow[] = []
  for (const row of candidates) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('result_id', row.result_id)
      .eq('channel', 'sms')
    if (!count) eligible.push(row)
  }

  const config = termiiConfig()
  if (!config) {
    // Dormant — report what would be sent, but change nothing.
    return jsonResponse({ not_configured: true, eligible: eligible.length, sent: 0 })
  }

  let sent = 0
  let failed = 0
  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 30 * 86_400_000).toISOString()

  for (const row of eligible) {
    const token = newToken()
    const link = linkFor(row.secure_link, token)
    if (!link || !row.recipient_phone) {
      failed++
      continue
    }
    const message = `Labid Health: your lab result is ready. View it securely here: ${link}`
    const result = await sendTermiiSms(config, row.recipient_phone, message)
    if (!result.ok) {
      failed++
      continue // leave the WhatsApp row untouched so it retries next run
    }

    await supabase.from('notifications').insert({
      id: crypto.randomUUID(),
      labid: row.labid,
      result_id: row.result_id,
      lab_id: row.lab_id,
      channel: 'sms',
      status: 'sent',
      recipient_phone: row.recipient_phone,
      secure_link: link,
      link_token: token,
      link_expires_at: expires,
      sent_at: now,
      is_doctor_copy: false,
      created_at: now
    })
    // Mark the WhatsApp row handled so it is not reconsidered next run.
    await supabase.from('notifications').update({ failure_reason: 'undelivered_24h_sms_sent' }).eq('id', row.id)
    sent++
  }

  return jsonResponse({ eligible: eligible.length, sent, failed })
})
