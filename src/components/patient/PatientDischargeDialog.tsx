import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Home, Cross, ArrowRightLeft, Building2, HeartPulse, AlertTriangle } from 'lucide-react';
import type { PatientOutcome } from '@/types/database';

interface PatientDischargeDialogProps {
  patientId: string;
  patientInitials: string;
  bedId: string | null;
  hasActiveExternalTransfer?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type DischargeOutcome = 'alta' | 'alta_enfermaria' | 'transferencia_interna' | 'transferencia_externa' | 'obito';

const outcomeOptions: { value: DischargeOutcome; label: string; icon: React.ReactNode; iconColor: string }[] = [
  { value: 'alta', label: 'Alta', icon: <HeartPulse className="h-4 w-4" />, iconColor: 'text-green-500' },
  { value: 'alta_enfermaria', label: 'Alta para Enfermaria', icon: <Home className="h-4 w-4" />, iconColor: 'text-emerald-600' },
  { value: 'transferencia_interna', label: 'Transferência Interna', icon: <ArrowRightLeft className="h-4 w-4" />, iconColor: 'text-blue-600' },
  { value: 'transferencia_externa', label: 'Transferência Externa', icon: <Building2 className="h-4 w-4" />, iconColor: 'text-amber-600' },
  { value: 'obito', label: 'Óbito', icon: <Cross className="h-4 w-4" />, iconColor: 'text-red-600' },
];

export function PatientDischargeDialog({
  patientId,
  patientInitials,
  bedId,
  hasActiveExternalTransfer,
  isOpen,
  onClose,
  onSuccess,
}: PatientDischargeDialogProps) {
  const { toast } = useToast();
  const [outcome, setOutcome] = useState<DischargeOutcome | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [justification, setJustification] = useState('');

  const selectedOption = outcomeOptions.find(o => o.value === outcome);
  
  // Verifica se selecionou desfecho diferente de transferência externa quando há regulação ativa
  const needsJustification = 
    hasActiveExternalTransfer && 
    outcome && 
    outcome !== 'transferencia_externa';

  const handleDischarge = async () => {
    if (!outcome) return;

    setIsLoading(true);

    try {
      const { error: patientError } = await supabase
        .from('patients')
        .update({
          outcome: outcome as PatientOutcome,
          outcome_date: new Date().toISOString(),
          is_active: false,
          bed_id: null,
        })
        .eq('id', patientId);

      if (patientError) throw patientError;

      if (bedId) {
        const { error: bedError } = await supabase
          .from('beds')
          .update({ is_occupied: false })
          .eq('id', bedId);

        if (bedError) throw bedError;
      }

      const label = outcomeOptions.find(o => o.value === outcome)?.label || outcome;
      toast({
        title: 'Desfecho registrado',
        description: `${label} registrado para ${patientInitials}`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao registrar desfecho:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar o desfecho. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOutcome('');
      setJustification('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Desfecho</DialogTitle>
          <DialogDescription>
            Registrar desfecho para o paciente <strong>{patientInitials}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Select value={outcome} onValueChange={(v) => setOutcome(v as DischargeOutcome)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o desfecho" />
            </SelectTrigger>
            <SelectContent>
              {outcomeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span className={option.iconColor}>{option.icon}</span>
                    <span>{option.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {needsJustification && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md space-y-3">
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong>Atenção:</strong> Este paciente possui uma vaga de transferência externa confirmada. 
                  Você está selecionando um desfecho diferente.
                </div>
              </div>
              <Textarea
                placeholder="Justifique o motivo do desfecho diferente da transferência..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full" 
                disabled={!outcome || isLoading || (needsJustification && !justification.trim())}
                variant={outcome === 'obito' ? 'destructive' : 'default'}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  'Confirmar Desfecho'
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar desfecho?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    {outcome === 'obito' ? (
                      <span className="text-destructive font-medium">
                        Você está registrando <strong>ÓBITO</strong> para {patientInitials}. 
                        Esta ação não pode ser desfeita.
                      </span>
                    ) : (
                      <>
                        Confirmar <strong>{selectedOption?.label}</strong> para {patientInitials}?
                        O leito será liberado automaticamente.
                      </>
                    )}
                    {needsJustification && (
                      <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-sm text-amber-800 dark:text-amber-200">
                        <strong>Justificativa:</strong> {justification}
                      </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDischarge}
                  className={outcome === 'obito' ? 'bg-destructive hover:bg-destructive/90' : ''}
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
