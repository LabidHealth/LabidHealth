// Generated from the Supabase schema — do not edit by hand.
// Regenerate after every migration (Supabase MCP, or `supabase gen types typescript`).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          lab_id: string | null
          new_value: Json | null
          old_value: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id: string
          ip_address?: string | null
          lab_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          lab_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      catalog_parameters: {
        Row: {
          critical_high: number | null
          critical_low: number | null
          id: string
          key: string
          name: string
          qualitative_options: Json | null
          ref_high: number | null
          ref_low: number | null
          ref_operator: string | null
          sex: string | null
          sort: number
          test_id: string
          unit: string | null
        }
        Insert: {
          critical_high?: number | null
          critical_low?: number | null
          id: string
          key: string
          name: string
          qualitative_options?: Json | null
          ref_high?: number | null
          ref_low?: number | null
          ref_operator?: string | null
          sex?: string | null
          sort?: number
          test_id: string
          unit?: string | null
        }
        Update: {
          critical_high?: number | null
          critical_low?: number | null
          id?: string
          key?: string
          name?: string
          qualitative_options?: Json | null
          ref_high?: number | null
          ref_low?: number | null
          ref_operator?: string | null
          sex?: string | null
          sort?: number
          test_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'catalog_parameters_test_id_fkey'
            columns: ['test_id']
            isOneToOne: false
            referencedRelation: 'catalog_tests'
            referencedColumns: ['id']
          },
        ]
      }
      catalog_tests: {
        Row: {
          active: boolean
          category: string
          code: string
          id: string
          lab_id: string
          name: string
          result_type: string
          specimen: string
        }
        Insert: {
          active?: boolean
          category: string
          code: string
          id: string
          lab_id: string
          name: string
          result_type: string
          specimen: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          id?: string
          lab_id?: string
          name?: string
          result_type?: string
          specimen?: string
        }
        Relationships: [
          {
            foreignKeyName: 'catalog_tests_lab_id_fkey'
            columns: ['lab_id']
            isOneToOne: false
            referencedRelation: 'labs'
            referencedColumns: ['id']
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          lab_id: string
          labid: string
          line_items: Json
          notes: string | null
          outstanding: number
          platform_fee: number
          sample_id: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          id: string
          invoice_id: string
          lab_id: string
          labid: string
          line_items?: Json
          notes?: string | null
          outstanding?: number
          platform_fee?: number
          sample_id?: string | null
          status: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          lab_id?: string
          labid?: string
          line_items?: Json
          notes?: string | null
          outstanding?: number
          platform_fee?: number
          sample_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_lab_id_fkey'
            columns: ['lab_id']
            isOneToOne: false
            referencedRelation: 'labs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_labid_fkey'
            columns: ['labid']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['labid']
          },
          {
            foreignKeyName: 'invoices_sample_id_fkey'
            columns: ['sample_id']
            isOneToOne: false
            referencedRelation: 'samples'
            referencedColumns: ['sample_id']
          },
        ]
      }
      lab_staff: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          lab_id: string
          phone: string | null
          role: string
          two_factor_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          lab_id: string
          phone?: string | null
          role: string
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          lab_id?: string
          phone?: string | null
          role?: string
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lab_staff_lab_id_fkey'
            columns: ['lab_id']
            isOneToOne: false
            referencedRelation: 'labs'
            referencedColumns: ['id']
          },
        ]
      }
      labs: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          mlscn_no: string
          name: string
          pdf_disclaimer: string
          pdf_footer: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          logo_url?: string | null
          mlscn_no: string
          name: string
          pdf_disclaimer?: string
          pdf_footer?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          mlscn_no?: string
          name?: string
          pdf_disclaimer?: string
          pdf_footer?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          delivered_at: string | null
          doctor_name: string | null
          failure_reason: string | null
          id: string
          is_doctor_copy: boolean
          lab_id: string
          labid: string
          link_expires_at: string | null
          link_token: string | null
          opened_at: string | null
          recipient_phone: string | null
          result_id: string
          secure_link: string | null
          sent_at: string | null
          status: string
          superseded_by: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          delivered_at?: string | null
          doctor_name?: string | null
          failure_reason?: string | null
          id: string
          is_doctor_copy?: boolean
          lab_id: string
          labid: string
          link_expires_at?: string | null
          link_token?: string | null
          opened_at?: string | null
          recipient_phone?: string | null
          result_id: string
          secure_link?: string | null
          sent_at?: string | null
          status: string
          superseded_by?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          delivered_at?: string | null
          doctor_name?: string | null
          failure_reason?: string | null
          id?: string
          is_doctor_copy?: boolean
          lab_id?: string
          labid?: string
          link_expires_at?: string | null
          link_token?: string | null
          opened_at?: string | null
          recipient_phone?: string | null
          result_id?: string
          secure_link?: string | null
          sent_at?: string | null
          status?: string
          superseded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_lab_id_fkey'
            columns: ['lab_id']
            isOneToOne: false
            referencedRelation: 'labs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_labid_fkey'
            columns: ['labid']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['labid']
          },
          {
            foreignKeyName: 'notifications_result_id_fkey'
            columns: ['result_id']
            isOneToOne: false
            referencedRelation: 'results'
            referencedColumns: ['id']
          },
        ]
      }
      patient_visits: {
        Row: {
          created_by: string | null
          id: string
          lab_id: string
          labid: string
          visited_at: string
        }
        Insert: {
          created_by?: string | null
          id: string
          lab_id: string
          labid: string
          visited_at?: string
        }
        Update: {
          created_by?: string | null
          id?: string
          lab_id?: string
          labid?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'patient_visits_lab_id_fkey'
            columns: ['lab_id']
            isOneToOne: false
            referencedRelation: 'labs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'patient_visits_labid_fkey'
            columns: ['labid']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['labid']
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          consent: boolean
          consent_date: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          labid: string
          next_of_kin: string | null
          next_of_kin_phone: string | null
          phone: string
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          consent?: boolean
          consent_date?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id: string
          labid: string
          next_of_kin?: string | null
          next_of_kin_phone?: string | null
          phone: string
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          consent?: boolean
          consent_date?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          labid?: string
          next_of_kin?: string | null
          next_of_kin_phone?: string | null
          phone?: string
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          lab_id: string
          method: string
          recorded_by: string | null
          reference: string | null
          void_reason: string | null
          voided: boolean
          voided_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id: string
          invoice_id: string
          lab_id: string
          method: string
          recorded_by?: string | null
          reference?: string | null
          void_reason?: string | null
          voided?: boolean
          voided_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          lab_id?: string
          method?: string
          recorded_by?: string | null
          reference?: string | null
          void_reason?: string | null
          voided?: boolean
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payments_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_lab_id_fkey'
            columns: ['lab_id']
            isOneToOne: false
            referencedRelation: 'labs'
            referencedColumns: ['id']
          },
        ]
      }
      price_list: {
        Row: {
          category: string
          corporate_price: number
          created_at: string
          hmo_price: number
          id: string
          is_active: boolean
          lab_id: string
          standard_price: number
          test_code: string
          test_name: string
          updated_at: string
        }
        Insert: {
          category: string
          corporate_price?: number
          created_at?: string
          hmo_price?: number
          id: string
          is_active?: boolean
          lab_id: string
          standard_price?: number
          test_code: string
          test_name: string
          updated_at?: string
        }
        Update: {
          category?: string
          corporate_price?: number
          created_at?: string
          hmo_price?: number
          id?: string
          is_active?: boolean
          lab_id?: string
          standard_price?: number
          test_code?: string
          test_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'price_list_lab_id_fkey'
            columns: ['lab_id']
            isOneToOne: false
            referencedRelation: 'labs'
            referencedColumns: ['id']
          },
        ]
      }
      result_amendments: {
        Row: {
          amended_at: string
          amended_by: string | null
          amendment_reason: string
          id: string
          previous_comments: string | null
          previous_parameters: Json
          result_id: string
        }
        Insert: {
          amended_at?: string
          amended_by?: string | null
          amendment_reason: string
          id: string
          previous_comments?: string | null
          previous_parameters?: Json
          result_id: string
        }
        Update: {
          amended_at?: string
          amended_by?: string | null
          amendment_reason?: string
          id?: string
          previous_comments?: string | null
          previous_parameters?: Json
          result_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'result_amendments_result_id_fkey'
            columns: ['result_id']
            isOneToOne: false
            referencedRelation: 'results'
            referencedColumns: ['id']
          },
        ]
      }
      results: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          comments: string | null
          created_at: string
          critical_acknowledged: boolean
          critical_acknowledged_at: string | null
          critical_acknowledged_by: string | null
          entered_by: string | null
          id: string
          lab_id: string
          labid: string
          parameters: Json
          pdf_generated_at: string | null
          pdf_url: string | null
          sample_id: string
          status: string
          test_type: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          critical_acknowledged?: boolean
          critical_acknowledged_at?: string | null
          critical_acknowledged_by?: string | null
          entered_by?: string | null
          id: string
          lab_id: string
          labid: string
          parameters?: Json
          pdf_generated_at?: string | null
          pdf_url?: string | null
          sample_id: string
          status: string
          test_type: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          comments?: string | null
          created_at?: string
          critical_acknowledged?: boolean
          critical_acknowledged_at?: string | null
          critical_acknowledged_by?: string | null
          entered_by?: string | null
          id?: string
          lab_id?: string
          labid?: string
          parameters?: Json
          pdf_generated_at?: string | null
          pdf_url?: string | null
          sample_id?: string
          status?: string
          test_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'results_lab_id_fkey'
            columns: ['lab_id']
            isOneToOne: false
            referencedRelation: 'labs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'results_labid_fkey'
            columns: ['labid']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['labid']
          },
          {
            foreignKeyName: 'results_sample_id_fkey'
            columns: ['sample_id']
            isOneToOne: false
            referencedRelation: 'samples'
            referencedColumns: ['sample_id']
          },
        ]
      }
      sample_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          notes: string | null
          performed_by: string | null
          sample_id: string
          station: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id: string
          notes?: string | null
          performed_by?: string | null
          sample_id: string
          station?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          performed_by?: string | null
          sample_id?: string
          station?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sample_events_sample_id_fkey'
            columns: ['sample_id']
            isOneToOne: false
            referencedRelation: 'samples'
            referencedColumns: ['sample_id']
          },
        ]
      }
      samples: {
        Row: {
          collected_at: string
          collected_by: string | null
          created_at: string
          id: string
          is_stat: boolean
          lab_id: string
          labid: string
          notes: string | null
          referring_doctor: string | null
          rejection_reason: string | null
          sample_id: string
          status: string
          tests_ordered: string[]
          updated_at: string
        }
        Insert: {
          collected_at?: string
          collected_by?: string | null
          created_at?: string
          id: string
          is_stat?: boolean
          lab_id: string
          labid: string
          notes?: string | null
          referring_doctor?: string | null
          rejection_reason?: string | null
          sample_id: string
          status: string
          tests_ordered?: string[]
          updated_at?: string
        }
        Update: {
          collected_at?: string
          collected_by?: string | null
          created_at?: string
          id?: string
          is_stat?: boolean
          lab_id?: string
          labid?: string
          notes?: string | null
          referring_doctor?: string | null
          rejection_reason?: string | null
          sample_id?: string
          status?: string
          tests_ordered?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'samples_lab_id_fkey'
            columns: ['lab_id']
            isOneToOne: false
            referencedRelation: 'labs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'samples_labid_fkey'
            columns: ['labid']
            isOneToOne: false
            referencedRelation: 'patients'
            referencedColumns: ['labid']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      my_lab_id: { Args: never; Returns: string }
      my_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
