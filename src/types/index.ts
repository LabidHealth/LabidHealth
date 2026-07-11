export type UserRole = 'owner' | 'manager' | 'scientist' | 'front_desk'

export interface Lab {
  id: string
  name: string
  address?: string | null
  phone?: string | null
  email?: string | null
  mlscn_no: string
  logo_url?: string | null
  pdf_footer: string
  pdf_disclaimer: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LabStaff {
  id: string
  user_id: string
  lab_id: string
  role: UserRole
  full_name: string
  phone?: string | null
  two_factor_enabled?: boolean | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  labid: string
  full_name: string
  date_of_birth?: string | null
  gender?: 'male' | 'female' | 'other'
  phone: string
  address?: string | null
  next_of_kin?: string | null
  next_of_kin_phone?: string | null
  photo_url?: string | null
  consent: boolean
  consent_date?: string | null
  created_at: string
  updated_at: string
}

export interface PatientVisit {
  id: string
  labid: string
  lab_id: string
  visited_at: string
  created_by?: string | null
}

export interface PriceListItem {
  id: string
  lab_id: string
  test_code: string
  test_name: string
  category: string
  standard_price: number // stored in kobo - divide by 100 for display
  hmo_price: number // stored in kobo - divide by 100 for display
  corporate_price: number // stored in kobo - divide by 100 for display
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SampleStatus =
  | 'received'
  | 'processing'
  | 'awaiting_approval'
  | 'ready'
  | 'delivered'
  | 'rejected'

export interface Sample {
  id: string
  sample_id: string
  labid: string
  lab_id: string
  status: SampleStatus
  is_stat: boolean
  tests_ordered: string[]
  referring_doctor?: string | null
  collected_at: string
  collected_by?: string | null
  rejection_reason?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface SampleEvent {
  id: string
  sample_id: string
  event_type:
    | 'received'
    | 'processing_started'
    | 'status_updated'
    | 'approved'
    | 'delivered'
    | 'rejected'
    | 'stat_flagged'
    | 'label_printed'
    | 'qr_scanned'
  performed_by?: string | null
  station?: string | null
  notes?: string | null
  created_at: string
}

export type ResultStatus = 'draft' | 'awaiting_approval' | 'approved' | 'amended' | 'rejected'

export type ResultParameterStatus =
  | 'low'
  | 'normal'
  | 'high'
  | 'critical_low'
  | 'critical_high'

export interface ResultParameter {
  value: string
  unit: string
  status: ResultParameterStatus
}

export interface Result {
  id: string
  sample_id: string
  labid: string
  lab_id: string
  test_type: string
  parameters: Record<string, ResultParameter>
  comments?: string | null
  status: ResultStatus
  entered_by?: string | null
  approved_by?: string | null
  approved_at?: string | null
  pdf_url?: string | null
  pdf_generated_at?: string | null
  critical_acknowledged: boolean
  critical_acknowledged_by?: string | null
  critical_acknowledged_at?: string | null
  created_at: string
  updated_at: string
}

export interface ResultAmendment {
  id: string
  result_id: string
  previous_parameters: Record<string, ResultParameter>
  previous_comments?: string | null
  amendment_reason: string
  amended_by?: string | null
  amended_at: string
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'refunded' | 'void'

export interface InvoiceLineItem {
  test_code: string
  test_name: string
  price: number // stored in kobo - divide by 100 for display
}

export interface Invoice {
  id: string
  invoice_id: string
  labid: string
  lab_id: string
  sample_id?: string | null
  line_items: InvoiceLineItem[]
  subtotal: number // stored in kobo - divide by 100 for display
  platform_fee: number // stored in kobo - divide by 100 for display
  total: number // stored in kobo - divide by 100 for display
  amount_paid: number // stored in kobo - divide by 100 for display
  outstanding: number // stored in kobo - divide by 100 for display
  status: InvoiceStatus
  notes?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export type PaymentMethod = 'cash' | 'pos' | 'bank_transfer' | 'opay' | 'palmpay'

export interface Payment {
  id: string
  invoice_id: string
  lab_id: string
  amount: number // stored in kobo - divide by 100 for display
  method: PaymentMethod
  reference?: string | null
  recorded_by?: string | null
  voided: boolean
  void_reason?: string | null
  voided_by?: string | null
  created_at: string
}

export type NotificationChannel = 'whatsapp' | 'sms' | 'email'
export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'failed'

export interface Notification {
  id: string
  labid: string
  result_id: string
  lab_id: string
  channel: NotificationChannel
  status: NotificationStatus
  recipient_phone?: string | null
  secure_link?: string | null
  link_token?: string | null
  link_expires_at?: string | null
  sent_at?: string | null
  delivered_at?: string | null
  opened_at?: string | null
  failure_reason?: string | null
  is_doctor_copy: boolean
  doctor_name?: string | null
  superseded_by?: string | null
  created_at: string
}

export interface AuditLogEntry {
  id: string
  user_id?: string | null
  lab_id?: string | null
  action: string
  table_name: string
  record_id: string
  old_value?: Record<string, unknown> | null
  new_value?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
}

export interface SyncQueueItem {
  id?: number
  table: string
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  recordId: string
  payload: Record<string, unknown>
  timestamp: number
  attempts: number
  lastError?: string | null
}
