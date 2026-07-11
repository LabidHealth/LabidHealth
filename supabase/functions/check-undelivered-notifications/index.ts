// Supabase Edge Function — check-undelivered-notifications
// Scheduled cron job (every hour) to check for notifications that were sent
// more than 24 hours ago but have not been opened by the patient.
// Creates an alert record for the front desk undelivered results list.
//
// Deploy: supabase functions deploy check-undelivered-notifications
// Cron: Set to run every hour via Supabase dashboard

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Find notifications sent > 24 hours ago that haven't been opened
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: undelivered, error } = await supabase
      .from('notifications')
      .select('id, labid, result_id, lab_id, sent_at, failure_reason')
      .gte('sent_at', twentyFourHoursAgo)
      .is('opened_at', null)
      .is('failure_reason', null)
      .eq('status', 'sent')
      .is('superseded_by', null)

    if (error) throw error

    if (!undelivered || undelivered.length === 0) {
      return new Response(JSON.stringify({ checked: 0, alerts: 0 }), { status: 200 })
    }

    // Create alert records for each undelivered notification
    // We'll use the notifications table itself with a special status or a separate alerts table
    // For now, we'll update the notification to flag it as needing attention
    let alertCount = 0

    for (const notification of undelivered) {
      // Check if we already flagged this notification
      if (notification.failure_reason === 'undelivered_24h') {
        continue
      }

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ failure_reason: 'undelivered_24h' })
        .eq('id', notification.id)

      if (!updateError) {
        alertCount++
      }
    }

    return new Response(
      JSON.stringify({
        checked: undelivered.length,
        alerts: alertCount
      }),
      { status: 200 }
    )
  } catch (err) {
    console.error('Undelivered check error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})
