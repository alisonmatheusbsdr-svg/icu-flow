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
          created_at: string
          id: string
          is_occupied: boolean
          unit_id: string
        }
        Insert: {
          bed_number: number
          created_at?: string
          id?: string
          is_occupied?: boolean
          unit_id: string
        }
        Update: {
          bed_number?: number
          created_at?: string
          id?: string
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
    }
    Enums: {
      app_role: "admin" | "diarista" | "plantonista" | "coordenador"
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
      app_role: ["admin", "diarista", "plantonista", "coordenador"],
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
