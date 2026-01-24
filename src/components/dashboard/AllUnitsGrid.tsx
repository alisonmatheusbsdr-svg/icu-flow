import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BedCard } from './BedCard';
import { PatientModal } from '@/components/patient/PatientModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, ChevronDown, Users, TrendingUp, AlertTriangle, Heart, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Bed, Patient } from '@/types/database';

interface Unit {
  id: string;
  name: string;
  bed_count: number;
}

interface BedWithPatient extends Bed {
  patient?: (Patient & { 
    respiratory_modality?: string; 
    has_active_dva?: boolean;
    active_antibiotics_count?: number;
    active_devices_count?: number;
    has_central_access?: boolean;
    has_sepsis_or_shock?: boolean;
    has_tot_device?: boolean;
  }) | null;
}

interface UnitWithBeds {
  unit: Unit;
  beds: BedWithPatient[];
  stats: {
    total: number;
    occupied: number;
    blockedBeds: number;   // Leitos fisicamente bloqueados
    highDischarge: number; // probabilidade >= 80%
    critical: number;      // TOT ou DVA (pacientes críticos)
    palliative: number;
  };
}

// Função de cálculo de probabilidade (igual ao BedCard)
const calculateDischargeProbability = (patient: BedWithPatient['patient']) => {
  if (!patient) return { probability: 0, status: 'empty' as const };
  
  if (patient.is_palliative) {
    return { probability: 100, status: 'palliative' as const };
  }
  
  const isOnTOT = patient.respiratory_modality === 'tot' || patient.has_tot_device;
  if (isOnTOT || patient.has_active_dva) {
    return { probability: 0, status: 'blocked' as const };
  }
  
  let discount = 0;
  
  // Respiratory support (TQT, VNI)
  if (['traqueostomia', 'vni'].includes(patient.respiratory_modality || '')) {
    discount += 15;
  }
  
  // Antibiotics
  const atbCount = patient.active_antibiotics_count || 0;
  if (atbCount >= 4) discount += 15;
  else if (atbCount === 3) discount += 10;
  else if (atbCount >= 1) discount += 5;
  
  // Devices
  const devCount = patient.active_devices_count || 0;
  if (devCount >= 6) discount += 15;
  else if (devCount >= 4) discount += 10;
  else if (devCount >= 2) discount += 5;
  
  // Central access
  if (patient.has_central_access) discount += 5;
  
  // Sepsis/Shock
  if (patient.has_sepsis_or_shock) discount += 10;
  
  // LOS (days hospitalized)
  const days = Math.ceil((Date.now() - new Date(patient.admission_date).getTime()) / 86400000);
  if (days > 30) discount += 10;
  else if (days > 14) discount += 5;
  
  const probability = Math.max(0, 100 - discount);
  return { probability, status: 'normal' as const };
};

