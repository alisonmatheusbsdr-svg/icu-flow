import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NIRRegulationDialog } from './NIRRegulationDialog';
import { Wind, Heart, Pill, Ban, Building2, Clock, Check, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Bed, Patient, PatientRegulation } from '@/types/database';

interface PatientWithModality extends Patient {
  respiratory_modality?: string;
  has_active_dva?: boolean;
  patient_regulation?: PatientRegulation[];
}

interface NIRBedCardProps {
  bed: Bed;
  patient: PatientWithModality;
  onUpdate: () => void;
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

const STATUS_CONFIG = {
  aguardando: { icon: Clock, className: 'text-amber-600' },
  confirmado: { icon: Check, className: 'text-green-600' },
  negado: { icon: XCircle, className: 'text-red-600' },
};

export function NIRBedCard({ bed, patient, onUpdate }: NIRBedCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const daysInternado = Math.ceil(
    (new Date().getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  const activeRegulations = patient.patient_regulation?.filter(r => r.is_active) || [];
  const pendingCount = activeRegulations.filter(r => r.status === 'aguardando').length;

  return (
    <>
      <Card className="bed-occupied hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm text-muted-foreground">Leito {bed.bed_number}</span>
            <span className="text-xs text-muted-foreground">{daysInternado}d</span>
          </div>
          
          <div className="text-xl font-bold text-foreground mb-1">{patient.initials}</div>
          <div className="text-sm text-muted-foreground mb-3">{patient.age} anos</div>
          
          <div className="flex flex-wrap gap-1 mb-3">
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

          {/* Regulation summary badges */}
          {activeRegulations.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {activeRegulations.slice(0, 3).map((reg) => {
                const status = reg.status as keyof typeof STATUS_CONFIG;
                const StatusIcon = STATUS_CONFIG[status]?.icon || Clock;
                const statusClass = STATUS_CONFIG[status]?.className || 'text-muted-foreground';
                return (
                  <Badge 
                    key={reg.id} 
                    variant="outline" 
                    className={cn("text-xs gap-1", statusClass)}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {reg.support_type.slice(0, 4)}
                  </Badge>
                );
              })}
              {activeRegulations.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{activeRegulations.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* Regulation button */}
          <Button
            variant={pendingCount > 0 ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "w-full gap-2",
              pendingCount > 0 && "bg-amber-600 hover:bg-amber-700"
            )}
            onClick={() => setIsDialogOpen(true)}
          >
            <Building2 className="h-4 w-4" />
            Regulação
            {pendingCount > 0 && (
              <Badge className="ml-1 bg-white text-amber-700 text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
                {pendingCount}
              </Badge>
            )}
          </Button>
        </CardContent>
      </Card>

      <NIRRegulationDialog
        patientId={patient.id}
        patientInitials={patient.initials}
        bedNumber={bed.bed_number}
        regulations={activeRegulations}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onUpdate={() => {
          setIsDialogOpen(false);
          onUpdate();
        }}
      />
    </>
  );
}