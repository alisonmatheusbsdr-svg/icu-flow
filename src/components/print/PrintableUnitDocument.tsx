import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PrintPatientSheet } from './PrintPatientSheet';
import { Loader2 } from 'lucide-react';
import type { PatientWithDetails, Profile } from '@/types/database';

interface PatientPrintData {
  patient: PatientWithDetails;
  bedNumber: number;
  evolutionSummary: string | null;
  authorProfiles: Record<string, Profile>;
}

interface PrintableUnitDocumentProps {
  unitId: string;
  unitName: string;
  onReady?: () => void;
  onError?: (error: string) => void;
}

export interface PrintableUnitDocumentRef {
  triggerPrint: () => void;
}

export const PrintableUnitDocument = forwardRef<PrintableUnitDocumentRef, PrintableUnitDocumentProps>(
  ({ unitId, unitName, onReady, onError }, ref) => {
    const [patients, setPatients] = useState<PatientPrintData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState('Carregando leitos...');

    useImperativeHandle(ref, () => ({
      triggerPrint: () => {
        window.print();
      }
    }));

    useEffect(() => {
      fetchAllPatients();
    }, [unitId]);

    const fetchAllPatients = async () => {
      try {
        setIsLoading(true);
        setLoadingStatus('Carregando leitos ocupados...');

        // Get all occupied beds in the unit
        const { data: beds, error: bedsError } = await supabase
          .from('beds')
          .select('*')
          .eq('unit_id', unitId)
          .eq('is_occupied', true)
          .order('bed_number');

        if (bedsError) throw bedsError;
        if (!beds || beds.length === 0) {
          onError?.('Nenhum leito ocupado na unidade');
          setIsLoading(false);
          return;
        }

        const bedIds = beds.map(b => b.id);
        setLoadingStatus(`Carregando dados de ${beds.length} pacientes...`);

        // Get all active patients in these beds
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('*')
          .in('bed_id', bedIds)
          .eq('is_active', true);

        if (patientsError) throw patientsError;
        if (!patientsData || patientsData.length === 0) {
          onError?.('Nenhum paciente ativo encontrado');
          setIsLoading(false);
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
          const bed = beds.find(b => b.id === patientData.bed_id);
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
        
        setPatients(patientPrintData);
        setIsLoading(false);
        onReady?.();

      } catch (error) {
        console.error('Error fetching patients for print:', error);
        onError?.(error instanceof Error ? error.message : 'Erro ao carregar dados');
        setIsLoading(false);
      }
    };

    if (isLoading) {
      return (
        <div className="print-container">
          <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">{loadingStatus}</p>
          </div>
        </div>
      );
    }

    if (patients.length === 0) {
      return (
        <div className="print-container">
          <div className="flex items-center justify-center min-h-[200px]">
            <p className="text-muted-foreground">Nenhum paciente para imprimir</p>
          </div>
        </div>
      );
    }

    return (
      <div className="print-container">
        {patients.map(({ patient, bedNumber, evolutionSummary, authorProfiles }) => (
          <PrintPatientSheet
            key={patient.id}
            patient={patient}
            bedNumber={bedNumber}
            evolutionSummary={evolutionSummary}
            authorProfiles={authorProfiles}
          />
        ))}
      </div>
    );
  }
);

PrintableUnitDocument.displayName = 'PrintableUnitDocument';
