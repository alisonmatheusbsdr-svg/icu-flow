import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calculator, AlertCircle } from 'lucide-react';

interface Concentration {
  label: string;
  value: number; // µg/mL
}

interface VasoactiveDrugCalculatorProps {
  drugName: string;
  concentrations: Concentration[];
  patientWeight: number | null;
  currentDoseMlH: number;
  onApply: (doseMlH: number) => void;
}

export function VasoactiveDrugCalculator({
  drugName,
  concentrations,
  patientWeight,
  currentDoseMlH,
  onApply,
}: VasoactiveDrugCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState<string>(patientWeight?.toString() || '');
  const [concentration, setConcentration] = useState<string>('');
  const [customConcentration, setCustomConcentration] = useState<string>('');
  const [doseUgKgMin, setDoseUgKgMin] = useState<string>('');
  const [flowMlH, setFlowMlH] = useState<string>(currentDoseMlH > 0 ? currentDoseMlH.toString() : '');
  const [calculationMode, setCalculationMode] = useState<'toFlow' | 'toDose'>('toFlow');

  // Get the effective concentration value
  const getConcentrationValue = (): number | null => {
    if (concentration === 'custom') {
      const val = parseFloat(customConcentration);
      return isNaN(val) || val <= 0 ? null : val;
    }
    const val = parseFloat(concentration);
    return isNaN(val) || val <= 0 ? null : val;
  };

  // Calculate flow from dose
  // Formula: Flow (mL/h) = (Dose µg/kg/min × Weight kg × 60) / Concentration µg/mL
  const calculateFlow = () => {
    const w = parseFloat(weight);
    const c = getConcentrationValue();
    const d = parseFloat(doseUgKgMin);
    
    if (!w || !c || !d || w <= 0 || c <= 0 || d <= 0) return null;
    
    return (d * w * 60) / c;
  };

  // Calculate dose from flow
  // Formula: Dose (µg/kg/min) = (Flow mL/h × Concentration µg/mL) / (Weight kg × 60)
  const calculateDose = () => {
    const w = parseFloat(weight);
    const c = getConcentrationValue();
    const f = parseFloat(flowMlH);
    
    if (!w || !c || !f || w <= 0 || c <= 0 || f <= 0) return null;
    
    return (f * c) / (w * 60);
  };

  // Auto-calculate when inputs change
  useEffect(() => {
    if (calculationMode === 'toFlow' && doseUgKgMin) {
      const flow = calculateFlow();
      if (flow !== null) {
        setFlowMlH(flow.toFixed(1));
      }
    }
  }, [weight, concentration, customConcentration, doseUgKgMin, calculationMode]);

  useEffect(() => {
    if (calculationMode === 'toDose' && flowMlH) {
      const dose = calculateDose();
      if (dose !== null) {
        setDoseUgKgMin(dose.toFixed(3));
      }
    }
  }, [weight, concentration, customConcentration, flowMlH, calculationMode]);

  // Reset when opening
  useEffect(() => {
    if (open) {
      setWeight(patientWeight?.toString() || '');
      setFlowMlH(currentDoseMlH > 0 ? currentDoseMlH.toString() : '');
      setConcentration('');
      setCustomConcentration('');
      setDoseUgKgMin('');
      setCalculationMode('toFlow');
    }
  }, [open, patientWeight, currentDoseMlH]);

  const handleApply = () => {
    const flow = parseFloat(flowMlH);
    if (!isNaN(flow) && flow > 0) {
      onApply(flow);
      setOpen(false);
    }
  };

  const calculatedDose = calculationMode === 'toDose' ? null : calculateDose();
  const hasWeight = parseFloat(weight) > 0;
  const hasConcentration = getConcentrationValue() !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-0.5 rounded hover:bg-foreground/10 transition-colors opacity-60 hover:opacity-100"
          title="Calculadora de dosagem"
        >
          <Calculator className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="font-medium text-sm border-b pb-2">
            Calculadora - {drugName}
          </div>

          {/* Weight */}
          <div className="space-y-1.5">
            <Label className="text-xs">Peso do paciente</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Peso"
                className="h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">kg</span>
            </div>
            {!patientWeight && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Peso não cadastrado
              </p>
            )}
          </div>

          {/* Concentration */}
          <div className="space-y-1.5">
            <Label className="text-xs">Concentração</Label>
            <Select value={concentration} onValueChange={setConcentration}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {concentrations.map((c) => (
                  <SelectItem key={c.label} value={c.value.toString()}>
                    {c.label} ({c.value} µg/mL)
                  </SelectItem>
                ))}
                <SelectItem value="custom">Outra concentração...</SelectItem>
              </SelectContent>
            </Select>
            {concentration === 'custom' && (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  value={customConcentration}
                  onChange={(e) => setCustomConcentration(e.target.value)}
                  placeholder="Concentração"
                  className="h-8 text-sm"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">µg/mL</span>
              </div>
            )}
          </div>

          {/* Calculation inputs */}
          <div className="grid grid-cols-2 gap-3">
            {/* Dose input */}
            <div className="space-y-1.5">
              <Label className="text-xs">Dose</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="0.01"
                  value={doseUgKgMin}
                  onChange={(e) => {
                    setCalculationMode('toFlow');
                    setDoseUgKgMin(e.target.value);
                  }}
                  placeholder="--"
                  className="h-8 text-sm"
                  disabled={!hasWeight || !hasConcentration}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">µg/kg/min</span>
            </div>

            {/* Flow input */}
            <div className="space-y-1.5">
              <Label className="text-xs">Vazão</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="0.1"
                  value={flowMlH}
                  onChange={(e) => {
                    setCalculationMode('toDose');
                    setFlowMlH(e.target.value);
                  }}
                  placeholder="--"
                  className="h-8 text-sm"
                />
              </div>
              <span className="text-[10px] text-muted-foreground">ml/h</span>
            </div>
          </div>

          {/* Calculated result display */}
          {hasWeight && hasConcentration && parseFloat(flowMlH) > 0 && calculatedDose !== null && calculationMode === 'toDose' && (
            <div className="bg-muted/50 rounded-md p-2 text-center">
              <span className="text-xs text-muted-foreground">Dose: </span>
              <span className="font-medium text-sm">{calculatedDose.toFixed(3)} µg/kg/min</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!parseFloat(flowMlH) || parseFloat(flowMlH) <= 0}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
