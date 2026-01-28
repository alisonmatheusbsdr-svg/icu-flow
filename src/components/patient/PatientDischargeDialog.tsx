import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Home, Cross, ArrowRightLeft, Building2, HeartPulse, Truck } from 'lucide-react';
import { getSupportLabel } from '@/lib/regulation-config';
import type { PatientOutcome, PatientRegulation } from '@/types/database';

interface PatientDischargeDialogProps {
  patientId: string;
  patientInitials: string;
  bedId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  regulations?: PatientRegulation[];
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
  isOpen,
  onClose,
  onSuccess,
  regulations,
}: PatientDischargeDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [outcome, setOutcome] = useState<DischargeOutcome | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedOption = outcomeOptions.find(o => o.value === outcome);
  
  // Find regulation awaiting transfer
  const awaitingTransferReg = regulations?.find(
    r => r.is_active && r.status === 'aguardando_transferencia'
  );

  const handleDischarge = async (outcomeValue?: DischargeOutcome, regulationId?: string) => {
    const finalOutcome = outcomeValue || outcome;
    if (!finalOutcome) return;

    setIsLoading(true);

    try {
      // 1. If confirming transfer with regulation, update team_confirmed fields
      if (regulationId && finalOutcome === 'transferencia_externa') {
        const { error: regError } = await supabase
          .from('patient_regulation')
          .update({
            team_confirmed_at: new Date().toISOString(),
            team_confirmed_by: user?.id
          })
          .eq('id', regulationId);

        if (regError) throw regError;
      }

      // 2. Atualizar paciente
      const { error: patientError } = await supabase
        .from('patients')
        .update({
          outcome: finalOutcome as PatientOutcome,
          outcome_date: new Date().toISOString(),
          is_active: false,
          bed_id: null,
        })
        .eq('id', patientId);

      if (patientError) throw patientError;

      // 3. Liberar o leito (se existir)
      if (bedId) {
        const { error: bedError } = await supabase
          .from('beds')
          .update({ is_occupied: false })
          .eq('id', bedId);

        if (bedError) throw bedError;
      }

      const label = outcomeOptions.find(o => o.value === finalOutcome)?.label || finalOutcome;
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

  const handleQuickTransfer = () => {
    if (awaitingTransferReg) {
      handleDischarge('transferencia_externa', awaitingTransferReg.id);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOutcome('');
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
          {/* Quick transfer suggestion when there's an awaiting transfer regulation */}
          {awaitingTransferReg && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <Truck className="h-5 w-5" />
                <span className="font-medium">
                  Vaga disponível para {getSupportLabel(awaitingTransferReg.support_type)}
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mb-3">
                NIR confirmou vaga. Deseja registrar Transferência Externa?
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Truck className="h-4 w-4" />
                    )}
                    Confirmar Transferência Externa
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar transferência externa?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Confirmar <strong>Transferência Externa</strong> para {patientInitials} 
                      ({getSupportLabel(awaitingTransferReg.support_type)})?
                      O leito será liberado automaticamente e o NIR será notificado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleQuickTransfer}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {awaitingTransferReg && (
            <div className="text-center text-sm text-muted-foreground">
              — ou selecione outro desfecho —
            </div>
          )}

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

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full" 
                disabled={!outcome || isLoading}
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
                <AlertDialogDescription>
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
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleDischarge()}
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
