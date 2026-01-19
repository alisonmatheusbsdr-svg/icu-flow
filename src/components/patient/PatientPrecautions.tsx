import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PatientWithDetails } from '@/types/database';
import { AlertTriangle, Plus, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

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
      return 'bg-green-100 text-green-800';
    case 'medio':
      return 'bg-yellow-100 text-yellow-800';
    case 'alto':
    case 'muito_alto':
      return 'bg-red-100 text-red-800';
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingSelections, setPendingSelections] = useState<PendingPrecaution[]>([]);
  const [otherText, setOtherText] = useState('');

  const activePrecautions = patient.patient_precautions?.filter(p => p.is_active) || [];

  const getPrecautionByType = (type: string) => {
    return activePrecautions.find(p => p.precaution_type === type);
  };

  const isPendingSelected = (type: string, level?: string) => {
    return pendingSelections.some(p => p.type === type && (!level || p.level === level));
  };

  const isActiveOrPending = (type: string) => {
    return !!getPrecautionByType(type) || pendingSelections.some(p => p.type === type);
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
      setDropdownOpen(false);
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

  return (
    <div className={cn("space-y-3", isLoading && "opacity-50 pointer-events-none")}>
      {/* Header with dropdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Precauções
          </h3>
        </div>

        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72" align="end">
            {/* Leveled Risks */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Riscos com Níveis
            </DropdownMenuLabel>
            {LEVELED_PRECAUTIONS.map(({ type, label, icon }) => {
              const isActive = !!getPrecautionByType(type);
              const pendingLevel = pendingSelections.find(p => p.type === type)?.level;
              
              return (
                <DropdownMenuSub key={type}>
                  <DropdownMenuSubTrigger 
                    className={cn(
                      "gap-2",
                      isActive && "opacity-50"
                    )}
                    disabled={isActive}
                  >
                    <span>{icon}</span>
                    <span className="flex-1">{label}</span>
                    {pendingLevel && (
                      <span className={cn("px-1.5 py-0.5 rounded text-xs", getLevelBadgeStyle(pendingLevel))}>
                        {RISK_LEVELS.find(l => l.value === pendingLevel)?.label}
                      </span>
                    )}
                    {isActive && <span className="text-xs text-muted-foreground">(ativo)</span>}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {RISK_LEVELS.map(({ value, label: levelLabel }) => (
                      <DropdownMenuItem
                        key={value}
                        onClick={(e) => {
                          e.preventDefault();
                          togglePendingSelection(type, value);
                        }}
                        className="gap-2"
                      >
                        <Checkbox 
                          checked={isPendingSelected(type, value)} 
                          className="pointer-events-none"
                        />
                        <span className={cn("px-2 py-0.5 rounded text-xs flex-1", getLevelBadgeStyle(value))}>
                          {levelLabel}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })}

            <DropdownMenuSeparator />

            {/* Binary Risks */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Riscos
            </DropdownMenuLabel>
            {BINARY_RISKS.map(({ type, label }) => {
              const isActive = !!getPrecautionByType(type);
              const isPending = pendingSelections.some(p => p.type === type);
              
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isActive) toggleBinaryPending(type);
                  }}
                  className={cn("gap-2", isActive && "opacity-50")}
                  disabled={isActive}
                >
                  <Checkbox 
                    checked={isPending} 
                    className="pointer-events-none"
                  />
                  <span className="flex-1">{label}</span>
                  {isActive && <span className="text-xs text-muted-foreground">(ativo)</span>}
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />

            {/* Isolation Precautions */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Isolamento / Contato
            </DropdownMenuLabel>
            {ISOLATION_PRECAUTIONS.map(({ type, label }) => {
              const isActive = !!getPrecautionByType(type);
              const isPending = pendingSelections.some(p => p.type === type);
              
              return (
                <DropdownMenuItem
                  key={type}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isActive) toggleBinaryPending(type);
                  }}
                  className={cn("gap-2", isActive && "opacity-50")}
                  disabled={isActive}
                >
                  <Checkbox 
                    checked={isPending} 
                    className="pointer-events-none"
                  />
                  <span className="flex-1">{label}</span>
                  {isActive && <span className="text-xs text-muted-foreground">(ativo)</span>}
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />

            {/* Other input */}
            <div className="p-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Outro..."
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  className="h-8 text-sm"
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
                  className="h-8 px-2"
                  onClick={(e) => {
                    e.preventDefault();
                    addOtherToPending();
                  }}
                  disabled={!otherText.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {/* Show pending "outros" */}
              {pendingSelections.filter(p => p.type === 'OUTROS').length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {pendingSelections
                    .filter(p => p.type === 'OUTROS')
                    .map((p, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-xs"
                      >
                        {p.notes}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setPendingSelections(prev => 
                              prev.filter((_, i) => !(prev[i].type === 'OUTROS' && prev[i].notes === p.notes))
                            );
                          }}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* Save button */}
            {pendingSelections.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSaveBatch();
                    }}
                  >
                    Salvar ({pendingSelections.length} {pendingSelections.length === 1 ? 'item' : 'itens'})
                  </Button>
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active precautions as badges */}
      {activePrecautions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activePrecautions.map((precaution) => (
            <div
              key={precaution.id}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-sm font-medium transition-colors",
                getBadgeStyle(precaution.precaution_type, precaution.risk_level)
              )}
            >
              <span>{getPrecautionLabel(precaution.precaution_type, precaution.risk_level, precaution.notes)}</span>
              <button
                onClick={() => handleRemovePrecaution(precaution.id)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Nenhuma precaução registrada</p>
      )}
    </div>
  );
};
