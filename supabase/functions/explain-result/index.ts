// explain-result — patient-facing plain-language explanation of a lab result.
//
// Advisory and NON-diagnostic by construction: a strict system prompt plus a
// disclaimer that is appended server-side (never left to the model) so it is
// always present. Online-only; the secret lives solely in this function's env.
//
// Dormant until ANTHROPIC_API_KEY is set: returns 503 with a clear message so
// the client can degrade gracefully instead of erroring.
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

// Confirmed against the claude-api reference: cost-appropriate for a high-volume,
// simple explanation task, and the model the product spec (mvp-spec.md M8) calls for.
const MODEL = 'claude-haiku-4-5'

type Lang = 'en' | 'pcm' | 'ig'

interface ResultParam {
  name: string
  value: string
  unit?: string | null
  status?: string | null // normal | low | high | critical_low | critical_high
  ref?: string | null
}

interface ExplainRequest {
  test_name: string
  language: Lang
  parameters: ResultParam[]
}

const LANG_NAME: Record<Lang, string> = {
  en: 'clear, simple English',
  pcm: 'Nigerian Pidgin English',
  ig: 'Igbo'
}

// Appended verbatim so the safety disclaimer can never be omitted by the model.
const DISCLAIMER: Record<Lang, string> = {
  en: 'This explanation is for general understanding only and is not a diagnosis. Please discuss your results with a doctor or qualified health worker.',
  pcm: 'Dis explanation na just to help you understand small — e no be diagnosis. Abeg make you talk to doctor or health worker about your result.',
  ig: 'Nkọwa a bụ naanị maka nghọta izugbe, ọ bụghị nyocha ọrịa. Biko gwa dọkịta ma ọ bụ onye ọrụ ahụike gbasara nsonaazụ gị.'
}

function systemPrompt(lang: Lang): string {
  return [
    'You are a warm, careful health educator helping a patient in Nigeria understand their laboratory test result.',
    `Write ONLY in ${LANG_NAME[lang]}. Keep it short (a few plain sentences), calm, and non-alarming.`,
    'Explain, in everyday terms, what the test looks at and what the values suggest in general.',
    'You are STRICTLY NON-DIAGNOSTIC: never state or imply a specific diagnosis, never name a disease as the cause, never recommend a specific drug, dose, or treatment.',
    'If any value is flagged high, low, or critical, gently note it may be outside the usual range and is worth discussing with a doctor — without predicting what it means for them specifically.',
    'Do not invent values or ranges beyond what you are given. Do not add a disclaimer yourself; one is added automatically.'
  ].join(' ')
}

function buildUserContent(req: ExplainRequest): string {
  const lines = req.parameters.map((p) => {
    const flag = p.status && p.status !== 'normal' ? ` [${p.status.replace('_', ' ')}]` : ''
    const ref = p.ref ? ` (usual range ${p.ref})` : ''
    return `- ${p.name}: ${p.value}${p.unit ? ' ' + p.unit : ''}${ref}${flag}`
  })
  return `Test: ${req.test_name}\nResults:\n${lines.join('\n')}\n\nExplain what this means in simple terms for the patient.`
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    return jsonResponse(
      { error: 'not_configured', message: 'AI explanations are not enabled yet.' },
      503
    )
  }

  let body: ExplainRequest
  try {
    body = (await request.json()) as ExplainRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const language: Lang = body.language === 'pcm' || body.language === 'ig' ? body.language : 'en'
  if (!body.test_name || !Array.isArray(body.parameters) || body.parameters.length === 0) {
    return jsonResponse({ error: 'test_name and parameters are required' }, 400)
  }

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt(language),
      messages: [{ role: 'user', content: buildUserContent({ ...body, language }) }]
    })

    if (message.stop_reason === 'refusal') {
      return jsonResponse({ error: 'refused', message: DISCLAIMER[language] }, 200)
    }

    const explanation = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { text: string }).text)
      .join('\n')
      .trim()

    return jsonResponse({
      language,
      explanation,
      disclaimer: DISCLAIMER[language]
    })
  } catch (error) {
    console.error('explain-result error:', error)
    return jsonResponse({ error: 'ai_error', message: 'Could not generate an explanation right now.' }, 502)
  }
})
