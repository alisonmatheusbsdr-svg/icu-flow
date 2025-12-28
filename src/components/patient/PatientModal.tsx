import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import { Loader2 } from 'lucide-react';
import { PatientClinicalData } from './PatientClinicalData';
import { PatientEvolutions } from './PatientEvolutions';
import type { PatientWithDetails, Profile } from '@/types/database';

interface PatientModalProps {
  patientId: string | null;
  bedNumber: number;
  isOpen: boolean;
  onClose: () => void;
}

export function PatientModal({ patientId, bedNumber, isOpen, onClose }: PatientModalProps) {
  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, Profile>>({});

  const fetchPatient = async (isRefresh = false) => {
    if (!patientId) return;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsInitialLoading(true);
    }
    
    const { data: patientData, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .maybeSingle();

    if (error || !patientData) {
      setIsInitialLoading(false);
      setIsRefreshing(false);
      return;
    }

    const [devicesRes, drugsRes, antibioticsRes, plansRes, evolutionsRes] = await Promise.all([
      supabase.from('invasive_devices').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('vasoactive_drugs').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('antibiotics').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('therapeutic_plans').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1),
      supabase.from('evolutions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false })
    ]);

    const patientWithDetails: PatientWithDetails = {
      ...patientData,
      weight: patientData.weight ?? null,
      invasive_devices: devicesRes.data || [],
      vasoactive_drugs: drugsRes.data || [],
      antibiotics: antibioticsRes.data || [],
      therapeutic_plans: plansRes.data || [],
      evolutions: evolutionsRes.data || []
    };

    setPatient(patientWithDetails);

    const authorIds = new Set<string>();
    plansRes.data?.forEach(p => authorIds.add(p.created_by));
    evolutionsRes.data?.forEach(e => authorIds.add(e.created_by));

    if (authorIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(authorIds));

      if (profiles) {
        const profileMap: Record<string, Profile> = {};
        profiles.forEach(p => { profileMap[p.id] = p as Profile; });
        setAuthorProfiles(profileMap);
      }
    }

    setIsInitialLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (isOpen && patientId) {
      fetchPatient();
    }
  }, [isOpen, patientId]);

  const daysAdmitted = patient 
    ? Math.ceil((new Date().getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const comorbidityList = patient?.comorbidities?.split(',').map(c => c.trim()).filter(Boolean) || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-card border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Leito {bedNumber} - {patient?.initials || '...'}
              </h2>
              {patient && (
                <p className="text-sm text-muted-foreground mt-1">
                  {patient.age} anos {patient.weight ? `| ${patient.weight}kg` : ''} | Adm: {new Date(patient.admission_date).toLocaleDateString('pt-BR')} | D{daysAdmitted}
                </p>
              )}
            </div>
          </div>

          {/* Badges */}
          {patient && (
            <div className="flex flex-wrap gap-2 mt-3">
              {patient.main_diagnosis && (
                <Badge className="bg-destructive text-destructive-foreground">
                  HD: {patient.main_diagnosis}
                </Badge>
              )}
              {comorbidityList.map((c, i) => (
                <Badge key={i} variant="secondary" className="bg-muted text-muted-foreground">
                  {c}
                </Badge>
              ))}
              {patient.is_palliative && (
                <Badge className="badge-pal">PAL</Badge>
              )}
              {patient.respiratory_status === 'tot' && (
                <Badge className="badge-tot">TOT</Badge>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {isInitialLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : patient ? (
          <div className="flex-1 overflow-y-auto p-6 relative">
            <div className="grid lg:grid-cols-2 gap-6">
              <PatientClinicalData patient={patient} onUpdate={() => fetchPatient(true)} />
              <PatientEvolutions 
                patient={patient} 
                authorProfiles={authorProfiles} 
                onUpdate={() => fetchPatient(true)} 
              />
            </div>
            
            {/* Overlay sutil durante refresh */}
            {isRefreshing && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-200">
                <div className="bg-card rounded-lg px-4 py-2 shadow-lg flex items-center gap-2 border border-border">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Atualizando...</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Paciente não encontrado
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
