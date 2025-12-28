import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface EditableDayBadgeProps {
  days: number;
  startDate: Date;
  onDateChange: (newDate: Date) => Promise<void>;
  className?: string;
}

export function EditableDayBadge({ 
  days, 
  startDate, 
  onDateChange, 
  className 
}: EditableDayBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(startDate);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onDateChange(selectedDate);
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setSelectedDate(startDate);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "cursor-pointer hover:ring-2 ring-primary/50 rounded px-1 transition-all",
            className
          )}
          title="Clique para alterar a data de início"
        >
          D{days}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarIcon className="h-4 w-4" />
            Alterar data de início
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            disabled={(date) => date > new Date()}
            locale={ptBR}
            className="pointer-events-auto"
          />
          <div className="text-xs text-muted-foreground">
            Selecionado: {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
