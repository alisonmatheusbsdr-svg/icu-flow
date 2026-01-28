import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clock, XCircle, Loader2, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getSupportLabel, formatDate } from '@/lib/regulation-config';
import type { PatientRegulation } from '@/types/database';

type ActionType = 'relisting' | 'cancel' | null;

interface DeadlineExpiredDialogProps {
  regulation: PatientRegulation;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function DeadlineExpiredDialog({ regulation, isOpen, onClose, onUpdate }: DeadlineExpiredDialogProps) {
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
        // Clear clinical hold
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

  const renderActionContent = () => {
    switch (selectedAction) {
      case 'relisting':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <RefreshCw className="h-5 w-5" />
              <span className="font-medium">Solicitar Nova Listagem</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Uma nova senha será solicitada ao NIR para re-listar o paciente na central de regulação.
            </p>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Justificativa <span className="text-destructive">*</span>
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

      case 'cancel':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Cancelar Regulação</span>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-sm text-destructive">
                ⚠️ Esta ação irá cancelar definitivamente a solicitação de transferência.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Motivo do Cancelamento <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Ex: Paciente apresentou piora clínica incompatível com transferência..."
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

      default:
        return (
          <div className="space-y-4">
            {/* Warning banner */}
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Prazo Vencido em {formatDate(regulation.clinical_hold_deadline!)}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    A vaga pode ter expirado. É necessário tomar uma ação.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Escolha uma das opções abaixo:
            </p>

            {/* Option: Confirm Transfer */}
            <button
              onClick={handleConfirmTransfer}
              disabled={isSaving}
              className="w-full p-4 text-left rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 hover:border-green-400 dark:hover:border-green-600 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Paciente Melhorou</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Confirmar transferência agora</p>
                </div>
              </div>
            </button>

            {/* Option: Relisting */}
            <button
              onClick={() => setSelectedAction('relisting')}
              className="w-full p-4 text-left rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                  <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">Solicitar Nova Listagem</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Solicitar nova senha ao NIR</p>
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
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Clock className="h-5 w-5" />
            Prazo de Melhora Clínica Vencido
          </DialogTitle>
          <DialogDescription>
            {getSupportLabel(regulation.support_type)}
          </DialogDescription>
        </DialogHeader>

        {renderActionContent()}
      </DialogContent>
    </Dialog>
  );
}
