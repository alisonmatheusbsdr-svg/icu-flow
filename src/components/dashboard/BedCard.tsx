import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AdmitPatientForm } from './AdmitPatientForm';
import { BlockBedDialog } from './BlockBedDialog';
import { Wind, Heart, Plus, Pill, Ban, Lock, MoreVertical, Unlock, Loader2, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSupportLabel } from '@/lib/regulation-config';
import type { Bed, Patient, PatientRegulation } from '@/types/database';

interface PatientWithModality extends Patient {
  respiratory_modality?: string;
  has_active_dva?: boolean;
  active_antibiotics_count?: number;
  active_devices_count?: number;
  has_central_access?: boolean;
  has_sepsis_or_shock?: boolean;
  has_tot_device?: boolean;
  patient_regulation?: PatientRegulation[];
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
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const { hasRole } = useAuth();

  const canBlockBeds = hasRole('admin') || hasRole('coordenador');

  const daysInternado = patient 
    ? Math.ceil((new Date().getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleUnblock = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUnblocking(true);
    
    const { error } = await supabase
      .from('beds')
      .update({
        is_blocked: false,
        blocked_at: null,
        blocked_by: null,
        blocked_reason: null
      })
      .eq('id', bed.id);

    if (error) {
      toast.error('Erro ao desbloquear leito');
      console.error(error);
    } else {
      toast.success(`Leito ${bed.bed_number} desbloqueado`);
      onUpdate();
    }
    
    setIsUnblocking(false);
  };

  // Blocked bed state
  if (bed.is_blocked) {
    return (
      <Card className="border-destructive/50 bg-destructive/5 cursor-default">
        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px]">
          <div className="text-lg font-semibold text-muted-foreground mb-2">Leito {bed.bed_number}</div>
          <div className="p-2 rounded-full bg-destructive/10">
            <Lock className="h-5 w-5 text-destructive" />
          </div>
          <span className="text-sm font-medium text-destructive mt-2">BLOQUEADO</span>
          {bed.blocked_reason && (
            <span className="text-xs text-muted-foreground mt-1 text-center line-clamp-2">
              {bed.blocked_reason}
            </span>
          )}
          
          {canBlockBeds && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3 gap-1"
              onClick={handleUnblock}
              disabled={isUnblocking}
            >
              {isUnblocking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
              Desbloquear
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Empty bed state
  if (!patient) {
    return (
      <>
        <Dialog open={isAdmitOpen} onOpenChange={setIsAdmitOpen}>
          <Card className="bed-empty cursor-pointer hover:border-success/50 transition-colors relative">
            <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px]">
              <div className="text-lg font-semibold text-muted-foreground mb-2">Leito {bed.bed_number}</div>
              
              {canBlockBeds && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsBlockDialogOpen(true)}>
                      <Lock className="h-4 w-4 mr-2" />
                      Bloquear Leito
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              <DialogTrigger asChild>
                <div className="p-2 rounded-full bg-success/10 cursor-pointer hover:bg-success/20 transition-colors">
                  <Plus className="h-5 w-5 text-success" />
                </div>
              </DialogTrigger>
              <span className="text-sm text-muted-foreground mt-2">Vago</span>
            </CardContent>
          </Card>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Admitir Paciente - Leito {bed.bed_number}</DialogTitle>
            </DialogHeader>
            <AdmitPatientForm bedId={bed.id} onSuccess={() => { setIsAdmitOpen(false); onUpdate(); }} />
          </DialogContent>
        </Dialog>
        
        <BlockBedDialog
          bedId={bed.id}
          bedNumber={bed.bed_number}
          isOpen={isBlockDialogOpen}
          onClose={() => setIsBlockDialogOpen(false)}
          onSuccess={onUpdate}
        />
      </>
    );
  }

  // Occupied bed state
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

        {/* Awaiting transfer notification badge - only show green VAGA */}
        {(() => {
          const awaitingTransfer = patient.patient_regulation?.find(
            r => r.is_active && r.status === 'aguardando_transferencia'
          );
          if (!awaitingTransfer) return null;

          return (
            <div className="mt-2 p-2 bg-green-100 dark:bg-green-950/40 rounded-md border border-green-300 dark:border-green-800 animate-pulse">
              <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300 text-xs font-medium">
                <Truck className="h-3.5 w-3.5" />
                VAGA - {getSupportLabel(awaitingTransfer.support_type)}
              </div>
            </div>
          );
        })()}
        
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
