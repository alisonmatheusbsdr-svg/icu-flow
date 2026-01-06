import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Trash2, AlertCircle, Syringe, Activity, Pill, X, ChevronDown, Shield, Utensils } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { VasoactiveDrugCalculator } from './VasoactiveDrugCalculator';
import { EditableDayBadge } from './EditableDayBadge';
import { VenousAccessSection } from './VenousAccessSection';
import type { PatientWithDetails, DietType } from '@/types/database';

interface PatientClinicalDataProps {
  patient: PatientWithDetails;
  onUpdate: () => void;
}

// Standard devices with labels
const DEVICE_LABELS: Record<string, string> = {
  'TOT': 'Tubo Orotraqueal',
  'CVD': 'Cateter Venoso Duplo-lúmen',
  'CVC': 'Cateter Venoso Central',
  'PAI': 'Pressão Arterial Invasiva',
  'SNE': 'Sonda Nasoenteral',
  'SVD': 'Sonda Vesical de Demora'
};

const STANDARD_DEVICES = Object.keys(DEVICE_LABELS);

// Vasoactive drugs configuration
interface DvaConfig {
  category: 'vasopressor' | 'inotropico' | 'vasodilatador';
  categoryLabel: string;
  categoryEmoji: string;
  color: string;
  supportsUgKgMin: boolean;
  concentrations: { label: string; value: number }[];
}

const VASOACTIVE_DRUGS: Record<string, DvaConfig> = {
  'Noradrenalina': {
    category: 'vasopressor',
    categoryLabel: 'Vasopressores',
    categoryEmoji: '🔴',
    color: 'hsl(0, 72%, 51%)', // red
    supportsUgKgMin: true,
    concentrations: [
      { label: '4mg/250mL', value: 16 },
      { label: '8mg/250mL', value: 32 }
    ]
  },
  'Adrenalina': {
    category: 'vasopressor',
    categoryLabel: 'Vasopressores',
    categoryEmoji: '🔴',
    color: 'hsl(0, 72%, 51%)',
    supportsUgKgMin: true,
    concentrations: [
      { label: '4mg/250mL', value: 16 },
      { label: '1mg/100mL', value: 10 }
    ]
  },
  'Dopamina': {
    category: 'vasopressor',
    categoryLabel: 'Vasopressores',
    categoryEmoji: '🔴',
    color: 'hsl(0, 72%, 51%)',
    supportsUgKgMin: true,
    concentrations: [
      { label: '200mg/250mL', value: 800 },
      { label: '400mg/250mL', value: 1600 }
    ]
  },
  'Vasopressina': {
    category: 'vasopressor',
    categoryLabel: 'Vasopressores',
    categoryEmoji: '🔴',
    color: 'hsl(0, 72%, 51%)',
    supportsUgKgMin: false,
    concentrations: []
  },
  'Dobutamina': {
    category: 'inotropico',
    categoryLabel: 'Inotrópicos',
    categoryEmoji: '🔵',
    color: 'hsl(217, 91%, 60%)', // blue
    supportsUgKgMin: true,
    concentrations: [
      { label: '250mg/250mL', value: 1000 },
      { label: '500mg/250mL', value: 2000 }
    ]
  },
  'Milrinona': {
    category: 'inotropico',
    categoryLabel: 'Inotrópicos',
    categoryEmoji: '🔵',
    color: 'hsl(217, 91%, 60%)',
    supportsUgKgMin: true,
    concentrations: [
      { label: '10mg/100mL', value: 100 },
      { label: '20mg/100mL', value: 200 }
    ]
  },
  'Nitroglicerina': {
    category: 'vasodilatador',
    categoryLabel: 'Vasodilatadores',
    categoryEmoji: '🟢',
    color: 'hsl(142, 71%, 45%)', // green
    supportsUgKgMin: false,
    concentrations: []
  },
  'Nitroprussiato': {
    category: 'vasodilatador',
    categoryLabel: 'Vasodilatadores',
    categoryEmoji: '🟢',
    color: 'hsl(142, 71%, 45%)',
    supportsUgKgMin: false,
    concentrations: []
  }
};

