import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, Loader2 } from 'lucide-react';

interface BlockBedDialogProps {
  bedId: string;
  bedNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BlockBedDialog({ bedId, bedNumber, isOpen, onClose, onSuccess }: BlockBedDialogProps) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleBlock = async () => {
    setIsLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('beds')
      .update({
        is_blocked: true,
        blocked_at: new Date().toISOString(),
        blocked_by: user?.id,
        blocked_reason: reason.trim() || null
      })
      .eq('id', bedId);

    if (error) {
      toast.error('Erro ao bloquear leito');
      console.error(error);
    } else {
      toast.success(`Leito ${bedNumber} bloqueado`);
      setReason('');
      onSuccess();
      onClose();
    }
    
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-destructive" />
            Bloquear Leito {bedNumber}
          </DialogTitle>
          <DialogDescription>
            O leito ficará indisponível para novas admissões até ser desbloqueado.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Manutenção, limpeza terminal, aguardando reparo..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleBlock} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Bloqueando...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Bloquear Leito
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
