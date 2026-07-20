// result-view — serves an approved result to a patient by secure link token.
//
// No login: the patient opens a link like /r/<token>. This runs as the service
// role (bypassing RLS) but is gated by the unguessable token stored on the
// notification, its expiry, and the result being approved. It returns only what
// a patient should see — never internal ids, pricing, or other patients' data.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

interface ParamRow {
  key: string
  name: string
  unit: string | null
  status: string | null
  ref: string | null
}

function refText(p: { ref_low: number | null; ref_high: number | null; ref_operator: string | null; unit: string | null }): string | null {
  const u = p.unit ? ` ${p.unit}` : ''
  if (p.ref_operator === 'lt' && p.ref_high != null) return `< ${p.ref_high}${u}`
  if (p.ref_operator === 'gt' && p.ref_low != null) return `> ${p.ref_low}${u}`
  if (p.ref_low != null && p.ref_high != null) return `${p.ref_low}–${p.ref_high}${u}`
  return null
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!token) return jsonResponse({ error: 'missing_token' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Resolve the token → notification (unique index on link_token).
  const { data: notif, error: notifErr } = await supabase
    .from('notifications')
    .select('id, result_id, lab_id, link_expires_at')
    .eq('link_token', token)
    .maybeSingle()

  if (notifErr || !notif) return jsonResponse({ error: 'invalid_token' }, 404)
  if (notif.link_expires_at && new Date(notif.link_expires_at) < new Date()) {
    return jsonResponse({ error: 'expired' }, 410)
  }

  // 2. Load the result — must be approved to be viewable.
  const { data: result } = await supabase
    .from('results')
    .select('id, sample_id, labid, lab_id, test_type, parameters, comments, status, approved_at')
    .eq('id', notif.result_id)
    .maybeSingle()

  if (!result || (result.status !== 'approved' && result.status !== 'amended')) {
    return jsonResponse({ error: 'not_available' }, 404)
  }

  // 3. Patient + lab (for the report header) and the catalog (for names/ranges).
  const [{ data: patient }, { data: lab }, { data: test }] = await Promise.all([
    supabase.from('patients').select('full_name, labid').eq('labid', result.labid).maybeSingle(),
    supabase.from('labs').select('name, address, phone, mlscn_no, pdf_disclaimer').eq('id', result.lab_id).maybeSingle(),
    supabase.from('catalog_tests').select('id, name').eq('lab_id', result.lab_id).eq('code', result.test_type).maybeSingle()
  ])

  let catalogParams: Array<{ key: string; name: string; unit: string | null; ref_low: number | null; ref_high: number | null; ref_operator: string | null; sort: number }> = []
  if (test) {
    const { data } = await supabase
      .from('catalog_parameters')
      .select('key, name, unit, ref_low, ref_high, ref_operator, sort')
      .eq('test_id', test.id)
    catalogParams = data ?? []
  }
  const byKey = new Map(catalogParams.map((p) => [p.key, p]))

  const stored = (result.parameters ?? {}) as Record<string, { value: string; unit?: string; status?: string }>
  const params: ParamRow[] = Object.entries(stored)
    .map(([key, v]) => {
      const cat = byKey.get(key)
      return {
        key,
        name: cat?.name ?? key,
        value: v.value,
        unit: v.unit ?? cat?.unit ?? null,
        status: v.status ?? null,
        ref: cat ? refText(cat) : null,
        sort: cat?.sort ?? 999
      }
    })
    .sort((a, b) => a.sort - b.sort)
    .map(({ key, name, value, unit, status, ref }) => ({ key, name, value, unit, status, ref } as ParamRow & { value: string }))

  // 4. Record that the patient opened it (delivery tracking; best-effort).
  await supabase
    .from('notifications')
    .update({ status: 'opened', opened_at: new Date().toISOString() })
    .eq('id', notif.id)

  return jsonResponse({
    patient_name: patient?.full_name ?? null,
    labid: result.labid,
    test_name: test?.name ?? result.test_type,
    test_type: result.test_type,
    comments: result.comments,
    approved_at: result.approved_at,
    parameters: params,
    lab: lab
      ? { name: lab.name, address: lab.address, phone: lab.phone, mlscn_no: lab.mlscn_no, disclaimer: lab.pdf_disclaimer }
      : null
  })
})
