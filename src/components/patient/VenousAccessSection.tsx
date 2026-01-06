import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Droplets, X, AlertTriangle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EditableDayBadge } from './EditableDayBadge';
import { AddVenousAccessDialog } from './AddVenousAccessDialog';
import type { VenousAccess } from '@/types/database';

interface VenousAccessSectionProps {
  patientId: string;
  venousAccess: VenousAccess[];
  hasActiveVasoactiveDrugs: boolean;
  onUpdate: () => void;
}

// Access type configuration
export const ACCESS_TYPES: Record<string, { label: string; shortLabel: string; color: string }> = {
  'periferico': { label: 'Periférico', shortLabel: 'Perif.', color: 'hsl(142, 71%, 45%)' },
  'central_nao_tunelizado': { label: 'Central - não tunelizado', shortLabel: 'CVC', color: 'hsl(0, 72%, 51%)' },
  'central_tunelizado': { label: 'Central - tunelizado', shortLabel: 'CVC Tun.', color: 'hsl(0, 72%, 51%)' },
  'picc': { label: 'PICC', shortLabel: 'PICC', color: 'hsl(262, 83%, 58%)' },
  'port_a_cath': { label: 'Port-a-cath', shortLabel: 'Port', color: 'hsl(217, 91%, 60%)' },
  'hemodialise': { label: 'Cateter de hemodiálise', shortLabel: 'HD', color: 'hsl(25, 95%, 53%)' },
};

// Insertion sites by access type
export const INSERTION_SITES: Record<string, { label: string; accessTypes: string[] }> = {
  // Peripheral sites
  'mao': { label: 'Mão', accessTypes: ['periferico'] },
  'antebraco': { label: 'Antebraço', accessTypes: ['periferico'] },
  'fossa_antecubital': { label: 'Fossa antecubital', accessTypes: ['periferico'] },
  // Central sites
  'jugular_interna_d': { label: 'Jugular interna D', accessTypes: ['central_nao_tunelizado', 'central_tunelizado', 'hemodialise'] },
  'jugular_interna_e': { label: 'Jugular interna E', accessTypes: ['central_nao_tunelizado', 'central_tunelizado', 'hemodialise'] },
  'subclavia_d': { label: 'Subclávia D', accessTypes: ['central_nao_tunelizado', 'central_tunelizado'] }, // Blocked for hemodialysis
  'subclavia_e': { label: 'Subclávia E', accessTypes: ['central_nao_tunelizado', 'central_tunelizado'] }, // Blocked for hemodialysis
  'femoral_d': { label: 'Femoral D', accessTypes: ['central_nao_tunelizado', 'central_tunelizado', 'hemodialise'] },
  'femoral_e': { label: 'Femoral E', accessTypes: ['central_nao_tunelizado', 'central_tunelizado', 'hemodialise'] },
  // PICC sites
  'basilica': { label: 'Basílica', accessTypes: ['picc'] },
  'cefalica': { label: 'Cefálica', accessTypes: ['picc'] },
  'braquial': { label: 'Braquial', accessTypes: ['picc'] },
  // Port-a-cath (usually implanted, site less relevant but can track)
  'torax_d': { label: 'Tórax D', accessTypes: ['port_a_cath'] },
  'torax_e': { label: 'Tórax E', accessTypes: ['port_a_cath'] },
};

export const LUMEN_COUNTS: Record<string, string> = {
  'mono': 'Mono',
  'duplo': 'Duplo',
  'triplo': 'Triplo',
};

// Alert thresholds in days
const ALERT_THRESHOLDS: Record<string, { warning: number; danger: number }> = {
  'periferico': { warning: 3, danger: 4 },
  'central_nao_tunelizado': { warning: 7, danger: 10 },
  'central_tunelizado': { warning: 14, danger: 21 },
  'picc': { warning: 14, danger: 21 },
  'hemodialise': { warning: 7, danger: 14 },
};

// Femoral has stricter thresholds
const FEMORAL_THRESHOLDS = { warning: 3, danger: 5 };

