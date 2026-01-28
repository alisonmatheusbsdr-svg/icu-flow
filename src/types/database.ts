export type AppRole = 'admin' | 'diarista' | 'plantonista' | 'coordenador' | 'nir';
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
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_by: string | null;
  blocked_reason: string | null;
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
  concentration_ug_ml: number | null;
  start_date: string | null;
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

export interface RespiratorySupport {
  id: string;
  patient_id: string;
  modality: string;
  spo2_target: number | null;
  flow_rate: number | null;
  fio2: number | null;
  vni_type: string | null;
  vni_tolerance: string | null;
  intubation_date: string | null;
  ventilator_mode: string | null;
  peep: number | null;
  volume_or_pressure: number | null;
  is_sedated: boolean;
  cannula_type: string | null;
  cuff_status: string | null;
  on_ventilation: boolean;
  clinical_status: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PatientTask {
  id: string;
  patient_id: string;
  content: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  created_at: string;
}

export interface PatientPrecaution {
  id: string;
  patient_id: string;
  precaution_type: string;
  risk_level: string | null;
  is_active: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface PatientExam {
  id: string;
  patient_id: string;
  exam_type: 'imagem' | 'laboratorial' | 'cultura' | 'outros';
  exam_name: string;
  exam_date: string;
  is_critical: boolean;
  content: string;
  created_by: string;
  created_at: string;
}

export type RegulationStatus = 
  | 'aguardando_regulacao'
  | 'regulado'
  | 'aguardando_transferencia'
  | 'transferido'
  | 'negado_nir'
  | 'negado_hospital';

export interface PatientRegulation {
  id: string;
  patient_id: string;
  support_type: string;
  status: RegulationStatus;
  requested_at: string;
  regulated_at: string | null;
  confirmed_at: string | null;
  transferred_at: string | null;
  denied_at: string | null;
  denial_reason: string | null;
  // Mudança de especialidade
  previous_support_type: string | null;
  change_reason: string | null;
  changed_at: string | null;
  changed_by: string | null;
  // Dupla checagem - confirmação pela equipe assistencial
  team_confirmed_at: string | null;
  team_confirmed_by: string | null;
  // Outros
  updated_at: string;
  is_active: boolean;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
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
  patient_exams?: PatientExam[];
  evolutions?: Evolution[];
  prophylaxis?: Prophylaxis[];
  venous_access?: VenousAccess[];
  respiratory_support?: RespiratorySupport | null;
  patient_tasks?: PatientTask[];
  patient_precautions?: PatientPrecaution[];
  patient_regulation?: PatientRegulation[];
}
export interface ProfileWithRole extends Profile {
  user_roles?: UserRole[];
}