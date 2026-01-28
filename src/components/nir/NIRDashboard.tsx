import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NIRBedCard } from './NIRBedCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, ChevronDown, Clock, Check, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Bed, Patient, PatientRegulation } from '@/types/database';

interface Unit {
  id: string;
  name: string;
  bed_count: number;
}

interface PatientWithRegulation extends Patient {
  respiratory_modality?: string;
  has_active_dva?: boolean;
  patient_regulation?: PatientRegulation[];
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
    pending: number;
    confirmed: number;
    denied: number;
  };
}

export function NIRDashboard() {
  const [unitsWithBeds, setUnitsWithBeds] = useState<UnitWithBeds[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

    if (patientIds.length > 0) {
      const [respResult, dvaResult, regResult] = await Promise.all([
        supabase.from('respiratory_support').select('patient_id, modality').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('vasoactive_drugs').select('patient_id').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('patient_regulation').select('*').in('patient_id', patientIds).eq('is_active', true)
      ]);

      respiratoryModalities = respResult.data || [];
      vasoactiveDrugs = dvaResult.data || [];
      regulations = (regResult.data || []) as PatientRegulation[];
    }

    const patientsWithDva = new Set(vasoactiveDrugs.map(d => d.patient_id));

    // 5. Build enriched patient data
    const enrichPatient = (patient: Patient): PatientWithRegulation => {
      const respModality = respiratoryModalities.find(r => r.patient_id === patient.id)?.modality;
      const patientRegulations = regulations.filter(r => r.patient_id === patient.id);

      return {
        ...patient,
        respiratory_modality: respModality,
        has_active_dva: patientsWithDva.has(patient.id),
        patient_regulation: patientRegulations
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

      // Only keep beds with patients that have active regulations
      const bedsWithRegulation = bedsWithPatients.filter(b => {
        const patientRegs = b.patient?.patient_regulation || [];
        return patientRegs.length > 0;
      });

      // Calculate stats
      const allRegsInUnit = bedsWithPatients.flatMap(b => b.patient?.patient_regulation || []);
      const pendingCount = allRegsInUnit.filter(r => r.status === 'aguardando').length;
      const confirmedCount = allRegsInUnit.filter(r => r.status === 'confirmado').length;
      const deniedCount = allRegsInUnit.filter(r => r.status === 'negado').length;

      return {
        unit,
        beds: bedsWithPatients,
        stats: {
          total: unitBeds.length,
          occupied: bedsWithPatients.filter(b => b.patient).length,
          withRegulation: bedsWithRegulation.length,
          pending: pendingCount,
          confirmed: confirmedCount,
          denied: deniedCount
        }
      };
    });

    setUnitsWithBeds(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Filter beds based on status filter
  const filterBeds = (beds: BedWithPatient[]): BedWithPatient[] => {
    // Only show beds with patients that have regulations
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
    pending: acc.pending + u.stats.pending,
    confirmed: acc.confirmed + u.stats.confirmed,
    denied: acc.denied + u.stats.denied
  }), { pending: 0, confirmed: 0, denied: 0 });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Painel de Regulação</h2>
        </div>

        {/* Stats and filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 cursor-pointer",
              statusFilter === 'aguardando' ? "bg-amber-100 border-amber-500" : "border-amber-500/50 text-amber-600"
            )}
            onClick={() => setStatusFilter(statusFilter === 'aguardando' ? 'all' : 'aguardando')}
          >
            <Clock className="h-3 w-3" />
            {globalStats.pending} Aguardando
          </Badge>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 cursor-pointer",
              statusFilter === 'confirmado' ? "bg-green-100 border-green-500" : "border-green-500/50 text-green-600"
            )}
            onClick={() => setStatusFilter(statusFilter === 'confirmado' ? 'all' : 'confirmado')}
          >
            <Check className="h-3 w-3" />
            {globalStats.confirmed} Confirmados
          </Badge>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 cursor-pointer",
              statusFilter === 'negado' ? "bg-red-100 border-red-500" : "border-red-500/50 text-red-600"
            )}
            onClick={() => setStatusFilter(statusFilter === 'negado' ? 'all' : 'negado')}
          >
            <XCircle className="h-3 w-3" />
            {globalStats.denied} Negados
          </Badge>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="aguardando">Aguardando</SelectItem>
              <SelectItem value="confirmado">Confirmados</SelectItem>
              <SelectItem value="negado">Negados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Units sections */}
      {unitsWithBeds.map(({ unit, beds, stats }) => {
        const filteredBeds = filterBeds(beds);
        
        // Skip units with no matching beds
        if (filteredBeds.length === 0 && statusFilter !== 'all') {
          return null;
        }

        return (
          <Collapsible key={unit.id} defaultOpen className="border rounded-lg bg-card">
            <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{unit.name}</span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Regulation counts */}
                {stats.pending > 0 && (
                  <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
                    <Clock className="h-3 w-3" />
                    {stats.pending}
                  </Badge>
                )}
                {stats.confirmed > 0 && (
                  <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                    <Check className="h-3 w-3" />
                    {stats.confirmed}
                  </Badge>
                )}
                {stats.denied > 0 && (
                  <Badge variant="outline" className="gap-1 border-red-500 text-red-600">
                    <XCircle className="h-3 w-3" />
                    {stats.denied}
                  </Badge>
                )}
                
                <ChevronDown className="h-4 w-4 transition-transform ui-state-open:rotate-180" />
              </div>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <div className="px-4 pb-4">
                {filteredBeds.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum paciente com regulação nesta unidade.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pt-3">
                    {filteredBeds.map((bed) => (
                      <NIRBedCard
                        key={bed.id}
                        bed={bed}
                        patient={bed.patient!}
                        onUpdate={fetchAllData}
                      />
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
            {statusFilter === 'all' 
              ? 'Nenhum paciente com regulação ativa no momento.'
              : `Nenhum paciente com regulação "${statusFilter}" no momento.`
            }
          </p>
        </div>
      )}
    </div>
  );
}
