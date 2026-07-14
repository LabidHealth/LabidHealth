import { db } from './db'
import { hasBackend } from './supabase'
import type { Lab, LabStaff, PriceListItem, UserRole } from '@/types'

/**
 * Offline dev mode: active whenever no Supabase backend is configured.
 * Provides local login and seeds a dev lab + staff + the design-partner
 * (KEMI) test menu so the whole app is usable with no cloud account.
 */
export const DEV_MODE = !hasBackend

export const DEV_LAB_ID = 'dev-lab-0001'

export const DEV_USERS: Record<UserRole, { userId: string; fullName: string }> = {
  owner: { userId: 'dev-owner', fullName: 'Dev Owner' },
  manager: { userId: 'dev-manager', fullName: 'Dev Manager' },
  scientist: { userId: 'dev-scientist', fullName: 'Dev Scientist' },
  front_desk: { userId: 'dev-frontdesk', fullName: 'Dev Front Desk' }
}

/** Maps a dev login email to a role by prefix (password is ignored in dev). */
export function devRoleFromEmail(email: string): UserRole {
  const e = email.trim().toLowerCase()
  if (e.startsWith('scientist')) return 'scientist'
  if (e.startsWith('front') || e.startsWith('desk') || e.startsWith('reception')) return 'front_desk'
  if (e.startsWith('manager')) return 'manager'
  return 'owner'
}

// Placeholder prices in kobo (divide by 100 for naira). Confirm real prices
// with the lab on-site — these are only to make the dev catalog functional.
const DEV_PRICE_LIST: Array<{ code: string; name: string; category: string; price: number }> = [
  { code: 'FBC', name: 'Full Blood Count', category: 'Haematology', price: 350000 },
  { code: 'DIFF', name: 'Differential Count', category: 'Haematology', price: 250000 },
  { code: 'ESR', name: 'ESR', category: 'Haematology', price: 150000 },
  { code: 'BGG', name: 'Blood Group & Genotype', category: 'Haematology', price: 250000 },
  { code: 'MALRDT', name: 'Malaria RDT', category: 'Haematology', price: 150000 },
  { code: 'MALMIC', name: 'Malaria Microscopy', category: 'Haematology', price: 150000 },
  { code: 'LFT', name: 'Liver Function Test', category: 'Biochemistry', price: 500000 },
  { code: 'RFT', name: 'Electrolytes & Urea (E&U)', category: 'Biochemistry', price: 500000 },
  { code: 'LIPID', name: 'Lipid Profile', category: 'Biochemistry', price: 450000 },
  { code: 'FBG', name: 'Fasting Blood Glucose', category: 'Biochemistry', price: 120000 },
  { code: 'HBA1C', name: 'HbA1c', category: 'Biochemistry', price: 400000 },
  { code: 'CNS', name: 'Culture & Sensitivity (M/C/S)', category: 'Microbiology', price: 500000 },
  { code: 'WIDAL', name: 'Widal Test', category: 'Microbiology', price: 200000 },
  { code: 'VDRL', name: 'VDRL / Syphilis', category: 'Serology', price: 200000 },
  { code: 'HBSAG', name: 'Hepatitis B (HBsAg)', category: 'Serology', price: 200000 },
  { code: 'HIV', name: 'HIV 1 & 2 Screening', category: 'Serology', price: 200000 },
  { code: 'URINAL', name: 'Urinalysis', category: 'Urinalysis', price: 150000 },
  { code: 'URMIC', name: 'Urine Microscopy', category: 'Urinalysis', price: 150000 },
  { code: 'TSH', name: 'TSH', category: 'Hormones', price: 500000 },
  { code: 'FT3', name: 'FT3', category: 'Hormones', price: 500000 },
  { code: 'FT4', name: 'FT4', category: 'Hormones', price: 500000 },
  { code: 'PSA', name: 'PSA', category: 'Hormones', price: 500000 },
  { code: 'PREG', name: 'Pregnancy Test', category: 'Hormones', price: 150000 },
  { code: 'STOOL', name: 'Stool Microscopy', category: 'Other', price: 150000 }
]

/** Seeds a dev lab, staff (one per role), and the KEMI test menu into Dexie. */
export async function seedDevDataIfNeeded(): Promise<void> {
  if (!DEV_MODE) return
  const now = new Date().toISOString()

  const lab: Lab = {
    id: DEV_LAB_ID,
    name: 'KEMI Diagnostics',
    address: 'Enugu, South-East Nigeria',
    phone: '+234 800 000 0000',
    email: 'lab@labidhealth.com',
    mlscn_no: 'MLSCN/L/DEV0001',
    logo_url: null,
    pdf_footer: 'Results should be interpreted in conjunction with clinical findings.',
    pdf_disclaimer: 'This report is confidential and intended only for the requesting physician.',
    is_active: true,
    created_at: now,
    updated_at: now
  }
  await db.labs.put(lab)

  const staff: LabStaff[] = (Object.keys(DEV_USERS) as UserRole[]).map((role) => ({
    id: `dev-staff-${role}`,
    user_id: DEV_USERS[role].userId,
    lab_id: DEV_LAB_ID,
    role,
    full_name: DEV_USERS[role].fullName,
    phone: null,
    two_factor_enabled: false,
    is_active: true,
    created_at: now,
    updated_at: now
  }))
  await db.lab_staff.bulkPut(staff)

  const priceList: PriceListItem[] = DEV_PRICE_LIST.map((t) => ({
    id: `dev-price-${t.code}`,
    lab_id: DEV_LAB_ID,
    test_code: t.code,
    test_name: t.name,
    category: t.category,
    standard_price: t.price,
    hmo_price: Math.round(t.price * 0.8),
    corporate_price: Math.round(t.price * 0.9),
    is_active: true,
    created_at: now,
    updated_at: now
  }))
  await db.price_list.bulkPut(priceList)

  // Demo transactional data (patients, samples, invoices, payments, results,
  // notifications) — seeded once so the dashboards are populated. Dynamic
  // import avoids a circular dependency with this module.
  if ((await db.patients.count()) === 0) {
    const { seedDemoData } = await import('./devSeedDemo')
    await seedDemoData()
  }
}
