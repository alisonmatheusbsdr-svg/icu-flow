import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PatientWithDetails } from '@/types/database';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface PatientPrecautionsProps {
  patient: PatientWithDetails;
  onUpdate: () => void;
}

interface PendingPrecaution {
  type: string;
  level?: string;
  notes?: string;
}

// Precaution types with levels
const LEVELED_PRECAUTIONS = [
  { type: 'LESAO_PRESSAO', label: 'Lesão por Pressão', shortLabel: 'LPP', icon: '🛏️' },
  { type: 'BRONCOASPIRACAO', label: 'Broncoaspiração', shortLabel: 'Bronco', icon: '🫁' },
  { type: 'QUEDA', label: 'Queda', shortLabel: 'Queda', icon: '🚶' },
] as const;

const RISK_LEVELS = [
  { value: 'baixo', label: 'Baixo', shortLabel: 'B' },
  { value: 'medio', label: 'Médio', shortLabel: 'M' },
  { value: 'alto', label: 'Alto', shortLabel: 'A' },
  { value: 'muito_alto', label: 'Muito Alto', shortLabel: 'MA' },
] as const;

// Binary risk precautions
const BINARY_RISKS = [
  { type: 'TEV', label: 'TEV' },
  { type: 'SEPSE', label: 'Sepse' },
  { type: 'CHOQUE', label: 'Choque' },
  { type: 'DELIRIUM', label: 'Delirium' },
  { type: 'RISCO_SOCIAL', label: 'Risco Social' },
] as const;

// Isolation precautions
const ISOLATION_PRECAUTIONS = [
  { type: 'PRECAUCAO_PADRAO', label: 'Padrão' },
  { type: 'PRECAUCAO_GOTICULAS', label: 'Gotículas' },
  { type: 'PRECAUCAO_AEROSSOIS', label: 'Aerossóis' },
  { type: 'ISOLAMENTO', label: 'Isolamento' },
] as const;

// Get badge colors based on type and level
const getBadgeStyle = (type: string, level?: string | null) => {
  // Leveled risks
  if (level) {
    switch (level) {
      case 'baixo':
        return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
      case 'medio':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200';
      case 'alto':
      case 'muito_alto':
        return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200';
    }
  }

  // Binary risks
  if (BINARY_RISKS.some(r => r.type === type)) {
    return 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200';
  }

  // Isolation precautions
  if (ISOLATION_PRECAUTIONS.some(i => i.type === type)) {
    return 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200';
  }

  // Others
  return 'bg-muted text-muted-foreground border-border hover:bg-muted/80';
};

