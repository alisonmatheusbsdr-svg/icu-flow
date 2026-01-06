export type AppRole = 'admin' | 'diarista' | 'plantonista' | 'coordenador';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type RespiratoryStatus = 'ar_ambiente' | 'tot';
export type PatientOutcome = 'alta' | 'obito' | 'transferencia' | 'alta_enfermaria' | 'transferencia_externa' | 'transferencia_interna';
export type DietType = 'zero' | 'oral' | 'sne' | 'sng' | 'npt' | 'gtt' | null;

export interface Profile {
  id: string;
  nome: string;
  crm: string;
  approval_status: ApprovalStatus;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Unit {
  id: string;
  name: string;
  bed_count: number;
  created_at: string;
  updated_at: string;
}

export interface Bed {
  id: string;
  unit_id: string;
  bed_number: number;
  is_occupied: boolean;
  created_at: string;
}

export interface Patient {
  id: string;
  bed_id: string | null;
  initials: string;
  age: number;
  weight: number | null;
  admission_date: string;
  main_diagnosis: string | null;
  comorbidities: string | null;
  respiratory_status: RespiratoryStatus;
  is_palliative: boolean;
  is_active: boolean;
  outcome: PatientOutcome | null;
  outcome_date: string | null;
  diet_type: DietType;
  created_at: string;
  updated_at: string;
}

export interface InvasiveDevice {
  id: string;
  patient_id: string;
  device_type: string;
  insertion_date: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface VasoactiveDrug {
  id: string;
  patient_id: string;
  drug_name: string;
  dose_ml_h: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Antibiotic {
  id: string;
  patient_id: string;
  antibiotic_name: string;
  start_date: string;
  is_active: boolean;
  created_at: string;
}

export interface TherapeuticPlan {
  id: string;
  patient_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Evolution {
  id: string;
  patient_id: string;
  content: string;
  created_by: string;
  created_at: string;
}

export interface Prophylaxis {
  id: string;
  patient_id: string;
  prophylaxis_type: string;
  is_active: boolean;
  created_at: string;
}

export interface VenousAccess {
  id: string;
  patient_id: string;
  access_type: string;
  insertion_site: string;
  lumen_count: string;
  insertion_date: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

// Extended types with relations
export interface BedWithPatient extends Bed {
  patient?: PatientWithDetails | null;
}

export interface PatientWithDetails extends Patient {
  invasive_devices?: InvasiveDevice[];
  vasoactive_drugs?: VasoactiveDrug[];
  antibiotics?: Antibiotic[];
  therapeutic_plans?: TherapeuticPlan[];
  evolutions?: Evolution[];
  prophylaxis?: Prophylaxis[];
  venous_access?: VenousAccess[];
}
export interface ProfileWithRole extends Profile {
  user_roles?: UserRole[];
}