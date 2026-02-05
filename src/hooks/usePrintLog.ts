import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LogPrintParams {
  printType: 'single_patient' | 'unit_batch';
  unitId?: string;
  unitName?: string;
  patientIds?: string[];
  bedNumbers?: number[];
}

export function usePrintLog() {
  const { user, profile } = useAuth();
  
  const logPrint = async (params: LogPrintParams) => {
    if (!user || !profile) return;
    
    try {
      await supabase.from('print_logs').insert({
        user_id: user.id,
        user_name: profile.nome,
        print_type: params.printType,
        unit_id: params.unitId || null,
        unit_name: params.unitName || null,
        patient_count: params.patientIds?.length || 1,
        patient_ids: params.patientIds || [],
        bed_numbers: params.bedNumbers || []
      });
    } catch (error) {
      console.error('Erro ao registrar impressão:', error);
    }
  };
  
  return { logPrint, userName: profile?.nome };
}
