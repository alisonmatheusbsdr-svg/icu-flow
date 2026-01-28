import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NIRBedCard } from './NIRBedCard';
import { NIREmptyBedCard } from './NIREmptyBedCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2, Building2, ChevronDown, Clock, FileCheck, Truck, CheckCircle2, XCircle, ListFilter, LayoutGrid, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, ACTIVE_STATUSES } from '@/lib/regulation-config';
import type { Bed, Patient, PatientRegulation, RegulationStatus } from '@/types/database';

interface Unit {
  id: string;
  name: string;
  bed_count: number;
}

interface PatientWithRegulation extends Patient {
  respiratory_modality?: string;
  has_active_dva?: boolean;
  patient_regulation?: PatientRegulation[];
  // Campos para cálculo de probabilidade de alta
  active_antibiotics_count?: number;
  active_devices_count?: number;
  has_central_access?: boolean;
  has_sepsis_or_shock?: boolean;
  has_tot_device?: boolean;
}

interface BedWithPatient extends Bed {
  patient?: PatientWithRegulation | null;
}

interface UnitWithBeds {
  unit: Unit;
  beds: BedWithPatient[];
  stats: {
    total: number;
    occupied: number;
    withRegulation: number;
    aguardando_regulacao: number;
    regulado: number;
    aguardando_transferencia: number;
    transferido: number;
    negado_nir: number;
    negado_hospital: number;
    // Stats para Visão Geral
    critical: number;
    probableDischarges: number;
  };
}

type ViewMode = 'regulation' | 'overview';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos os Status', icon: Building2 },
  { value: 'aguardando_regulacao', label: 'Aguardando Regulação', icon: Clock },
  { value: 'regulado', label: 'Regulados', icon: FileCheck },
  { value: 'aguardando_transferencia', label: 'Aguard. Transferência', icon: Truck },
  { value: 'transferido', label: 'Transferidos', icon: CheckCircle2 },
  { value: 'negado_nir', label: 'Negados (NIR)', icon: XCircle },
  { value: 'negado_hospital', label: 'Negados (Hospital)', icon: Building2 },
] as const;

// Função para calcular probabilidade de alta (reutilizada do BedCard)
const calculateDischargeProbability = (patient: PatientWithRegulation) => {
  if (patient.is_palliative) {
    return { probability: 100, status: 'palliative' as const, color: 'gray' as const };
  }
  
  const isOnTOT = patient.respiratory_modality === 'tot' || patient.has_tot_device;
  if (isOnTOT || patient.has_active_dva) {
    return { probability: 0, status: 'blocked' as const, color: 'red' as const };
  }
  
  let discount = 0;
  
  if (['traqueostomia', 'vni'].includes(patient.respiratory_modality || '')) {
    discount += 15;
  }
  
  const atbCount = patient.active_antibiotics_count || 0;
  if (atbCount >= 4) discount += 15;
  else if (atbCount === 3) discount += 10;
  else if (atbCount >= 1) discount += 5;
  
  const devCount = patient.active_devices_count || 0;
  if (devCount >= 6) discount += 15;
  else if (devCount >= 4) discount += 10;
  else if (devCount >= 2) discount += 5;
  
  if (patient.has_central_access) discount += 5;
  if (patient.has_sepsis_or_shock) discount += 10;
  
  const days = Math.ceil((Date.now() - new Date(patient.admission_date).getTime()) / 86400000);
  if (days > 30) discount += 10;
  else if (days > 14) discount += 5;
  
  const probability = Math.max(0, 100 - discount);
  
  let color: 'green' | 'yellow' | 'orange' | 'red' = 'green';
  if (probability < 30) color = 'red';
  else if (probability < 60) color = 'orange';
  else if (probability < 80) color = 'yellow';
  
  return { probability, status: 'normal' as const, color };
};

