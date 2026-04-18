// Supabase Edge Function — send-result-notification
// Triggered by the sync engine after a notification record is inserted.
// Sends WhatsApp via Meta Business API; falls back to Termii SMS on failure.
//
// Deploy: supabase functions deploy send-result-notification
// Secrets: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, TERMII_API_KEY, TERMII_SENDER_ID

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WA_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const WA_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!
const TERMII_KEY = Deno.env.get('TERMII_API_KEY')!
const TERMII_SENDER = Deno.env.get('TERMII_SENDER_ID') ?? 'LaboraAI'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function sendWhatsApp(phone: string, pdfUrl: string | null, patientName: string): Promise<boolean> {
  const body = {
    messaging_product: 'whatsapp',
    to: phone.replace(/\s/g, ''),
    type: 'template',
    template: {
      name: 'result_ready',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: patientName },
            { type: 'text', text: pdfUrl ?? 'Contact your lab for your result.' }
          ]
        }
      ]
    }
  }

  const res = await fetch(
    `https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  )
  return res.ok
}

async function sendSMS(phone: string, patientName: string, pdfUrl: string | null): Promise<boolean> {
  const message = pdfUrl
    ? `Hi ${patientName}, your lab result is ready. View: ${pdfUrl}`
    : `Hi ${patientName}, your lab result is ready. Please contact your lab to collect it.`

  const res = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phone.replace(/\s/g, ''),
      from: TERMII_SENDER,
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: TERMII_KEY
    })
  })
  return res.ok
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { notificationId } = await req.json() as { notificationId: string }
    if (!notificationId) {
      return new Response(JSON.stringify({ error: 'notificationId required' }), { status: 400 })
    }

    // Fetch notification + result + patient
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single()

    if (notifError || !notification) {
      return new Response(JSON.stringify({ error: 'Notification not found' }), { status: 404 })
    }

    const { data: patient } = await supabase
      .from('patients')
      .select('full_name, phone')
      .eq('lapid', notification.lapid)
      .single()

    const phone = notification.recipient_phone ?? patient?.phone
    const patientName = patient?.full_name ?? 'Patient'
    const pdfUrl = notification.secure_link

    if (!phone) {
      await supabase.from('notifications').update({
        status: 'failed',
        failure_reason: 'No recipient phone number'
      }).eq('id', notificationId)
      return new Response(JSON.stringify({ error: 'No phone number' }), { status: 422 })
    }

    const now = new Date().toISOString()

    // Try WhatsApp first
    const waSent = await sendWhatsApp(phone, pdfUrl, patientName)
    if (waSent) {
      await supabase.from('notifications').update({
        status: 'sent',
        channel: 'whatsapp',
        sent_at: now
      }).eq('id', notificationId)
      return new Response(JSON.stringify({ success: true, channel: 'whatsapp' }), { status: 200 })
    }

    // WhatsApp failed — fall back to SMS
    const smsSent = await sendSMS(phone, patientName, pdfUrl)
    if (smsSent) {
      await supabase.from('notifications').update({
        status: 'sent',
        channel: 'sms',
        sent_at: now
      }).eq('id', notificationId)
      return new Response(JSON.stringify({ success: true, channel: 'sms' }), { status: 200 })
    }

    // Both failed
    await supabase.from('notifications').update({
      status: 'failed',
      failure_reason: 'WhatsApp and SMS both failed'
    }).eq('id', notificationId)

    return new Response(JSON.stringify({ error: 'Delivery failed on all channels' }), { status: 500 })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})