const getLevelBadgeStyle = (level: string) => {
  switch (level) {
    case 'baixo':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'medio':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'alto':
    case 'muito_alto':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

// Get display label for a precaution
const getPrecautionLabel = (type: string, level?: string | null, notes?: string | null) => {
  const leveled = LEVELED_PRECAUTIONS.find(p => p.type === type);
  if (leveled) {
    const levelLabel = RISK_LEVELS.find(l => l.value === level)?.shortLabel || '';
    return `${leveled.icon} ${leveled.shortLabel} ${levelLabel}`;
  }

  const binary = BINARY_RISKS.find(p => p.type === type);
  if (binary) return binary.label;

  const isolation = ISOLATION_PRECAUTIONS.find(p => p.type === type);
  if (isolation) return isolation.label;

  if (type === 'OUTROS' && notes) return notes;

  return type;
};

export const PatientPrecautions = ({ patient, onUpdate }: PatientPrecautionsProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingSelections, setPendingSelections] = useState<PendingPrecaution[]>([]);
  const [otherText, setOtherText] = useState('');
  const [editingPrecautionId, setEditingPrecautionId] = useState<string | null>(null);

  const activePrecautions = patient.patient_precautions?.filter(p => p.is_active) || [];

  const getPrecautionByType = (type: string) => {
    return activePrecautions.find(p => p.precaution_type === type);
  };

  const togglePendingSelection = (type: string, level?: string) => {
    setPendingSelections(prev => {
      // For leveled precautions, remove any existing selection of same type
      const filtered = prev.filter(p => p.type !== type);
      
      // Check if this exact selection already exists
      const exists = prev.some(p => p.type === type && p.level === level);
      
      if (exists) {
        // Remove it
        return filtered;
      } else {
        // Add new selection
        return [...filtered, { type, level }];
      }
    });
  };

  const toggleBinaryPending = (type: string) => {
    setPendingSelections(prev => {
      const exists = prev.some(p => p.type === type);
      if (exists) {
        return prev.filter(p => p.type !== type);
      } else {
        return [...prev, { type }];
      }
    });
  };

  const addOtherToPending = () => {
    if (!otherText.trim()) return;
    setPendingSelections(prev => [...prev, { type: 'OUTROS', notes: otherText.trim() }]);
    setOtherText('');
  };

  const removeOtherFromPending = (notes: string) => {
    setPendingSelections(prev => 
      prev.filter(p => !(p.type === 'OUTROS' && p.notes === notes))
    );
  };

  const handleSaveBatch = async () => {
    if (!user || pendingSelections.length === 0) return;
    setIsLoading(true);

    try {
      const inserts = pendingSelections.map(p => ({
        patient_id: patient.id,
        precaution_type: p.type,
        risk_level: p.level || null,
        notes: p.notes || null,
        created_by: user.id,
      }));

      const { error } = await supabase.from('patient_precautions').insert(inserts);

      if (error) throw error;

      setPendingSelections([]);
      setDialogOpen(false);
      onUpdate();
      toast.success(`${inserts.length} ${inserts.length === 1 ? 'precaução adicionada' : 'precauções adicionadas'}`);
    } catch (error) {
      toast.error('Erro ao salvar precauções');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePrecaution = async (id: string) => {
    setIsLoading(true);
    try {
      await supabase
        .from('patient_precautions')
        .update({ is_active: false })
        .eq('id', id);
      onUpdate();
    } catch (error) {
      toast.error('Erro ao remover precaução');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRiskLevel = async (id: string, newLevel: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('patient_precautions')
        .update({ risk_level: newLevel })
        .eq('id', id);

      if (error) throw error;

      setEditingPrecautionId(null);
      onUpdate();
      toast.success('Nível de risco atualizado');
    } catch (error) {
      toast.error('Erro ao atualizar nível de risco');
    } finally {
      setIsLoading(false);
    }
  };

  const isLeveledPrecaution = (type: string) => {
    return LEVELED_PRECAUTIONS.some(p => p.type === type);
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setPendingSelections([]);
      setOtherText('');
    }
  };

  return (
    <div className={cn("space-y-3", isLoading && "opacity-50 pointer-events-none")}>
      {/* Header with dialog trigger */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Precauções
          </h3>
        </div>

        <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Precauções</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Leveled Risks */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Riscos com Níveis
                </Label>
                <div className="space-y-3">
                  {LEVELED_PRECAUTIONS.map(({ type, label, icon }) => {
                    const isActive = !!getPrecautionByType(type);
                    const selectedLevel = pendingSelections.find(p => p.type === type)?.level || '';
                    
                    return (
                      <div 
                        key={type} 
                        className={cn(
                          "p-3 border rounded-lg space-y-2",
                          isActive && "opacity-50 bg-muted"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2 font-medium">
                            <span>{icon}</span> {label}
                          </Label>
                          {isActive && (
                            <span className="text-xs text-muted-foreground">(já ativo)</span>
                          )}
                        </div>
                        {!isActive && (
                          <RadioGroup 
                            value={selectedLevel}
                            onValueChange={(value) => togglePendingSelection(type, value)}
                            className="flex flex-wrap gap-2"
                          >
                            {RISK_LEVELS.map(({ value, label: levelLabel }) => (
                              <div key={value} className="flex items-center gap-1.5">
                                <RadioGroupItem value={value} id={`${type}-${value}`} />
                                <Label 
                                  htmlFor={`${type}-${value}`} 
                                  className={cn(
                                    "cursor-pointer px-2 py-0.5 rounded text-xs border transition-colors",
                                    selectedLevel === value 
                                      ? getLevelBadgeStyle(value)
                                      : "bg-background hover:bg-muted"
                                  )}
                                >
                                  {levelLabel}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Binary Risks */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Riscos
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {BINARY_RISKS.map(({ type, label }) => {
                    const isActive = !!getPrecautionByType(type);
                    const isPending = pendingSelections.some(p => p.type === type);
                    
                    return (
                      <div 
                        key={type} 
                        className={cn(
                          "flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors",
                          isActive && "opacity-50 cursor-not-allowed bg-muted",
                          isPending && !isActive && "border-amber-300 bg-amber-50"
                        )}
                        onClick={() => !isActive && toggleBinaryPending(type)}
                      >
                        <Checkbox 
                          checked={isPending} 
                          disabled={isActive}
                          className="pointer-events-none"
                        />
                        <Label className={cn("cursor-pointer text-sm", isActive && "cursor-not-allowed")}>
                          {label}
                        </Label>
                        {isActive && (
                          <span className="text-xs text-muted-foreground ml-auto">(ativo)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Isolation Precautions */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Isolamento / Contato
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {ISOLATION_PRECAUTIONS.map(({ type, label }) => {
                    const isActive = !!getPrecautionByType(type);
                    const isPending = pendingSelections.some(p => p.type === type);
                    
                    return (
                      <div 
                        key={type} 
                        className={cn(
                          "flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-colors",
                          isActive && "opacity-50 cursor-not-allowed bg-muted",
                          isPending && !isActive && "border-purple-300 bg-purple-50"
                        )}
                        onClick={() => !isActive && toggleBinaryPending(type)}
                      >
                        <Checkbox 
                          checked={isPending} 
                          disabled={isActive}
                          className="pointer-events-none"
                        />
                        <Label className={cn("cursor-pointer text-sm", isActive && "cursor-not-allowed")}>
                          {label}
                        </Label>
                        {isActive && (
                          <span className="text-xs text-muted-foreground ml-auto">(ativo)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Other input */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Outros
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar outra precaução..."
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addOtherToPending();
                      }
                    }}
                  />
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={addOtherToPending}
                    disabled={!otherText.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {/* Show pending "outros" */}
                {pendingSelections.filter(p => p.type === 'OUTROS').length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingSelections
                      .filter(p => p.type === 'OUTROS')
                      .map((p, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-md text-sm"
                        >
                          {p.notes}
                          <button
                            onClick={() => removeOtherFromPending(p.notes!)}
                            className="hover:text-destructive transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveBatch}
                disabled={pendingSelections.length === 0 || isLoading}
              >
                Salvar ({pendingSelections.length} {pendingSelections.length === 1 ? 'item' : 'itens'})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active precautions as badges */}
      {activePrecautions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activePrecautions.map((precaution) => {
            const canEditLevel = isLeveledPrecaution(precaution.precaution_type);
            
            return (
              <div
                key={precaution.id}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm font-medium transition-colors",
                  getBadgeStyle(precaution.precaution_type, precaution.risk_level)
                )}
              >
                {canEditLevel ? (
                  <Popover 
                    open={editingPrecautionId === precaution.id} 
                    onOpenChange={(open) => setEditingPrecautionId(open ? precaution.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button className="hover:underline cursor-pointer">
                        {getPrecautionLabel(precaution.precaution_type, precaution.risk_level, precaution.notes)}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Alterar nível de risco
                        </Label>
                        <RadioGroup 
                          value={precaution.risk_level || ''}
                          onValueChange={(value) => handleUpdateRiskLevel(precaution.id, value)}
                          className="flex flex-wrap gap-2"
                        >
                          {RISK_LEVELS.map(({ value, label }) => (
                            <div key={value} className="flex items-center gap-1.5">
                              <RadioGroupItem value={value} id={`edit-${precaution.id}-${value}`} />
                              <Label 
                                htmlFor={`edit-${precaution.id}-${value}`} 
                                className={cn(
                                  "cursor-pointer px-2 py-0.5 rounded text-xs border transition-colors",
                                  precaution.risk_level === value 
                                    ? getLevelBadgeStyle(value)
                                    : "bg-background hover:bg-muted"
                                )}
                              >
                                {label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span>{getPrecautionLabel(precaution.precaution_type, precaution.risk_level, precaution.notes)}</span>
                )}
                <button
                  onClick={() => handleRemovePrecaution(precaution.id)}
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Nenhuma precaução registrada</p>
      )}
    </div>
  );
};
