// Shared Termii SMS helper — used by both the staff-triggered send-sms function
// and the scheduled SMS-fallback cron. One implementation so both paths behave
// identically (number normalisation, request shape, dormancy).

export interface TermiiConfig {
  apiKey: string
  senderId: string
}

/** Reads Termii config from the function env. Null when SMS is not enabled yet. */
export function termiiConfig(): TermiiConfig | null {
  const apiKey = Deno.env.get('TERMII_API_KEY')
  const senderId = Deno.env.get('TERMII_SENDER_ID')
  if (!apiKey || !senderId) return null
  return { apiKey, senderId }
}

/** Normalise a Nigerian number to international form (234…, digits only). */
export function toIntlNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('234')) return digits
  if (digits.startsWith('0')) return `234${digits.slice(1)}`
  if (digits.length === 10) return `234${digits}`
  return digits
}

export type TermiiResult = { ok: true; messageId: string | null } | { ok: false; status: number; message: string }

/** Sends one plain SMS via Termii. Callers must have a non-null termiiConfig(). */
export async function sendTermiiSms(config: TermiiConfig, to: string, message: string): Promise<TermiiResult> {
  try {
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: config.apiKey,
        to: toIntlNumber(to),
        from: config.senderId,
        sms: message,
        type: 'plain',
        channel: 'generic'
      })
    })
    const data = await res.json().catch(() => ({}) as { message?: string; message_id?: string })
    if (!res.ok) return { ok: false, status: res.status, message: data.message ?? `Termii ${res.status}` }
    return { ok: true, messageId: data.message_id ?? null }
  } catch (error) {
    console.error('Termii send error:', error)
    return { ok: false, status: 0, message: 'Could not reach the SMS provider.' }
  }
}
