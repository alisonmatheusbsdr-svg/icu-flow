import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Wind, Edit2, AlertTriangle } from 'lucide-react';
import { EditRespiratoryDialog } from './EditRespiratoryDialog';
import type { DietType } from '@/types/database';

export interface RespiratorySupport {
  id: string;
  patient_id: string;
  modality: string;
  spo2_target: number | null;
  flow_rate: number | null;
  fio2: number | null;
  vni_type: string | null;
  vni_tolerance: string | null;
  intubation_date: string | null;
  ventilator_mode: string | null;
  peep: number | null;
  volume_or_pressure: number | null;
  is_sedated: boolean;
  cannula_type: string | null;
  cuff_status: string | null;
  on_ventilation: boolean;
  clinical_status: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RespiratorySectionProps {
  patientId: string;
  respiratorySupport: RespiratorySupport | null;
  currentDietType?: DietType;
  onUpdate: () => void;
}

// Modality configuration
export const MODALITY_CONFIG: Record<string, { label: string; badge: string; color: string }> = {
  'ar_ambiente': { label: 'Ar Ambiente', badge: 'AA', color: 'hsl(var(--status-success))' },
  'cateter_nasal': { label: 'Cateter Nasal', badge: 'O₂', color: 'hsl(217, 91%, 60%)' },
  'mascara_simples': { label: 'Máscara Simples', badge: 'O₂', color: 'hsl(217, 91%, 60%)' },
  'mascara_reservatorio': { label: 'Máscara c/ Reservatório', badge: 'O₂', color: 'hsl(45, 93%, 47%)' },
  'vni': { label: 'VNI (CPAP/BiPAP)', badge: 'VNI', color: 'hsl(25, 95%, 53%)' },
  'tot': { label: 'TOT (Ventilação Invasiva)', badge: 'TOT', color: 'hsl(0, 72%, 51%)' },
  'traqueostomia': { label: 'Traqueostomia', badge: 'TQT', color: 'hsl(280, 67%, 55%)' },
};

export const CLINICAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  'estavel': { label: 'Estável', color: 'hsl(var(--status-success))' },
  'dependente_o2': { label: 'Dependente de O₂', color: 'hsl(45, 93%, 47%)' },
  'desmame': { label: 'Desmame em andamento', color: 'hsl(217, 91%, 60%)' },
  'alto_risco': { label: 'Alto risco de falha', color: 'hsl(25, 95%, 53%)' },
  'paliativo': { label: 'Paliativo / conforto', color: 'hsl(var(--muted-foreground))' },
};

