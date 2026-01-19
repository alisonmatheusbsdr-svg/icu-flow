import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PatientWithDetails } from '@/types/database';
import { AlertTriangle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface PatientPrecautionsProps {
  patient: PatientWithDetails;
  onUpdate: () => void;
}

// Precaution types with levels
const LEVELED_PRECAUTIONS = [
  { type: 'LESAO_PRESSAO', label: 'Lesão por Pressão', icon: '🛏️' },
  { type: 'BRONCOASPIRACAO', label: 'Broncoaspiração', icon: '🫁' },
  { type: 'QUEDA', label: 'Queda', icon: '🚶' },
] as const;

const RISK_LEVELS = [
  { value: 'baixo', label: 'Baixo', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'medio', label: 'Médio', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'alto', label: 'Alto', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'muito_alto', label: 'Muito Alto', color: 'bg-red-200 text-red-900 border-red-400' },
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

export const PatientPrecautions = ({ patient, onUpdate }: PatientPrecautionsProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState('');

  const activePrecautions = patient.patient_precautions?.filter(p => p.is_active) || [];

  const getPrecautionByType = (type: string) => {
    return activePrecautions.find(p => p.precaution_type === type);
  };

  const handleToggleLeveledPrecaution = async (type: string, level: string | null) => {
    if (!user) return;
    setIsLoading(true);

    try {
      const existing = getPrecautionByType(type);

      if (existing) {
        if (level === null || existing.risk_level === level) {
          // Remove precaution
          await supabase
            .from('patient_precautions')
            .update({ is_active: false })
            .eq('id', existing.id);
        } else {
          // Update level
          await supabase
            .from('patient_precautions')
            .update({ risk_level: level })
            .eq('id', existing.id);
        }
      } else if (level) {
        // Create new precaution
        await supabase
          .from('patient_precautions')
          .insert({
            patient_id: patient.id,
            precaution_type: type,
            risk_level: level,
            created_by: user.id,
          });
      }

      onUpdate();
    } catch (error) {
      toast.error('Erro ao atualizar precaução');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBinaryPrecaution = async (type: string) => {
    if (!user) return;
    setIsLoading(true);

    try {
      const existing = getPrecautionByType(type);

      if (existing) {
        await supabase
          .from('patient_precautions')
          .update({ is_active: false })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('patient_precautions')
          .insert({
            patient_id: patient.id,
            precaution_type: type,
            created_by: user.id,
          });
      }

      onUpdate();
    } catch (error) {
      toast.error('Erro ao atualizar precaução');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOther = async () => {
    if (!user || !otherText.trim()) return;
    setIsLoading(true);

    try {
      await supabase
        .from('patient_precautions')
        .insert({
          patient_id: patient.id,
          precaution_type: 'OUTROS',
          notes: otherText.trim(),
          created_by: user.id,
        });

      setOtherText('');
      setShowOtherInput(false);
      onUpdate();
      toast.success('Precaução adicionada');
    } catch (error) {
      toast.error('Erro ao adicionar precaução');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveOther = async (id: string) => {
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

  const otherPrecautions = activePrecautions.filter(p => p.precaution_type === 'OUTROS');

  const getLevelColor = (level: string | null) => {
    if (!level) return '';
    const found = RISK_LEVELS.find(l => l.value === level);
    return found?.color || '';
  };

  return (
    <div className={cn("space-y-4", isLoading && "opacity-50 pointer-events-none")}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Precauções
        </h3>
      </div>

      {/* Leveled Risks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {LEVELED_PRECAUTIONS.map(({ type, label, icon }) => {
          const precaution = getPrecautionByType(type);
          const currentLevel = precaution?.risk_level || null;

          return (
            <div
              key={type}
              className={cn(
                "p-3 rounded-lg border transition-colors",
                currentLevel ? getLevelColor(currentLevel) : "bg-muted/30 border-border"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{icon}</span>
                <span className="text-sm font-medium">{label}</span>
              </div>
              <RadioGroup
                value={currentLevel || ''}
                onValueChange={(value) => handleToggleLeveledPrecaution(type, value || null)}
                className="flex flex-wrap gap-2"
              >
                {RISK_LEVELS.map(({ value, label: levelLabel }) => (
                  <div key={value} className="flex items-center">
                    <RadioGroupItem
                      value={value}
                      id={`${type}-${value}`}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={`${type}-${value}`}
                      className={cn(
                        "px-2 py-1 text-xs rounded cursor-pointer border transition-all",
                        currentLevel === value
                          ? getLevelColor(value)
                          : "bg-background hover:bg-muted border-border"
                      )}
                    >
                      {levelLabel}
                    </Label>
                  </div>
                ))}
                {currentLevel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleToggleLeveledPrecaution(type, null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </RadioGroup>
            </div>
          );
        })}
      </div>

      {/* Binary Risks */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Riscos</p>
        <div className="flex flex-wrap gap-2">
          {BINARY_RISKS.map(({ type, label }) => {
            const isActive = !!getPrecautionByType(type);
            return (
              <Button
                key={type}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleToggleBinaryPrecaution(type)}
                className={cn(
                  "text-xs",
                  isActive && "bg-amber-500 hover:bg-amber-600 text-white"
                )}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Isolation Precautions */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Precauções de Contato / Isolamento</p>
        <div className="flex flex-wrap gap-2">
          {ISOLATION_PRECAUTIONS.map(({ type, label }) => {
            const isActive = !!getPrecautionByType(type);
            return (
              <Button
                key={type}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleToggleBinaryPrecaution(type)}
                className={cn(
                  "text-xs",
                  isActive && "bg-purple-500 hover:bg-purple-600 text-white"
                )}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Other Precautions */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Outros</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {otherPrecautions.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
            >
              <span>{p.notes}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-destructive/20"
                onClick={() => handleRemoveOther(p.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        
        {showOtherInput ? (
          <div className="flex gap-2">
            <Input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Descreva a precaução..."
              className="text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddOther()}
            />
            <Button size="sm" onClick={handleAddOther} disabled={!otherText.trim()}>
              Adicionar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowOtherInput(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOtherInput(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar outro
          </Button>
        )}
      </div>
    </div>
  );
};
