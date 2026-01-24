import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CharacterCounter } from '@/components/ui/character-counter';
import { toast } from 'sonner';
import { Check, Clock, Save } from 'lucide-react';
import { PatientTasks } from './PatientTasks';
import { PatientPrecautions } from './PatientPrecautions';
import type { PatientWithDetails, Profile } from '@/types/database';

const EVOLUTION_CHAR_LIMIT = 420;

interface PatientEvolutionsProps {
  patient: PatientWithDetails;
  authorProfiles: Record<string, Profile>;
  onUpdate: () => void;
}

export function PatientEvolutions({ patient, authorProfiles, onUpdate }: PatientEvolutionsProps) {
  const { user } = useAuth();
  const { canEdit } = useUnit();
  const [newEvolution, setNewEvolution] = useState('');
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

  // Scroll to bottom of history container only (not the whole page)
  useEffect(() => {
    if (historyContainerRef.current) {
      historyContainerRef.current.scrollTop = historyContainerRef.current.scrollHeight;
    }
  }, [patient.evolutions]);

  const handleAddEvolution = async () => {
    if (!newEvolution.trim() || !user || !canEdit) return;
    setIsLoading(true);
    const { error } = await supabase.from('evolutions').insert({ 
      patient_id: patient.id, 
      content: newEvolution, 
      created_by: user.id 
    });
    if (error) {
      toast.error('Erro ao registrar evolução');
    } else {
      toast.success('Evolução registrada!');
      setNewEvolution('');
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
                <div className="text-xs text-muted-foreground mt-1 text-right">
                  Dr. {authorProfiles[evo.created_by]?.nome || 'Desconhecido'} - {' '}
                  {new Date(evo.created_at).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
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
              disabled={isLoading || !newEvolution.trim()}
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

      {/* Precautions Section */}
      <div className="section-card">
        <PatientPrecautions 
          patient={patient} 
          onUpdate={onUpdate} 
        />
      </div>
    </div>
  );
}
