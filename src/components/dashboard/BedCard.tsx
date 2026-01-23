import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdmitPatientForm } from './AdmitPatientForm';
import { Wind, Heart, Plus, Pill, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Bed, Patient } from '@/types/database';

interface PatientWithModality extends Patient {
  respiratory_modality?: string;
  has_active_dva?: boolean;
  active_antibiotics_count?: number;
  active_devices_count?: number;
  has_central_access?: boolean;
  has_sepsis_or_shock?: boolean;
  has_tot_device?: boolean;
}

const calculateDischargeProbability = (patient: PatientWithModality) => {
  // Palliative = special case
  if (patient.is_palliative) {
    return { probability: 100, status: 'palliative' as const, color: 'gray' as const };
  }
  
  // Absolute blockers - TOT from respiratory OR invasive devices, or active DVA
  const isOnTOT = patient.respiratory_modality === 'tot' || patient.has_tot_device;
  if (isOnTOT || patient.has_active_dva) {
    return { probability: 0, status: 'blocked' as const, color: 'red' as const };
  }
  
  // Calculate discounts
  let discount = 0;
  
  // Respiratory support
  if (['traqueostomia', 'vni'].includes(patient.respiratory_modality || '')) {
    discount += 15;
  }
  
  // Antibiotics
  const atbCount = patient.active_antibiotics_count || 0;
  if (atbCount >= 4) discount += 15;
  else if (atbCount === 3) discount += 10;
  else if (atbCount >= 1) discount += 5;
  
  // Devices
  const devCount = patient.active_devices_count || 0;
  if (devCount >= 6) discount += 15;
  else if (devCount >= 4) discount += 10;
  else if (devCount >= 2) discount += 5;
  
  // Central access
  if (patient.has_central_access) discount += 5;
  
  // Sepsis/Shock
  if (patient.has_sepsis_or_shock) discount += 10;
  
  // LOS (days hospitalized)
  const days = Math.ceil((Date.now() - new Date(patient.admission_date).getTime()) / 86400000);
  if (days > 30) discount += 10;
  else if (days > 14) discount += 5;
  
  const probability = Math.max(0, 100 - discount);
  
  // Determine color
  let color: 'green' | 'yellow' | 'orange' | 'red' = 'green';
  if (probability < 30) color = 'red';
  else if (probability < 60) color = 'orange';
  else if (probability < 80) color = 'yellow';
  
  return { probability, status: 'normal' as const, color };
};

interface BedCardProps {
  bed: Bed;
  patient?: PatientWithModality | null;
  onUpdate: () => void;
  onPatientClick?: (patientId: string) => void;
}

const MODALITY_BADGES: Record<string, { badge: string; className: string }> = {
  'ar_ambiente': { badge: 'AA', className: 'badge-aa' },
  'cateter_nasal': { badge: 'O₂', className: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  'mascara_simples': { badge: 'O₂', className: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  'mascara_reservatorio': { badge: 'O₂', className: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' },
  'vni': { badge: 'VNI', className: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
  'tot': { badge: 'TOT', className: 'badge-tot' },
  'traqueostomia': { badge: 'TQT', className: 'bg-purple-500/20 text-purple-600 border-purple-500/30' },
};

export function BedCard({ bed, patient, onUpdate, onPatientClick }: BedCardProps) {
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);

  const daysInternado = patient 
    ? Math.ceil((new Date().getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (!patient) {
    return (
      <Dialog open={isAdmitOpen} onOpenChange={setIsAdmitOpen}>
        <DialogTrigger asChild>
          <Card className="bed-empty cursor-pointer hover:border-success/50 transition-colors">
            <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px]">
              <div className="text-lg font-semibold text-muted-foreground mb-2">Leito {bed.bed_number}</div>
              <div className="p-2 rounded-full bg-success/10">
                <Plus className="h-5 w-5 text-success" />
              </div>
              <span className="text-sm text-muted-foreground mt-2">Vago</span>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admitir Paciente - Leito {bed.bed_number}</DialogTitle>
          </DialogHeader>
          <AdmitPatientForm bedId={bed.id} onSuccess={() => { setIsAdmitOpen(false); onUpdate(); }} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card 
      className="bed-occupied cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onPatientClick?.(patient.id)}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm text-muted-foreground">Leito {bed.bed_number}</span>
          <span className="text-xs text-muted-foreground">{daysInternado}d</span>
        </div>
        
        <div className="text-xl font-bold text-foreground mb-1">{patient.initials}</div>
        <div className="text-sm text-muted-foreground mb-3">{patient.age} anos</div>
        
        <div className="flex flex-wrap gap-1">
          {(() => {
            const modality = patient.respiratory_modality || 'ar_ambiente';
            const config = MODALITY_BADGES[modality] || MODALITY_BADGES['ar_ambiente'];
            return (
              <Badge className={`text-xs gap-1 ${config.className}`}>
                <Wind className="h-3 w-3" />{config.badge}
              </Badge>
            );
          })()}
          {patient.has_active_dva && (
            <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-xs gap-1">
              <Pill className="h-3 w-3" />DVA
            </Badge>
          )}
          {patient.diet_type === 'zero' && (
            <Badge className="bg-slate-500/20 text-slate-600 border-slate-500/30 text-xs gap-1">
              <Ban className="h-3 w-3" />ZERO
            </Badge>
          )}
          {patient.is_palliative && (
            <Badge className="badge-pal text-xs gap-1"><Heart className="h-3 w-3" />CCPP</Badge>
          )}
        </div>
        
        {/* Mini discharge probability bar */}
        {(() => {
          const { probability, status, color } = calculateDischargeProbability(patient);
          
          const colorClasses = {
            green: 'bg-green-500',
            yellow: 'bg-yellow-500',
            orange: 'bg-orange-500',
            red: 'bg-red-500',
            gray: 'bg-gray-400'
          };

          // For blocked patients (TOT/DVA), show full red bar to indicate blocker
          const barWidth = status === 'blocked' ? 100 : (status === 'palliative' ? 100 : probability);
          
          return (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all", colorClasses[color])}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-[28px] text-right">
                {status === 'palliative' ? 'CP' : `${probability}%`}
              </span>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
