import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NIRRegulationDialog } from './NIRRegulationDialog';
import { Wind, Heart, Pill, Ban, Building2, Clock, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, ACTIVE_STATUSES, isDeadlineExpired } from '@/lib/regulation-config';
import type { Bed, Patient, PatientRegulation, RegulationStatus } from '@/types/database';

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

export function NIRBedCard({ bed, patient, onUpdate }: NIRBedCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const daysInternado = Math.ceil(
    (new Date().getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  const activeRegulations = patient.patient_regulation?.filter(r => r.is_active) || [];
  
  // Count pending actions (status that requires NIR action)
  const pendingCount = activeRegulations.filter(r => 
    r.status === 'aguardando_regulacao' || r.status === 'regulado' || r.status === 'aguardando_transferencia'
  ).length;

  // Check for urgent signals from team
  const hasClinicalHoldWithoutDeadline = activeRegulations.some(r => 
    r.clinical_hold_at && !r.clinical_hold_deadline
  );
  const hasExpiredDeadline = activeRegulations.some(r => 
    r.clinical_hold_deadline && isDeadlineExpired(r.clinical_hold_deadline)
  );
  const hasRelistingRequest = activeRegulations.some(r => r.relisting_requested_at);
  const hasCancelRequest = activeRegulations.some(r => r.team_cancel_requested_at);
  
  const hasUrgentSignal = hasClinicalHoldWithoutDeadline || hasExpiredDeadline || hasRelistingRequest || hasCancelRequest;

  // Get most urgent status for button color
  const getMostUrgentStatus = (): RegulationStatus | null => {
    if (activeRegulations.some(r => r.status === 'aguardando_regulacao')) return 'aguardando_regulacao';
    if (activeRegulations.some(r => r.status === 'regulado')) return 'regulado';
    if (activeRegulations.some(r => r.status === 'aguardando_transferencia')) return 'aguardando_transferencia';
    return null;
  };

  const urgentStatus = getMostUrgentStatus();

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

          {/* Regulation status badges */}
          {activeRegulations.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {activeRegulations.slice(0, 3).map((reg) => {
                const statusConfig = STATUS_CONFIG[reg.status] || STATUS_CONFIG.aguardando_regulacao;
                const StatusIcon = statusConfig.icon;
                return (
                  <Badge 
                    key={reg.id} 
                    variant="outline" 
                    className={cn("text-xs gap-1", statusConfig.className)}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.shortLabel}
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

          {/* Urgent signals from team */}
          {hasUrgentSignal && (
            <div className="space-y-1 mb-3">
              {hasClinicalHoldWithoutDeadline && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded">
                  <Clock className="h-3 w-3" />
                  <span>Aguardando definição de prazo</span>
                </div>
              )}
              {hasExpiredDeadline && (
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/30 p-1.5 rounded animate-pulse">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Prazo vencido</span>
                </div>
              )}
              {hasRelistingRequest && (
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs bg-blue-50 dark:bg-blue-950/30 p-1.5 rounded animate-pulse">
                  <RefreshCw className="h-3 w-3" />
                  <span>Solicitação de nova listagem</span>
                </div>
              )}
              {hasCancelRequest && (
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/30 p-1.5 rounded animate-pulse">
                  <XCircle className="h-3 w-3" />
                  <span>Solicitação de cancelamento</span>
                </div>
              )}
            </div>
          )}
          
          {/* Regulation button */}
          <Button
            variant={urgentStatus || hasUrgentSignal ? 'default' : 'outline'}
            size="sm"
            className={cn(
              "w-full gap-2",
              hasUrgentSignal && "bg-red-600 hover:bg-red-700 animate-pulse",
              !hasUrgentSignal && urgentStatus === 'aguardando_regulacao' && "bg-amber-600 hover:bg-amber-700",
              !hasUrgentSignal && urgentStatus === 'regulado' && "bg-blue-600 hover:bg-blue-700",
              !hasUrgentSignal && urgentStatus === 'aguardando_transferencia' && "bg-green-600 hover:bg-green-700"
            )}
            onClick={() => setIsDialogOpen(true)}
          >
            <Building2 className="h-4 w-4" />
            Regulação
            {pendingCount > 0 && (
              <Badge className="ml-1 bg-white text-foreground text-xs h-5 w-5 p-0 flex items-center justify-center rounded-full">
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