export function VenousAccessSection({ 
  patientId, 
  venousAccess, 
  hasActiveVasoactiveDrugs, 
  onUpdate 
}: VenousAccessSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const getDays = (insertionDate: string) => {
    return Math.ceil((new Date().getTime() - new Date(insertionDate).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getAlertLevel = (access: VenousAccess): 'none' | 'warning' | 'danger' => {
    const days = getDays(access.insertion_date);
    
    // Femoral has stricter thresholds
    if (access.insertion_site.includes('femoral')) {
      if (days >= FEMORAL_THRESHOLDS.danger) return 'danger';
      if (days >= FEMORAL_THRESHOLDS.warning) return 'warning';
      return 'none';
    }
    
    const thresholds = ALERT_THRESHOLDS[access.access_type];
    if (!thresholds) return 'none';
    
    if (days >= thresholds.danger) return 'danger';
    if (days >= thresholds.warning) return 'warning';
    return 'none';
  };

  const handleRemove = async (accessId: string) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('venous_access')
      .update({ is_active: false })
      .eq('id', accessId);
    
    if (error) {
      toast.error('Erro ao remover acesso');
    } else {
      toast.success('Acesso removido');
      onUpdate();
    }
    setIsLoading(false);
  };

  const handleUpdateDate = async (accessId: string, newDate: Date) => {
    const { error } = await supabase
      .from('venous_access')
      .update({ insertion_date: newDate.toISOString().split('T')[0] })
      .eq('id', accessId);
    
    if (error) {
      toast.error('Erro ao atualizar data');
    } else {
      toast.success('Data atualizada');
      onUpdate();
    }
  };

  // Check if any peripheral access exists while DVAs are active
  const hasPeripheralWithDva = hasActiveVasoactiveDrugs && 
    venousAccess.some(a => a.access_type === 'periferico');

  return (
    <div className="section-card">
      <div className="section-title justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-rose-500" />
          Acessos Venosos
          {hasPeripheralWithDva && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>⚠️ DVA em uso com acesso periférico</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="mt-3">
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap gap-2 items-center">
            {venousAccess.map(access => {
              const typeConfig = ACCESS_TYPES[access.access_type];
              const siteConfig = INSERTION_SITES[access.insertion_site];
              const lumenLabel = LUMEN_COUNTS[access.lumen_count];
              const days = getDays(access.insertion_date);
              const alertLevel = getAlertLevel(access);
              
              const badgeColor = typeConfig?.color || 'hsl(var(--muted-foreground))';
              const isPeripheralWithDva = hasActiveVasoactiveDrugs && access.access_type === 'periferico';
              
              return (
                <Tooltip key={access.id}>
                  <TooltipTrigger asChild>
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm"
                      style={{
                        backgroundColor: alertLevel === 'danger' 
                          ? 'hsl(0, 72%, 51%, 0.15)' 
                          : alertLevel === 'warning' 
                            ? 'hsl(45, 93%, 47%, 0.15)' 
                            : `${badgeColor}15`,
                        borderColor: alertLevel === 'danger' 
                          ? 'hsl(0, 72%, 51%, 0.5)' 
                          : alertLevel === 'warning' 
                            ? 'hsl(45, 93%, 47%, 0.5)' 
                            : `${badgeColor}40`,
                        borderWidth: '1px',
                        color: alertLevel === 'danger' 
                          ? 'hsl(0, 72%, 45%)' 
                          : alertLevel === 'warning' 
                            ? 'hsl(45, 93%, 35%)' 
                            : badgeColor
                      }}
                    >
                      <span className="font-medium">{typeConfig?.shortLabel || access.access_type}</span>
                      <span className="opacity-70">{siteConfig?.label || access.insertion_site}</span>
                      <span className="text-xs opacity-60">- {lumenLabel}</span>
                      <EditableDayBadge
                        days={days}
                        startDate={new Date(access.insertion_date)}
                        onDateChange={(date) => handleUpdateDate(access.id, date)}
                        className="text-xs opacity-80"
                      />
                      {alertLevel !== 'none' && (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {isPeripheralWithDva && alertLevel === 'none' && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <button
                        onClick={() => handleRemove(access.id)}
                        disabled={isLoading}
                        className="ml-0.5 p-0.5 rounded hover:bg-foreground/10 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{typeConfig?.label}</p>
                    <p className="text-xs">{siteConfig?.label} - {lumenLabel} lúmen</p>
                    <p className="text-xs">Inserção: {new Date(access.insertion_date).toLocaleDateString('pt-BR')}</p>
                    {alertLevel === 'warning' && (
                      <p className="text-xs text-amber-500 mt-1">⚠️ Considerar troca</p>
                    )}
                    {alertLevel === 'danger' && (
                      <p className="text-xs text-red-500 mt-1">🚨 Recomendado trocar</p>
                    )}
                    {isPeripheralWithDva && (
                      <p className="text-xs text-amber-500 mt-1">⚠️ DVA em uso - preferir acesso central</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}

            {venousAccess.length === 0 && (
              <span className="text-sm text-muted-foreground">Nenhum acesso venoso</span>
            )}
          </div>
        </TooltipProvider>
      </div>

      <AddVenousAccessDialog
        patientId={patientId}
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={() => {
          setIsAddDialogOpen(false);
          onUpdate();
        }}
      />
    </div>
  );
}