export function RespiratorySection({ patientId, respiratorySupport, currentDietType, onUpdate }: RespiratorySectionProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const modality = respiratorySupport?.modality || 'ar_ambiente';
  const config = MODALITY_CONFIG[modality] || MODALITY_CONFIG['ar_ambiente'];
  const clinicalConfig = respiratorySupport?.clinical_status 
    ? CLINICAL_STATUS_CONFIG[respiratorySupport.clinical_status] 
    : null;

  // Calculate days for TOT
  const getTotDays = () => {
    if (!respiratorySupport?.intubation_date) return 0;
    return Math.ceil((new Date().getTime() - new Date(respiratorySupport.intubation_date).getTime()) / (1000 * 60 * 60 * 24));
  };

  // Generate alerts
  const getAlerts = () => {
    const alerts: { message: string; color: string }[] = [];
    
    if (!respiratorySupport) return alerts;

    // Cateter nasal ≥ 5 L/min
    if (modality === 'cateter_nasal' && respiratorySupport.flow_rate && respiratorySupport.flow_rate >= 5) {
      alerts.push({ message: 'Fluxo elevado - Avaliar máscara/VNI', color: 'hsl(45, 93%, 47%)' });
    }

    // VNI tolerância ruim
    if (modality === 'vni' && respiratorySupport.vni_tolerance === 'ruim') {
      alerts.push({ message: 'VNI com tolerância ruim - Risco de falha', color: 'hsl(0, 72%, 51%)' });
    }

    // TOT > 7 dias
    if (modality === 'tot' && getTotDays() > 7) {
      alerts.push({ message: `TOT > 7 dias (D${getTotDays()}) - Considerar traqueostomia`, color: 'hsl(45, 93%, 47%)' });
    }

    // TOT + FiO2 > 60%
    if (modality === 'tot' && respiratorySupport.fio2 && respiratorySupport.fio2 > 60) {
      alerts.push({ message: `FiO₂ elevada (${respiratorySupport.fio2}%)`, color: 'hsl(25, 95%, 53%)' });
    }

    // TOT sem data de intubação
    if (modality === 'tot' && !respiratorySupport.intubation_date) {
      alerts.push({ message: 'Data de IOT não preenchida', color: 'hsl(0, 72%, 51%)' });
    }

    return alerts;
  };

  const alerts = getAlerts();

  // Render parameters based on modality
  const renderParameters = () => {
    if (!respiratorySupport) return null;

    const params: string[] = [];

    switch (modality) {
      case 'ar_ambiente':
        if (respiratorySupport.spo2_target) params.push(`SpO₂: ${respiratorySupport.spo2_target}%`);
        break;
      case 'cateter_nasal':
      case 'mascara_simples':
      case 'mascara_reservatorio':
        if (respiratorySupport.flow_rate) params.push(`Fluxo: ${respiratorySupport.flow_rate} L/min`);
        if (respiratorySupport.spo2_target) params.push(`SpO₂ alvo: ${respiratorySupport.spo2_target}%`);
        break;
      case 'vni':
        if (respiratorySupport.vni_type) params.push(`Tipo: ${respiratorySupport.vni_type.toUpperCase()}`);
        if (respiratorySupport.vni_tolerance) params.push(`Tolerância: ${respiratorySupport.vni_tolerance}`);
        if (respiratorySupport.fio2) params.push(`FiO₂: ${respiratorySupport.fio2}%`);
        break;
      case 'tot':
        if (respiratorySupport.ventilator_mode) params.push(`Modo: ${respiratorySupport.ventilator_mode}`);
        if (respiratorySupport.fio2) params.push(`FiO₂: ${respiratorySupport.fio2}%`);
        if (respiratorySupport.peep) params.push(`PEEP: ${respiratorySupport.peep}`);
        if (respiratorySupport.volume_or_pressure) params.push(`Vol/Pinsp: ${respiratorySupport.volume_or_pressure}`);
        if (respiratorySupport.intubation_date) params.push(`IOT: ${new Date(respiratorySupport.intubation_date).toLocaleDateString('pt-BR')}`);
        params.push(`Sedação: ${respiratorySupport.is_sedated ? 'Sim' : 'Não'}`);
        break;
      case 'traqueostomia':
        if (respiratorySupport.cannula_type) params.push(`Cânula: ${respiratorySupport.cannula_type}`);
        if (respiratorySupport.cuff_status) params.push(`Cuff: ${respiratorySupport.cuff_status}`);
        if (respiratorySupport.fio2) params.push(`FiO₂: ${respiratorySupport.fio2}%`);
        params.push(`Em ventilação: ${respiratorySupport.on_ventilation ? 'Sim' : 'Não'}`);
        break;
    }

    return params;
  };

  const params = renderParameters();

  return (
    <div className="section-card">
      <div className="section-title justify-between">
        <div className="flex items-center gap-2">
          <Wind className="h-4 w-4" style={{ color: config.color }} />
          Suporte Respiratório
        </div>
        
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => setIsEditOpen(true)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="mt-3 space-y-3">
        {/* Main status badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge 
            className="text-sm font-medium"
            style={{ 
              backgroundColor: `${config.color}20`,
              color: config.color,
              border: `1px solid ${config.color}40`
            }}
          >
            {config.badge}
          </Badge>
          <span className="text-sm font-medium">{config.label}</span>
          {modality === 'tot' && respiratorySupport?.intubation_date && (
            <Badge variant="outline" className="text-xs">
              D{getTotDays()}
            </Badge>
          )}
        </div>

        {/* Parameters */}
        {params && params.length > 0 && (
          <div className="bg-muted/50 rounded-md p-2 text-sm">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {params.map((param, idx) => (
                <span key={idx} className="text-muted-foreground">{param}</span>
              ))}
            </div>
          </div>
        )}

        {/* Clinical status */}
        {clinicalConfig && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Status:</span>
            <span 
              className="text-sm font-medium" 
              style={{ color: clinicalConfig.color }}
            >
              {clinicalConfig.label}
            </span>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-1.5">
            {alerts.map((alert, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md"
                style={{ 
                  backgroundColor: `${alert.color}15`,
                  color: alert.color 
                }}
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!respiratorySupport && (
          <p className="text-sm text-muted-foreground">
            Clique em editar para configurar o suporte respiratório
          </p>
        )}
      </div>

      <EditRespiratoryDialog
        patientId={patientId}
        respiratorySupport={respiratorySupport}
        currentDietType={currentDietType}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={onUpdate}
      />
    </div>
  );
}
