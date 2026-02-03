import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { NIRBedCard } from './NIRBedCard';
import type { Bed, Patient, PatientRegulation } from '@/types/database';

interface PatientWithModality extends Patient {
  respiratory_modality?: string;
  has_active_dva?: boolean;
  patient_regulation?: PatientRegulation[];
  active_antibiotics_count?: number;
  active_devices_count?: number;
  has_central_access?: boolean;
  has_sepsis_or_shock?: boolean;
  has_tot_device?: boolean;
}

interface NIRDraggableBedCardProps {
  bed: Bed;
  patient: PatientWithModality;
  unitId: string;
  onUpdate: () => void;
  showProbabilityBar?: boolean;
  onPatientClick?: (patientId: string, bedNumber: number) => void;
}

export function NIRDraggableBedCard({
  bed,
  patient,
  unitId,
  onUpdate,
  showProbabilityBar,
  onPatientClick
}: NIRDraggableBedCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `patient-${patient.id}`,
    data: {
      type: 'patient',
      patientId: patient.id,
      patientInitials: patient.initials,
      patientAge: patient.age,
      bedId: bed.id,
      bedNumber: bed.bed_number,
      unitId
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? 'z-50 shadow-2xl scale-105' : ''}
    >
      <NIRBedCard
        bed={bed}
        patient={patient}
        onUpdate={onUpdate}
        showProbabilityBar={showProbabilityBar}
        onPatientClick={onPatientClick}
      />
    </div>
  );
}
