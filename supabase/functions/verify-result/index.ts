// Supabase Edge Function — verify-result
// Verifies JWT token for secure patient result access.
// Returns result data if token is valid and not expired.
//
// Deploy: supabase functions deploy verify-result
// Secrets: JWT_SECRET

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jwtVerify } from 'https://esm.sh/jose@5'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JWT_SECRET = Deno.env.get('JWT_SECRET')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Verify JWT token
    const secretKey = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secretKey)

    const { result_id, labid } = payload as any

    if (!result_id || !labid) {
      return new Response(JSON.stringify({ error: 'Invalid token payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch result from database
    const { data: result, error } = await supabase
      .from('results')
      .select('*')
      .eq('id', result_id)
      .eq('labid', labid)
      .single()

    if (error || !result) {
      return new Response(JSON.stringify({ error: 'Result not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (result.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Result not approved yet' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch patient name
    const { data: patient } = await supabase
      .from('patients')
      .select('full_name')
      .eq('labid', labid)
      .single()

    return new Response(JSON.stringify({
      result: {
        ...result,
        patient_name: patient?.full_name || null
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Token verification error:', err)
    if ((err as any).code === 'ERR_JWT_EXPIRED') {
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
