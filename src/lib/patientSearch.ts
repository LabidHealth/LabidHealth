import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import type { Patient } from '@/types'

export interface DuplicateCandidate {
  patient: Patient
  matchScore: number
  exactPhoneMatch: boolean
}

function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.startsWith('234')) digits = digits.slice(3)
  return digits
}

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0
  if (!left.length) return right.length
  if (!right.length) return left.length

  const matrix = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1).fill(0))

  for (let row = 0; row <= left.length; row += 1) matrix[row][0] = row
  for (let col = 0; col <= right.length; col += 1) matrix[0][col] = col

  for (let row = 1; row <= left.length; row += 1) {
    for (let col = 1; col <= right.length; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost
      )
    }
  }

  return matrix[left.length][right.length]
}

export function getNameSimilarity(left: string, right: string) {
  const normalizedLeft = normalizeName(left)
  const normalizedRight = normalizeName(right)

  if (!normalizedLeft || !normalizedRight) return 0
  if (normalizedLeft === normalizedRight) return 1

  const tokenBonus = normalizedLeft
    .split(' ')
    .filter(Boolean)
    .some((token) => normalizedRight.includes(token))
    ? 0.1
    : 0

  const distance = levenshteinDistance(normalizedLeft, normalizedRight)
  const similarity = 1 - distance / Math.max(normalizedLeft.length, normalizedRight.length)
  return Math.max(0, Math.min(1, similarity + tokenBonus))
}

async function fetchRemoteCandidates(fullName: string, phone: string) {
  if (!navigator.onLine) return []

  const normalizedPhone = normalizePhone(phone)
  const leadToken = normalizeName(fullName).split(' ').filter(Boolean)[0] ?? ''

  const phoneQuery = normalizedPhone
    ? supabase.from('patients').select('*').ilike('phone', `%${normalizedPhone.slice(-10)}%`).limit(10)
    : Promise.resolve({ data: [], error: null })

  const nameQuery = leadToken
    ? supabase.from('patients').select('*').ilike('full_name', `%${leadToken}%`).limit(25)
    : Promise.resolve({ data: [], error: null })

  const [{ data: phoneMatches, error: phoneError }, { data: nameMatches, error: nameError }] = await Promise.all([
    phoneQuery,
    nameQuery
  ])

  if (phoneError) console.error('Failed remote phone duplicate search', phoneError)
  if (nameError) console.error('Failed remote name duplicate search', nameError)

  return [...(phoneMatches ?? []), ...(nameMatches ?? [])] as Patient[]
}

export async function findPotentialDuplicate(fullName: string, phone: string) {
  const localPatients = await db.patients.toArray()
  const remotePatients = await fetchRemoteCandidates(fullName, phone)
  const merged = new Map<string, Patient>()

  for (const patient of [...localPatients, ...remotePatients]) {
    merged.set(patient.id, patient)
  }

  const normalizedPhone = normalizePhone(phone)
  let bestMatch: DuplicateCandidate | null = null

  for (const patient of merged.values()) {
    const exactPhoneMatch = Boolean(normalizedPhone) && normalizePhone(patient.phone) === normalizedPhone
    const nameScore = getNameSimilarity(fullName, patient.full_name)
    const matchScore = exactPhoneMatch ? Math.max(nameScore, 0.94) : nameScore

    if (matchScore < 0.7) continue

    if (!bestMatch || matchScore > bestMatch.matchScore) {
      bestMatch = { patient, matchScore, exactPhoneMatch }
    }
  }

  return bestMatch
}

export function buildPatientSearchValue(patient: Pick<Patient, 'full_name' | 'phone' | 'lapid'>) {
  return [normalizeName(patient.full_name), normalizePhone(patient.phone), patient.lapid.toLowerCase()].join(' ')
}
