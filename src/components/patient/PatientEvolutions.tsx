import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CharacterCounter } from '@/components/ui/character-counter';
import { toast } from 'sonner';
import { Check, Clock, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PatientTasks } from './PatientTasks';
import type { PatientWithDetails, Profile } from '@/types/database';

type ClinicalStatus = 'melhor' | 'pior' | 'inalterado';

const STATUS_CONFIG: Record<ClinicalStatus, { label: string; icon: typeof TrendingUp; className: string; badgeClass: string }> = {
  melhor: { label: 'Melhor', icon: TrendingUp, className: 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400', badgeClass: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  pior: { label: 'Pior', icon: TrendingDown, className: 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400', badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
  inalterado: { label: 'Inalterado', icon: Minus, className: 'border-muted-foreground bg-muted text-muted-foreground', badgeClass: 'bg-muted text-muted-foreground border-muted-foreground/30' },
};

const EVOLUTION_CHAR_LIMIT = 420;

interface PatientEvolutionsProps {
  patient: PatientWithDetails;
  authorProfiles: Record<string, Profile>;
  onUpdate: () => void;
  onDraftChange?: (draft: string) => void;
}

export function PatientEvolutions({ patient, authorProfiles, onUpdate, onDraftChange }: PatientEvolutionsProps) {
  const { user } = useAuth();
  const { canEdit } = useUnit();
  const [newEvolution, setNewEvolution] = useState('');
  const [clinicalStatus, setClinicalStatus] = useState<ClinicalStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const historyContainerRef = useRef<HTMLDivElement>(null);

  const draftKey = `evolution_draft_${patient.id}`;

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setNewEvolution(savedDraft);
    }
  }, [draftKey]);

  // Notify parent of draft changes
  useEffect(() => {
    onDraftChange?.(newEvolution);
  }, [newEvolution, onDraftChange]);

  // Scroll to bottom of history container only (not the whole page)
  useEffect(() => {
    if (historyContainerRef.current) {
      historyContainerRef.current.scrollTop = historyContainerRef.current.scrollHeight;
    }
  }, [patient.evolutions]);

  const handleAddEvolution = async () => {
    if (!newEvolution.trim() || !user || !canEdit) return;
    setIsLoading(true);
    if (!clinicalStatus) {
      toast.error('Selecione o status clínico antes de registrar');
      setIsLoading(false);
      return;
    }
    const { error } = await supabase.from('evolutions').insert({ 
      patient_id: patient.id, 
      content: newEvolution, 
      created_by: user.id,
      clinical_status: clinicalStatus
    } as any);
    if (error) {
      toast.error('Erro ao registrar evolução');
    } else {
      toast.success('Evolução registrada!');
      setNewEvolution('');
      setClinicalStatus(null);
      localStorage.removeItem(draftKey); // Clear draft after successful save
      onUpdate();
    }
    setIsLoading(false);
  };

  const handleSaveDraft = () => {
    if (!newEvolution.trim()) return;
    localStorage.setItem(draftKey, newEvolution);
    toast.success('Rascunho salvo!');
  };

  return (
    <div className="space-y-4">
      {/* Evolution History */}
      <div className="section-card">
        <h3 className="section-title">
          <Clock className="h-4 w-4" />
          Histórico
        </h3>
        
        {patient.evolutions && patient.evolutions.length > 0 ? (
          <div ref={historyContainerRef} className="space-y-0 max-h-80 overflow-y-auto">
            {[...patient.evolutions].reverse().map((evo) => (
              <div key={evo.id} className="evolution-item">
                <p className="text-sm whitespace-pre-wrap text-foreground">{evo.content}</p>
                <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mt-1">
                  {(evo as any).clinical_status && STATUS_CONFIG[(evo as any).clinical_status as ClinicalStatus] && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_CONFIG[(evo as any).clinical_status as ClinicalStatus].badgeClass}`}>
                      {STATUS_CONFIG[(evo as any).clinical_status as ClinicalStatus].label}
                    </Badge>
                  )}
                  <span>
                    Dr. {authorProfiles[evo.created_by]?.nome || 'Desconhecido'} - {' '}
                    {new Date(evo.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma evolução registrada</p>
        )}
      </div>

      {/* New Evolution - only show if canEdit */}
      {canEdit && (
        <div id="evolution-input-section" className="section-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">SUA EVOLUÇÃO</h3>
          
          <div className="flex gap-2 mb-3">
            {(Object.entries(STATUS_CONFIG) as [ClinicalStatus, typeof STATUS_CONFIG[ClinicalStatus]][]).map(([key, config]) => {
              const Icon = config.icon;
              const isSelected = clinicalStatus === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setClinicalStatus(isSelected ? null : key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-all ${
                    isSelected ? config.className + ' ring-1 ring-offset-1' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                </button>
              );
            })}
          </div>

          <Textarea
            placeholder="Registrar evolução do plantão..."
            value={newEvolution}
            onChange={(e) => setNewEvolution(e.target.value)}
            rows={5}
            className="evolution-textarea"
          />
          <CharacterCounter current={newEvolution.length} max={EVOLUTION_CHAR_LIMIT} className="mb-3" />
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline"
              onClick={handleSaveDraft} 
              disabled={isLoading || !newEvolution.trim()}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Salvar Rascunho
            </Button>
            <Button 
              onClick={handleAddEvolution} 
              disabled={isLoading || !newEvolution.trim() || !clinicalStatus}
              className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white gap-2"
            >
              <Check className="h-4 w-4" />
              Validar Evolução
            </Button>
          </div>
        </div>
      )}

      {/* Pending Tasks Section */}
      <PatientTasks 
        patient={patient} 
        authorProfiles={authorProfiles} 
        onUpdate={onUpdate} 
      />
    </div>
  );
}