const DVA_CATEGORIES = [
  { key: 'vasopressor', label: 'Vasopressores', emoji: '🔴' },
  { key: 'inotropico', label: 'Inotrópicos', emoji: '🔵' },
  { key: 'vasodilatador', label: 'Vasodilatadores', emoji: '🟢' }
] as const;

// Common antibiotics configuration
const COMMON_ANTIBIOTICS: Record<string, { category: string; emoji: string }> = {
  // Betalactâmicos
  'Ceftriaxona': { category: 'betalactamico', emoji: '💊' },
  'Piperacilina-Tazobactam': { category: 'betalactamico', emoji: '💊' },
  'Meropenem': { category: 'betalactamico', emoji: '💊' },
  'Amoxicilina-Clavulanato': { category: 'betalactamico', emoji: '💊' },
  'Cefepime': { category: 'betalactamico', emoji: '💊' },
  'Ampicilina-Sulbactam': { category: 'betalactamico', emoji: '💊' },
  
  // Glicopeptídeos
  'Vancomicina': { category: 'glicopeptideo', emoji: '🛡️' },
  'Teicoplanina': { category: 'glicopeptideo', emoji: '🛡️' },
  
  // Aminoglicosídeos
  'Amicacina': { category: 'aminoglicosideo', emoji: '💉' },
  'Gentamicina': { category: 'aminoglicosideo', emoji: '💉' },
  
  // Outros
  'Metronidazol': { category: 'outro', emoji: '🧪' },
  'Ciprofloxacino': { category: 'outro', emoji: '🧪' },
  'Polimixina B': { category: 'outro', emoji: '🧪' },
  'Linezolida': { category: 'outro', emoji: '🧪' },
  'Clindamicina': { category: 'outro', emoji: '🧪' },
  'Fluconazol': { category: 'outro', emoji: '🧪' },
};

const ATB_CATEGORIES = [
  { key: 'betalactamico', label: 'Betalactâmicos', emoji: '💊' },
  { key: 'glicopeptideo', label: 'Glicopeptídeos', emoji: '🛡️' },
  { key: 'aminoglicosideo', label: 'Aminoglicosídeos', emoji: '💉' },
  { key: 'outro', label: 'Outros', emoji: '🧪' },
];

// Prophylaxis types configuration
const PROPHYLAXIS_TYPES: Record<string, { label: string; emoji: string }> = {
  'PROT_GASTRICA': { label: 'Proteção Gástrica', emoji: '💊' },
  'TEV': { label: 'Tromboembolismo Venoso', emoji: '🩸' },
  'LPP': { label: 'Lesão por Pressão', emoji: '🛏️' },
  'QUEDA': { label: 'Risco de Queda', emoji: '⚠️' },
  'AGITACAO': { label: 'Risco de Agitação', emoji: '😤' },
  'BRONCOASP': { label: 'Risco de Broncoaspiração', emoji: '🫁' },
};

// Diet types configuration
const DIET_TYPES: Record<string, { label: string; emoji: string }> = {
  'zero': { label: 'Dieta Zero', emoji: '🚫' },
  'oral': { label: 'Dieta Oral', emoji: '🍽️' },
  'sne': { label: 'Sonda Naso Enteral (SNE)', emoji: '🔄' },
  'sng': { label: 'Sonda Naso Gástrica (SNG)', emoji: '🔄' },
  'npt': { label: 'NPT', emoji: '💉' },
  'gtt': { label: 'GTT', emoji: '🔘' },
};

