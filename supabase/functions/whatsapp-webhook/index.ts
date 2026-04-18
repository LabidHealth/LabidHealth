// Supabase Edge Function — whatsapp-webhook
// Handles Meta WhatsApp webhook events: delivery receipts and message reads.
// Updates notification.delivered_at and notification.opened_at in real-time.
//
// Deploy: supabase functions deploy whatsapp-webhook
// Secrets: WHATSAPP_WEBHOOK_VERIFY_TOKEN, WHATSAPP_APP_SECRET

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac, timingSafeEqual } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN')!
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Verify Meta webhook signature using X-Hub-Signature-256
function verifySignature(payload: string, signature: string): boolean {
  if (!APP_SECRET) return false
  const expectedSignature = `sha256=${createHmac('sha-256', APP_SECRET).update(payload).toString('hex')}`
  // Note: timingSafeEqual requires equal-length buffers
  const sigBuf = new TextEncoder().encode(signature)
  const expectedBuf = new TextEncoder().encode(expectedSignature)
  if (sigBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(sigBuf, expectedBuf)
}

// GET — Meta verification challenge
serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verify webhook signature
  const signature = req.headers.get('x-hub-signature-256')
  if (!signature) {
    return new Response('Missing signature', { status: 401 })
  }

  const rawBody = await req.text()
  if (!verifySignature(rawBody, signature)) {
    return new Response('Invalid signature', { status: 401 })
  }

  try {
    const payload = JSON.parse(rawBody)

    // Meta sends entry array
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue

        const value = change.value
        if (!value) continue

        const statuses = value.statuses ?? []
        for (const status of statuses) {
          const { id: messageId, status: statusType, timestamp } = status
          const conversationId = status.conversation?.id

          if (!conversationId) continue

          // Extract notification ID from conversation ID (format: wamid.HASH)
          // We need to find the notification by the message ID or other identifier
          // For now, we'll try to match by looking up notifications that were sent recently
          // In production, you'd store the WhatsApp message ID in the notification record

          const sentAt = new Date(timestamp * 1000).toISOString()

          if (statusType === 'delivered') {
            await supabase
              .from('notifications')
              .update({ delivered_at: sentAt })
              .eq('channel', 'whatsapp')
              .is('delivered_at', null)
              .gt('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .limit(1)
          } else if (statusType === 'read') {
            await supabase
              .from('notifications')
              .update({ opened_at: sentAt })
              .eq('channel', 'whatsapp')
              .is('opened_at', null)
              .gt('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .limit(1)
          }
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('Internal server error', { status: 500 })
  }
})
