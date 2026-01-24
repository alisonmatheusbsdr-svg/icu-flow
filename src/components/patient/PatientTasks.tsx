import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import type { PatientWithDetails, Profile, PatientTask } from '@/types/database';

interface PatientTasksProps {
  patient: PatientWithDetails;
  authorProfiles: Record<string, Profile>;
  onUpdate: () => void;
}

export function PatientTasks({ patient, authorProfiles, onUpdate }: PatientTasksProps) {
  const { user } = useAuth();
  const { canEdit } = useUnit();
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sort tasks: pending first, then completed (by completed_at desc)
  const sortedTasks = [...(patient.patient_tasks || [])].sort((a, b) => {
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    // Within same completion status, sort by created_at desc for pending, completed_at desc for completed
    if (a.is_completed) {
      return new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleAddTask = async () => {
    if (!newTask.trim() || !user || !canEdit) return;
    setIsLoading(true);
    
    const { error } = await supabase.from('patient_tasks').insert({
      patient_id: patient.id,
      content: newTask.trim(),
      created_by: user.id
    });

    if (error) {
      toast.error('Erro ao adicionar pendência');
    } else {
      toast.success('Pendência adicionada!');
      setNewTask('');
      onUpdate();
    }
    setIsLoading(false);
  };

  const handleToggleTask = async (task: PatientTask) => {
    if (!user || !canEdit) return;
    setIsLoading(true);

    const { error } = await supabase
      .from('patient_tasks')
      .update({
        is_completed: !task.is_completed,
        completed_at: !task.is_completed ? new Date().toISOString() : null,
        completed_by: !task.is_completed ? user.id : null
      })
      .eq('id', task.id);

    if (error) {
      toast.error('Erro ao atualizar pendência');
    } else {
      onUpdate();
    }
    setIsLoading(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!canEdit) return;
    setIsLoading(true);
    
    const { error } = await supabase
      .from('patient_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast.error('Erro ao remover pendência');
    } else {
      toast.success('Pendência removida');
      onUpdate();
    }
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
  };

  return (
    <div className="section-card mt-4">
      <h3 className="section-title">
        <ClipboardList className="h-4 w-4" />
        Pendências
      </h3>

      {/* Add new task */}
      {canEdit && (
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nova pendência..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleAddTask}
            disabled={isLoading || !newTask.trim()}
            size="sm"
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      )}

      {/* Task list */}
      {sortedTasks.length > 0 ? (
        <div className="space-y-2">
          {sortedTasks.map((task) => (
            <div
              key={task.id}
              className={`group flex items-start gap-3 p-2 rounded-md transition-colors ${
                task.is_completed 
                  ? 'bg-muted/30 opacity-60' 
                  : 'bg-background hover:bg-muted/50'
              }`}
            >
              <Checkbox
                checked={task.is_completed}
                onCheckedChange={() => handleToggleTask(task)}
                disabled={isLoading || !canEdit}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.is_completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.content}
                </p>
                {task.is_completed && task.completed_at && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {authorProfiles[task.completed_by || '']?.nome || 'Usuário'} - {new Date(task.completed_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTask(task.id)}
                  disabled={isLoading}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma pendência registrada</p>
      )}
    </div>
  );
}
