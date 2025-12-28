import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BedCard } from './BedCard';
import { PatientModal } from '@/components/patient/PatientModal';
import { Loader2 } from 'lucide-react';
import type { Bed, Patient } from '@/types/database';

interface BedGridProps {
  unitId: string;
  unitName: string;
  bedCount: number;
}

interface BedWithPatient extends Bed {
  patient?: Patient | null;
}

export function BedGrid({ unitId, unitName, bedCount }: BedGridProps) {
  const [beds, setBeds] = useState<BedWithPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedBedNumber, setSelectedBedNumber] = useState<number>(0);

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
      if (occupiedBedIds.length > 0) {
        const { data } = await supabase
          .from('patients')
          .select('*')
          .in('bed_id', occupiedBedIds)
          .eq('is_active', true);
        patients = (data || []).map(p => ({ ...p, weight: p.weight ?? null })) as Patient[];
      }

      const bedsWithPatients = bedsData.map(bed => ({
        ...bed,
        patient: patients.find(p => p.bed_id === bed.id) || null
      }));

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">{unitName}</h2>
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
    </div>
  );
}