export function AllUnitsGrid() {
  const [unitsWithBeds, setUnitsWithBeds] = useState<UnitWithBeds[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedBedNumber, setSelectedBedNumber] = useState<number>(0);

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

    // 4. Fetch clinical data in parallel
    let respiratoryModalities: { patient_id: string; modality: string }[] = [];
    let vasoactiveDrugs: { patient_id: string }[] = [];
    let antibiotics: { patient_id: string }[] = [];
    let devices: { patient_id: string; device_type: string }[] = [];
    let venousAccess: { patient_id: string; access_type: string }[] = [];
    let precautions: { patient_id: string; precaution_type: string }[] = [];

    if (patientIds.length > 0) {
      const [respResult, dvaResult, atbResult, devResult, venResult, precResult] = await Promise.all([
        supabase.from('respiratory_support').select('patient_id, modality').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('vasoactive_drugs').select('patient_id').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('antibiotics').select('patient_id').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('invasive_devices').select('patient_id, device_type').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('venous_access').select('patient_id, access_type').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('patient_precautions').select('patient_id, precaution_type').in('patient_id', patientIds).eq('is_active', true)
      ]);

      respiratoryModalities = respResult.data || [];
      vasoactiveDrugs = dvaResult.data || [];
      antibiotics = atbResult.data || [];
      devices = devResult.data || [];
      venousAccess = venResult.data || [];
      precautions = precResult.data || [];
    }

    const patientsWithDva = new Set(vasoactiveDrugs.map(d => d.patient_id));
    const centralTypes = ['central', 'picc', 'port-a-cath', 'hemodialise'];

    // 5. Build enriched patient data
    const enrichPatient = (patient: Patient) => {
      const respModality = respiratoryModalities.find(r => r.patient_id === patient.id)?.modality;
      const patientAntibiotics = antibiotics.filter(a => a.patient_id === patient.id);
      const patientDevices = devices.filter(d => d.patient_id === patient.id);
      const patientVenous = venousAccess.filter(v => v.patient_id === patient.id);
      const patientPrecautions = precautions.filter(p => p.patient_id === patient.id);

      const hasCentralAccess = patientVenous.some(v => 
        centralTypes.some(t => v.access_type.toLowerCase().includes(t))
      );
      const hasSepsisOrShock = patientPrecautions.some(p => 
        ['sepse', 'choque'].includes(p.precaution_type.toLowerCase())
      );
      const hasTotDevice = patientDevices.some(d => 
        d.device_type.toLowerCase() === 'tot'
      );

      return {
        ...patient,
        respiratory_modality: respModality,
        has_active_dva: patientsWithDva.has(patient.id),
        active_antibiotics_count: patientAntibiotics.length,
        active_devices_count: patientDevices.length,
        has_central_access: hasCentralAccess,
        has_sepsis_or_shock: hasSepsisOrShock,
        has_tot_device: hasTotDevice
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
      const occupiedBeds = bedsWithPatients.filter(b => b.patient);
      const blockedBedsCount = bedsWithPatients.filter(b => b.is_blocked).length;
      const criticalCount = occupiedBeds.filter(b => 
        b.patient?.has_tot_device || b.patient?.has_active_dva
      ).length;
      const palliativeCount = occupiedBeds.filter(b => b.patient?.is_palliative).length;
      
      // High discharge probability calculation (usando mesma lógica do BedCard)
      const highDischargeCount = occupiedBeds.filter(b => {
        if (!b.patient) return false;
        const { probability, status } = calculateDischargeProbability(b.patient);
        // Alta provável = probabilidade >= 80% e não é palliativo nem bloqueado
        return status === 'normal' && probability >= 80;
      }).length;

      return {
        unit,
        beds: bedsWithPatients,
        stats: {
          total: unitBeds.length,
          occupied: occupiedBeds.length,
          blockedBeds: blockedBedsCount,
          highDischarge: highDischargeCount,
          critical: criticalCount,
          palliative: palliativeCount
        }
      };
    });

    setUnitsWithBeds(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handlePatientClick = (patientId: string, bedNumber: number) => {
    setSelectedPatientId(patientId);
    setSelectedBedNumber(bedNumber);
  };

  const handleCloseModal = () => {
    setSelectedPatientId(null);
    setSelectedBedNumber(0);
    fetchAllData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (unitsWithBeds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma UTI disponível.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Visão Geral das UTIs</h2>
        <Badge variant="secondary" className="text-sm">
          {unitsWithBeds.length} unidade{unitsWithBeds.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Units sections */}
      {unitsWithBeds.map(({ unit, beds, stats }) => (
        <Collapsible key={unit.id} defaultOpen className="border rounded-lg bg-card">
          <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{unit.name}</span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Occupancy */}
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1",
                  stats.occupied / stats.total >= 0.9 ? "border-destructive text-destructive" :
                  stats.occupied / stats.total >= 0.7 ? "border-warning text-warning" :
                  "border-muted-foreground text-muted-foreground"
                )}
              >
                <Users className="h-3 w-3" />
                {stats.occupied}/{stats.total}
              </Badge>
              
              {/* High discharge */}
              {stats.highDischarge > 0 && (
                <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  {stats.highDischarge} alta{stats.highDischarge > 1 ? 's' : ''}
                </Badge>
              )}
              
              {/* Blocked beds */}
              {stats.blockedBeds > 0 && (
                <Badge variant="outline" className="gap-1 border-muted-foreground text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  {stats.blockedBeds} bloqueado{stats.blockedBeds > 1 ? 's' : ''}
                </Badge>
              )}
              
              {/* Critical (TOT/DVA) */}
              {stats.critical > 0 && (
                <Badge variant="outline" className="gap-1 border-destructive text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  {stats.critical} crítico{stats.critical > 1 ? 's' : ''}
                </Badge>
              )}
              
              {/* Palliative */}
              {stats.palliative > 0 && (
                <Badge variant="outline" className="gap-1 border-muted-foreground text-muted-foreground">
                  <Heart className="h-3 w-3" />
                  {stats.palliative} CCPP
                </Badge>
              )}
              
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {beds.map(bed => (
                  <BedCard 
                    key={bed.id} 
                    bed={bed} 
                    patient={bed.patient} 
                    onUpdate={fetchAllData}
                    onPatientClick={(patientId) => handlePatientClick(patientId, bed.bed_number)} 
                  />
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

      <PatientModal
        patientId={selectedPatientId}
        bedNumber={selectedBedNumber}
        isOpen={!!selectedPatientId}
        onClose={handleCloseModal}
      />
    </div>
  );
}
