// Shared CORS headers for browser-invoked Edge Functions. The patient result
// view and the "Explain this simply" call both run in the patient's browser
// with no Supabase session, so these must allow unauthenticated cross-origin
// requests.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
