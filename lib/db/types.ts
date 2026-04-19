// Hand-authored Supabase Database type for typed clients.
// Keep in sync with supabase/migrations/0001_init.sql.

export type Role = 'super_admin' | 'gp' | 'operating_partner' | 'read_only'
export type SourceType = 'csv' | 'document' | 'diagnostic' | 'manual'
export type AssessmentStatus = 'healthy' | 'moderate' | 'elevated' | 'critical'
export type SignalCategory =
  | 'operational_stability'
  | 'systems_reliability'
  | 'organizational_capacity'
export type SignalSeverity = 'none' | 'mild' | 'moderate' | 'severe'

export interface FirmRow {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface ProfileRow {
  id: string
  firm_id: string | null
  full_name: string | null
  role: Role
  created_at: string
}

export interface CompanyRow {
  id: string
  firm_id: string
  name: string
  slug: string
  industry: string | null
  hold_start_date: string | null
  created_at: string
}

export interface AssessmentRow {
  id: string
  company_id: string
  risk_score: number | null
  status: AssessmentStatus | null
  scoring_model_version: string
  source_type: SourceType
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface SignalRow {
  id: string
  assessment_id: string
  signal_type: string
  category: SignalCategory
  severity: SignalSeverity
  contribution: number
  evidence: string | null
  raw_value: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      firms: {
        Row: FirmRow
        Insert: Omit<FirmRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<FirmRow>
        Relationships: []
      }
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'created_at'> & { created_at?: string }
        Update: Partial<ProfileRow>
        Relationships: []
      }
      companies: {
        Row: CompanyRow
        Insert: Omit<CompanyRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<CompanyRow>
        Relationships: []
      }
      assessments: {
        Row: AssessmentRow
        Insert: Omit<AssessmentRow, 'id' | 'created_at' | 'scoring_model_version'> & {
          id?: string
          created_at?: string
          scoring_model_version?: string
        }
        Update: Partial<AssessmentRow>
        Relationships: []
      }
      signals: {
        Row: SignalRow
        Insert: Omit<SignalRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<SignalRow>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
