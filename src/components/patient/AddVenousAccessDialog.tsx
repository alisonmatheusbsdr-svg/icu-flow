import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ACCESS_TYPES, INSERTION_SITES, LUMEN_COUNTS } from './VenousAccessSection';

interface AddVenousAccessDialogProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddVenousAccessDialog({ 
  patientId, 
  isOpen, 
  onClose, 
  onSuccess 
}: AddVenousAccessDialogProps) {
  const [accessType, setAccessType] = useState<string>('');
  const [insertionSite, setInsertionSite] = useState<string>('');
  const [lumenCount, setLumenCount] = useState<string>('duplo');
  const [insertionDate, setInsertionDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAccessType('');
      setInsertionSite('');
      setLumenCount('duplo');
      setInsertionDate(new Date());
    }
  }, [isOpen]);

  // Auto-select duplo for hemodialysis
  useEffect(() => {
    if (accessType === 'hemodialise') {
      setLumenCount('duplo');
    }
  }, [accessType]);

  // Clear site when access type changes (sites are filtered)
  useEffect(() => {
    setInsertionSite('');
  }, [accessType]);

  // Get available sites for selected access type
  const getAvailableSites = () => {
    if (!accessType) return [];
    
    return Object.entries(INSERTION_SITES)
      .filter(([, config]) => config.accessTypes.includes(accessType))
      .map(([key, config]) => ({ key, label: config.label }));
  };

  const handleSubmit = async () => {
    if (!accessType || !insertionSite || !lumenCount) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.from('venous_access').insert({
      patient_id: patientId,
      access_type: accessType,
      insertion_site: insertionSite,
      lumen_count: lumenCount,
      insertion_date: insertionDate.toISOString().split('T')[0],
    });

    if (error) {
      toast.error('Erro ao adicionar acesso venoso');
      console.error(error);
    } else {
      toast.success('Acesso venoso adicionado');
      onSuccess();
    }
    setIsLoading(false);
  };

  const availableSites = getAvailableSites();
  const isHemodialysis = accessType === 'hemodialise';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Acesso Venoso</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Access Type */}
          <div className="space-y-2">
            <Label>Tipo de Acesso</Label>
            <Select value={accessType} onValueChange={setAccessType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de acesso" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACCESS_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Insertion Site */}
          <div className="space-y-2">
            <Label>Local de Inserção</Label>
            <Select 
              value={insertionSite} 
              onValueChange={setInsertionSite}
              disabled={!accessType}
            >
              <SelectTrigger>
                <SelectValue placeholder={accessType ? "Selecione o local" : "Selecione o tipo primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {availableSites.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accessType && availableSites.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum local disponível para este tipo
              </p>
            )}
          </div>

          {/* Lumen Count */}
          <div className="space-y-2">
            <Label>Número de Lúmens</Label>
            <RadioGroup 
              value={lumenCount} 
              onValueChange={setLumenCount}
              className="flex gap-4"
              disabled={isHemodialysis}
            >
              {Object.entries(LUMEN_COUNTS).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <RadioGroupItem value={key} id={key} />
                  <Label htmlFor={key} className="font-normal cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {isHemodialysis && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Cateter de hemodiálise sempre é duplo lúmen
              </p>
            )}
          </div>

          {/* Insertion Date */}
          <div className="space-y-2">
            <Label>Data de Inserção</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !insertionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {insertionDate ? format(insertionDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={insertionDate}
                  onSelect={(date) => date && setInsertionDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !accessType || !insertionSite}
          >
            {isLoading ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
