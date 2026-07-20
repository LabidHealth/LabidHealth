// send-sms — SMS fallback delivery via Termii.
//
// Staff-triggered (verify_jwt on): only an authenticated lab user can send,
// which prevents anonymous abuse of the SMS credits. Dormant (503) until
// TERMII_API_KEY + TERMII_SENDER_ID are set — the client degrades to "SMS not
// enabled" rather than erroring. Secrets live only in this function's env.
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { sendTermiiSms, termiiConfig } from '../_shared/termii.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const config = termiiConfig()
  if (!config) {
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

  const result = await sendTermiiSms(config, body.to, body.message)
  if (!result.ok) {
    return jsonResponse({ error: 'sms_failed', message: result.message }, 502)
  }
  return jsonResponse({ sent: true, message_id: result.messageId })
})
