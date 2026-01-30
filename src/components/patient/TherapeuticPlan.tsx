import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CharacterCounter } from '@/components/ui/character-counter';
import { toast } from 'sonner';
import { FileText, Edit2 } from 'lucide-react';
import type { PatientWithDetails } from '@/types/database';

const PLAN_CHAR_LIMIT = 250;

interface TherapeuticPlanProps {
  patient: PatientWithDetails;
  onUpdate: () => void;
}

export function TherapeuticPlan({ patient, onUpdate }: TherapeuticPlanProps) {
  const { user, hasRole } = useAuth();
  const { canEdit } = useUnit();
  const [newPlan, setNewPlan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlanEditing, setIsPlanEditing] = useState(false);

  const currentPlan = patient.therapeutic_plans?.[0];
  const canEditPlan = hasRole('diarista') && canEdit;

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

  return (
    <div className="therapeutic-plan rounded-lg mb-4 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[hsl(var(--warning))] flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Plano Terapêutico
        </h3>
        {canEditPlan && !isPlanEditing && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setNewPlan(currentPlan?.content || '');
              setIsPlanEditing(true);
            }}
            className="border-warning text-warning hover:bg-warning hover:text-warning-foreground gap-1"
          >
            <Edit2 className="h-3.5 w-3.5" />
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
          <CharacterCounter current={newPlan.length} max={PLAN_CHAR_LIMIT} />
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
  );
}
