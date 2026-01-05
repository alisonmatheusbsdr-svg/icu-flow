import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { PatientClinicalData } from '@/components/patient/PatientClinicalData';
import { PatientEvolutions } from '@/components/patient/PatientEvolutions';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { PatientWithDetails, Profile } from '@/types/database';

export default function PatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isApproved } = useAuth();
  
  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authorProfiles, setAuthorProfiles] = useState<Record<string, Profile>>({});

  const fetchPatient = async () => {
    if (!patientId) return;

    setIsLoading(true);
    
    // Fetch patient with related data
    const { data: patientData, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .maybeSingle();

    if (error || !patientData) {
      navigate('/dashboard');
      return;
    }

    // Fetch related data in parallel
    const [devicesRes, drugsRes, antibioticsRes, plansRes, evolutionsRes, prophylaxisRes] = await Promise.all([
      supabase.from('invasive_devices').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('vasoactive_drugs').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('antibiotics').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('therapeutic_plans').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1),
      supabase.from('evolutions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('prophylaxis').select('*').eq('patient_id', patientId).eq('is_active', true)
    ]);

    const patientWithDetails: PatientWithDetails = {
      ...patientData,
      diet_type: (patientData.diet_type as PatientWithDetails['diet_type']) ?? null,
      invasive_devices: devicesRes.data || [],
      vasoactive_drugs: drugsRes.data || [],
      antibiotics: antibioticsRes.data || [],
      therapeutic_plans: plansRes.data || [],
      evolutions: evolutionsRes.data || [],
      prophylaxis: prophylaxisRes.data || []
    };

    setPatient(patientWithDetails);

    // Fetch author profiles for evolutions and plans
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

    setIsLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && !isApproved) {
      navigate('/dashboard');
    } else if (user && isApproved) {
      fetchPatient();
    }
  }, [user, authLoading, isApproved, patientId]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6">
        {/* Back button and patient header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{patient.initials}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{patient.initials}</h1>
              <p className="text-muted-foreground">
                {patient.age} anos • Internado há {Math.ceil((new Date().getTime() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24))} dias
              </p>
            </div>
          </div>
        </div>

        {/* Split view */}
        <div className="grid lg:grid-cols-2 gap-6">
          <PatientClinicalData patient={patient} onUpdate={fetchPatient} />
          <PatientEvolutions 
            patient={patient} 
            authorProfiles={authorProfiles} 
            onUpdate={fetchPatient} 
          />
        </div>
      </main>
    </div>
  );
}