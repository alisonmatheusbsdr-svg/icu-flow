import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Activity, Pill, Syringe, Timer, Wind, AlertTriangle, Heart, Droplets } from 'lucide-react';
import type { PatientWithDetails, RespiratorySupport, PatientPrecaution, VasoactiveDrug } from '@/types/database';

interface PatientComplexityBarProps {
  patient: PatientWithDetails;
  respiratorySupport: RespiratorySupport | null;
  precautions: PatientPrecaution[];
}

interface ComplexityFactor {
  id: string;
  label: string;
  points: number;
  icon: React.ReactNode;
  colorClass: string;
}

// Score thresholds and their visual configuration
const SCORE_CONFIG = {
  low: { max: 25, label: 'Baixa', barColor: 'bg-green-500', textColor: 'text-green-600', badgeClass: 'bg-green-100 text-green-700 border-green-200' },
  moderate: { max: 50, label: 'Moderada', barColor: 'bg-yellow-500', textColor: 'text-yellow-600', badgeClass: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  high: { max: 75, label: 'Alta', barColor: 'bg-orange-500', textColor: 'text-orange-600', badgeClass: 'bg-orange-100 text-orange-700 border-orange-200' },
  veryHigh: { max: Infinity, label: 'Muito Alta', barColor: 'bg-red-500', textColor: 'text-red-600', badgeClass: 'bg-red-100 text-red-700 border-red-200' },
  palliative: { max: 0, label: 'Cuidados Paliativos', barColor: 'bg-gray-400', textColor: 'text-gray-500', badgeClass: 'bg-gray-100 text-gray-600 border-gray-200' },
};

// Respiratory modality scores
const RESPIRATORY_SCORES: Record<string, number> = {
  ar_ambiente: 0,
  cateter_nasal: 5,
  mascara_reservatorio: 10,
  cnaf: 15,
  vni: 20,
  tot: 30, // Base, will add more for days
  traqueostomia: 25,
};

function getScoreConfig(score: number, isPalliative: boolean) {
  if (isPalliative) return SCORE_CONFIG.palliative;
  if (score <= SCORE_CONFIG.low.max) return SCORE_CONFIG.low;
  if (score <= SCORE_CONFIG.moderate.max) return SCORE_CONFIG.moderate;
  if (score <= SCORE_CONFIG.high.max) return SCORE_CONFIG.high;
  return SCORE_CONFIG.veryHigh;
}

function getFactorColorClass(points: number): string {
  if (points >= 20) return 'bg-red-100 text-red-700 border-red-200';
  if (points >= 10) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (points >= 5) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
}

// Calculate respiratory support score (0-40 pts)
function calculateRespiratoryScore(respiratorySupport: RespiratorySupport | null): { score: number; label: string } {
  if (!respiratorySupport) return { score: 0, label: '' };

  const modality = respiratorySupport.modality || 'ar_ambiente';
  let baseScore = RESPIRATORY_SCORES[modality] ?? 0;
  let label = '';

  if (modality === 'tot' && respiratorySupport.intubation_date) {
    const days = differenceInDays(new Date(), new Date(respiratorySupport.intubation_date));
    if (days > 7) {
      baseScore = 40; // Max for prolonged TOT
      label = `TOT D${days}`;
    } else {
      baseScore = 30;
      label = `TOT D${days}`;
    }
  } else if (modality === 'vni') {
    label = 'VNI';
  } else if (modality === 'cnaf') {
    label = 'CNAF';
  } else if (modality === 'traqueostomia') {
    const onVent = respiratorySupport.on_ventilation;
    label = onVent ? 'TQT+VM' : 'TQT';
    if (onVent) baseScore += 5;
  } else if (baseScore > 0) {
    label = modality.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return { score: baseScore, label };
}

// Calculate DVA score (0-30 pts)
function calculateDvaScore(drugs: VasoactiveDrug[] | undefined, patientWeight: number | null): { score: number; label: string } {
  const activeDrugs = drugs?.filter(d => d.is_active) || [];
  const count = activeDrugs.length;
  
  if (count === 0) return { score: 0, label: '' };

  // Check for high dose norepinephrine
  const hasHighDoseNora = activeDrugs.some(d => {
    if (d.drug_name !== 'Noradrenalina') return false;
    const concentration = d.concentration_ug_ml || 0;
    const mlh = d.dose_ml_h;
    if (!patientWeight || patientWeight <= 0 || concentration <= 0) return false;
    const ugKgMin = (mlh * concentration) / (patientWeight * 60);
    return ugKgMin > 0.5;
  });

  let score = 0;
  if (count === 1) {
    score = hasHighDoseNora ? 20 : 15;
  } else {
    score = 30; // 2+ DVAs
  }

  return { score, label: `${count} DVA${count > 1 ? 's' : ''}` };
}

// Calculate antibiotic score (0-15 pts)
function calculateAntibioticScore(antibiotics: { is_active: boolean }[] | undefined): { score: number; label: string } {
  const count = antibiotics?.filter(a => a.is_active).length || 0;
  
  if (count === 0) return { score: 0, label: '' };
  if (count <= 2) return { score: 5, label: `${count} ATB` };
  if (count === 3) return { score: 10, label: '3 ATB' };
  return { score: 15, label: `${count} ATB` };
}

// Calculate invasive devices score (0-15 pts)
function calculateDeviceScore(devices: { is_active: boolean }[] | undefined): { score: number; label: string } {
  const count = devices?.filter(d => d.is_active).length || 0;
  
  if (count <= 1) return { score: 0, label: '' };
  if (count <= 3) return { score: 5, label: `${count} Disp` };
  if (count <= 5) return { score: 10, label: `${count} Disp` };
  return { score: 15, label: `${count} Disp` };
}

// Calculate venous access score (0-10 pts)
function calculateVenousAccessScore(venousAccess: { access_type: string; is_active: boolean }[] | undefined): { score: number; label: string } {
  const active = venousAccess?.filter(v => v.is_active) || [];
  
  if (active.length === 0) return { score: 0, label: '' };
  
  const centralTypes = ['CVC', 'PICC', 'Hemodiálise'];
  const centralCount = active.filter(v => centralTypes.includes(v.access_type)).length;
  
  if (centralCount === 0) return { score: 0, label: '' };
  if (centralCount === 1) return { score: 5, label: '1 Central' };
  return { score: 10, label: `${centralCount} Centrais` };
}

// Calculate length of stay score (0-10 pts)
function calculateLosScore(admissionDate: string): { score: number; label: string } {
  const days = differenceInDays(new Date(), new Date(admissionDate));
  
  if (days <= 14) return { score: 0, label: '' };
  if (days <= 30) return { score: 5, label: `D${days}` };
  return { score: 10, label: `D${days}` };
}

// Calculate FiO2 score (0-5 pts)
function calculateFio2Score(respiratorySupport: RespiratorySupport | null): { score: number; label: string } {
  const fio2 = respiratorySupport?.fio2;
  if (!fio2 || fio2 <= 50) return { score: 0, label: '' };
  return { score: 5, label: `FiO2 ${fio2}%` };
}

// Calculate precaution score (0-10 pts)
function calculatePrecautionScore(precautions: PatientPrecaution[]): { score: number; label: string } {
  const active = precautions.filter(p => p.is_active);
  
  let score = 0;
  const labels: string[] = [];
  
  if (active.some(p => p.precaution_type === 'sepse')) {
    score += 5;
    labels.push('Sepse');
  }
  if (active.some(p => p.precaution_type === 'choque')) {
    score += 5;
    labels.push('Choque');
  }
  
  return { score, label: labels.join(', ') };
}

export function PatientComplexityBar({ patient, respiratorySupport, precautions }: PatientComplexityBarProps) {
  // Handle palliative patients
  if (patient.is_palliative) {
    const config = SCORE_CONFIG.palliative;
    return (
      <div className="border rounded-lg p-4 bg-muted/30 mt-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Complexidade do Paciente
          </span>
          <span className={cn("text-sm font-bold", config.textColor)}>
            {config.label}
          </span>
        </div>
        
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className={cn("h-full w-full", config.barColor)} />
        </div>
        
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className={config.badgeClass}>
            <Heart className="h-3 w-3 mr-1" />
            Foco em conforto e qualidade de vida
          </Badge>
        </div>
      </div>
    );
  }

  // Calculate all scores
  const respiratory = calculateRespiratoryScore(respiratorySupport);
  const dva = calculateDvaScore(patient.vasoactive_drugs, patient.weight);
  const antibiotics = calculateAntibioticScore(patient.antibiotics);
  const devices = calculateDeviceScore(patient.invasive_devices);
  const venous = calculateVenousAccessScore(patient.venous_access);
  const los = calculateLosScore(patient.admission_date);
  const fio2 = calculateFio2Score(respiratorySupport);
  const precautionScore = calculatePrecautionScore(precautions);

  const totalScore = respiratory.score + dva.score + antibiotics.score + devices.score + venous.score + los.score + fio2.score + precautionScore.score;
  const config = getScoreConfig(totalScore, false);

  // Build factors array for display
  const factors: ComplexityFactor[] = [];

  if (respiratory.score > 0) {
    factors.push({
      id: 'respiratory',
      label: respiratory.label,
      points: respiratory.score,
      icon: <Wind className="h-3 w-3" />,
      colorClass: getFactorColorClass(respiratory.score),
    });
  }

  if (dva.score > 0) {
    factors.push({
      id: 'dva',
      label: dva.label,
      points: dva.score,
      icon: <Syringe className="h-3 w-3" />,
      colorClass: getFactorColorClass(dva.score),
    });
  }

  if (antibiotics.score > 0) {
    factors.push({
      id: 'antibiotics',
      label: antibiotics.label,
      points: antibiotics.score,
      icon: <Pill className="h-3 w-3" />,
      colorClass: getFactorColorClass(antibiotics.score),
    });
  }

  if (devices.score > 0) {
    factors.push({
      id: 'devices',
      label: devices.label,
      points: devices.score,
      icon: <Activity className="h-3 w-3" />,
      colorClass: getFactorColorClass(devices.score),
    });
  }

  if (venous.score > 0) {
    factors.push({
      id: 'venous',
      label: venous.label,
      points: venous.score,
      icon: <Droplets className="h-3 w-3" />,
      colorClass: getFactorColorClass(venous.score),
    });
  }

  if (los.score > 0) {
    factors.push({
      id: 'los',
      label: los.label,
      points: los.score,
      icon: <Timer className="h-3 w-3" />,
      colorClass: getFactorColorClass(los.score),
    });
  }

  if (fio2.score > 0) {
    factors.push({
      id: 'fio2',
      label: fio2.label,
      points: fio2.score,
      icon: <Wind className="h-3 w-3" />,
      colorClass: getFactorColorClass(fio2.score),
    });
  }

  if (precautionScore.score > 0) {
    factors.push({
      id: 'precautions',
      label: precautionScore.label,
      points: precautionScore.score,
      icon: <AlertTriangle className="h-3 w-3" />,
      colorClass: getFactorColorClass(precautionScore.score),
    });
  }

  const displayScore = Math.min(totalScore, 100);

  return (
    <div className="border rounded-lg p-4 bg-muted/30 mt-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Complexidade do Paciente
        </span>
        <span className={cn("text-sm font-bold", config.textColor)}>
          {totalScore}/100 - {config.label}
        </span>
      </div>
      
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-500", config.barColor)}
          style={{ width: `${displayScore}%` }}
        />
      </div>
      
      {factors.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {factors.map(factor => (
            <Badge 
              key={factor.id} 
              variant="outline"
              className={cn("text-xs", factor.colorClass)}
            >
              {factor.icon}
              <span className="ml-1">{factor.label}</span>
              <span className="ml-1 opacity-70">(+{factor.points})</span>
            </Badge>
          ))}
        </div>
      )}
      
      {factors.length === 0 && (
        <div className="mt-2">
          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
            Paciente estável - sem fatores de complexidade
          </Badge>
        </div>
      )}
    </div>
  );
}
