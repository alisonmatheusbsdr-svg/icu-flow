import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Check, Plus, Trash2, AlertCircle, Syringe, Activity, Pill } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PatientWithDetails } from '@/types/database';

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

// Standard vasoactive drugs
const STANDARD_DVAS = [
  { name: 'Noradrenalina', max: 30 },
  { name: 'Vasopressina', max: 5 },
  { name: 'Dobutamina', max: 20 }
];

export function PatientClinicalData({ patient, onUpdate }: PatientClinicalDataProps) {
  const [newDevice, setNewDevice] = useState('');
  const [newAtb, setNewAtb] = useState('');
  const [dvaInputs, setDvaInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

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

  // Update DVA dose
  const handleUpdateDva = async (dvaName: string, dose: number) => {
    setIsLoading(true);
    const existing = getDvaByName(dvaName);
    
    if (dose <= 0 && existing) {
      // Remove if dose is 0
      await supabase.from('vasoactive_drugs').update({ is_active: false }).eq('id', existing.id);
      toast.success(`${dvaName} removida`);
    } else if (dose > 0) {
      if (existing) {
        await supabase.from('vasoactive_drugs').update({ dose_ml_h: dose }).eq('id', existing.id);
      } else {
        await supabase.from('vasoactive_drugs').insert({
          patient_id: patient.id,
          drug_name: dvaName,
          dose_ml_h: dose
        });
      }
      toast.success(`${dvaName} atualizada`);
    }
    
    setDvaInputs(prev => ({ ...prev, [dvaName]: '' }));
    onUpdate();
    setIsLoading(false);
  };

  // Add antibiotic
  const handleAddAntibiotic = async () => {
    if (!newAtb.trim()) return;
    setIsLoading(true);
    const { error } = await supabase.from('antibiotics').insert({
      patient_id: patient.id,
      antibiotic_name: newAtb,
      start_date: new Date().toISOString().split('T')[0]
    });
    if (error) toast.error('Erro ao adicionar antibiótico');
    else {
      toast.success('Antibiótico adicionado');
      setNewAtb('');
      onUpdate();
    }
    setIsLoading(false);
  };

  // Remove antibiotic
  const handleRemoveAntibiotic = async (atbId: string) => {
    setIsLoading(true);
    await supabase.from('antibiotics').update({ is_active: false }).eq('id', atbId);
    toast.success('Antibiótico removido');
    onUpdate();
    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Invasive Devices */}
      <div className="section-card">
        <div className="section-title">
          <Activity className="h-4 w-4 text-destructive" />
          Dispositivos Invasivos
        </div>
        <div className="space-y-2">
          {/* Standard devices as toggleable checkboxes */}
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-2 gap-2">
              {STANDARD_DEVICES.map(device => {
                const isActive = activeDeviceTypes.has(device);
                const deviceData = patient.invasive_devices?.find(d => d.device_type.toUpperCase() === device);
                return (
                  <Tooltip key={device}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleToggleDevice(device)}
                        disabled={isLoading}
                        className={`device-checkbox px-2 py-1.5 rounded border transition-colors ${
                          isActive 
                            ? 'bg-destructive/10 border-destructive/30 text-destructive' 
                            : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {isActive && <Check className="device-checkbox-icon" />}
                        <span className="font-medium">{device}</span>
                        {isActive && deviceData && (
                          <span className="text-xs ml-auto">D{getDeviceDays(deviceData.insertion_date)}</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{DEVICE_LABELS[device]}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Custom devices from DB that aren't standard */}
          {patient.invasive_devices?.filter(d => !STANDARD_DEVICES.includes(d.device_type.toUpperCase())).map(device => (
            <div key={device.id} className="device-checkbox px-2 py-1.5 rounded bg-destructive/10 border border-destructive/30">
              <Check className="device-checkbox-icon" />
              <span className="font-medium text-destructive">{device.device_type}</span>
              <span className="text-xs text-destructive ml-2">D{getDeviceDays(device.insertion_date)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto text-destructive hover:text-destructive"
                onClick={() => handleRemoveDevice(device.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Add custom device */}
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Drenos / Outros..."
              value={newDevice}
              onChange={(e) => setNewDevice(e.target.value)}
              className="text-sm"
            />
            <Button size="sm" onClick={() => handleAddDevice(newDevice)} disabled={!newDevice.trim() || isLoading}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Vasoactive Drugs */}
      <div className="section-card">
        <div className="section-title">
          <Syringe className="h-4 w-4 text-[hsl(var(--status-dva))]" />
          Drogas Vasoativas
        </div>
        <div className="space-y-1">
          {STANDARD_DVAS.map(dva => {
            const activeDva = getDvaByName(dva.name);
            const currentDose = activeDva?.dose_ml_h || 0;
            const percentage = Math.min((currentDose / dva.max) * 100, 100);
            
            return (
              <div key={dva.name} className="dva-row">
                <span className="dva-label">{dva.name}</span>
                <div className="dva-bar-container">
                  <div className="dva-bar-fill" style={{ width: `${percentage}%` }} />
                </div>
                <Input
                  type="number"
                  placeholder="--"
                  value={dvaInputs[dva.name] ?? (currentDose > 0 ? currentDose : '')}
                  onChange={(e) => setDvaInputs(prev => ({ ...prev, [dva.name]: e.target.value }))}
                  onBlur={() => {
                    const val = parseFloat(dvaInputs[dva.name] || '0');
                    if (dvaInputs[dva.name] !== undefined && dvaInputs[dva.name] !== '') {
                      handleUpdateDva(dva.name, val);
                    }
                  }}
                  className="w-20 h-8 text-sm text-right"
                />
                <span className="text-xs text-muted-foreground w-8">ml/h</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Antibiotics / Infectology */}
      <div className="section-card">
        <div className="section-title justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-[hsl(var(--status-atb))]" />
            Infectologia
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Novo antibiótico..."
              value={newAtb}
              onChange={(e) => setNewAtb(e.target.value)}
              className="w-40 h-7 text-sm"
            />
            <Button size="sm" variant="outline" onClick={handleAddAntibiotic} disabled={!newAtb.trim() || isLoading}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
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
                  <span className="atb-day">D{days}</span>
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
  );
}