export function NIRDashboard() {
  const [unitsWithBeds, setUnitsWithBeds] = useState<UnitWithBeds[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('regulation');

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);

    // 1. Fetch all units
    const { data: units } = await supabase
      .from('units')
      .select('*')
      .order('name');

    if (!units || units.length === 0) {
      setUnitsWithBeds([]);
      setIsLoading(false);
      return;
    }

    // 2. Fetch all beds
    const { data: allBeds } = await supabase
      .from('beds')
      .select('*')
      .order('bed_number');

    // 3. Fetch all active patients
    const { data: allPatients } = await supabase
      .from('patients')
      .select('*')
      .eq('is_active', true);

    const patients = (allPatients || []).map(p => ({ ...p, weight: p.weight ?? null })) as Patient[];
    const patientIds = patients.map(p => p.id);

    // 4. Fetch clinical data and regulations in parallel
    let respiratoryModalities: { patient_id: string; modality: string }[] = [];
    let vasoactiveDrugs: { patient_id: string }[] = [];
    let regulations: PatientRegulation[] = [];
    let antibiotics: { patient_id: string }[] = [];
    let devices: { patient_id: string; device_type: string }[] = [];
    let venousAccess: { patient_id: string; access_type: string }[] = [];
    let precautions: { patient_id: string; precaution_type: string }[] = [];

    if (patientIds.length > 0) {
      const [respResult, dvaResult, regResult, atbResult, devResult, venResult, precResult] = await Promise.all([
        supabase.from('respiratory_support').select('patient_id, modality').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('vasoactive_drugs').select('patient_id').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('patient_regulation').select('*').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('antibiotics').select('patient_id').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('invasive_devices').select('patient_id, device_type').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('venous_access').select('patient_id, access_type').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('patient_precautions').select('patient_id, precaution_type').in('patient_id', patientIds).eq('is_active', true)
      ]);

      respiratoryModalities = respResult.data || [];
      vasoactiveDrugs = dvaResult.data || [];
      regulations = (regResult.data || []) as PatientRegulation[];
      antibiotics = atbResult.data || [];
      devices = devResult.data || [];
      venousAccess = venResult.data || [];
      precautions = precResult.data || [];
    }

    const patientsWithDva = new Set(vasoactiveDrugs.map(d => d.patient_id));

    // Mapear contagens por paciente
    const atbCountByPatient = new Map<string, number>();
    antibiotics.forEach(a => {
      atbCountByPatient.set(a.patient_id, (atbCountByPatient.get(a.patient_id) || 0) + 1);
    });

    const devCountByPatient = new Map<string, number>();
    const hasTotDevice = new Set<string>();
    devices.forEach(d => {
      devCountByPatient.set(d.patient_id, (devCountByPatient.get(d.patient_id) || 0) + 1);
      if (d.device_type.toLowerCase() === 'tot') {
        hasTotDevice.add(d.patient_id);
      }
    });

    const hasCentralAccess = new Set<string>();
    venousAccess.forEach(v => {
      if (['cvc', 'picc', 'hemodialise'].some(t => v.access_type.toLowerCase().includes(t))) {
        hasCentralAccess.add(v.patient_id);
      }
    });

    const hasSepsisOrShock = new Set<string>();
    precautions.forEach(p => {
      if (['sepse', 'choque'].some(t => p.precaution_type.toLowerCase().includes(t))) {
        hasSepsisOrShock.add(p.patient_id);
      }
    });

    // 5. Build enriched patient data
    const enrichPatient = (patient: Patient): PatientWithRegulation => {
      const respModality = respiratoryModalities.find(r => r.patient_id === patient.id)?.modality;
      const patientRegulations = regulations.filter(r => r.patient_id === patient.id);

      return {
        ...patient,
        respiratory_modality: respModality,
        has_active_dva: patientsWithDva.has(patient.id),
        patient_regulation: patientRegulations,
        active_antibiotics_count: atbCountByPatient.get(patient.id) || 0,
        active_devices_count: devCountByPatient.get(patient.id) || 0,
        has_central_access: hasCentralAccess.has(patient.id),
        has_sepsis_or_shock: hasSepsisOrShock.has(patient.id),
        has_tot_device: hasTotDevice.has(patient.id)
      };
    };

    // 6. Group beds by unit and calculate stats
    const result: UnitWithBeds[] = units.map(unit => {
      const unitBeds = (allBeds || []).filter(b => b.unit_id === unit.id);
      
      const bedsWithPatients: BedWithPatient[] = unitBeds.map(bed => {
        const patient = patients.find(p => p.bed_id === bed.id);
        return {
          ...bed,
          patient: patient ? enrichPatient(patient) : null
        };
      });

      // Calculate stats
      const allRegsInUnit = bedsWithPatients.flatMap(b => b.patient?.patient_regulation || []);
      
      // Calcular stats de probabilidade de alta
      let criticalCount = 0;
      let probableDischargesCount = 0;
      
      bedsWithPatients.forEach(bed => {
        if (bed.patient) {
          const { probability, status } = calculateDischargeProbability(bed.patient);
          if (status === 'blocked') {
            criticalCount++;
          } else if (status === 'normal' && probability >= 80) {
            probableDischargesCount++;
          }
        }
      });

      return {
        unit,
        beds: bedsWithPatients,
        stats: {
          total: unitBeds.length,
          occupied: bedsWithPatients.filter(b => b.patient).length,
          withRegulation: bedsWithPatients.filter(b => (b.patient?.patient_regulation?.length || 0) > 0).length,
          aguardando_regulacao: allRegsInUnit.filter(r => r.status === 'aguardando_regulacao').length,
          regulado: allRegsInUnit.filter(r => r.status === 'regulado').length,
          aguardando_transferencia: allRegsInUnit.filter(r => r.status === 'aguardando_transferencia').length,
          transferido: allRegsInUnit.filter(r => r.status === 'transferido').length,
          negado_nir: allRegsInUnit.filter(r => r.status === 'negado_nir').length,
          negado_hospital: allRegsInUnit.filter(r => r.status === 'negado_hospital').length,
          critical: criticalCount,
          probableDischarges: probableDischargesCount
        }
      };
    });

    setUnitsWithBeds(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Filter beds based on status filter and view mode
  const filterBeds = (beds: BedWithPatient[]): BedWithPatient[] => {
    // Modo visão geral: todos os leitos (ocupados + vagos)
    if (viewMode === 'overview') {
      return beds;
    }

    // Modo regulação: apenas com regulação ativa
    const bedsWithRegulation = beds.filter(b => {
      const regs = b.patient?.patient_regulation || [];
      if (regs.length === 0) return false;
      
      if (statusFilter === 'all') return true;
      return regs.some(r => r.status === statusFilter);
    });

    return bedsWithRegulation;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate global stats
  const globalStats = unitsWithBeds.reduce((acc, u) => ({
    occupied: acc.occupied + u.stats.occupied,
    critical: acc.critical + u.stats.critical,
    probableDischarges: acc.probableDischarges + u.stats.probableDischarges,
    aguardando_regulacao: acc.aguardando_regulacao + u.stats.aguardando_regulacao,
    regulado: acc.regulado + u.stats.regulado,
    aguardando_transferencia: acc.aguardando_transferencia + u.stats.aguardando_transferencia,
    transferido: acc.transferido + u.stats.transferido,
    negado_nir: acc.negado_nir + u.stats.negado_nir,
    negado_hospital: acc.negado_hospital + u.stats.negado_hospital
  }), { 
    occupied: 0, 
    critical: 0, 
    probableDischarges: 0,
    aguardando_regulacao: 0, 
    regulado: 0, 
    aguardando_transferencia: 0, 
    transferido: 0, 
    negado_nir: 0, 
    negado_hospital: 0 
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Painel de Regulação</h2>
          </div>
          
          {/* Toggle de modo de visualização */}
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="bg-muted p-1 rounded-lg"
          >
            <ToggleGroupItem 
              value="regulation" 
              aria-label="Modo Regulação"
              className="gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:text-muted-foreground px-3"
            >
              <ListFilter className="h-4 w-4" />
              <span className="hidden sm:inline">Regulação</span>
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="overview" 
              aria-label="Visão Geral"
              className="gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=off]:text-muted-foreground px-3"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Stats badges - diferentes por modo */}
        {viewMode === 'regulation' ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 cursor-pointer transition-colors whitespace-nowrap flex-shrink-0",
                statusFilter === 'aguardando_regulacao' 
                  ? "bg-amber-100 border-amber-500 dark:bg-amber-900/50" 
                  : "border-amber-500/50 text-amber-600 hover:bg-amber-50"
              )}
              onClick={() => setStatusFilter(statusFilter === 'aguardando_regulacao' ? 'all' : 'aguardando_regulacao')}
            >
              <Clock className="h-3 w-3" />
              {globalStats.aguardando_regulacao} Aguard.
            </Badge>
            
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 cursor-pointer transition-colors whitespace-nowrap flex-shrink-0",
                statusFilter === 'regulado' 
                  ? "bg-blue-100 border-blue-500 dark:bg-blue-900/50" 
                  : "border-blue-500/50 text-blue-600 hover:bg-blue-50"
              )}
              onClick={() => setStatusFilter(statusFilter === 'regulado' ? 'all' : 'regulado')}
            >
              <FileCheck className="h-3 w-3" />
              {globalStats.regulado} Reg.
            </Badge>
            
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1 cursor-pointer transition-colors whitespace-nowrap flex-shrink-0",
                statusFilter === 'aguardando_transferencia' 
                  ? "bg-green-100 border-green-500 dark:bg-green-900/50" 
                  : "border-green-500/50 text-green-600 hover:bg-green-50"
              )}
              onClick={() => setStatusFilter(statusFilter === 'aguardando_transferencia' ? 'all' : 'aguardando_transferencia')}
            >
              <Truck className="h-3 w-3" />
              {globalStats.aguardando_transferencia} Transf.
            </Badge>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] md:w-[200px] flex-shrink-0">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
            <Badge 
              variant="outline" 
              className="gap-1 whitespace-nowrap flex-shrink-0 border-primary/50 text-primary"
            >
              <Building2 className="h-3 w-3" />
              {globalStats.occupied} Ocupados
            </Badge>
            
            <Badge 
              variant="outline" 
              className="gap-1 whitespace-nowrap flex-shrink-0 border-green-500/50 text-green-600"
            >
              <CheckCircle2 className="h-3 w-3" />
              {globalStats.probableDischarges} Altas Prováveis
            </Badge>
            
            <Badge 
              variant="outline" 
              className="gap-1 whitespace-nowrap flex-shrink-0 border-red-500/50 text-red-600"
            >
              <Activity className="h-3 w-3" />
              {globalStats.critical} Críticos
            </Badge>
          </div>
        )}
      </div>

      {/* Units sections */}
      {unitsWithBeds.map(({ unit, beds, stats }) => {
        const filteredBeds = filterBeds(beds);
        
        // Skip units with no matching beds (in regulation mode with filter)
        if (filteredBeds.length === 0 && viewMode === 'regulation') {
          return null;
        }

        return (
          <Collapsible key={unit.id} defaultOpen className="border rounded-lg bg-card">
            <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{unit.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {viewMode === 'regulation' ? (
                  <>
                    {stats.aguardando_regulacao > 0 && (
                      <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600 text-xs">
                        <Clock className="h-3 w-3" />
                        {stats.aguardando_regulacao}
                      </Badge>
                    )}
                    {stats.regulado > 0 && (
                      <Badge variant="outline" className="gap-1 border-blue-500 text-blue-600 text-xs">
                        <FileCheck className="h-3 w-3" />
                        {stats.regulado}
                      </Badge>
                    )}
                    {stats.aguardando_transferencia > 0 && (
                      <Badge variant="outline" className="gap-1 border-green-500 text-green-600 text-xs">
                        <Truck className="h-3 w-3" />
                        {stats.aguardando_transferencia}
                      </Badge>
                    )}
                    {(stats.negado_nir + stats.negado_hospital) > 0 && (
                      <Badge variant="outline" className="gap-1 border-red-500 text-red-600 text-xs">
                        <XCircle className="h-3 w-3" />
                        {stats.negado_nir + stats.negado_hospital}
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="gap-1 border-muted-foreground/50 text-muted-foreground text-xs">
                      {stats.occupied}/{stats.total}
                    </Badge>
                    {stats.probableDischarges > 0 && (
                      <Badge variant="outline" className="gap-1 border-green-500 text-green-600 text-xs">
                        <CheckCircle2 className="h-3 w-3" />
                        {stats.probableDischarges}
                      </Badge>
                    )}
                    {stats.critical > 0 && (
                      <Badge variant="outline" className="gap-1 border-red-500 text-red-600 text-xs">
                        <Activity className="h-3 w-3" />
                        {stats.critical}
                      </Badge>
                    )}
                  </>
                )}
                
                <ChevronDown className="h-4 w-4 transition-transform ui-state-open:rotate-180" />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="px-4 pb-4">
                {filteredBeds.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {viewMode === 'overview' 
                      ? 'Nenhum paciente internado nesta unidade.'
                      : 'Nenhum paciente com regulação nesta unidade.'
                    }
                  </p>
                ) : (
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pt-3">
                    {filteredBeds.map((bed) => (
                      bed.patient ? (
                        <NIRBedCard
                          key={bed.id}
                          bed={bed}
                          patient={bed.patient}
                          onUpdate={fetchAllData}
                          showProbabilityBar={viewMode === 'overview'}
                        />
                      ) : (
                        <NIREmptyBedCard key={bed.id} bed={bed} />
                      )
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}

      {/* Empty state */}
      {unitsWithBeds.every(u => filterBeds(u.beds).length === 0) && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {viewMode === 'overview'
              ? 'Nenhum paciente internado no momento.'
              : statusFilter === 'all' 
                ? 'Nenhum paciente com regulação ativa no momento.'
                : `Nenhum paciente com status "${STATUS_CONFIG[statusFilter as RegulationStatus]?.label || statusFilter}" no momento.`
            }
          </p>
        </div>
      )}
    </div>
  );
}
