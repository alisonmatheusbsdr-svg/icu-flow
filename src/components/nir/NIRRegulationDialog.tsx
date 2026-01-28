import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Building2, Calendar, Clock, Check, XCircle, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PatientRegulation } from '@/types/database';

interface NIRRegulationDialogProps {
  patientId: string;
  patientInitials: string;
  bedNumber: number;
  regulations: PatientRegulation[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const SUPPORT_TYPES = [
  { type: 'NEUROLOGIA', label: 'Neurologia', emoji: '🧠' },
  { type: 'CARDIOLOGIA', label: 'Cardiologia', emoji: '❤️' },
  { type: 'CRONICOS', label: 'Crônicos', emoji: '🏥' },
  { type: 'TORACICA', label: 'Torácica', emoji: '🫁' },
  { type: 'ONCOLOGIA', label: 'Oncologia', emoji: '🎗️' },
  { type: 'NEFROLOGIA', label: 'Nefrologia', emoji: '💧' },
  { type: 'OUTROS', label: 'Outros', emoji: '📋' },
] as const;

const STATUS_CONFIG = {
  aguardando: { 
    label: 'Aguardando', 
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    icon: Clock
  },
  confirmado: { 
    label: 'Confirmado', 
    className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    icon: Check
  },
  negado: { 
    label: 'Negado', 
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    icon: XCircle
  },
} as const;

type RegulationStatus = keyof typeof STATUS_CONFIG;

interface RegulationEdit {
  status: RegulationStatus;
  denial_reason: string;
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
  const [editingStates, setEditingStates] = useState<Record<string, RegulationEdit>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const getSupportLabel = (type: string) => {
    const found = SUPPORT_TYPES.find(s => s.type === type);
    return found ? `${found.emoji} ${found.label}` : type;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEditState = (reg: PatientRegulation): RegulationEdit => {
    if (editingStates[reg.id]) {
      return editingStates[reg.id];
    }
    return {
      status: reg.status as RegulationStatus,
      denial_reason: reg.denial_reason || ''
    };
  };

  const updateEditState = (regId: string, updates: Partial<RegulationEdit>) => {
    setEditingStates(prev => ({
      ...prev,
      [regId]: {
        ...getEditState(regulations.find(r => r.id === regId)!),
        ...prev[regId],
        ...updates
      }
    }));
  };

  const hasChanges = (reg: PatientRegulation): boolean => {
    const current = getEditState(reg);
    return (
      current.status !== reg.status ||
      current.denial_reason !== (reg.denial_reason || '')
    );
  };

  const handleSave = async (reg: PatientRegulation) => {
    const editState = getEditState(reg);
    
    // Validate denial reason if status is "negado"
    if (editState.status === 'negado' && !editState.denial_reason.trim()) {
      toast.error('Justificativa obrigatória para regulação negada');
      return;
    }

    setSavingId(reg.id);
    
    const { error } = await supabase
      .from('patient_regulation')
      .update({
        status: editState.status,
        denial_reason: editState.status === 'negado' ? editState.denial_reason : null,
        updated_by: user?.id
      })
      .eq('id', reg.id);

    if (error) {
      toast.error('Erro ao atualizar regulação');
      console.error(error);
    } else {
      toast.success(`Regulação atualizada para ${STATUS_CONFIG[editState.status].label}`);
      // Clear edit state
      setEditingStates(prev => {
        const { [reg.id]: _, ...rest } = prev;
        return rest;
      });
      onUpdate();
    }
    
    setSavingId(null);
  };

  const activeRegulations = regulations.filter(r => r.is_active);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
              const editState = getEditState(reg);
              const statusConfig = STATUS_CONFIG[editState.status];
              const StatusIcon = statusConfig.icon;
              const isEdited = hasChanges(reg);
              const isSaving = savingId === reg.id;

              return (
                <div 
                  key={reg.id} 
                  className={`border rounded-lg p-4 space-y-3 ${isEdited ? 'border-primary bg-primary/5' : ''}`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">{getSupportLabel(reg.support_type)}</span>
                    </div>
                    <Badge variant="outline" className={statusConfig.className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>

                  {/* Request date */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    Solicitado em: {formatDateTime(reg.requested_at)}
                  </div>

                  {/* Status selector */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select 
                      value={editState.status} 
                      onValueChange={(value) => updateEditState(reg.id, { status: value as RegulationStatus })}
                      disabled={isSaving}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_CONFIG) as RegulationStatus[]).map((status) => {
                          const config = STATUS_CONFIG[status];
                          const Icon = config.icon;
                          return (
                            <SelectItem key={status} value={status}>
                              <span className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Denial reason (only shown if status is "negado") */}
                  {editState.status === 'negado' && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Justificativa <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        placeholder="Informe o motivo da recusa (obrigatório)"
                        value={editState.denial_reason}
                        onChange={(e) => updateEditState(reg.id, { denial_reason: e.target.value })}
                        disabled={isSaving}
                        className="min-h-[80px]"
                      />
                    </div>
                  )}

                  {/* Existing denial reason display (if already denied and not editing) */}
                  {reg.status === 'negado' && reg.denial_reason && editState.status !== 'negado' && (
                    <div className="p-2 bg-destructive/10 rounded text-sm">
                      <span className="font-medium text-destructive">Motivo anterior:</span>{' '}
                      <span className="text-muted-foreground">{reg.denial_reason}</span>
                    </div>
                  )}

                  {/* Save button */}
                  {isEdited && (
                    <Button 
                      onClick={() => handleSave(reg)} 
                      disabled={isSaving}
                      className="w-full"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar Alterações
                    </Button>
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
