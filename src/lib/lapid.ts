import { db } from '@/lib/db'

function pad5(value: number) {
  return `${value}`.padStart(5, '0')
}

export async function generateLocalLapid(now = new Date()): Promise<string> {
  const year = now.getFullYear()
  const prefix = `LA-${year}-`

  const existing = await db.patients.toArray()
  const used = new Set<number>()

  for (const patient of existing) {
    if (!patient.lapid?.startsWith(prefix)) continue
    const match = patient.lapid.match(/^LA-\d{4}-(\d{5})$/)
    if (!match) continue
    used.add(Number(match[1]))
  }

  let next = 1
  while (used.has(next)) next += 1
  return `${prefix}${pad5(next)}`
}

