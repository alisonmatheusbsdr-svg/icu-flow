import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Building2, Calendar, Loader2, AlertTriangle, XCircle, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_CONFIG, NIR_TRANSITIONS, DENIAL_STATUSES, getSupportLabel, formatDateTime } from '@/lib/regulation-config';
import type { PatientRegulation, RegulationStatus } from '@/types/database';

interface NIRRegulationDialogProps {
  patientId: string;
  patientInitials: string;
  bedNumber: number;
  regulations: PatientRegulation[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function NIRRegulationDialog({
  patientInitials,
  bedNumber,
  regulations,
  isOpen,
  onClose,
  onUpdate
}: NIRRegulationDialogProps) {
  const { user } = useAuth();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [denialReasons, setDenialReasons] = useState<Record<string, string>>({});
  const [pendingDenial, setPendingDenial] = useState<{
    regId: string;
    status: RegulationStatus;
  } | null>(null);

  const getTimestampField = (status: RegulationStatus): string | null => {
    switch (status) {
      case 'regulado': return 'regulated_at';
      case 'aguardando_transferencia': return 'confirmed_at';
      case 'transferido': return 'transferred_at';
      case 'negado_nir':
      case 'negado_hospital': return 'denied_at';
      default: return null;
    }
  };

  const handleActionClick = (reg: PatientRegulation, newStatus: RegulationStatus) => {
    if (DENIAL_STATUSES.includes(newStatus)) {
      // Activate denial mode - show justification field
      setPendingDenial({ regId: reg.id, status: newStatus });
    } else {
      // Execute transition directly
      handleTransition(reg, newStatus);
    }
  };

  const handleTransition = async (reg: PatientRegulation, newStatus: RegulationStatus) => {
    // Check if denial reason is required
    if (DENIAL_STATUSES.includes(newStatus)) {
      const reason = denialReasons[reg.id];
      if (!reason?.trim()) {
        toast.error('Justificativa obrigatória para negativa');
        return;
      }
    }

    setSavingId(reg.id);

    const timestampField = getTimestampField(newStatus);
    const updateData: Record<string, unknown> = {
      status: newStatus,
      updated_by: user?.id
    };

    // Set the appropriate timestamp
    if (timestampField) {
      updateData[timestampField] = new Date().toISOString();
    }

    // Set denial reason if applicable
    if (DENIAL_STATUSES.includes(newStatus)) {
      updateData.denial_reason = denialReasons[reg.id];
    } else {
      // Clear denial fields when moving away from denied status
      if (newStatus === 'regulado' && reg.status === 'negado_hospital') {
        updateData.denied_at = null;
        updateData.denial_reason = null;
      }
    }

    const { error } = await supabase
      .from('patient_regulation')
      .update(updateData)
      .eq('id', reg.id);

    if (error) {
      toast.error('Erro ao atualizar regulação');
      console.error(error);
    } else {
      toast.success(`Status alterado para ${STATUS_CONFIG[newStatus].label}`);
      // Clear states
      setDenialReasons(prev => {
        const { [reg.id]: _, ...rest } = prev;
        return rest;
      });
      setPendingDenial(null);
      onUpdate();
    }

    setSavingId(null);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setPendingDenial(null);
    }
    onClose();
  };

  const activeRegulations = regulations.filter(r => r.is_active);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Regulação - {patientInitials} (Leito {bedNumber})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {activeRegulations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma regulação ativa para este paciente.
            </p>
          ) : (
            activeRegulations.map((reg) => {
              const statusConfig = STATUS_CONFIG[reg.status] || STATUS_CONFIG.aguardando_regulacao;
              const StatusIcon = statusConfig.icon;
              const availableTransitions = NIR_TRANSITIONS[reg.status] || [];
              const isSaving = savingId === reg.id;
              const isInDenialMode = pendingDenial?.regId === reg.id;

              return (
                <div key={reg.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-lg">{getSupportLabel(reg.support_type)}</span>
                    <Badge variant="outline" className={statusConfig.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Timeline */}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Solicitado: {formatDateTime(reg.requested_at)}
                    </div>
                    {reg.regulated_at && (
                      <div>Regulado: {formatDateTime(reg.regulated_at)}</div>
                    )}
                    {reg.confirmed_at && (
                      <div>Vaga confirmada: {formatDateTime(reg.confirmed_at)}</div>
                    )}
                    {reg.transferred_at && (
                      <div>Transferido: {formatDateTime(reg.transferred_at)}</div>
                    )}
                  </div>

                  {/* Change specialty indicator */}
                  {reg.previous_support_type && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-800 dark:text-amber-200 font-medium">
                          Especialidade alterada pela equipe
                        </p>
                        <p className="text-amber-700 dark:text-amber-300">
                          De: {getSupportLabel(reg.previous_support_type)}
                        </p>
                        {reg.change_reason && (
                          <p className="text-amber-600 dark:text-amber-400 italic mt-1">
                            "{reg.change_reason}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Existing denial reason */}
                  {reg.denial_reason && (
                    <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded text-sm">
                      <span className="font-medium text-red-700 dark:text-red-300">
                        {reg.status === 'negado_nir' ? 'Motivo (NIR): ' : 'Motivo (Hospital): '}
                      </span>
                      <span className="text-red-600 dark:text-red-400">{reg.denial_reason}</span>
                    </div>
                  )}

                  {/* Denial reason input - only appears when user clicked a denial button */}
                  {isInDenialMode && (
                    <div className="space-y-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <XCircle className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          {pendingDenial.status === 'negado_nir' ? 'Negar Regulação' : 'Negado pelo Hospital'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          Justificativa da Negativa <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          placeholder="Informe o motivo da recusa..."
                          value={denialReasons[reg.id] || ''}
                          onChange={(e) => setDenialReasons(prev => ({ ...prev, [reg.id]: e.target.value }))}
                          disabled={isSaving}
                          className="min-h-[60px] text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPendingDenial(null)}
                          disabled={isSaving}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleTransition(reg, pendingDenial.status)}
                          disabled={isSaving || !denialReasons[reg.id]?.trim()}
                        >
                          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Confirmar Negativa
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons - hidden when in denial mode */}
                  {availableTransitions.length > 0 && !isInDenialMode && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {availableTransitions.map((transition) => {
                        // Double-check logic for transfer status
                        const isTransferAction = transition.status === 'transferido';
                        const teamConfirmed = reg.team_confirmed_at;

                        // If transfer action and team hasn't confirmed yet
                        if (isTransferAction && !teamConfirmed) {
                          return (
                            <div key={transition.status} className="w-full space-y-2">
                              <div className="text-xs text-muted-foreground italic flex items-center gap-2 p-2 bg-muted/50 rounded">
                                <Clock className="h-4 w-4" />
                                Aguardando equipe assistencial confirmar saída do paciente
                              </div>
                              <Button
                                variant="default"
                                size="sm"
                                disabled
                                className="opacity-50"
                              >
                                {transition.label}
                              </Button>
                            </div>
                          );
                        }

                        // If transfer action and team confirmed
                        if (isTransferAction && teamConfirmed) {
                          return (
                            <div key={transition.status} className="w-full space-y-2">
                              <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded">
                                <CheckCircle2 className="h-4 w-4" />
                                Equipe confirmou saída em {formatDateTime(teamConfirmed)}
                              </div>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleActionClick(reg, transition.status)}
                                disabled={isSaving}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {transition.label}
                              </Button>
                            </div>
                          );
                        }

                        // Standard button for other actions
                        return (
                          <Button
                            key={transition.status}
                            variant={transition.variant || 'default'}
                            size="sm"
                            onClick={() => handleActionClick(reg, transition.status)}
                            disabled={isSaving}
                          >
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {transition.label}
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  {/* Final state indicator */}
                  {availableTransitions.length === 0 && !isInDenialMode && (
                    <p className="text-xs text-muted-foreground italic pt-2 border-t">
                      {reg.status === 'transferido' 
                        ? '✓ Regulação concluída com sucesso.'
                        : reg.status === 'negado_nir'
                        ? 'Regulação negada. A equipe pode criar nova solicitação.'
                        : 'Nenhuma ação disponível para este status.'}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
