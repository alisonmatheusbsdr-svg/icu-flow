import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdmitPatientForm } from './AdmitPatientForm';
import { Wind, Heart, Plus, Pill, Ban } from 'lucide-react';
import type { Bed, Patient } from '@/types/database';

interface PatientWithModality extends Patient {
  respiratory_modality?: string;
  has_active_dva?: boolean;
}

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
      </CardContent>
    </Card>
  );
}
