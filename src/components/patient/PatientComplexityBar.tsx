import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Pill, Syringe, Timer, Wind, AlertTriangle, Heart, Droplets, Activity, Ban } from 'lucide-react';
import type { PatientWithDetails, RespiratorySupport, PatientPrecaution, VasoactiveDrug } from '@/types/database';

interface PatientComplexityBarProps {
  patient: PatientWithDetails;
  respiratorySupport: RespiratorySupport | null;
  precautions: PatientPrecaution[];
}

interface DiscountFactor {
  id: string;
  label: string;
  discount: number;
  icon: React.ReactNode;
}

// Probability thresholds and their visual configuration
const PROBABILITY_CONFIG = {
  high: { min: 80, label: 'Alta Provável', barColor: 'bg-green-500', textColor: 'text-green-600', bgColor: 'bg-green-50' },
  moderate: { min: 60, label: 'Moderada', barColor: 'bg-yellow-500', textColor: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  low: { min: 30, label: 'Baixa', barColor: 'bg-orange-500', textColor: 'text-orange-600', bgColor: 'bg-orange-50' },
  veryLow: { min: 1, label: 'Muito Baixa', barColor: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' },
  blocked: { min: 0, label: 'Bloqueado', barColor: 'bg-red-600', textColor: 'text-red-700', bgColor: 'bg-red-50' },
  palliative: { min: 0, label: 'Cuidados Paliativos', barColor: 'bg-gray-400', textColor: 'text-gray-500', bgColor: 'bg-gray-50' },
};

function getProbabilityConfig(probability: number) {
  if (probability >= PROBABILITY_CONFIG.high.min) return PROBABILITY_CONFIG.high;
  if (probability >= PROBABILITY_CONFIG.moderate.min) return PROBABILITY_CONFIG.moderate;
  if (probability >= PROBABILITY_CONFIG.low.min) return PROBABILITY_CONFIG.low;
  if (probability >= PROBABILITY_CONFIG.veryLow.min) return PROBABILITY_CONFIG.veryLow;
  return PROBABILITY_CONFIG.blocked;
}

// Detect absolute blockers (TOT or active DVA)
function detectBlockers(
  respiratorySupport: RespiratorySupport | null,
  drugs: VasoactiveDrug[] | undefined,
  invasiveDevices: { device_type: string; is_active: boolean }[] | undefined
): { isBlocked: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // TOT = absolute blocker (via respiratory support OR invasive device)
  const hasTotInRespiratory = respiratorySupport?.modality === 'tot';
  const hasTotDevice = invasiveDevices?.some(
    d => d.is_active && d.device_type.toUpperCase() === 'TOT'
  );
  
  if (hasTotInRespiratory || hasTotDevice) {
    reasons.push('Intubado');
  }
  
  // Active DVA = absolute blocker
  const activeDva = drugs?.filter(d => d.is_active) || [];
  if (activeDva.length > 0) {
    reasons.push('Em DVA');
  }
  
  return { isBlocked: reasons.length > 0, reasons };
}

// Calculate respiratory discount (excluding TOT which is a blocker)
function calculateRespiratoryDiscount(respiratorySupport: RespiratorySupport | null): { discount: number; label: string } {
  if (!respiratorySupport) return { discount: 0, label: '' };
  
  const modality = respiratorySupport.modality;
  
  const discounts: Record<string, { discount: number; label: string }> = {
    traqueostomia: { 
      discount: respiratorySupport.on_ventilation ? 20 : 10, 
      label: respiratorySupport.on_ventilation ? 'TQT+VM' : 'TQT' 
    },
    vni: { discount: 15, label: 'VNI' },
    cnaf: { discount: 10, label: 'CNAF' },
    mascara_reservatorio: { discount: 5, label: 'Másc. Reserv.' },
    cateter_nasal: { discount: 5, label: 'Cat. Nasal' },
    ar_ambiente: { discount: 0, label: '' },
  };
  
  return discounts[modality] || { discount: 0, label: '' };
}

// Calculate FiO2 discount
function calculateFio2Discount(respiratorySupport: RespiratorySupport | null): { discount: number; label: string } {
  const fio2 = respiratorySupport?.fio2;
  if (!fio2 || fio2 <= 50) return { discount: 0, label: '' };
  return { discount: 5, label: `FiO2 ${fio2}%` };
}

// Calculate antibiotic discount
function calculateAntibioticDiscount(antibiotics: { is_active: boolean }[] | undefined): { discount: number; label: string } {
  const count = antibiotics?.filter(a => a.is_active).length || 0;
  
  if (count === 0) return { discount: 0, label: '' };
  if (count <= 2) return { discount: 5, label: `${count} ATB` };
  if (count === 3) return { discount: 10, label: '3 ATB' };
  return { discount: 15, label: `${count} ATB` };
}

// Calculate invasive devices discount
function calculateDeviceDiscount(devices: { is_active: boolean }[] | undefined): { discount: number; label: string } {
  const count = devices?.filter(d => d.is_active).length || 0;
  
  if (count <= 1) return { discount: 0, label: '' };
  if (count <= 3) return { discount: 5, label: `${count} Disp` };
  if (count <= 5) return { discount: 10, label: `${count} Disp` };
  return { discount: 15, label: `${count} Disp` };
}

// Calculate venous access discount
function calculateVenousDiscount(venousAccess: { access_type: string; is_active: boolean }[] | undefined): { discount: number; label: string } {
  const active = venousAccess?.filter(v => v.is_active) || [];
  
  if (active.length === 0) return { discount: 0, label: '' };
  
  const centralTypes = ['CVC', 'PICC', 'Hemodiálise'];
  const centralCount = active.filter(v => centralTypes.includes(v.access_type)).length;
  
  if (centralCount === 0) return { discount: 0, label: '' };
  if (centralCount === 1) return { discount: 5, label: '1 Central' };
  return { discount: 10, label: `${centralCount} Centrais` };
}

// Calculate precaution discount
function calculatePrecautionDiscount(precautions: PatientPrecaution[]): { discount: number; label: string } {
  const active = precautions.filter(p => p.is_active);
  
  let discount = 0;
  const labels: string[] = [];
  
  if (active.some(p => p.precaution_type === 'sepse')) {
    discount += 10;
    labels.push('Sepse');
  }
  if (active.some(p => p.precaution_type === 'choque')) {
    discount += 10;
    labels.push('Choque');
  }
  
  return { discount, label: labels.join(', ') };
}

// Calculate length of stay discount
function calculateLosDiscount(admissionDate: string): { discount: number; label: string } {
  const days = differenceInDays(new Date(), new Date(admissionDate));
  
  if (days <= 14) return { discount: 0, label: '' };
  if (days <= 30) return { discount: 5, label: `D${days}` };
  return { discount: 10, label: `D${days}` };
}

export function PatientComplexityBar({ patient, respiratorySupport, precautions }: PatientComplexityBarProps) {
  // Handle palliative patients
  if (patient.is_palliative) {
    const config = PROBABILITY_CONFIG.palliative;
    return (
      <div className={cn("border rounded-lg p-4 mt-3", config.bgColor)}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Probabilidade de Alta
          </span>
          <span className={cn("text-sm font-bold", config.textColor)}>
            {config.label}
          </span>
        </div>
        
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className={cn("h-full w-full", config.barColor)} />
        </div>
        
        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-200">
            <Heart className="h-3 w-3 mr-1" />
            Foco em conforto e qualidade de vida
          </Badge>
        </div>
      </div>
    );
  }

  // Check for absolute blockers (TOT or DVA)
  const { isBlocked, reasons } = detectBlockers(respiratorySupport, patient.vasoactive_drugs, patient.invasive_devices);
  
  if (isBlocked) {
    const config = PROBABILITY_CONFIG.blocked;
    return (
      <div className={cn("border rounded-lg p-4 mt-3", config.bgColor)}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Probabilidade de Alta
          </span>
          <span className={cn("text-sm font-bold", config.textColor)}>
            0% - {config.label}
          </span>
        </div>
        
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className={cn("h-full w-0", config.barColor)} />
        </div>
        
        <div className="flex flex-wrap gap-1 mt-2">
          {reasons.map(reason => (
            <Badge 
              key={reason} 
              variant="outline"
              className="text-xs bg-red-100 text-red-700 border-red-200"
            >
              <Ban className="h-3 w-3 mr-1" />
              {reason}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  // Calculate all discounts
  const respiratory = calculateRespiratoryDiscount(respiratorySupport);
  const fio2 = calculateFio2Discount(respiratorySupport);
  const antibiotics = calculateAntibioticDiscount(patient.antibiotics);
  const devices = calculateDeviceDiscount(patient.invasive_devices);
  const venous = calculateVenousDiscount(patient.venous_access);
  const precautionDiscount = calculatePrecautionDiscount(precautions);
  const los = calculateLosDiscount(patient.admission_date);

  // Build factors array for display
  const factors: DiscountFactor[] = [];

  if (respiratory.discount > 0) {
    factors.push({
      id: 'respiratory',
      label: respiratory.label,
      discount: respiratory.discount,
      icon: <Wind className="h-3 w-3" />,
    });
  }

  if (fio2.discount > 0) {
    factors.push({
      id: 'fio2',
      label: fio2.label,
      discount: fio2.discount,
      icon: <Wind className="h-3 w-3" />,
    });
  }

  if (antibiotics.discount > 0) {
    factors.push({
      id: 'antibiotics',
      label: antibiotics.label,
      discount: antibiotics.discount,
      icon: <Pill className="h-3 w-3" />,
    });
  }

  if (devices.discount > 0) {
    factors.push({
      id: 'devices',
      label: devices.label,
      discount: devices.discount,
      icon: <Activity className="h-3 w-3" />,
    });
  }

  if (venous.discount > 0) {
    factors.push({
      id: 'venous',
      label: venous.label,
      discount: venous.discount,
      icon: <Droplets className="h-3 w-3" />,
    });
  }

  if (precautionDiscount.discount > 0) {
    factors.push({
      id: 'precautions',
      label: precautionDiscount.label,
      discount: precautionDiscount.discount,
      icon: <AlertTriangle className="h-3 w-3" />,
    });
  }

  if (los.discount > 0) {
    factors.push({
      id: 'los',
      label: los.label,
      discount: los.discount,
      icon: <Timer className="h-3 w-3" />,
    });
  }

  // Calculate final probability (100% - all discounts)
  const totalDiscount = factors.reduce((sum, f) => sum + f.discount, 0);
  const probability = Math.max(0, 100 - totalDiscount);
  const config = getProbabilityConfig(probability);

  return (
    <div className={cn("border rounded-lg p-4 mt-3", config.bgColor)}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Probabilidade de Alta
        </span>
        <span className={cn("text-sm font-bold", config.textColor)}>
          {probability}% - {config.label}
        </span>
      </div>
      
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-500", config.barColor)}
          style={{ width: `${probability}%` }}
        />
      </div>
      
      {factors.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {factors.map(factor => (
            <Badge 
              key={factor.id} 
              variant="outline"
              className="text-xs bg-white/50"
            >
              {factor.icon}
              <span className="ml-1">{factor.label}</span>
              <span className="ml-1 text-muted-foreground">(-{factor.discount}%)</span>
            </Badge>
          ))}
        </div>
      )}
      
      {factors.length === 0 && (
        <div className="mt-2">
          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-200">
            <TrendingUp className="h-3 w-3 mr-1" />
            Paciente estável - alta provável
          </Badge>
        </div>
      )}
    </div>
  );
}
