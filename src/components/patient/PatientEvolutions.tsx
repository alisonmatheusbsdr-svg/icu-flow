import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
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

  const currentPlan = patient.therapeutic_plans?.[0];
  const canEditPlan = hasRole('diarista');

  const handleAddEvolution = async () => {
    if (!newEvolution.trim() || !user) return;
    setIsLoading(true);
    await supabase.from('evolutions').insert({ patient_id: patient.id, content: newEvolution, created_by: user.id });
    toast.success('Evolução registrada!');
    setNewEvolution('');
    setIsLoading(false);
    onUpdate();
  };

  const handleSavePlan = async () => {
    if (!newPlan.trim() || !user) return;
    setIsLoading(true);
    if (currentPlan) {
      await supabase.from('therapeutic_plans').update({ content: newPlan }).eq('id', currentPlan.id);
    } else {
      await supabase.from('therapeutic_plans').insert({ patient_id: patient.id, content: newPlan, created_by: user.id });
    }
    toast.success('Plano atualizado!');
    setNewPlan('');
    setIsLoading(false);
    onUpdate();
  };

  return (
    <div className="space-y-4">
      {/* Therapeutic Plan */}
      <Card className="therapeutic-plan">
        <CardHeader><CardTitle className="text-lg text-warning">Plano Terapêutico</CardTitle></CardHeader>
        <CardContent>
          {currentPlan ? (
            <p className="whitespace-pre-wrap">{currentPlan.content}</p>
          ) : (
            <p className="text-muted-foreground">Nenhum plano definido</p>
          )}
          {canEditPlan && (
            <div className="mt-4 space-y-2">
              <Textarea placeholder="Editar plano..." value={newPlan} onChange={(e) => setNewPlan(e.target.value)} />
              <Button onClick={handleSavePlan} disabled={isLoading || !newPlan.trim()}>Salvar Plano</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Evolution */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Nova Evolução</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea placeholder="Registrar evolução do plantão..." value={newEvolution} onChange={(e) => setNewEvolution(e.target.value)} rows={4} />
          <Button onClick={handleAddEvolution} disabled={isLoading || !newEvolution.trim()}>Validar Plantão</Button>
        </CardContent>
      </Card>

      {/* Evolution Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Histórico de Evoluções</CardTitle></CardHeader>
        <CardContent>
          {patient.evolutions && patient.evolutions.length > 0 ? (
            <div className="space-y-4">
              {patient.evolutions.map(evo => (
                <div key={evo.id} className="evolution-item">
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(evo.created_at).toLocaleString('pt-BR')} - {authorProfiles[evo.created_by]?.nome || 'Desconhecido'}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{evo.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhuma evolução registrada</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}