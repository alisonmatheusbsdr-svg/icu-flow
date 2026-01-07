import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { MODALITY_CONFIG, CLINICAL_STATUS_CONFIG, type RespiratorySupport } from './RespiratorySection';

interface EditRespiratoryDialogProps {
  patientId: string;
  respiratorySupport: RespiratorySupport | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const VNI_TYPES = [
  { value: 'cpap', label: 'CPAP' },
  { value: 'bipap', label: 'BiPAP' },
];

const VNI_TOLERANCE = [
  { value: 'boa', label: 'Boa' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'ruim', label: 'Ruim' },
];

const CANNULA_TYPES = [
  { value: 'plastica', label: 'Plástica' },
  { value: 'metalica', label: 'Metálica' },
];

const CUFF_STATUS = [
  { value: 'insuflado', label: 'Insuflado' },
  { value: 'desinsuflado', label: 'Desinsuflado' },
];

export function EditRespiratoryDialog({
  patientId,
  respiratorySupport,
  isOpen,
  onClose,
  onSuccess,
}: EditRespiratoryDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [modality, setModality] = useState(respiratorySupport?.modality || 'ar_ambiente');
  const [spo2Target, setSpo2Target] = useState(respiratorySupport?.spo2_target?.toString() || '');
  const [flowRate, setFlowRate] = useState(respiratorySupport?.flow_rate?.toString() || '');
  const [fio2, setFio2] = useState(respiratorySupport?.fio2?.toString() || '');
  const [vniType, setVniType] = useState(respiratorySupport?.vni_type || '');
  const [vniTolerance, setVniTolerance] = useState(respiratorySupport?.vni_tolerance || '');
  const [intubationDate, setIntubationDate] = useState(respiratorySupport?.intubation_date || '');
  const [ventilatorMode, setVentilatorMode] = useState(respiratorySupport?.ventilator_mode || '');
  const [peep, setPeep] = useState(respiratorySupport?.peep?.toString() || '');
  const [volumeOrPressure, setVolumeOrPressure] = useState(respiratorySupport?.volume_or_pressure?.toString() || '');
  const [isSedated, setIsSedated] = useState(respiratorySupport?.is_sedated || false);
  const [cannulaType, setCannulaType] = useState(respiratorySupport?.cannula_type || '');
  const [cuffStatus, setCuffStatus] = useState(respiratorySupport?.cuff_status || '');
  const [onVentilation, setOnVentilation] = useState(respiratorySupport?.on_ventilation || false);
  const [clinicalStatus, setClinicalStatus] = useState(respiratorySupport?.clinical_status || '');

  // Update form when respiratorySupport changes
  useEffect(() => {
    if (respiratorySupport) {
      setModality(respiratorySupport.modality || 'ar_ambiente');
      setSpo2Target(respiratorySupport.spo2_target?.toString() || '');
      setFlowRate(respiratorySupport.flow_rate?.toString() || '');
      setFio2(respiratorySupport.fio2?.toString() || '');
      setVniType(respiratorySupport.vni_type || '');
      setVniTolerance(respiratorySupport.vni_tolerance || '');
      setIntubationDate(respiratorySupport.intubation_date || '');
      setVentilatorMode(respiratorySupport.ventilator_mode || '');
      setPeep(respiratorySupport.peep?.toString() || '');
      setVolumeOrPressure(respiratorySupport.volume_or_pressure?.toString() || '');
      setIsSedated(respiratorySupport.is_sedated || false);
      setCannulaType(respiratorySupport.cannula_type || '');
      setCuffStatus(respiratorySupport.cuff_status || '');
      setOnVentilation(respiratorySupport.on_ventilation || false);
      setClinicalStatus(respiratorySupport.clinical_status || '');
    } else {
      // Reset to defaults for new entry
      setModality('ar_ambiente');
      setSpo2Target('');
      setFlowRate('');
      setFio2('');
      setVniType('');
      setVniTolerance('');
      setIntubationDate('');
      setVentilatorMode('');
      setPeep('');
      setVolumeOrPressure('');
      setIsSedated(false);
      setCannulaType('');
      setCuffStatus('');
      setOnVentilation(false);
      setClinicalStatus('');
    }
  }, [respiratorySupport, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = {
        patient_id: patientId,
        modality,
        spo2_target: spo2Target ? parseFloat(spo2Target) : null,
        flow_rate: flowRate ? parseFloat(flowRate) : null,
        fio2: fio2 ? parseFloat(fio2) : null,
        vni_type: vniType || null,
        vni_tolerance: vniTolerance || null,
        intubation_date: intubationDate || null,
        ventilator_mode: ventilatorMode || null,
        peep: peep ? parseFloat(peep) : null,
        volume_or_pressure: volumeOrPressure ? parseFloat(volumeOrPressure) : null,
        is_sedated: isSedated,
        cannula_type: cannulaType || null,
        cuff_status: cuffStatus || null,
        on_ventilation: onVentilation,
        clinical_status: clinicalStatus || null,
        is_active: true,
      };

      if (respiratorySupport?.id) {
        // Update existing
        const { error } = await supabase
          .from('respiratory_support')
          .update(data)
          .eq('id', respiratorySupport.id);
        
        if (error) throw error;
      } else {
        // First, deactivate any existing active records
        await supabase
          .from('respiratory_support')
          .update({ is_active: false })
          .eq('patient_id', patientId)
          .eq('is_active', true);

        // Insert new
        const { error } = await supabase
          .from('respiratory_support')
          .insert(data);
        
        if (error) throw error;
      }

      toast.success('Suporte respiratório atualizado!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar suporte respiratório:', error);
      toast.error('Erro ao salvar');
    } finally {
      setIsLoading(false);
    }
  };

  // Render dynamic fields based on modality
  const renderModalityFields = () => {
    switch (modality) {
      case 'ar_ambiente':
        return (
          <div className="space-y-2">
            <Label htmlFor="spo2">SpO₂ basal (%)</Label>
            <Input
              id="spo2"
              type="number"
              value={spo2Target}
              onChange={(e) => setSpo2Target(e.target.value)}
              placeholder="Ex: 96"
              min="0"
              max="100"
            />
          </div>
        );

      case 'cateter_nasal':
      case 'mascara_simples':
      case 'mascara_reservatorio':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="flowRate">Fluxo (L/min)</Label>
              <Input
                id="flowRate"
                type="number"
                value={flowRate}
                onChange={(e) => setFlowRate(e.target.value)}
                placeholder="Ex: 3"
                min="0"
                max="15"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spo2Target">SpO₂ alvo (%)</Label>
              <Input
                id="spo2Target"
                type="number"
                value={spo2Target}
                onChange={(e) => setSpo2Target(e.target.value)}
                placeholder="Ex: 92"
                min="0"
                max="100"
              />
            </div>
          </>
        );

      case 'vni':
        return (
          <>
            <div className="space-y-2">
              <Label>Tipo de VNI *</Label>
              <Select value={vniType} onValueChange={setVniType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {VNI_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tolerância</Label>
              <Select value={vniTolerance} onValueChange={setVniTolerance}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {VNI_TOLERANCE.map((tol) => (
                    <SelectItem key={tol.value} value={tol.value}>
                      {tol.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fio2">FiO₂ (%)</Label>
              <Input
                id="fio2"
                type="number"
                value={fio2}
                onChange={(e) => setFio2(e.target.value)}
                placeholder="Ex: 40"
                min="21"
                max="100"
              />
            </div>
          </>
        );

      case 'tot':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="intubationDate">Data da IOT *</Label>
              <Input
                id="intubationDate"
                type="date"
                value={intubationDate}
                onChange={(e) => setIntubationDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ventilatorMode">Modo Ventilatório</Label>
              <Input
                id="ventilatorMode"
                value={ventilatorMode}
                onChange={(e) => setVentilatorMode(e.target.value)}
                placeholder="Ex: VCV, PCV, PSV"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fio2Tot">FiO₂ (%) *</Label>
                <Input
                  id="fio2Tot"
                  type="number"
                  value={fio2}
                  onChange={(e) => setFio2(e.target.value)}
                  placeholder="Ex: 40"
                  min="21"
                  max="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peep">PEEP (cmH₂O)</Label>
                <Input
                  id="peep"
                  type="number"
                  value={peep}
                  onChange={(e) => setPeep(e.target.value)}
                  placeholder="Ex: 8"
                  min="0"
                  max="30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="volumeOrPressure">Volume corrente / Pinsp</Label>
              <Input
                id="volumeOrPressure"
                type="number"
                value={volumeOrPressure}
                onChange={(e) => setVolumeOrPressure(e.target.value)}
                placeholder="Ex: 450"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="sedated" className="cursor-pointer">
                Sedação
              </Label>
              <Switch
                id="sedated"
                checked={isSedated}
                onCheckedChange={setIsSedated}
              />
            </div>
          </>
        );

      case 'traqueostomia':
        return (
          <>
            <div className="space-y-2">
              <Label>Tipo de Cânula</Label>
              <Select value={cannulaType} onValueChange={setCannulaType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CANNULA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status do Cuff</Label>
              <Select value={cuffStatus} onValueChange={setCuffStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CUFF_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fio2Traq">FiO₂ (%)</Label>
              <Input
                id="fio2Traq"
                type="number"
                value={fio2}
                onChange={(e) => setFio2(e.target.value)}
                placeholder="Ex: 40"
                min="21"
                max="100"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="onVentilation" className="cursor-pointer">
                Em Ventilação Mecânica
              </Label>
              <Switch
                id="onVentilation"
                checked={onVentilation}
                onCheckedChange={setOnVentilation}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suporte Respiratório</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Modality selection */}
          <div className="space-y-2">
            <Label>Modalidade atual</Label>
            <Select value={modality} onValueChange={setModality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODALITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    [{config.badge}] {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic fields based on modality */}
          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium text-muted-foreground">
              Parâmetros - {MODALITY_CONFIG[modality]?.label}
            </p>
            {renderModalityFields()}
          </div>

          {/* Clinical status */}
          <div className="border-t pt-4 space-y-2">
            <Label>Situação Clínica Respiratória</Label>
            <Select value={clinicalStatus} onValueChange={setClinicalStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CLINICAL_STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
