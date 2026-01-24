import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PatientWithDetails, Profile } from '@/types/database';

interface PrintData {
  patient: PatientWithDetails;
  bedNumber: number;
  evolutionSummary: string | null;
  authorProfiles: Record<string, Profile>;
}

export function usePrintPatient() {
  const [isPreparing, setIsPreparing] = useState(false);
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const preparePrint = useCallback(async (
    patient: PatientWithDetails, 
    bedNumber: number, 
    existingAuthorProfiles: Record<string, Profile>,
    openPreview: boolean = true
  ) => {
    setIsPreparing(true);
    
    try {
      // Get AI summary if there are 3+ evolutions
      let summary: string | null = null;
      const evolutions = patient.evolutions || [];
      
      if (evolutions.length >= 3) {
        try {
          const { data, error } = await supabase.functions.invoke('summarize-evolutions', {
            body: {
              evolutions: evolutions.map(e => ({
                content: e.content,
                created_at: e.created_at,
                author_name: existingAuthorProfiles[e.created_by]?.nome
              })),
              patient_context: patient.main_diagnosis
            }
          });
          
          if (!error && data?.summary) {
            summary = data.summary;
          }
        } catch (e) {
          console.error('Failed to get evolution summary:', e);
          // Continue without summary
        }
      }

      setPrintData({
        patient,
        bedNumber,
        evolutionSummary: summary,
        authorProfiles: existingAuthorProfiles
      });

      if (openPreview) {
        setShowPreview(true);
      } else {
        // Direct print without preview
        setTimeout(() => {
          window.print();
        }, 100);
      }

      setIsPreparing(false);

    } catch (error) {
      console.error('Error preparing print:', error);
      setIsPreparing(false);
    }
  }, []);

  const closePreview = useCallback(() => {
    setShowPreview(false);
  }, []);

  const clearPrintData = useCallback(() => {
    setPrintData(null);
    setShowPreview(false);
  }, []);

  return {
    isPreparing,
    printData,
    showPreview,
    preparePrint,
    closePreview,
    clearPrintData
  };
}
