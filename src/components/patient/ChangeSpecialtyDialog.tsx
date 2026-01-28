import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PatientRegulation } from '@/types/database';

interface ChangeSpecialtyDialogProps {
  regulation: PatientRegulation;
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

export function ChangeSpecialtyDialog({ regulation, isOpen, onClose, onUpdate }: ChangeSpecialtyDialogProps) {
  const { user } = useAuth();
  const [newSpecialty, setNewSpecialty] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getSupportLabel = (type: string) => {
    const found = SUPPORT_TYPES.find(s => s.type === type);
    return found ? `${found.emoji} ${found.label}` : type;
  };

  const handleSubmit = async () => {
    if (!newSpecialty || !changeReason.trim() || !user) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (newSpecialty === regulation.support_type) {
      toast.error('Selecione uma especialidade diferente da atual');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('patient_regulation')
      .update({
        previous_support_type: regulation.support_type,
        support_type: newSpecialty,
        change_reason: changeReason,
        changed_at: new Date().toISOString(),
        changed_by: user.id,
        // Reset to initial status
        status: 'aguardando_regulacao',
        regulated_at: null,
        confirmed_at: null,
        transferred_at: null,
        denied_at: null,
        denial_reason: null,
        updated_by: user.id
      })
      .eq('id', regulation.id);

    if (error) {
      toast.error('Erro ao alterar especialidade');
      console.error(error);
    } else {
      toast.success('Especialidade alterada. Processo reiniciado.');
      handleClose();
      onUpdate();
    }

    setIsSubmitting(false);
  };

  const handleClose = () => {
    setNewSpecialty('');
    setChangeReason('');
    onClose();
  };

  const availableTypes = SUPPORT_TYPES.filter(t => t.type !== regulation.support_type);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Especialidade</DialogTitle>
          <DialogDescription>
            Alterar a especialidade reiniciará o processo de regulação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current specialty */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Especialidade atual</p>
            <p className="font-medium">{getSupportLabel(regulation.support_type)}</p>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* New specialty */}
          <div className="space-y-2">
            <Label>Nova Especialidade <span className="text-destructive">*</span></Label>
            <Select value={newSpecialty} onValueChange={setNewSpecialty}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a nova especialidade" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type.type} value={type.type}>
                    {type.emoji} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label>
              Justificativa da Mudança <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Descreva o motivo da mudança de especialidade..."
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Atenção</p>
              <p className="text-xs mt-1">
                Esta ação reiniciará o processo de regulação. O status voltará para "Aguardando Regulação".
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !newSpecialty || !changeReason.trim()}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Mudança
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
