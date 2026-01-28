import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, X, Calendar, Info, Pencil, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { ChangeSpecialtyDialog } from './ChangeSpecialtyDialog';
import { STATUS_CONFIG, SUPPORT_TYPES, getSupportLabel, formatDate, FINAL_STATUSES } from '@/lib/regulation-config';
import type { PatientRegulation as PatientRegulationType, RegulationStatus } from '@/types/database';

interface PatientRegulationProps {
  patientId: string;
  regulations: PatientRegulationType[];
  onUpdate: () => void;
}

export function PatientRegulation({ patientId, regulations, onUpdate }: PatientRegulationProps) {
  const { user } = useAuth();
  const { canEdit, isNIR } = useUnit();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changeSpecialtyReg, setChangeSpecialtyReg] = useState<PatientRegulationType | null>(null);

  // Care team (non-NIR) can add/remove requests and change specialty
  const canManageRequests = canEdit && !isNIR;

  const handleAddRegulation = async () => {
    if (!selectedType || !user) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('patient_regulation')
      .insert({
        patient_id: patientId,
        support_type: selectedType,
        status: 'aguardando_regulacao',
        created_by: user.id
      });

    if (error) {
      toast.error('Erro ao adicionar regulação');
      console.error(error);
    } else {
      toast.success('Regulação solicitada');
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

  const canChangeSpecialty = (reg: PatientRegulationType): boolean => {
    // Can change specialty unless it's in a final state
    return canManageRequests && !FINAL_STATUSES.includes(reg.status);
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

      <div className="flex flex-col gap-2">
        {regulations.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nenhuma regulação ativa</span>
        ) : (
          regulations.map((reg) => {
            const statusConfig = STATUS_CONFIG[reg.status] || STATUS_CONFIG.aguardando_regulacao;
            const StatusIcon = statusConfig.icon;

            return (
              <Popover key={reg.id}>
                <PopoverTrigger asChild>
                  <div className={`p-2 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${statusConfig.className}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusIcon className="h-4 w-4 shrink-0" />
                        <span className="font-medium truncate">{getSupportLabel(reg.support_type)}</span>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {statusConfig.shortLabel}
                      </Badge>
                    </div>
                    
                    {/* Timeline info */}
                    <div className="flex items-center gap-2 mt-1 text-xs opacity-80">
                      <Calendar className="h-3 w-3" />
                      <span>Solicitado: {formatDate(reg.requested_at)}</span>
                      {reg.regulated_at && <span>| Regulado: {formatDate(reg.regulated_at)}</span>}
                      {reg.confirmed_at && <span>| Vaga: {formatDate(reg.confirmed_at)}</span>}
                    </div>

                    {/* Change indicator */}
                    {reg.previous_support_type && (
                      <div className="flex items-start gap-1.5 mt-2 p-1.5 bg-amber-50 dark:bg-amber-950/30 rounded text-xs">
                        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-amber-800 dark:text-amber-200">
                            Mudado de {getSupportLabel(reg.previous_support_type)}
                          </span>
                          {reg.change_reason && (
                            <p className="text-amber-700 dark:text-amber-300 mt-0.5 italic">
                              "{reg.change_reason}"
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Denial reason */}
                    {reg.denial_reason && (reg.status === 'negado_nir' || reg.status === 'negado_hospital') && (
                      <div className="flex items-start gap-1.5 mt-2 p-1.5 bg-red-50 dark:bg-red-950/30 rounded text-xs">
                        <Info className="h-3 w-3 text-red-600 shrink-0 mt-0.5" />
                        <span className="text-red-800 dark:text-red-200">
                          {reg.status === 'negado_nir' ? 'Motivo NIR: ' : 'Motivo Hospital: '}
                          {reg.denial_reason}
                        </span>
                      </div>
                    )}
                  </div>
                </PopoverTrigger>
                
                <PopoverContent className="w-72" align="start">
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">{getSupportLabel(reg.support_type)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {statusConfig.description}
                      </p>
                    </div>
                    
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>Solicitado: {new Date(reg.requested_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      {reg.regulated_at && <p>Regulado: {new Date(reg.regulated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                      {reg.confirmed_at && <p>Vaga confirmada: {new Date(reg.confirmed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                      {reg.transferred_at && <p>Transferido: {new Date(reg.transferred_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                    </div>

                    {/* Actions for care team */}
                    {canManageRequests && (
                      <div className="flex gap-2 pt-2 border-t">
                        {canChangeSpecialty(reg) && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 gap-1"
                            onClick={() => setChangeSpecialtyReg(reg)}
                          >
                            <Pencil className="h-3 w-3" />
                            Alterar
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemove(reg.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Info for NIR */}
                    {isNIR && (
                      <p className="text-xs text-muted-foreground italic border-t pt-2">
                        Use o painel NIR para alterar o status desta regulação.
                      </p>
                    )}
                  </div>
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
              Solicitar Regulação
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
                Solicitar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para alterar especialidade */}
      {changeSpecialtyReg && (
        <ChangeSpecialtyDialog
          regulation={changeSpecialtyReg}
          isOpen={!!changeSpecialtyReg}
          onClose={() => setChangeSpecialtyReg(null)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
