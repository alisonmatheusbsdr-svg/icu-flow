import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BedCard } from './BedCard';
import { PatientModal } from '@/components/patient/PatientModal';
import { PrintableUnitDocument, PrintableUnitDocumentRef } from '@/components/print/PrintableUnitDocument';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import '@/components/print/print-styles.css';
import type { Bed, Patient } from '@/types/database';

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
  }) | null;
}

export function BedGrid({ unitId, unitName, bedCount }: BedGridProps) {
  const [beds, setBeds] = useState<BedWithPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedBedNumber, setSelectedBedNumber] = useState<number>(0);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isPrintReady, setIsPrintReady] = useState(false);
  const printRef = useRef<PrintableUnitDocumentRef>(null);

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
          
          const [respResult, dvaResult, atbResult, devResult, venResult, precResult] = await Promise.all([
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
              .eq('is_active', true)
          ]);
          
          respiratoryModalities = respResult.data || [];
          vasoactiveDrugs = dvaResult.data || [];
          antibiotics = atbResult.data || [];
          devices = devResult.data || [];
          venousAccess = venResult.data || [];
          precautions = precResult.data || [];
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
            has_tot_device: hasTotDevice
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

  const handlePrintUnit = () => {
    setIsPrintMode(true);
    setIsPrintReady(false);
  };

  const handlePrintReady = () => {
    setIsPrintReady(true);
    setTimeout(() => {
      printRef.current?.triggerPrint();
      // Reset after print
      setTimeout(() => {
        setIsPrintMode(false);
        setIsPrintReady(false);
      }, 500);
    }, 100);
  };

  const handlePrintError = (error: string) => {
    toast.error(error);
    setIsPrintMode(false);
    setIsPrintReady(false);
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

      {/* Print container for entire unit - renders when print mode is active */}
      {isPrintMode && (
        <PrintableUnitDocument
          ref={printRef}
          unitId={unitId}
          unitName={unitName}
          onReady={handlePrintReady}
          onError={handlePrintError}
        />
      )}
    </div>
  );
}
