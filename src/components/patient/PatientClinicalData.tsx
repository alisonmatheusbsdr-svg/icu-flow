import { useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, Trash2, AlertCircle, Syringe, Activity, Pill, X, ChevronDown, Shield, Utensils, AlertTriangle, CheckCircle, Link2, TestTube } from 'lucide-react';
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
import { VenousAccessSection, ACCESS_TYPES, INSERTION_SITES } from './VenousAccessSection';
import { RespiratorySection } from './RespiratorySection';
import { PatientExamsDialog } from './PatientExamsDialog';
import { PatientRegulation } from './PatientRegulation';
import { PatientPrecautions } from './PatientPrecautions';
import type { PatientWithDetails, DietType } from '@/types/database';

// Derived devices - these are automatically shown based on other sections
const DERIVED_DEVICES = ['TOT', 'TQT', 'CVC', 'CVD'];

// Access types that represent central venous catheters
const CENTRAL_ACCESS_TYPES = ['central_nao_tunelizado', 'central_tunelizado', 'hemodialise'];

interface PatientClinicalDataProps {
  patient: PatientWithDetails;
  onUpdate: () => void;
}

// Standard devices with labels
const DEVICE_LABELS: Record<string, string> = {
  'TOT': 'Tubo Orotraqueal',
  'TQT': 'Traqueostomia',
  'CVD': 'Cateter Venoso Duplo-lúmen',
  'CVC': 'Cateter Venoso Central',
  'PAI': 'Pressão Arterial Invasiva',
  'SNE': 'Sonda Nasoenteral',
  'SVD': 'Sonda Vesical de Demora'
};

const STANDARD_DEVICES = Object.keys(DEVICE_LABELS);

// Selectable devices (excluding derived ones that come from other sections)
const SELECTABLE_DEVICES = STANDARD_DEVICES.filter(d => !DERIVED_DEVICES.includes(d));

// Mutually exclusive devices - adding one removes the other
const MUTUALLY_EXCLUSIVE_DEVICES: Record<string, string> = {
  'TOT': 'TQT',
  'TQT': 'TOT'
};

// Device alert thresholds (in days) with messages
// ok: green, warning: yellow, danger: red
const DEVICE_THRESHOLDS: Record<string, { 
  ok: number; 
  warning: number; 
  danger: number; 
  message: { warning: string; danger: string } 
}> = {
  'SVD': { 
    ok: 21, 
    warning: 28, 
    danger: 30,
    message: { 
      warning: 'Considerar remoção - avaliar indicação', 
      danger: 'Excedeu 30 dias - risco de ITU' 
    }
  },
  'SNE': { 
    ok: 21, 
    warning: 28, 
    danger: 30,
    message: { 
      warning: 'Avaliar integridade da sonda', 
      danger: 'Considerar troca' 
    }
  },
  'PAI': { 
    ok: 3, 
    warning: 4, 
    danger: 5,
    message: { 
      warning: 'Trocar sistema em breve (96h)', 
      danger: 'Excedeu 96h - trocar sistema' 
    }
  },
  'TOT': { 
    ok: 7,
    warning: 14, 
    danger: 15,
    message: { 
      warning: 'Considerar traqueostomia', 
      danger: 'Recomendado traqueostomia após 15 dias' 
    }
  },
  'TQT': { ok: -1, warning: -1, danger: -1, message: { warning: '', danger: '' } }, // No limit
  'CVC': { ok: -1, warning: -1, danger: -1, message: { warning: '', danger: '' } }, // Managed in VenousAccess
  'CVD': { ok: -1, warning: -1, danger: -1, message: { warning: '', danger: '' } }, // Managed in VenousAccess
};

// Alert styles for consistent colors
const ALERT_STYLES = {
  ok: {
    bg: 'hsl(142, 71%, 45%, 0.15)',
    border: 'hsl(142, 71%, 45%, 0.4)',
    text: 'hsl(142, 71%, 35%)',
    icon: 'text-green-600'
  },
  warning: {
    bg: 'hsl(45, 93%, 47%, 0.15)',
    border: 'hsl(45, 93%, 47%, 0.5)',
    text: 'hsl(45, 93%, 35%)',
    icon: 'text-amber-500'
  },
  danger: {
    bg: 'hsl(0, 72%, 51%, 0.15)',
    border: 'hsl(0, 72%, 51%, 0.5)',
    text: 'hsl(0, 72%, 45%)',
    icon: 'text-red-500'
  }
};

