import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileText, Copy, Check, Clock } from 'lucide-react';
import type { PatientWithDetails, Profile } from '@/types/database';

interface PatientEvolutionsProps {
  patient: PatientWithDetails;
  authorProfiles: Record<string, Profile>;
  onUpdate: () => void;
}

export function PatientEvolutions({ patient, authorProfiles, onUpdate }: PatientEvolutionsProps) {
  const { user, hasRole } = useAuth();
  const [newEvolution, setNewEvolution] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanEditing, setIsPlanEditing] = useState(false);

  const currentPlan = patient.therapeutic_plans?.[0];
  const canEditPlan = hasRole('diarista');
  const lastEvolution = patient.evolutions?.[0];

  const handleAddEvolution = async () => {
    if (!newEvolution.trim() || !user) return;
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
      onUpdate();
    }
    setIsLoading(false);
  };

  const handleSavePlan = async () => {
    if (!newPlan.trim() || !user) return;
    setIsLoading(true);
    if (currentPlan) {
      await supabase.from('therapeutic_plans').update({ content: newPlan }).eq('id', currentPlan.id);
    } else {
      await supabase.from('therapeutic_plans').insert({ 
        patient_id: patient.id, 
        content: newPlan, 
        created_by: user.id 
      });
    }
    toast.success('Plano atualizado!');
    setNewPlan('');
    setIsPlanEditing(false);
    setIsLoading(false);
    onUpdate();
  };

  const handleCopyLastEvolution = () => {
    if (lastEvolution) {
      setNewEvolution(lastEvolution.content);
      toast.success('Evolução anterior copiada');
    } else {
      toast.info('Nenhuma evolução anterior para copiar');
    }
  };

  return (
    <div className="space-y-4">
      {/* Therapeutic Plan */}
      <div className="therapeutic-plan rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[hsl(var(--warning))] flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Plano Terapêutico
          </h3>
          {canEditPlan && !isPlanEditing && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setNewPlan(currentPlan?.content || '');
                setIsPlanEditing(true);
              }}
              className="text-[hsl(var(--warning))] hover:text-[hsl(var(--warning))]"
            >
              Editar
            </Button>
          )}
        </div>
        
        {isPlanEditing ? (
          <div className="space-y-2">
            <Textarea
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              placeholder="Definir plano terapêutico..."
              rows={4}
              className="bg-background"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSavePlan} disabled={isLoading || !newPlan.trim()}>
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsPlanEditing(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap text-foreground">
            {currentPlan?.content || 'Nenhum plano definido'}
          </p>
        )}
      </div>

      {/* New Evolution */}
      <div className="section-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">SUA EVOLUÇÃO</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLastEvolution}
            className="text-xs gap-1"
          >
            <Copy className="h-3 w-3" />
            Copiar Anterior
          </Button>
        </div>
        
        <Textarea
          placeholder="Registrar evolução do plantão..."
          value={newEvolution}
          onChange={(e) => setNewEvolution(e.target.value)}
          rows={5}
          className="evolution-textarea mb-3"
        />
        
        <div className="flex justify-end">
          <Button 
            onClick={handleAddEvolution} 
            disabled={isLoading || !newEvolution.trim()}
            className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white gap-2"
          >
            <Check className="h-4 w-4" />
            Validar Plantão
          </Button>
        </div>
      </div>

      {/* Evolution History */}
      <div className="section-card">
        <h3 className="section-title">
          <Clock className="h-4 w-4" />
          Histórico
        </h3>
        
        {patient.evolutions && patient.evolutions.length > 0 ? (
          <div className="space-y-0 max-h-80 overflow-y-auto">
            {patient.evolutions.map((evo, index) => (
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
    </div>
  );
}
