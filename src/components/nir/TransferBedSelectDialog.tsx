import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Bed } from '@/types/database';

interface TransferBedSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  patient: { id: string; initials: string; age: number };
  currentBedId: string;
  currentBedNumber: number;
  currentUnitId: string;
  onSuccess: () => void;
}

export function TransferBedSelectDialog({
  isOpen,
  onClose,
  patient,
  currentBedId,
  currentBedNumber,
  currentUnitId,
  onSuccess
}: TransferBedSelectDialogProps) {
  const [availableBeds, setAvailableBeds] = useState<Bed[]>([]);
  const [selectedBedId, setSelectedBedId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isOpen && currentUnitId) {
      fetchAvailableBeds();
    } else {
      setSelectedBedId('');
      setAvailableBeds([]);
    }
  }, [isOpen, currentUnitId]);

  const fetchAvailableBeds = async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from('beds')
      .select('*')
      .eq('unit_id', currentUnitId)
      .eq('is_occupied', false)
      .eq('is_blocked', false)
      .order('bed_number');

    if (error) {
      toast.error('Erro ao buscar leitos disponíveis');
      console.error(error);
    } else {
      setAvailableBeds(data || []);
    }
    setIsFetching(false);
  };

  const handleTransfer = async () => {
    if (!selectedBedId) return;

    setIsLoading(true);

    try {
      // 1. Atualizar bed_id do paciente
      const { error: patientError } = await supabase
        .from('patients')
        .update({ bed_id: selectedBedId })
        .eq('id', patient.id);

      if (patientError) throw patientError;

      // 2. Liberar leito antigo
      const { error: oldBedError } = await supabase
        .from('beds')
        .update({ is_occupied: false })
        .eq('id', currentBedId);

      if (oldBedError) throw oldBedError;

      // 3. Ocupar novo leito
      const { error: newBedError } = await supabase
        .from('beds')
        .update({ is_occupied: true })
        .eq('id', selectedBedId);

      if (newBedError) throw newBedError;

      const selectedBed = availableBeds.find(b => b.id === selectedBedId);
      toast.success(`Paciente transferido para Leito ${selectedBed?.bed_number}`);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro na transferência:', error);
      toast.error('Erro ao transferir paciente');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBed = availableBeds.find(b => b.id === selectedBedId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Leito</DialogTitle>
          <DialogDescription>
            Selecione o leito de destino para {patient.initials} ({patient.age}a)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Visualização da transferência */}
          <div className="flex items-center justify-center gap-4 py-4 bg-muted/50 rounded-lg">
            <div className="text-center px-4 py-2 bg-background rounded-lg border">
              <div className="text-xs text-muted-foreground">De</div>
              <div className="text-lg font-semibold">Leito {currentBedNumber}</div>
            </div>
            
            <ArrowRight className="h-6 w-6 text-primary" />
            
            <div className={`text-center px-4 py-2 rounded-lg border ${selectedBedId ? 'bg-primary/10 border-primary/30' : 'bg-muted border-dashed'}`}>
              <div className={`text-xs ${selectedBedId ? 'text-primary' : 'text-muted-foreground'}`}>Para</div>
              <div className={`text-lg font-semibold ${selectedBedId ? 'text-primary' : 'text-muted-foreground'}`}>
                {selectedBed ? `Leito ${selectedBed.bed_number}` : '?'}
              </div>
            </div>
          </div>

          {/* Lista de leitos disponíveis */}
          {isFetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableBeds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum leito vago disponível nesta unidade
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Leitos disponíveis</Label>
              <RadioGroup
                value={selectedBedId}
                onValueChange={setSelectedBedId}
                className="grid grid-cols-3 gap-2"
              >
                {availableBeds.map((bed) => (
                  <div key={bed.id}>
                    <RadioGroupItem
                      value={bed.id}
                      id={bed.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={bed.id}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 cursor-pointer transition-colors"
                    >
                      <span className="text-lg font-semibold">{bed.bed_number}</span>
                      <span className="text-xs text-muted-foreground">Vago</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={!selectedBedId || isLoading}
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
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
