// send-sms — SMS fallback delivery via Termii.
//
// Staff-triggered (verify_jwt on): only an authenticated lab user can send,
// which prevents anonymous abuse of the SMS credits. Dormant (503) until
// TERMII_API_KEY + TERMII_SENDER_ID are set — the client degrades to "SMS not
// enabled" rather than erroring. Secrets live only in this function's env.
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

// Normalise a Nigerian number to international form (234…, digits only).
function toIntlNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0')) return `234${digits.slice(1)}`
  if (digits.length === 10) return `234${digits}`
  return digits
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('TERMII_API_KEY')
  const senderId = Deno.env.get('TERMII_SENDER_ID')
  if (!apiKey || !senderId) {
    return jsonResponse({ error: 'not_configured', message: 'SMS delivery is not enabled yet.' }, 503)
  }

  let body: { to?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!body.to || !body.message) {
    return jsonResponse({ error: 'to and message are required' }, 400)
  }

  try {
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        to: toIntlNumber(body.to),
        from: senderId,
        sms: body.message,
        type: 'plain',
        channel: 'generic'
      })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return jsonResponse({ error: 'sms_failed', message: data.message ?? `Termii ${res.status}` }, 502)
    }
    return jsonResponse({ sent: true, message_id: data.message_id ?? null })
  } catch (error) {
    console.error('send-sms error:', error)
    return jsonResponse({ error: 'sms_error', message: 'Could not send the SMS right now.' }, 502)
  }
})
