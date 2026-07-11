import { db } from '@/lib/db'

function pad5(value: number) {
  return `${value}`.padStart(5, '0')
}

export async function generateLocalLabid(now = new Date()): Promise<string> {
  const year = now.getFullYear()
  const prefix = `LB-${year}-`

  const existing = await db.patients.toArray()
  const used = new Set<number>()

  for (const patient of existing) {
    if (!patient.labid?.startsWith(prefix)) continue
    const match = patient.labid.match(/^LB-\d{4}-(\d{5})$/)
    if (!match) continue
    used.add(Number(match[1]))
  }

  let next = 1
  while (used.has(next)) next += 1
  return `${prefix}${pad5(next)}`
}

