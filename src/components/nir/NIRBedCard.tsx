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
  // Campos para cálculo de probabilidade de alta
  active_antibiotics_count?: number;
  active_devices_count?: number;
  has_central_access?: boolean;
  has_sepsis_or_shock?: boolean;
  has_tot_device?: boolean;
}

interface NIRBedCardProps {
  bed: Bed;
  patient: PatientWithModality;
  onUpdate: () => void;
  showProbabilityBar?: boolean;
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

// Função para calcular probabilidade de alta
const calculateDischargeProbability = (patient: PatientWithModality) => {
  if (patient.is_palliative) {
    return { probability: 100, status: 'palliative' as const, color: 'gray' as const };
  }
  
  const isOnTOT = patient.respiratory_modality === 'tot' || patient.has_tot_device;
  if (isOnTOT || patient.has_active_dva) {
    return { probability: 0, status: 'blocked' as const, color: 'red' as const };
  }
  
  let discount = 0;
  
  if (['traqueostomia', 'vni'].includes(patient.respiratory_modality || '')) {
    discount += 15;
  }
  
  const atbCount = patient.active_antibiotics_count || 0;
  if (atbCount >= 4) discount += 15;
  else if (atbCount === 3) discount += 10;
  else if (atbCount >= 1) discount += 5;
  
  const devCount = patient.active_devices_count || 0;
  if (devCount >= 6) discount += 15;
  else if (devCount >= 4) discount += 10;
  else if (devCount >= 2) discount += 5;
  
  if (patient.has_central_access) discount += 5;
  if (patient.has_sepsis_or_shock) discount += 10;
  
  const days = Math.ceil((Date.now() - new Date(patient.admission_date).getTime()) / 86400000);
  if (days > 30) discount += 10;
  else if (days > 14) discount += 5;
  
  const probability = Math.max(0, 100 - discount);
  
  let color: 'green' | 'yellow' | 'orange' | 'red' = 'green';
  if (probability < 30) color = 'red';
  else if (probability < 60) color = 'orange';
  else if (probability < 80) color = 'yellow';
  
  return { probability, status: 'normal' as const, color };
};

export function NIRBedCard({ bed, patient, onUpdate, showProbabilityBar = false }: NIRBedCardProps) {
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

  // Calcular probabilidade de alta
  const { probability, status, color } = calculateDischargeProbability(patient);
  
  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400'
  };

  const barWidth = status === 'blocked' ? 100 : (status === 'palliative' ? 100 : probability);

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

          {/* Regulation status badges - only show if there are regulations */}
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

          {/* Mini discharge probability bar - always show in overview mode */}
          {showProbabilityBar && (
            <div className="flex items-center gap-2 mb-3">
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
          )}
          
          {/* Regulation button - only show if there are active regulations */}
          {activeRegulations.length > 0 && (
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
          )}
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