export function PatientClinicalData({ patient, onUpdate }: PatientClinicalDataProps) {
  const [newDevice, setNewDevice] = useState('');
  const [newAtb, setNewAtb] = useState('');
  const [dvaInputs, setDvaInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomDeviceInput, setShowCustomDeviceInput] = useState(false);
  const [showAtbInput, setShowAtbInput] = useState(false);

  // Calculate days for a device
  const getDeviceDays = (insertionDate: string) => {
    return Math.ceil((new Date().getTime() - new Date(insertionDate).getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get active device types
  const activeDeviceTypes = new Set(patient.invasive_devices?.map(d => d.device_type.toUpperCase()) || []);

  // Get active DVA by name
  const getDvaByName = (name: string) => {
    return patient.vasoactive_drugs?.find(d => 
      d.drug_name.toLowerCase().includes(name.toLowerCase())
    );
  };

  // Add device
  const handleAddDevice = async (deviceType: string) => {
    if (!deviceType.trim()) return;
    setIsLoading(true);
    const { error } = await supabase.from('invasive_devices').insert({
      patient_id: patient.id,
      device_type: deviceType.toUpperCase(),
      insertion_date: new Date().toISOString().split('T')[0]
    });
    if (error) toast.error('Erro ao adicionar dispositivo');
    else {
      toast.success('Dispositivo adicionado');
      setNewDevice('');
      onUpdate();
    }
    setIsLoading(false);
  };

  // Remove device
  const handleRemoveDevice = async (deviceId: string) => {
    setIsLoading(true);
    await supabase.from('invasive_devices').update({ is_active: false }).eq('id', deviceId);
    toast.success('Dispositivo removido');
    onUpdate();
    setIsLoading(false);
  };

  // Toggle standard device
  const handleToggleDevice = async (deviceType: string) => {
    const existing = patient.invasive_devices?.find(d => d.device_type.toUpperCase() === deviceType);
    if (existing) {
      await handleRemoveDevice(existing.id);
    } else {
      await handleAddDevice(deviceType);
    }
  };

  // Add DVA
  const handleAddDva = async (dvaName: string) => {
    setIsLoading(true);
    const existing = getDvaByName(dvaName);
    
    if (existing) {
      // Reactivate if exists
      await supabase.from('vasoactive_drugs').update({ is_active: true, dose_ml_h: 0 }).eq('id', existing.id);
    } else {
      await supabase.from('vasoactive_drugs').insert({
        patient_id: patient.id,
        drug_name: dvaName,
        dose_ml_h: 0
      });
    }
    toast.success(`${dvaName} adicionada`);
    onUpdate();
    setIsLoading(false);
  };

  // Remove DVA
  const handleRemoveDva = async (dvaId: string) => {
    setIsLoading(true);
    await supabase.from('vasoactive_drugs').update({ is_active: false }).eq('id', dvaId);
    toast.success('Droga removida');
    onUpdate();
    setIsLoading(false);
  };

  // Calculate dose in µg/kg/min from ml/h
  const calculateDoseUgKgMin = (
    doseMlH: number,
    concentrationUgMl: number | null,
    weightKg: number | null
  ): number | null => {
    if (!doseMlH || !concentrationUgMl || !weightKg || weightKg <= 0) return null;
    return (doseMlH * concentrationUgMl) / (weightKg * 60);
  };

  // Update DVA dose
  const handleUpdateDva = async (dvaName: string, dose: number, concentrationUgMl?: number) => {
    setIsLoading(true);
    const existing = getDvaByName(dvaName);
    
    if (dose <= 0 && existing) {
      // Remove if dose is 0
      await supabase.from('vasoactive_drugs').update({ is_active: false }).eq('id', existing.id);
      toast.success(`${dvaName} removida`);
    } else if (dose > 0) {
      const updateData: { dose_ml_h: number; concentration_ug_ml?: number } = { dose_ml_h: dose };
      if (concentrationUgMl !== undefined) {
        updateData.concentration_ug_ml = concentrationUgMl;
      }
      
      if (existing) {
        await supabase.from('vasoactive_drugs').update(updateData).eq('id', existing.id);
      } else {
        await supabase.from('vasoactive_drugs').insert({
          patient_id: patient.id,
          drug_name: dvaName,
          ...updateData
        });
      }
      toast.success(`${dvaName} atualizada`);
    }
    
    setDvaInputs(prev => ({ ...prev, [dvaName]: '' }));
    onUpdate();
    setIsLoading(false);
  };

  // Add antibiotic by name
  const handleAddAntibioticByName = async (name: string) => {
    if (!name.trim()) return;
    setIsLoading(true);
    const { error } = await supabase.from('antibiotics').insert({
      patient_id: patient.id,
      antibiotic_name: name,
      start_date: new Date().toISOString().split('T')[0]
    });
    if (error) toast.error('Erro ao adicionar antibiótico');
    else {
      toast.success('Antibiótico adicionado');
      onUpdate();
    }
    setIsLoading(false);
  };

  // Add antibiotic (from custom input)
  const handleAddAntibiotic = async () => {
    if (!newAtb.trim()) return;
    await handleAddAntibioticByName(newAtb);
    setNewAtb('');
  };

  // Remove antibiotic
  const handleRemoveAntibiotic = async (atbId: string) => {
    setIsLoading(true);
    await supabase.from('antibiotics').update({ is_active: false }).eq('id', atbId);
    toast.success('Antibiótico removido');
    onUpdate();
    setIsLoading(false);
  };

  // Update device insertion date
  const handleUpdateDeviceDate = async (deviceId: string, newDate: Date) => {
    const { error } = await supabase
      .from('invasive_devices')
      .update({ insertion_date: newDate.toISOString().split('T')[0] })
      .eq('id', deviceId);
    
    if (error) {
      toast.error('Erro ao atualizar data');
    } else {
      toast.success('Data atualizada');
      onUpdate();
    }
  };

  // Update DVA start date
  const handleUpdateDvaDate = async (dvaId: string, newDate: Date) => {
    const { error } = await supabase
      .from('vasoactive_drugs')
      .update({ start_date: newDate.toISOString().split('T')[0] })
      .eq('id', dvaId);
    
    if (error) {
      toast.error('Erro ao atualizar data');
    } else {
      toast.success('Data atualizada');
      onUpdate();
    }
  };

  // Update antibiotic start date
  const handleUpdateAntibioticDate = async (atbId: string, newDate: Date) => {
    const { error } = await supabase
      .from('antibiotics')
      .update({ start_date: newDate.toISOString().split('T')[0] })
      .eq('id', atbId);
    
    if (error) {
      toast.error('Erro ao atualizar data');
    } else {
      toast.success('Data atualizada');
      onUpdate();
    }
  };

  // Add prophylaxis
  const handleAddProphylaxis = async (type: string) => {
    setIsLoading(true);
    const { error } = await supabase.from('prophylaxis').insert({
      patient_id: patient.id,
      prophylaxis_type: type
    });
    if (error) toast.error('Erro ao adicionar profilaxia');
    else {
      toast.success('Profilaxia adicionada');
      onUpdate();
    }
    setIsLoading(false);
  };

  // Remove prophylaxis
  const handleRemoveProphylaxis = async (prophylaxisId: string) => {
    setIsLoading(true);
    await supabase.from('prophylaxis').update({ is_active: false }).eq('id', prophylaxisId);
    toast.success('Profilaxia removida');
    onUpdate();
    setIsLoading(false);
  };

  // Update diet type
  const handleUpdateDiet = async (dietType: DietType) => {
    setIsLoading(true);
    const { error } = await supabase
      .from('patients')
      .update({ diet_type: dietType })
      .eq('id', patient.id);
    
    if (error) {
      toast.error('Erro ao atualizar dieta');
    } else {
      toast.success('Dieta atualizada');
      onUpdate();
    }
    setIsLoading(false);
  };

  // Get active prophylaxis types
  const activeProphylaxisTypes = new Set(patient.prophylaxis?.map(p => p.prophylaxis_type) || []);

  return (
    <div className="space-y-4">
      {/* Invasive Devices */}
      <div className="section-card">
        <div className="section-title justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-destructive" />
            Dispositivos Invasivos
          </div>
          
          {/* Add device dropdown - now in title */}
          <DropdownMenu onOpenChange={(open) => { if (!open) { setShowCustomDeviceInput(false); setNewDevice(''); } }}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {STANDARD_DEVICES.filter(device => !activeDeviceTypes.has(device)).map(device => (
                <DropdownMenuItem
                  key={device}
                  onClick={() => handleAddDevice(device)}
                  className="cursor-pointer"
                >
                  <span className="font-medium">{device}</span>
                  <span className="text-muted-foreground ml-2 text-xs">
                    {DEVICE_LABELS[device]}
                  </span>
                </DropdownMenuItem>
              ))}
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Personalizado</DropdownMenuLabel>
              
              {!showCustomDeviceInput ? (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.preventDefault();
                    setShowCustomDeviceInput(true);
                  }}
                  className="cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Adicionar outro...
                </DropdownMenuItem>
              ) : (
                <div className="px-2 py-1.5">
                  <Input
                    autoFocus
                    placeholder="Nome do dispositivo..."
                    value={newDevice}
                    onChange={(e) => setNewDevice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newDevice.trim()) {
                        handleAddDevice(newDevice);
                        setShowCustomDeviceInput(false);
                      }
                      if (e.key === 'Escape') {
                        setShowCustomDeviceInput(false);
                        setNewDevice('');
                      }
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="mt-3">
          {/* Active devices as removable badges */}
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-2 items-center">
              {/* Standard active devices */}
              {STANDARD_DEVICES.filter(device => activeDeviceTypes.has(device)).map(device => {
                const deviceData = patient.invasive_devices?.find(d => d.device_type.toUpperCase() === device);
                return (
                  <Tooltip key={device}>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                        <span className="font-medium">{device}</span>
                        {deviceData && (
                          <EditableDayBadge
                            days={getDeviceDays(deviceData.insertion_date)}
                            startDate={new Date(deviceData.insertion_date)}
                            onDateChange={(date) => handleUpdateDeviceDate(deviceData.id, date)}
                            className="text-xs opacity-80"
                          />
                        )}
                        <button
                          onClick={() => deviceData && handleRemoveDevice(deviceData.id)}
                          disabled={isLoading}
                          className="ml-0.5 p-0.5 rounded hover:bg-destructive/20 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{DEVICE_LABELS[device]}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Custom active devices */}
              {patient.invasive_devices?.filter(d => !STANDARD_DEVICES.includes(d.device_type.toUpperCase())).map(device => (
                <div key={device.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <span className="font-medium">{device.device_type}</span>
                  <EditableDayBadge
                    days={getDeviceDays(device.insertion_date)}
                    startDate={new Date(device.insertion_date)}
                    onDateChange={(date) => handleUpdateDeviceDate(device.id, date)}
                    className="text-xs opacity-80"
                  />
                  <button
                    onClick={() => handleRemoveDevice(device.id)}
                    disabled={isLoading}
                    className="ml-0.5 p-0.5 rounded hover:bg-destructive/20 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Empty state */}
              {(!patient.invasive_devices || patient.invasive_devices.length === 0) && (
                <span className="text-sm text-muted-foreground">Nenhum dispositivo</span>
              )}
            </div>
        </TooltipProvider>
        </div>
      </div>

      {/* Venous Access Section */}
      <VenousAccessSection
        patientId={patient.id}
        venousAccess={patient.venous_access || []}
        hasActiveVasoactiveDrugs={(patient.vasoactive_drugs?.filter(d => d.is_active).length || 0) > 0}
        onUpdate={onUpdate}
      />

      {/* Vasoactive Drugs */}
      <div className="section-card">
        <div className="section-title justify-between">
          <div className="flex items-center gap-2">
            <Syringe className="h-4 w-4 text-[hsl(var(--status-dva))]" />
            Drogas Vasoativas
          </div>
          
          {/* Add DVA dropdown - now in title */}
          {(() => {
            const activeDvaNames = new Set(patient.vasoactive_drugs?.filter(d => d.is_active).map(d => d.drug_name) || []);
            const availableDvas = Object.entries(VASOACTIVE_DRUGS).filter(([name]) => !activeDvaNames.has(name));
            
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {DVA_CATEGORIES.map((category, idx) => {
                    const categoryDvas = availableDvas.filter(([, config]) => config.category === category.key);
                    if (categoryDvas.length === 0) return null;
                    
                    return (
                      <div key={category.key}>
                        {idx > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className="text-xs">
                          {category.emoji} {category.label}
                        </DropdownMenuLabel>
                        {categoryDvas.map(([name]) => (
                          <DropdownMenuItem
                            key={name}
                            onClick={() => handleAddDva(name)}
                            className="cursor-pointer pl-6"
                          >
                            {name}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
        </div>
        
        <div className="mt-3">
          {/* Active DVAs as removable badges */}
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-2 items-center">
              {patient.vasoactive_drugs?.filter(d => d.is_active).map(dva => {
                const config = VASOACTIVE_DRUGS[dva.drug_name];
                const badgeColor = config?.color || 'hsl(var(--muted-foreground))';
                const concentrationUgMl = (dva as any).concentration_ug_ml as number | null;
                const calculatedDose = calculateDoseUgKgMin(dva.dose_ml_h, concentrationUgMl, patient.weight);
                const startDate = (dva as any).start_date || dva.created_at.split('T')[0];
                const days = Math.ceil((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div
                    key={dva.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm"
                    style={{
                      backgroundColor: `${badgeColor}15`,
                      borderColor: `${badgeColor}40`,
                      borderWidth: '1px',
                      color: badgeColor
                    }}
                  >
                    <span className="font-medium">{dva.drug_name}</span>
                    <EditableDayBadge
                      days={days}
                      startDate={new Date(startDate)}
                      onDateChange={(date) => handleUpdateDvaDate(dva.id, date)}
                      className="text-xs opacity-80"
                    />
                    <Input
                      type="number"
                      value={dvaInputs[dva.drug_name] ?? dva.dose_ml_h}
                      onChange={(e) => setDvaInputs(prev => ({ ...prev, [dva.drug_name]: e.target.value }))}
                      onBlur={() => {
                        const val = parseFloat(dvaInputs[dva.drug_name]?.toString() || dva.dose_ml_h.toString());
                        if (dvaInputs[dva.drug_name] !== undefined) {
                          handleUpdateDva(dva.drug_name, val);
                        }
                      }}
                      className="w-14 h-6 text-xs text-center bg-background/50 border-0 p-1"
                      style={{ color: 'inherit' }}
                    />
                    <span className="text-xs opacity-80">ml/h</span>
                    
                    {/* Show calculated dose in µg/kg/min if available */}
                    {config?.supportsUgKgMin && calculatedDose !== null && (
                      <span className="text-xs opacity-60">
                        ({calculatedDose.toFixed(2)} µg/kg/min)
                      </span>
                    )}
                    
                    {/* Calculator for drugs that support µg/kg/min */}
                    {config?.supportsUgKgMin && (
                      <VasoactiveDrugCalculator
                        drugName={dva.drug_name}
                        concentrations={config.concentrations}
                        patientWeight={patient.weight}
                        currentDoseMlH={dva.dose_ml_h}
                        onApply={(dose, concentration) => handleUpdateDva(dva.drug_name, dose, concentration)}
                      />
                    )}
                    
                    <button
                      onClick={() => handleRemoveDva(dva.id)}
                      disabled={isLoading}
                      className="ml-0.5 p-0.5 rounded hover:bg-foreground/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}

              {/* Empty state */}
              {(!patient.vasoactive_drugs || patient.vasoactive_drugs.filter(d => d.is_active).length === 0) && (
                <span className="text-sm text-muted-foreground">Nenhuma droga vasoativa</span>
              )}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Antibiotics / Infectology */}
      <div className="section-card">
        <div className="section-title justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-[hsl(var(--status-atb))]" />
            Infectologia
          </div>
          
          {/* Add antibiotic dropdown - now in title */}
          {(() => {
            const activeAtbNames = new Set(patient.antibiotics?.map(a => a.antibiotic_name) || []);
            
            return (
              <DropdownMenu onOpenChange={(open) => { if (!open) { setShowAtbInput(false); setNewAtb(''); } }}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-7 w-7">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
                  {/* Antibiotics by category */}
                  {ATB_CATEGORIES.map((category, idx) => {
                    const categoryAtbs = Object.entries(COMMON_ANTIBIOTICS)
                      .filter(([name, config]) => config.category === category.key && !activeAtbNames.has(name));
                    
                    if (categoryAtbs.length === 0) return null;
                    
                    return (
                      <div key={category.key}>
                        {idx > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className="text-xs">
                          {category.emoji} {category.label}
                        </DropdownMenuLabel>
                        {categoryAtbs.map(([name]) => (
                          <DropdownMenuItem
                            key={name}
                            onClick={() => handleAddAntibioticByName(name)}
                            className="cursor-pointer pl-6"
                          >
                            {name}
                          </DropdownMenuItem>
                        ))}
                      </div>
                    );
                  })}
                  
                  {/* Custom antibiotic option */}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs">🏷️ Personalizado</DropdownMenuLabel>
                  {!showAtbInput ? (
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.preventDefault();
                        setShowAtbInput(true);
                      }}
                      className="cursor-pointer pl-6"
                    >
                      <Plus className="h-3.5 w-3.5 mr-2" />
                      Adicionar outro...
                    </DropdownMenuItem>
                  ) : (
                    <div className="px-2 py-1.5">
                      <Input
                        autoFocus
                        placeholder="Nome do antibiótico..."
                        value={newAtb}
                        onChange={(e) => setNewAtb(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newAtb.trim()) {
                            handleAddAntibiotic();
                            setShowAtbInput(false);
                          }
                          if (e.key === 'Escape') {
                            setShowAtbInput(false);
                            setNewAtb('');
                          }
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
        </div>
        
        <div className="mt-3">
          {patient.antibiotics && patient.antibiotics.length > 0 ? (
            <div className="space-y-0">
              {patient.antibiotics.map(atb => {
                const days = Math.ceil((new Date().getTime() - new Date(atb.start_date).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={atb.id} className="atb-row">
                    <div className="atb-info">
                      <span className="atb-name">{atb.antibiotic_name}</span>
                      <span className="atb-date ml-2">
                        Início: {new Date(atb.start_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <EditableDayBadge
                      days={days}
                      startDate={new Date(atb.start_date)}
                      onDateChange={(date) => handleUpdateAntibioticDate(atb.id, date)}
                      className="atb-day"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 ml-2 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveAntibiotic(atb.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Nenhum antibiótico em uso
            </p>
          )}
        </div>
      </div>

      {/* Prophylaxis */}
      <div className="section-card">
        <div className="section-title justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Profilaxias
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {Object.entries(PROPHYLAXIS_TYPES)
                .filter(([type]) => !activeProphylaxisTypes.has(type))
                .map(([type, config]) => (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => handleAddProphylaxis(type)}
                    className="cursor-pointer"
                  >
                    <span className="mr-2">{config.emoji}</span>
                    {config.label}
                  </DropdownMenuItem>
                ))}
              {Object.keys(PROPHYLAXIS_TYPES).every(type => activeProphylaxisTypes.has(type)) && (
                <DropdownMenuItem disabled>
                  Todas as profilaxias já estão ativas
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="mt-3">
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-2 items-center">
              {patient.prophylaxis?.filter(p => p.is_active).map(prophylaxis => {
                const config = PROPHYLAXIS_TYPES[prophylaxis.prophylaxis_type];
                return (
                  <Tooltip key={prophylaxis.id}>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-sm">
                        <span className="mr-0.5">{config?.emoji || '🛡️'}</span>
                        <span className="font-medium">
                          {prophylaxis.prophylaxis_type === 'PROT_GASTRICA' 
                            ? 'Prot. Gástrica' 
                            : prophylaxis.prophylaxis_type}
                        </span>
                        <button
                          onClick={() => handleRemoveProphylaxis(prophylaxis.id)}
                          disabled={isLoading}
                          className="ml-0.5 p-0.5 rounded hover:bg-primary/20 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{config?.label || prophylaxis.prophylaxis_type}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Empty state */}
              {(!patient.prophylaxis || patient.prophylaxis.filter(p => p.is_active).length === 0) && (
                <span className="text-sm text-muted-foreground">Nenhuma profilaxia ativa</span>
              )}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Diet */}
      <div className="section-card">
        <div className="section-title justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-amber-500" />
            Dieta
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1">
                {patient.diet_type ? (
                  <>
                    <span>{DIET_TYPES[patient.diet_type]?.emoji}</span>
                    <span className="text-xs">{DIET_TYPES[patient.diet_type]?.label}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Selecionar</span>
                )}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {Object.entries(DIET_TYPES).map(([type, config]) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => handleUpdateDiet(type as DietType)}
                  className={`cursor-pointer ${patient.diet_type === type ? 'bg-accent' : ''}`}
                >
                  <span className="mr-2">{config.emoji}</span>
                  {config.label}
                </DropdownMenuItem>
              ))}
              {patient.diet_type && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleUpdateDiet(null)}
                    className="cursor-pointer text-muted-foreground"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remover dieta
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="mt-3">
          {patient.diet_type ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
              <span>{DIET_TYPES[patient.diet_type]?.emoji}</span>
              <span className="font-medium">{DIET_TYPES[patient.diet_type]?.label}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Nenhuma dieta definida</span>
          )}
        </div>
      </div>
    </div>
  );
}
