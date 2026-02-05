export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      active_sessions: {
        Row: {
          created_at: string
          handover_mode: boolean
          id: string
          is_blocking: boolean
          is_handover_receiver: boolean
          last_activity: string
          started_at: string
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          handover_mode?: boolean
          id?: string
          is_blocking?: boolean
          is_handover_receiver?: boolean
          last_activity?: string
          started_at?: string
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          handover_mode?: boolean
          id?: string
          is_blocking?: boolean
          is_handover_receiver?: boolean
          last_activity?: string
          started_at?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_sessions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      antibiotics: {
        Row: {
          antibiotic_name: string
          created_at: string
          id: string
          is_active: boolean
          patient_id: string
          start_date: string
        }
        Insert: {
          antibiotic_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          patient_id: string
          start_date?: string
        }
        Update: {
          antibiotic_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          patient_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "antibiotics_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          bed_number: number
          blocked_at: string | null
          blocked_by: string | null
          blocked_reason: string | null
          created_at: string
          id: string
          is_blocked: boolean
          is_occupied: boolean
          unit_id: string
        }
        Insert: {
          bed_number: number
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean
          is_occupied?: boolean
          unit_id: string
        }
        Update: {
          bed_number?: number
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean
          is_occupied?: boolean
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beds_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      evolutions: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          patient_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          patient_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invasive_devices: {
        Row: {
          created_at: string
          device_type: string
          id: string
          insertion_date: string
          is_active: boolean
          notes: string | null
          patient_id: string
        }
        Insert: {
          created_at?: string
          device_type: string
          id?: string
          insertion_date?: string
          is_active?: boolean
          notes?: string | null
          patient_id: string
        }
        Update: {
          created_at?: string
          device_type?: string
          id?: string
          insertion_date?: string
          is_active?: boolean
          notes?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invasive_devices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_exams: {
        Row: {
          content: string
          created_at: string
          created_by: string
          exam_date: string
          exam_name: string
          exam_type: string
          id: string
          is_critical: boolean
          patient_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          exam_date?: string
          exam_name: string
          exam_type: string
          id?: string
          is_critical?: boolean
          patient_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          exam_date?: string
          exam_name?: string
          exam_type?: string
          id?: string
          is_critical?: boolean
          patient_id?: string
        }
        Relationships: []
      }
      patient_precautions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          notes: string | null
          patient_id: string
          precaution_type: string
          risk_level: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          notes?: string | null
          patient_id: string
          precaution_type: string
          risk_level?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          patient_id?: string
          precaution_type?: string
          risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_precautions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_regulation: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          clinical_hold_at: string | null
          clinical_hold_by: string | null
          clinical_hold_deadline: string | null
          clinical_hold_deadline_set_by: string | null
          clinical_hold_reason: string | null
          confirmed_at: string | null
          created_by: string
          denial_reason: string | null
          denied_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          patient_id: string
          previous_support_type: string | null
          regulated_at: string | null
          relisting_reason: string | null
          relisting_requested_at: string | null
          relisting_requested_by: string | null
          requested_at: string
          status: string
          support_type: string
          team_cancel_reason: string | null
          team_cancel_requested_at: string | null
          team_cancel_requested_by: string | null
          team_confirmed_at: string | null
          team_confirmed_by: string | null
          transferred_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          clinical_hold_at?: string | null
          clinical_hold_by?: string | null
          clinical_hold_deadline?: string | null
          clinical_hold_deadline_set_by?: string | null
          clinical_hold_reason?: string | null
          confirmed_at?: string | null
          created_by: string
          denial_reason?: string | null
          denied_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          patient_id: string
          previous_support_type?: string | null
          regulated_at?: string | null
          relisting_reason?: string | null
          relisting_requested_at?: string | null
          relisting_requested_by?: string | null
          requested_at?: string
          status?: string
          support_type: string
          team_cancel_reason?: string | null
          team_cancel_requested_at?: string | null
          team_cancel_requested_by?: string | null
          team_confirmed_at?: string | null
          team_confirmed_by?: string | null
          transferred_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          clinical_hold_at?: string | null
          clinical_hold_by?: string | null
          clinical_hold_deadline?: string | null
          clinical_hold_deadline_set_by?: string | null
          clinical_hold_reason?: string | null
          confirmed_at?: string | null
          created_by?: string
          denial_reason?: string | null
          denied_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          patient_id?: string
          previous_support_type?: string | null
          regulated_at?: string | null
          relisting_reason?: string | null
          relisting_requested_at?: string | null
          relisting_requested_by?: string | null
          requested_at?: string
          status?: string
          support_type?: string
          team_cancel_reason?: string | null
          team_cancel_requested_at?: string | null
          team_cancel_requested_by?: string | null
          team_confirmed_at?: string | null
          team_confirmed_by?: string | null
          transferred_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_regulation_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_tasks: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          is_completed: boolean
          patient_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_completed?: boolean
          patient_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_completed?: boolean
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          admission_date: string
          age: number
          allergies: string | null
          bed_id: string | null
          comorbidities: string | null
          created_at: string
          diet_type: string | null
          id: string
          initials: string
          is_active: boolean
          is_palliative: boolean
          main_diagnosis: string | null
          outcome: Database["public"]["Enums"]["patient_outcome"] | null
          outcome_date: string | null
          respiratory_status: Database["public"]["Enums"]["respiratory_status"]
          updated_at: string
          weight: number | null
        }
        Insert: {
          admission_date?: string
          age: number
          allergies?: string | null
          bed_id?: string | null
          comorbidities?: string | null
          created_at?: string
          diet_type?: string | null
          id?: string
          initials: string
          is_active?: boolean
          is_palliative?: boolean
          main_diagnosis?: string | null
          outcome?: Database["public"]["Enums"]["patient_outcome"] | null
          outcome_date?: string | null
          respiratory_status?: Database["public"]["Enums"]["respiratory_status"]
          updated_at?: string
          weight?: number | null
        }
        Update: {
          admission_date?: string
          age?: number
          allergies?: string | null
          bed_id?: string | null
          comorbidities?: string | null
          created_at?: string
          diet_type?: string | null
          id?: string
          initials?: string
          is_active?: boolean
          is_palliative?: boolean
          main_diagnosis?: string | null
          outcome?: Database["public"]["Enums"]["patient_outcome"] | null
          outcome_date?: string | null
          respiratory_status?: Database["public"]["Enums"]["respiratory_status"]
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          created_at: string
          crm: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          crm: string
          id: string
          nome: string
          updated_at?: string
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          created_at?: string
          crm?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      prophylaxis: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          patient_id: string
          prophylaxis_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          patient_id: string
          prophylaxis_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          patient_id?: string
          prophylaxis_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prophylaxis_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      respiratory_support: {
        Row: {
          cannula_type: string | null
          clinical_status: string | null
          created_at: string
          cuff_status: string | null
          fio2: number | null
          flow_rate: number | null
          id: string
          intubation_date: string | null
          is_active: boolean
          is_sedated: boolean | null
          modality: string
          on_ventilation: boolean | null
          patient_id: string
          peep: number | null
          spo2_target: number | null
          updated_at: string
          ventilator_mode: string | null
          vni_tolerance: string | null
          vni_type: string | null
          volume_or_pressure: number | null
        }
        Insert: {
          cannula_type?: string | null
          clinical_status?: string | null
          created_at?: string
          cuff_status?: string | null
          fio2?: number | null
          flow_rate?: number | null
          id?: string
          intubation_date?: string | null
          is_active?: boolean
          is_sedated?: boolean | null
          modality?: string
          on_ventilation?: boolean | null
          patient_id: string
          peep?: number | null
          spo2_target?: number | null
          updated_at?: string
          ventilator_mode?: string | null
          vni_tolerance?: string | null
          vni_type?: string | null
          volume_or_pressure?: number | null
        }
        Update: {
          cannula_type?: string | null
          clinical_status?: string | null
          created_at?: string
          cuff_status?: string | null
          fio2?: number | null
          flow_rate?: number | null
          id?: string
          intubation_date?: string | null
          is_active?: boolean
          is_sedated?: boolean | null
          modality?: string
          on_ventilation?: boolean | null
          patient_id?: string
          peep?: number | null
          spo2_target?: number | null
          updated_at?: string
          ventilator_mode?: string | null
          vni_tolerance?: string | null
          vni_type?: string | null
          volume_or_pressure?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "respiratory_support_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      therapeutic_plans: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapeutic_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          bed_count: number
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          bed_count?: number
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          bed_count?: number
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_units: {
        Row: {
          created_at: string
          id: string
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      vasoactive_drugs: {
        Row: {
          concentration_ug_ml: number | null
          created_at: string
          dose_ml_h: number
          drug_name: string
          id: string
          is_active: boolean
          patient_id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          concentration_ug_ml?: number | null
          created_at?: string
          dose_ml_h: number
          drug_name: string
          id?: string
          is_active?: boolean
          patient_id: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          concentration_ug_ml?: number | null
          created_at?: string
          dose_ml_h?: number
          drug_name?: string
          id?: string
          is_active?: boolean
          patient_id?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vasoactive_drugs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      venous_access: {
        Row: {
          access_type: string
          created_at: string
          id: string
          insertion_date: string
          insertion_site: string
          is_active: boolean
          lumen_count: string
          notes: string | null
          patient_id: string
        }
        Insert: {
          access_type: string
          created_at?: string
          id?: string
          insertion_date?: string
          insertion_site: string
          is_active?: boolean
          lumen_count: string
          notes?: string | null
          patient_id: string
        }
        Update: {
          access_type?: string
          created_at?: string
          id?: string
          insertion_date?: string
          insertion_site?: string
          is_active?: boolean
          lumen_count?: string
          notes?: string | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venous_access_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      debug_patient_update_check: {
        Args: { _new_bed_id: string; _user_id: string }
        Returns: {
          auth_uid_not_null: boolean
          bed_is_null: boolean
          full_check_result: boolean
          is_user_approved: boolean
          is_user_privileged: boolean
        }[]
      }
      discharge_patient: {
        Args: {
          _outcome: Database["public"]["Enums"]["patient_outcome"]
          _patient_id: string
          _user_id: string
        }
        Returns: boolean
      }
      has_active_session_in_unit: {
        Args: { _unit_id: string; _user_id: string }
        Returns: boolean
      }
      has_privileged_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_unit_access: {
        Args: { _unit_id: string; _user_id: string }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      is_unit_available: { Args: { _unit_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "diarista" | "plantonista" | "coordenador" | "nir"
      approval_status: "pending" | "approved" | "rejected"
      patient_outcome:
        | "alta"
        | "obito"
        | "transferencia"
        | "alta_enfermaria"
        | "transferencia_externa"
        | "transferencia_interna"
      respiratory_status: "ar_ambiente" | "tot"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "diarista", "plantonista", "coordenador", "nir"],
      approval_status: ["pending", "approved", "rejected"],
      patient_outcome: [
        "alta",
        "obito",
        "transferencia",
        "alta_enfermaria",
        "transferencia_externa",
        "transferencia_interna",
      ],
      respiratory_status: ["ar_ambiente", "tot"],
    },
  },
} as const
