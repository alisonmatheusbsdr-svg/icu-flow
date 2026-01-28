import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, XCircle, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupportLabel, formatDate } from '@/lib/regulation-config';
import type { PatientRegulation } from '@/types/database';

type ActionType = 'clinical_hold' | 'cancel' | 'confirm_transfer' | 'relisting' | null;

interface RegulationTeamActionsProps {
  regulation: PatientRegulation;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function RegulationTeamActions({ regulation, isOpen, onClose, onUpdate }: RegulationTeamActionsProps) {
  const { user } = useAuth();
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [justification, setJustification] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    setSelectedAction(null);
    setJustification('');
    onClose();
  };

  const handleConfirmTransfer = async () => {
    setIsSaving(true);
    
    const { error } = await supabase
      .from('patient_regulation')
      .update({
        team_confirmed_at: new Date().toISOString(),
        team_confirmed_by: user?.id,
        // Clear clinical hold if was set
        clinical_hold_at: null,
        clinical_hold_by: null,
        clinical_hold_reason: null,
        clinical_hold_deadline: null,
        clinical_hold_deadline_set_by: null
      })
      .eq('id', regulation.id);

    if (error) {
      toast.error('Erro ao confirmar transferência');
      console.error(error);
    } else {
      toast.success('Saída confirmada. NIR será notificado.');
      onUpdate();
    }
    
    setIsSaving(false);
  };

  const handleClinicalHold = async () => {
    if (!justification.trim()) {
      toast.error('Justificativa obrigatória');
      return;
    }

    setIsSaving(true);
    
    const { error } = await supabase
      .from('patient_regulation')
      .update({
        clinical_hold_at: new Date().toISOString(),
        clinical_hold_by: user?.id,
        clinical_hold_reason: justification,
        // Clear team confirmation if was set
        team_confirmed_at: null,
        team_confirmed_by: null
      })
      .eq('id', regulation.id);

    if (error) {
      toast.error('Erro ao sinalizar impossibilidade');
      console.error(error);
    } else {
      toast.success('NIR notificado. Aguarde definição do prazo.');
      handleClose();
      onUpdate();
    }
    
    setIsSaving(false);
  };

  const handleCancelRequest = async () => {
    if (!justification.trim()) {
      toast.error('Justificativa obrigatória');
      return;
    }

    setIsSaving(true);
    
    const { error } = await supabase
      .from('patient_regulation')
      .update({
        team_cancel_requested_at: new Date().toISOString(),
        team_cancel_requested_by: user?.id,
        team_cancel_reason: justification
      })
      .eq('id', regulation.id);

    if (error) {
      toast.error('Erro ao solicitar cancelamento');
      console.error(error);
    } else {
      toast.success('Solicitação de cancelamento enviada ao NIR.');
      handleClose();
      onUpdate();
    }
    
    setIsSaving(false);
  };

  const handleRelisting = async () => {
    if (!justification.trim()) {
      toast.error('Justificativa obrigatória');
      return;
    }

    setIsSaving(true);
    
    const { error } = await supabase
      .from('patient_regulation')
      .update({
        relisting_requested_at: new Date().toISOString(),
        relisting_requested_by: user?.id,
        relisting_reason: justification
      })
      .eq('id', regulation.id);

    if (error) {
      toast.error('Erro ao solicitar nova listagem');
      console.error(error);
    } else {
      toast.success('Solicitação de nova listagem enviada ao NIR.');
      handleClose();
      onUpdate();
    }
    
    setIsSaving(false);
  };

  const renderActionContent = () => {
    switch (selectedAction) {
      case 'clinical_hold':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Aguardar Melhora Clínica</span>
            </div>
            <p className="text-sm text-muted-foreground">
              O paciente não pode ser transferido no momento. O NIR será notificado e definirá um prazo para reavaliação.
            </p>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Justificativa <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Ex: Paciente instável hemodinamicamente, necessita estabilização antes do transporte..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                disabled={isSaving}
                className="min-h-[80px]"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedAction(null)} disabled={isSaving}>
                Voltar
              </Button>
              <Button 
                onClick={handleClinicalHold} 
                disabled={isSaving || !justification.trim()}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sinalizar Impossibilidade
              </Button>
            </div>
          </div>
        );

      case 'cancel':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Cancelar Regulação</span>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-sm text-destructive">
                ⚠️ Esta ação irá cancelar a vaga no hospital destino. O NIR precisará confirmar o cancelamento.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Motivo do Cancelamento <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Ex: Família optou por não transferir o paciente..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                disabled={isSaving}
                className="min-h-[80px]"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedAction(null)} disabled={isSaving}>
                Voltar
              </Button>
              <Button 
                variant="destructive"
                onClick={handleCancelRequest} 
                disabled={isSaving || !justification.trim()}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        );

      case 'relisting':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Solicitar Nova Listagem</span>
            </div>
            <p className="text-sm text-muted-foreground">
              O prazo de melhora clínica venceu e a vaga pode ter expirado. Uma nova senha será solicitada ao NIR.
            </p>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Justificativa para Nova Listagem <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Ex: Paciente apresentou melhora parcial, porém ainda necessita de suporte especializado..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                disabled={isSaving}
                className="min-h-[80px]"
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedAction(null)} disabled={isSaving}>
                Voltar
              </Button>
              <Button 
                onClick={handleRelisting} 
                disabled={isSaving || !justification.trim()}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Solicitar Nova Listagem
              </Button>
            </div>
          </div>
        );

      default:
        // Main menu - show available actions
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                Vaga Disponível
              </Badge>
              <span className="text-sm font-medium">{getSupportLabel(regulation.support_type)}</span>
            </div>

            {/* Option: Confirm Transfer */}
            <button
              onClick={handleConfirmTransfer}
              disabled={isSaving}
              className="w-full p-4 text-left rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 hover:border-green-400 dark:hover:border-green-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Confirmar Transferência</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Paciente está pronto para o transporte</p>
                </div>
              </div>
            </button>

            {/* Option: Clinical Hold */}
            <button
              onClick={() => setSelectedAction('clinical_hold')}
              className="w-full p-4 text-left rounded-lg border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">Aguardar Melhora Clínica</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">Paciente não pode transferir agora</p>
                </div>
              </div>
            </button>

            {/* Option: Cancel */}
            <button
              onClick={() => setSelectedAction('cancel')}
              className="w-full p-4 text-left rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 hover:border-red-400 dark:hover:border-red-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Cancelar Regulação</p>
                  <p className="text-sm text-red-600 dark:text-red-400">Desistir da transferência</p>
                </div>
              </div>
            </button>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ação de Regulação</DialogTitle>
          <DialogDescription>
            {getSupportLabel(regulation.support_type)} - Vaga confirmada
            {regulation.confirmed_at && ` em ${formatDate(regulation.confirmed_at)}`}
          </DialogDescription>
        </DialogHeader>

        {renderActionContent()}
      </DialogContent>
    </Dialog>
  );
}
