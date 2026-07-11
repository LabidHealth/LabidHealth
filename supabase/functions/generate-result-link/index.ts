// Supabase Edge Function — generate-result-link
// Generates a signed JWT token for secure patient result access.
// The token includes result_id, labid, and expiration time.
//
// Deploy: supabase functions deploy generate-result-link
// Secrets: JWT_SECRET

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT } from 'https://esm.sh/jose@5'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JWT_SECRET = Deno.env.get('JWT_SECRET')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface RequestBody {
  result_id: string
  labid: string
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body: RequestBody = await req.json()
    const { result_id, labid } = body

    if (!result_id || !labid) {
      return new Response('Missing result_id or labid', { status: 400 })
    }

    // Verify the result exists
    const { data: result, error } = await supabase
      .from('results')
      .select('id, labid, status, pdf_url')
      .eq('id', result_id)
      .eq('labid', labid)
      .single()

    if (error || !result) {
      return new Response('Result not found', { status: 404 })
    }

    if (result.status !== 'approved') {
      return new Response('Result not approved yet', { status: 403 })
    }

    // Generate JWT token valid for 7 days
    const secretKey = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({
      result_id: result.id,
      labid: result.labid,
      pdf_url: result.pdf_url
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secretKey)

    // Store the token in the notifications table for tracking
    await supabase
      .from('notifications')
      .update({
        link_token: token,
        link_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('result_id', result_id)
      .is('link_token', null)

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('JWT signing error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