// Get alert level for a device
const getDeviceAlertLevel = (deviceType: string, days: number): 'ok' | 'warning' | 'danger' => {
  const thresholds = DEVICE_THRESHOLDS[deviceType.toUpperCase()];
  if (!thresholds || thresholds.danger === -1) return 'ok';
  if (days >= thresholds.danger) return 'danger';
  if (days >= thresholds.warning) return 'warning';
  return 'ok';
};

// Get alert message for a device
const getDeviceAlertMessage = (deviceType: string, level: 'ok' | 'warning' | 'danger'): string | null => {
  if (level === 'ok') return null;
  const thresholds = DEVICE_THRESHOLDS[deviceType.toUpperCase()];
  return thresholds?.message[level] || null;
};

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
  const [isExamsDialogOpen, setIsExamsDialogOpen] = useState(false);

  // Calculate days for a device
  const getDeviceDays = (insertionDate: string) => {
    return Math.ceil((new Date().getTime() - new Date(insertionDate).getTime()) / (1000 * 60 * 60 * 24));
  };

  // Get active device types
  const activeDeviceTypes = new Set(patient.invasive_devices?.map(d => d.device_type.toUpperCase()) || []);

  // Get available devices with their disabled status (only selectable devices)
  const getDevicesWithStatus = () => {
    return SELECTABLE_DEVICES.filter(device => !activeDeviceTypes.has(device))
      .map(device => {
        const exclusiveDevice = MUTUALLY_EXCLUSIVE_DEVICES[device];
        const isDisabled = !!(exclusiveDevice && activeDeviceTypes.has(exclusiveDevice));
        return { device, isDisabled };
      });
  };

  // Get derived device from respiratory support (TOT or TQT)
  const getDerivedRespiratoryDevice = () => {
    if (!patient.respiratory_support) return null;
    
    const modality = patient.respiratory_support.modality;
    
    if (modality === 'tot') {
      const intubationDate = patient.respiratory_support.intubation_date;
      const days = intubationDate 
        ? Math.ceil((Date.now() - new Date(intubationDate).getTime()) / 86400000)
        : null;
      return { type: 'TOT', days, source: 'respiratory' as const };
    }
    
    if (modality === 'traqueostomia') {
      return { type: 'TQT', days: null, source: 'respiratory' as const };
    }
    
    return null;
  };

  // Get derived devices from venous access (CVC)
  const getDerivedVenousDevices = () => {
    const centralAccesses = (patient.venous_access || [])
      .filter(a => CENTRAL_ACCESS_TYPES.includes(a.access_type));
    
    return centralAccesses.map(access => ({
      type: 'CVC',
      days: Math.ceil((Date.now() - new Date(access.insertion_date).getTime()) / 86400000),
      source: 'venous_access' as const,
      details: INSERTION_SITES[access.insertion_site]?.label || access.insertion_site,
      accessType: ACCESS_TYPES[access.access_type]?.shortLabel || 'CVC',
      accessId: access.id
    }));
  };

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
    
    const normalizedType = deviceType.toUpperCase();
    
    // Check for mutually exclusive device and remove it
    const exclusiveDevice = MUTUALLY_EXCLUSIVE_DEVICES[normalizedType];
    if (exclusiveDevice) {
      const existingExclusive = patient.invasive_devices?.find(
        d => d.device_type.toUpperCase() === exclusiveDevice && d.is_active !== false
      );
      if (existingExclusive) {
        await supabase
          .from('invasive_devices')
          .update({ is_active: false })
          .eq('id', existingExclusive.id);
        toast.info(`${exclusiveDevice} removido automaticamente`);
      }
    }
    
    const { error } = await supabase.from('invasive_devices').insert({
      patient_id: patient.id,
      device_type: normalizedType,
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
    
    setDvaInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[dvaName];
      return newInputs;
    });
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

  // Check if patient is on TOT (Orotracheal Tube)
  const isPatientOnTOT = () => {
    return patient.respiratory_support?.modality === 'tot';
  };

  // Update diet type
  const handleUpdateDiet = async (dietType: DietType) => {
    // Block oral diet if patient is on TOT
    if (dietType === 'oral' && isPatientOnTOT()) {
      toast.error('Dieta oral não permitida para pacientes em uso de TOT');
      return;
    }

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
              {getDevicesWithStatus().map(({ device, isDisabled }) => (
                <DropdownMenuItem
                  key={device}
                  onClick={() => !isDisabled && handleAddDevice(device)}
                  disabled={isDisabled}
                  className={cn(
                    isDisabled 
                      ? "opacity-50 cursor-not-allowed text-gray-400" 
                      : "cursor-pointer"
                  )}
                >
                  <span className={cn("font-medium", isDisabled && "text-gray-400")}>
                    {device}
                  </span>
                  <span className={cn(
                    "ml-2 text-xs",
                    isDisabled ? "text-gray-300" : "text-muted-foreground"
                  )}>
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
              {/* Derived device from Respiratory Support (TOT or TQT) */}
              {(() => {
                const derivedResp = getDerivedRespiratoryDevice();
                if (!derivedResp) return null;
                
                const days = derivedResp.days || 0;
                const alertLevel = getDeviceAlertLevel(derivedResp.type, days);
                const alertMessage = getDeviceAlertMessage(derivedResp.type, alertLevel);
                const styles = ALERT_STYLES[alertLevel];
                
                return (
                  <Tooltip key={`derived-${derivedResp.type}`}>
                    <TooltipTrigger asChild>
                      <div 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm"
                        style={{
                          backgroundColor: styles.bg,
                          borderColor: styles.border,
                          borderWidth: '1px',
                          color: styles.text
                        }}
                      >
                        <span className="font-medium">{derivedResp.type}</span>
                        {derivedResp.days !== null && (
                          <span className="text-xs opacity-80">D{derivedResp.days}</span>
                        )}
                        {alertLevel === 'warning' && (
                          <AlertTriangle className={`h-3.5 w-3.5 ${styles.icon}`} />
                        )}
                        {alertLevel === 'danger' && (
                          <AlertCircle className={`h-3.5 w-3.5 ${styles.icon}`} />
                        )}
                        <Link2 className="h-3 w-3 opacity-50" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{DEVICE_LABELS[derivedResp.type]}</p>
                      <p className="text-xs text-muted-foreground">Derivado do Suporte Respiratório</p>
                      {derivedResp.days !== null && (
                        <p className="text-xs">Intubação há {derivedResp.days} dias</p>
                      )}
                      {alertMessage && (
                        <p className={`text-xs mt-1 ${styles.icon}`}>
                          {alertLevel === 'warning' ? '⚠️' : '🚨'} {alertMessage}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })()}

              {/* Derived devices from Venous Access (CVC) */}
              {getDerivedVenousDevices().map(derivedCvc => {
                const alertLevel = 'ok' as const; // CVC alerts are handled in VenousAccessSection
                const styles = ALERT_STYLES[alertLevel];
                
                return (
                  <Tooltip key={`derived-cvc-${derivedCvc.accessId}`}>
                    <TooltipTrigger asChild>
                      <div 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm"
                        style={{
                          backgroundColor: styles.bg,
                          borderColor: styles.border,
                          borderWidth: '1px',
                          color: styles.text
                        }}
                      >
                        <span className="font-medium">{derivedCvc.accessType}</span>
                        <span className="text-xs opacity-80">D{derivedCvc.days}</span>
                        <Link2 className="h-3 w-3 opacity-50" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">Cateter Venoso Central</p>
                      <p className="text-xs text-muted-foreground">Derivado de Acessos Venosos</p>
                      <p className="text-xs">{derivedCvc.details}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Standard active devices (only selectable ones - PAI, SNE, SVD) */}
              {SELECTABLE_DEVICES.filter(device => activeDeviceTypes.has(device)).map(device => {
                const deviceData = patient.invasive_devices?.find(d => d.device_type.toUpperCase() === device);
                const days = deviceData ? getDeviceDays(deviceData.insertion_date) : 0;
                const alertLevel = getDeviceAlertLevel(device, days);
                const alertMessage = getDeviceAlertMessage(device, alertLevel);
                const styles = ALERT_STYLES[alertLevel];
                
                return (
                  <Tooltip key={device}>
                    <TooltipTrigger asChild>
                      <div 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm"
                        style={{
                          backgroundColor: styles.bg,
                          borderColor: styles.border,
                          borderWidth: '1px',
                          color: styles.text
                        }}
                      >
                        <span className="font-medium">{device}</span>
                        {deviceData && (
                          <EditableDayBadge
                            days={days}
                            startDate={new Date(deviceData.insertion_date)}
                            onDateChange={(date) => handleUpdateDeviceDate(deviceData.id, date)}
                            className="text-xs opacity-80"
                          />
                        )}
                        {alertLevel === 'warning' && (
                          <AlertTriangle className={`h-3.5 w-3.5 ${styles.icon}`} />
                        )}
                        {alertLevel === 'danger' && (
                          <AlertCircle className={`h-3.5 w-3.5 ${styles.icon}`} />
                        )}
                        <button
                          onClick={() => deviceData && handleRemoveDevice(deviceData.id)}
                          disabled={isLoading}
                          className="ml-0.5 p-0.5 rounded hover:bg-foreground/10 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{DEVICE_LABELS[device]}</p>
                      {deviceData && (
                        <p className="text-xs">Inserção: {new Date(deviceData.insertion_date).toLocaleDateString('pt-BR')}</p>
                      )}
                      {alertMessage && (
                        <p className={`text-xs mt-1 ${styles.icon}`}>
                          {alertLevel === 'warning' ? '⚠️' : '🚨'} {alertMessage}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Custom active devices (non-standard) */}
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

              {/* Empty state - only show if no devices at all (including derived) */}
              {(!patient.invasive_devices || patient.invasive_devices.length === 0) && 
               !getDerivedRespiratoryDevice() && 
               getDerivedVenousDevices().length === 0 && (
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
                        const inputValue = dvaInputs[dva.drug_name];
                        // Only update if there's a value in the input AND it's different from current
                        if (inputValue !== undefined && inputValue !== '') {
                          const val = parseFloat(inputValue.toString());
                          if (!isNaN(val) && val !== dva.dose_ml_h) {
                            handleUpdateDva(dva.drug_name, val);
                          } else {
                            // Clear input if value is invalid or unchanged
                            setDvaInputs(prev => {
                              const newInputs = { ...prev };
                              delete newInputs[dva.drug_name];
                              return newInputs;
                            });
                          }
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

      {/* Respiratory Support Section - After DVA */}
      <RespiratorySection
        patientId={patient.id}
        respiratorySupport={patient.respiratory_support || null}
        currentDietType={patient.diet_type}
        onUpdate={onUpdate}
      />

      {/* Antibiotics / Antibioticoterapia */}
      <div className="section-card">
        <div className="section-title justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-[hsl(var(--status-atb))]" />
            Antibioticoterapia
          </div>
          
          <div className="flex items-center gap-2">
            {/* Button to open cultures */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => setIsExamsDialogOpen(true)}
            >
              <TestTube className="h-3.5 w-3.5" />
              Culturas
            </Button>
            
            {/* Add antibiotic dropdown */}
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
              {Object.entries(DIET_TYPES).map(([type, config]) => {
                const isDisabledByTOT = type === 'oral' && isPatientOnTOT();
                
                return (
                  <DropdownMenuItem
                    key={type}
                    onClick={() => !isDisabledByTOT && handleUpdateDiet(type as DietType)}
                    disabled={isDisabledByTOT}
                    className={cn(
                      'cursor-pointer',
                      patient.diet_type === type && 'bg-accent',
                      isDisabledByTOT && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span className="mr-2">{config.emoji}</span>
                    {config.label}
                    {isDisabledByTOT && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        (TOT ativo)
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
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

      {/* Precautions Section */}
      <div className="section-card">
        <PatientPrecautions 
          patient={patient} 
          onUpdate={onUpdate} 
        />
      </div>

      {/* Regulation Section */}
      <div className="section-card">
        <PatientRegulation
          patientId={patient.id}
          regulations={patient.patient_regulation || []}
          onUpdate={onUpdate}
        />
      </div>

      {/* Exams Dialog - opens filtered to Cultures */}
      <PatientExamsDialog
        patientId={patient.id}
        isOpen={isExamsDialogOpen}
        onClose={() => setIsExamsDialogOpen(false)}
        onUpdate={onUpdate}
        initialTypeFilter="cultura"
      />
    </div>
  );
}
