import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Building2, Plus, X, Calendar, Clock, Check, XCircle, Info, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PatientRegulation as PatientRegulationType } from '@/types/database';

interface PatientRegulationProps {
  patientId: string;
  regulations: PatientRegulationType[];
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

export function PatientRegulation({ patientId, regulations, onUpdate }: PatientRegulationProps) {
  const { user, hasRole } = useAuth();
  const { canEdit, isNIR } = useUnit();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // NIR-specific state
  const [nirEditStatus, setNirEditStatus] = useState<RegulationStatus | null>(null);
  const [nirDenialReason, setNirDenialReason] = useState('');
  const [isSavingNir, setIsSavingNir] = useState(false);

  // NIR and admins can update status/justification
  const canUpdateStatus = isNIR || hasRole('admin');
  // Care team (non-NIR) can add/remove requests
  const canManageRequests = canEdit && !isNIR;

  const handleAddRegulation = async () => {
    if (!selectedType || !user) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('patient_regulation')
      .insert({
        patient_id: patientId,
        support_type: selectedType,
        status: 'aguardando',
        created_by: user.id
      });

    if (error) {
      toast.error('Erro ao adicionar regulação');
      console.error(error);
    } else {
      toast.success('Regulação adicionada');
      setSelectedType('');
      setIsDialogOpen(false);
      onUpdate();
    }
    setIsSubmitting(false);
  };

  const handleRemove = async (regulationId: string) => {
    const { error } = await supabase
      .from('patient_regulation')
      .update({ is_active: false })
      .eq('id', regulationId);

    if (error) {
      toast.error('Erro ao remover regulação');
      console.error(error);
    } else {
      toast.success('Regulação removida');
      onUpdate();
    }
  };

  // NIR: Save status update
  const handleNirSave = async (regulationId: string) => {
    if (!nirEditStatus || !user) return;

    // Validate denial reason
    if (nirEditStatus === 'negado' && !nirDenialReason.trim()) {
      toast.error('Justificativa obrigatória para regulação negada');
      return;
    }

    setIsSavingNir(true);
    const { error } = await supabase
      .from('patient_regulation')
      .update({
        status: nirEditStatus,
        denial_reason: nirEditStatus === 'negado' ? nirDenialReason : null,
        updated_by: user.id
      })
      .eq('id', regulationId);

    if (error) {
      toast.error('Erro ao atualizar regulação');
      console.error(error);
    } else {
      toast.success(`Status alterado para ${STATUS_CONFIG[nirEditStatus].label}`);
      setEditingId(null);
      setNirEditStatus(null);
      setNirDenialReason('');
      onUpdate();
    }
    setIsSavingNir(false);
  };

  const openNirEdit = (reg: PatientRegulationType) => {
    setEditingId(reg.id);
    setNirEditStatus(reg.status as RegulationStatus);
    setNirDenialReason(reg.denial_reason || '');
  };

  const closeNirEdit = () => {
    setEditingId(null);
    setNirEditStatus(null);
    setNirDenialReason('');
  };

  const getSupportLabel = (type: string) => {
    const found = SUPPORT_TYPES.find(s => s.type === type);
    return found ? `${found.emoji} ${found.label}` : type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Regulação
        </h4>
        {canManageRequests && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {regulations.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nenhuma regulação ativa</span>
        ) : (
          regulations.map((reg) => {
            const statusConfig = STATUS_CONFIG[reg.status as RegulationStatus] || STATUS_CONFIG.aguardando;
            const StatusIcon = statusConfig.icon;
            const isEditing = editingId === reg.id;

            return (
              <Popover key={reg.id} open={isEditing} onOpenChange={(open) => {
                if (open && canUpdateStatus) {
                  openNirEdit(reg);
                } else {
                  closeNirEdit();
                }
              }}>
                <PopoverTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`cursor-pointer flex items-center gap-1.5 pr-1 ${statusConfig.className}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    <span>{getSupportLabel(reg.support_type)}</span>
                    <span className="text-xs opacity-70 flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" />
                      {formatDate(reg.requested_at)}
                    </span>
                    {/* Show denial indicator */}
                    {reg.status === 'negado' && reg.denial_reason && (
                      <Info className="h-3 w-3 ml-1" />
                    )}
                    {/* Only care team can remove */}
                    {canManageRequests && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(reg.id);
                        }}
                        className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                </PopoverTrigger>
                
                {/* Popover content - different for NIR vs care team */}
                <PopoverContent className="w-64 p-3" align="start">
                  {canUpdateStatus ? (
                    /* NIR/Admin: Can change status */
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">Alterar status (NIR):</p>
                      
                      <Select value={nirEditStatus || ''} onValueChange={(v) => setNirEditStatus(v as RegulationStatus)}>
                        <SelectTrigger className="w-full">
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

                      {nirEditStatus === 'negado' && (
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            Justificativa <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            placeholder="Motivo da recusa"
                            value={nirDenialReason}
                            onChange={(e) => setNirDenialReason(e.target.value)}
                            className="text-sm min-h-[60px]"
                          />
                        </div>
                      )}

                      {/* Show existing denial reason */}
                      {reg.denial_reason && nirEditStatus !== 'negado' && (
                        <div className="p-2 bg-destructive/10 rounded text-xs">
                          <span className="font-medium text-destructive">Motivo anterior:</span>{' '}
                          {reg.denial_reason}
                        </div>
                      )}

                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleNirSave(reg.id)}
                        disabled={isSavingNir || nirEditStatus === reg.status}
                      >
                        {isSavingNir ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  ) : (
                    /* Care team: View-only info */
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{getSupportLabel(reg.support_type)}</p>
                      <p className="text-xs text-muted-foreground">
                        Solicitado em {new Date(reg.requested_at).toLocaleDateString('pt-BR')}
                      </p>
                      <Badge variant="outline" className={statusConfig.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {reg.denial_reason && (
                        <div className="p-2 bg-destructive/10 rounded text-xs mt-2">
                          <span className="font-medium text-destructive">Motivo:</span>{' '}
                          {reg.denial_reason}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground italic mt-2">
                        Alterações de status são realizadas pelo NIR.
                      </p>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            );
          })
        )}
      </div>

      {/* Dialog para adicionar nova regulação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Adicionar Regulação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Suporte</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de suporte" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_TYPES.map((type) => (
                    <SelectItem key={type.type} value={type.type}>
                      {type.emoji} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddRegulation} 
                disabled={!selectedType || isSubmitting}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}