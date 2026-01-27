import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Plus, X, Calendar, Clock, Check, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { PatientRegulation as PatientRegulationType } from '@/types/database';

interface PatientRegulationProps {
  patientId: string;
  regulations: PatientRegulationType[];
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

const STATUS_CONFIG = {
  aguardando: { 
    label: 'Aguardando', 
    className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
    icon: Clock
  },
  confirmado: { 
    label: 'Confirmado', 
    className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    icon: Check
  },
  negado: { 
    label: 'Negado', 
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    icon: XCircle
  },
} as const;

type RegulationStatus = keyof typeof STATUS_CONFIG;

export function PatientRegulation({ patientId, regulations, onUpdate }: PatientRegulationProps) {
  const { user } = useAuth();
  const { canEdit } = useUnit();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddRegulation = async () => {
    if (!selectedType || !user) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('patient_regulation')
      .insert({
        patient_id: patientId,
        support_type: selectedType,
        status: 'aguardando',
        created_by: user.id
      });

    if (error) {
      toast.error('Erro ao adicionar regulação');
      console.error(error);
    } else {
      toast.success('Regulação adicionada');
      setSelectedType('');
      setIsDialogOpen(false);
      onUpdate();
    }
    setIsSubmitting(false);
  };

  const handleUpdateStatus = async (regulationId: string, newStatus: RegulationStatus) => {
    const { error } = await supabase
      .from('patient_regulation')
      .update({ status: newStatus })
      .eq('id', regulationId);

    if (error) {
      toast.error('Erro ao atualizar status');
      console.error(error);
    } else {
      toast.success(`Status alterado para ${STATUS_CONFIG[newStatus].label}`);
      setEditingId(null);
      onUpdate();
    }
  };

  const handleRemove = async (regulationId: string) => {
    const { error } = await supabase
      .from('patient_regulation')
      .update({ is_active: false })
      .eq('id', regulationId);

    if (error) {
      toast.error('Erro ao remover regulação');
      console.error(error);
    } else {
      toast.success('Regulação removida');
      onUpdate();
    }
  };

  const getSupportLabel = (type: string) => {
    const found = SUPPORT_TYPES.find(s => s.type === type);
    return found ? `${found.emoji} ${found.label}` : type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Regulação
        </h4>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {regulations.length === 0 ? (
          <span className="text-xs text-muted-foreground">Nenhuma regulação ativa</span>
        ) : (
          regulations.map((reg) => {
            const statusConfig = STATUS_CONFIG[reg.status as RegulationStatus] || STATUS_CONFIG.aguardando;
            const StatusIcon = statusConfig.icon;

            return (
              <Popover key={reg.id} open={editingId === reg.id} onOpenChange={(open) => setEditingId(open ? reg.id : null)}>
                <PopoverTrigger asChild>
                  <Badge
                    variant="outline"
                    className={`cursor-pointer flex items-center gap-1.5 pr-1 ${statusConfig.className}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    <span>{getSupportLabel(reg.support_type)}</span>
                    <span className="text-xs opacity-70 flex items-center gap-0.5">
                      <Calendar className="h-3 w-3" />
                      {formatDate(reg.requested_at)}
                    </span>
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(reg.id);
                        }}
                        className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                </PopoverTrigger>
                {canEdit && (
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Alterar status:</p>
                      {(Object.keys(STATUS_CONFIG) as RegulationStatus[]).map((status) => {
                        const config = STATUS_CONFIG[status];
                        const Icon = config.icon;
                        return (
                          <button
                            key={status}
                            onClick={() => handleUpdateStatus(reg.id, status)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors ${
                              reg.status === status ? 'bg-muted font-medium' : ''
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })
        )}
      </div>

      {/* Dialog para adicionar nova regulação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Adicionar Regulação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Suporte</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de suporte" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_TYPES.map((type) => (
                    <SelectItem key={type.type} value={type.type}>
                      {type.emoji} {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddRegulation} 
                disabled={!selectedType || isSubmitting}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
