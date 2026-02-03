import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowRight, Loader2 } from 'lucide-react';

interface TransferBedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  patient: { id: string; initials: string; age: number } | null;
  fromBed: { number: number } | null;
  toBed: { id: string; number: number } | null;
  isLoading: boolean;
}

export function TransferBedDialog({
  isOpen,
  onClose,
  onConfirm,
  patient,
  fromBed,
  toBed,
  isLoading
}: TransferBedDialogProps) {
  if (!patient || !fromBed || !toBed) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Transferência de Leito?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-center gap-4 py-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{patient.initials}</div>
                  <div className="text-sm text-muted-foreground">{patient.age} anos</div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <div className="text-center px-4 py-2 bg-muted rounded-lg">
                  <div className="text-xs text-muted-foreground">De</div>
                  <div className="text-lg font-semibold">Leito {fromBed.number}</div>
                </div>
                
                <ArrowRight className="h-6 w-6 text-primary" />
                
                <div className="text-center px-4 py-2 bg-primary/10 rounded-lg border border-primary/30">
                  <div className="text-xs text-primary">Para</div>
                  <div className="text-lg font-semibold text-primary">Leito {toBed.number}</div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Transferindo...
              </>
            ) : (
              'Confirmar Transferência'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
