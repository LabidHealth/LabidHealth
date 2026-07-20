// explain-result — patient-facing plain-language explanation of a lab result.
//
// Advisory and NON-diagnostic by construction: a strict system prompt plus a
// disclaimer appended server-side (never left to the model) so it is always
// present. Online-only; secrets live solely in this function's env.
//
// Provider is selected by AI_PROVIDER (default 'anthropic' — the production
// choice). Set AI_PROVIDER=groq + GROQ_API_KEY for a cheap dev provider
// (OpenAI-compatible Llama). Dormant (503) until the selected provider's key is
// set, so the client degrades gracefully.
import Anthropic from 'npm:@anthropic-ai/sdk@0.68.0'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const ANTHROPIC_MODEL = 'claude-haiku-4-5'
const GROQ_MODEL = Deno.env.get('GROQ_MODEL') ?? 'llama-3.3-70b-versatile'

type Lang = 'en' | 'pcm' | 'ig'

interface ResultParam {
  name: string
  value: string
  unit?: string | null
  status?: string | null
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

// ── Providers ────────────────────────────────────────────────────────────────
async function explainWithAnthropic(system: string, user: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 600,
    system,
    messages: [{ role: 'user', content: user }]
  })
  if (message.stop_reason === 'refusal') return ''
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('\n')
    .trim()
}

async function explainWithGroq(system: string, user: string, apiKey: string): Promise<string> {
  // Groq is OpenAI-compatible. Dev-only provider — Anthropic is the prod default.
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 600,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  })
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const provider = (Deno.env.get('AI_PROVIDER') ?? 'anthropic').toLowerCase()
  const key = provider === 'groq' ? Deno.env.get('GROQ_API_KEY') : Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) {
    return jsonResponse({ error: 'not_configured', message: 'AI explanations are not enabled yet.' }, 503)
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

  const system = systemPrompt(language)
  const user = buildUserContent({ ...body, language })

  try {
    const explanation =
      provider === 'groq' ? await explainWithGroq(system, user, key) : await explainWithAnthropic(system, user, key)

    if (!explanation) {
      return jsonResponse({ error: 'refused', message: DISCLAIMER[language] }, 200)
    }
    return jsonResponse({ language, explanation, disclaimer: DISCLAIMER[language] })
  } catch (error) {
    console.error('explain-result error:', error)
    return jsonResponse({ error: 'ai_error', message: 'Could not generate an explanation right now.' }, 502)
  }
})
