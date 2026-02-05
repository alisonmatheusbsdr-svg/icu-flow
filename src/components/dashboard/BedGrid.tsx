import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BedCard } from './BedCard';
import { PatientModal } from '@/components/patient/PatientModal';
import { UnitPrintPreviewModal } from '@/components/print/UnitPrintPreviewModal';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import '@/components/print/print-styles.css';
import type { Bed, Patient, PatientWithDetails, Profile, PatientRegulation } from '@/types/database';

interface BedGridProps {
  unitId: string;
  unitName: string;
  bedCount: number;
}

interface RespiratoryModality {
  patient_id: string;
  modality: string;
}

interface VasoactiveDrug {
  patient_id: string;
}

interface Antibiotic {
  patient_id: string;
}

interface InvasiveDevice {
  patient_id: string;
  device_type: string;
}

interface VenousAccess {
  patient_id: string;
  access_type: string;
}

interface Precaution {
  patient_id: string;
  precaution_type: string;
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
    patient_regulation?: PatientRegulation[];
  }) | null;
}

interface PatientPrintData {
  patient: PatientWithDetails;
  bedNumber: number;
  evolutionSummary: string | null;
  authorProfiles: Record<string, Profile>;
}

export function BedGrid({ unitId, unitName, bedCount }: BedGridProps) {
  const [beds, setBeds] = useState<BedWithPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedBedNumber, setSelectedBedNumber] = useState<number>(0);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isPrintLoading, setIsPrintLoading] = useState(false);
  const [printLoadingStatus, setLoadingStatus] = useState('Carregando...');
  const [printPatients, setPrintPatients] = useState<PatientPrintData[]>([]);

  const fetchBeds = async () => {
    setIsLoading(true);
    
    const { data: bedsData } = await supabase
      .from('beds')
      .select('*')
      .eq('unit_id', unitId)
      .order('bed_number');

    if (bedsData) {
      const occupiedBedIds = bedsData.filter(b => b.is_occupied).map(b => b.id);
      
      let patients: Patient[] = [];
      let respiratoryModalities: RespiratoryModality[] = [];
      let vasoactiveDrugs: VasoactiveDrug[] = [];
      let antibiotics: Antibiotic[] = [];
      let devices: InvasiveDevice[] = [];
      let venousAccess: VenousAccess[] = [];
      let precautions: Precaution[] = [];
      let regulations: PatientRegulation[] = [];
      
      if (occupiedBedIds.length > 0) {
        const { data } = await supabase
          .from('patients')
          .select('*')
          .in('bed_id', occupiedBedIds)
          .eq('is_active', true);
        patients = (data || []).map(p => ({ ...p, weight: p.weight ?? null })) as Patient[];
        
        // Fetch all clinical data for these patients
        if (patients.length > 0) {
          const patientIds = patients.map(p => p.id);
          
          const [respResult, dvaResult, atbResult, devResult, venResult, precResult, regResult] = await Promise.all([
            supabase
              .from('respiratory_support')
              .select('patient_id, modality')
              .in('patient_id', patientIds)
              .eq('is_active', true),
            supabase
              .from('vasoactive_drugs')
              .select('patient_id')
              .in('patient_id', patientIds)
              .eq('is_active', true),
            supabase
              .from('antibiotics')
              .select('patient_id')
              .in('patient_id', patientIds)
              .eq('is_active', true),
            supabase
              .from('invasive_devices')
              .select('patient_id, device_type')
              .in('patient_id', patientIds)
              .eq('is_active', true),
            supabase
              .from('venous_access')
              .select('patient_id, access_type')
              .in('patient_id', patientIds)
              .eq('is_active', true),
            supabase
              .from('patient_precautions')
              .select('patient_id, precaution_type')
              .in('patient_id', patientIds)
              .eq('is_active', true),
            supabase
              .from('patient_regulation')
              .select('*')
              .in('patient_id', patientIds)
              .eq('is_active', true)
          ]);
          
          respiratoryModalities = respResult.data || [];
          vasoactiveDrugs = dvaResult.data || [];
          antibiotics = atbResult.data || [];
          devices = devResult.data || [];
          venousAccess = venResult.data || [];
          precautions = precResult.data || [];
          regulations = (regResult.data || []) as PatientRegulation[];
        }
      }

      const patientsWithDva = new Set(vasoactiveDrugs.map(d => d.patient_id));

      const bedsWithPatients = bedsData.map(bed => {
        const patient = patients.find(p => p.bed_id === bed.id);
        if (!patient) {
          return { ...bed, patient: null };
        }

        const respModality = respiratoryModalities.find(r => r.patient_id === patient.id)?.modality;
        const patientAntibiotics = antibiotics.filter(a => a.patient_id === patient.id);
        const patientDevices = devices.filter(d => d.patient_id === patient.id);
        const patientVenous = venousAccess.filter(v => v.patient_id === patient.id);
        const patientPrecautions = precautions.filter(p => p.patient_id === patient.id);
        
        // Check for central access types
        const centralTypes = ['central', 'picc', 'port-a-cath', 'hemodialise'];
        const hasCentralAccess = patientVenous.some(v => 
          centralTypes.some(t => v.access_type.toLowerCase().includes(t))
        );
        
        // Check for sepsis or shock precautions
        const hasSepsisOrShock = patientPrecautions.some(p => 
          ['sepse', 'choque'].includes(p.precaution_type.toLowerCase())
        );

        // Check for TOT in invasive devices
        const hasTotDevice = patientDevices.some(d => 
          d.device_type.toLowerCase() === 'tot'
        );
        
        return {
          ...bed,
          patient: { 
            ...patient, 
            respiratory_modality: respModality,
            has_active_dva: patientsWithDva.has(patient.id),
            active_antibiotics_count: patientAntibiotics.length,
            active_devices_count: patientDevices.length,
            has_central_access: hasCentralAccess,
            has_sepsis_or_shock: hasSepsisOrShock,
            has_tot_device: hasTotDevice,
            patient_regulation: regulations.filter(r => r.patient_id === patient.id)
          }
        };
      });

      setBeds(bedsWithPatients);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBeds();
  }, [unitId]);

  const handlePatientClick = (patientId: string, bedNumber: number) => {
    setSelectedPatientId(patientId);
    setSelectedBedNumber(bedNumber);
  };

  const handleCloseModal = () => {
    setSelectedPatientId(null);
    setSelectedBedNumber(0);
    fetchBeds(); // Refresh data when modal closes
  };

  const handlePrintUnit = async () => {
    setIsPrintMode(true);
    setIsPrintLoading(true);
    setPrintPatients([]);
    
    try {
      setLoadingStatus('Carregando leitos ocupados...');
      
      // Get all occupied beds in the unit
      const { data: bedsData, error: bedsError } = await supabase
        .from('beds')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_occupied', true)
        .order('bed_number');

      if (bedsError) throw bedsError;
      if (!bedsData || bedsData.length === 0) {
        toast.error('Nenhum leito ocupado na unidade');
        setIsPrintMode(false);
        setIsPrintLoading(false);
        return;
      }

      const bedIds = bedsData.map(b => b.id);
      setLoadingStatus(`Carregando dados de ${bedsData.length} pacientes...`);

      // Get all active patients in these beds
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .in('bed_id', bedIds)
        .eq('is_active', true);

      if (patientsError) throw patientsError;
      if (!patientsData || patientsData.length === 0) {
        toast.error('Nenhum paciente ativo encontrado');
        setIsPrintMode(false);
        setIsPrintLoading(false);
        return;
      }

      const patientIds = patientsData.map(p => p.id);

      // Fetch all related data in parallel
      setLoadingStatus('Carregando dados clínicos...');
      const [
        devicesRes, drugsRes, antibioticsRes, plansRes, evolutionsRes,
        prophylaxisRes, venousAccessRes, respiratorySupportRes, tasksRes, precautionsRes
      ] = await Promise.all([
        supabase.from('invasive_devices').select('*').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('vasoactive_drugs').select('*').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('antibiotics').select('*').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('therapeutic_plans').select('*').in('patient_id', patientIds).order('created_at', { ascending: false }),
        supabase.from('evolutions').select('*').in('patient_id', patientIds).order('created_at', { ascending: false }),
        supabase.from('prophylaxis').select('*').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('venous_access').select('*').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('respiratory_support').select('*').in('patient_id', patientIds).eq('is_active', true),
        supabase.from('patient_tasks').select('*').in('patient_id', patientIds),
        supabase.from('patient_precautions').select('*').in('patient_id', patientIds).eq('is_active', true)
      ]);

      // Collect all author IDs
      const authorIds = new Set<string>();
      plansRes.data?.forEach(p => authorIds.add(p.created_by));
      evolutionsRes.data?.forEach(e => authorIds.add(e.created_by));

      // Fetch author profiles
      let authorProfiles: Record<string, Profile> = {};
      if (authorIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', Array.from(authorIds));
        if (profiles) {
          profiles.forEach(p => { authorProfiles[p.id] = p as Profile; });
        }
      }

      // Build patient data with all relations
      setLoadingStatus('Gerando resumos IA...');
      const patientPrintDataPromises = patientsData.map(async (patientData) => {
        const bed = bedsData.find(b => b.id === patientData.bed_id);
        const patientEvolutions = evolutionsRes.data?.filter(e => e.patient_id === patientData.id) || [];
        
        const patientWithDetails: PatientWithDetails = {
          ...patientData,
          weight: patientData.weight ?? null,
          diet_type: (patientData.diet_type as PatientWithDetails['diet_type']) ?? null,
          invasive_devices: devicesRes.data?.filter(d => d.patient_id === patientData.id) || [],
          vasoactive_drugs: drugsRes.data?.filter(d => d.patient_id === patientData.id) || [],
          antibiotics: antibioticsRes.data?.filter(a => a.patient_id === patientData.id) || [],
          therapeutic_plans: plansRes.data?.filter(p => p.patient_id === patientData.id).slice(0, 1) || [],
          evolutions: patientEvolutions,
          prophylaxis: prophylaxisRes.data?.filter(p => p.patient_id === patientData.id) || [],
          venous_access: venousAccessRes.data?.filter(v => v.patient_id === patientData.id) || [],
          respiratory_support: respiratorySupportRes.data?.find(r => r.patient_id === patientData.id) || null,
          patient_tasks: tasksRes.data?.filter(t => t.patient_id === patientData.id) || [],
          patient_precautions: precautionsRes.data?.filter(p => p.patient_id === patientData.id) || []
        };

        // Get AI summary if there are 3+ evolutions
        let summary: string | null = null;
        if (patientEvolutions.length >= 3) {
          try {
            const { data, error } = await supabase.functions.invoke('summarize-evolutions', {
              body: {
                evolutions: patientEvolutions.map(e => ({
                  content: e.content,
                  created_at: e.created_at,
                  author_name: authorProfiles[e.created_by]?.nome
                })),
                patient_context: patientData.main_diagnosis
              }
            });
            if (!error && data?.summary) {
              summary = data.summary;
            }
          } catch (e) {
            console.error('Failed to get summary for patient:', patientData.id, e);
          }
        }

        return {
          patient: patientWithDetails,
          bedNumber: bed?.bed_number || 0,
          evolutionSummary: summary,
          authorProfiles
        };
      });

      const patientPrintData = await Promise.all(patientPrintDataPromises);
      
      // Sort by bed number
      patientPrintData.sort((a, b) => a.bedNumber - b.bedNumber);
      
      setPrintPatients(patientPrintData);
      setIsPrintLoading(false);

    } catch (error) {
      console.error('Error fetching patients for print:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar dados');
      setIsPrintMode(false);
      setIsPrintLoading(false);
    }
  };

  const handleClosePrintPreview = () => {
    setIsPrintMode(false);
    setPrintPatients([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{unitName}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrintUnit}
          disabled={isPrintMode}
          className="flex items-center gap-2 no-print"
        >
          {isPrintMode ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparando...
            </>
          ) : (
            <>
              <Printer className="h-4 w-4" />
              Imprimir UTI
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {beds.map(bed => (
          <BedCard 
            key={bed.id} 
            bed={bed} 
            patient={bed.patient} 
            onUpdate={fetchBeds}
            onPatientClick={(patientId) => handlePatientClick(patientId, bed.bed_number)} 
          />
        ))}
      </div>

      <PatientModal
        patientId={selectedPatientId}
        bedNumber={selectedBedNumber}
        isOpen={!!selectedPatientId}
        onClose={handleCloseModal}
      />

      <UnitPrintPreviewModal
        isOpen={isPrintMode}
        onClose={handleClosePrintPreview}
        unitId={unitId}
        unitName={unitName}
        patients={printPatients}
        isLoading={isPrintLoading}
        loadingStatus={printLoadingStatus}
      />
    </div>
  );
}
