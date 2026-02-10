import { supabase } from "@/integrations/supabase/client";

export interface UnsavedDraft {
  patientId: string;
  initials: string;
}

/**
 * Checks localStorage for unsaved evolution drafts belonging to patients
 * in the specified unit. Only considers active patients with occupied beds.
 */
export async function getUnsavedDraftsForUnit(unitId: string): Promise<UnsavedDraft[]> {
  // Fetch active patients in beds belonging to this unit
  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, initials, bed_id, beds!inner(unit_id)')
    .eq('is_active', true)
    .eq('beds.unit_id', unitId);

  if (error || !patients) {
    console.error('Error fetching patients for draft check:', error);
    return [];
  }

  const drafts: UnsavedDraft[] = [];

  for (const patient of patients) {
    const draft = localStorage.getItem(`evolution_draft_${patient.id}`);
    if (draft && draft.trim().length > 0) {
      drafts.push({
        patientId: patient.id,
        initials: patient.initials,
      });
    }
  }

  return drafts;
}
