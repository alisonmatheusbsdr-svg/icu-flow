import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnit } from '@/hooks/useUnit';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ClipboardList, Edit, Loader2, LogOut, MoreHorizontal, PenLine, Printer } from 'lucide-react';
import { TherapeuticPlan } from './TherapeuticPlan';
import { PatientClinicalData } from './PatientClinicalData';
import { PatientEvolutions } from './PatientEvolutions';
import { PatientDischargeDialog } from './PatientDischargeDialog';
import { EditPatientDialog } from './EditPatientDialog';
import { PatientExamsDialog } from './PatientExamsDialog';
import { PatientComplexityBar } from './PatientComplexityBar';
import { PrintPreviewModal } from '@/components/print/PrintPreviewModal';
import { usePrintPatient } from '@/hooks/usePrintPatient';
import type { PatientWithDetails, Profile, RespiratorySupport, PatientPrecaution, RegulationStatus } from '@/types/database';

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
  const [isDischargeDialogOpen, setIsDischargeDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isExamsDialogOpen, setIsExamsDialogOpen] = useState(false);
  const { isPreparing, printData, showPreview, preparePrint, closePreview } = usePrintPatient();
  const { canEdit } = useUnit();
  const isMobile = useIsMobile();

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

    const [devicesRes, drugsRes, antibioticsRes, plansRes, evolutionsRes, prophylaxisRes, venousAccessRes, respiratorySupportRes, tasksRes, precautionsRes, examsRes, regulationRes] = await Promise.all([
      supabase.from('invasive_devices').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('vasoactive_drugs').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('antibiotics').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('therapeutic_plans').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(1),
      supabase.from('evolutions').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
      supabase.from('prophylaxis').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('venous_access').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('respiratory_support').select('*').eq('patient_id', patientId).eq('is_active', true).order('created_at', { ascending: false }).limit(1),
      supabase.from('patient_tasks').select('*').eq('patient_id', patientId),
      supabase.from('patient_precautions').select('*').eq('patient_id', patientId).eq('is_active', true),
      supabase.from('patient_exams').select('*').eq('patient_id', patientId).order('exam_date', { ascending: false }),
      supabase.from('patient_regulation').select('*').eq('patient_id', patientId).eq('is_active', true).order('requested_at', { ascending: false })
    ]);

    const patientWithDetails: PatientWithDetails = {
      ...patientData,
      weight: patientData.weight ?? null,
      diet_type: (patientData.diet_type as PatientWithDetails['diet_type']) ?? null,
      invasive_devices: devicesRes.data || [],
      vasoactive_drugs: drugsRes.data || [],
      antibiotics: antibioticsRes.data || [],
      therapeutic_plans: plansRes.data || [],
      evolutions: evolutionsRes.data || [],
      prophylaxis: prophylaxisRes.data || [],
      venous_access: venousAccessRes.data || [],
      respiratory_support: respiratorySupportRes.data?.[0] || null,
      patient_tasks: tasksRes.data || [],
      patient_precautions: precautionsRes.data || [],
      patient_exams: (examsRes.data || []).map(e => ({
        ...e,
        exam_type: e.exam_type as 'imagem' | 'laboratorial' | 'cultura' | 'outros'
      })),
      patient_regulation: (regulationRes.data || []).map(r => ({
        ...r,
        status: r.status as RegulationStatus
      }))
    };

    setPatient(patientWithDetails);

    const authorIds = new Set<string>();
    plansRes.data?.forEach(p => authorIds.add(p.created_by));
    evolutionsRes.data?.forEach(e => authorIds.add(e.created_by));
    tasksRes.data?.forEach(t => {
      if (t.completed_by) authorIds.add(t.completed_by);
    });

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

  // Mobile action buttons as dropdown
  const MobileActions = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MoreHorizontal className="h-4 w-4" />
          Ações
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canEdit && (
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Dados
          </DropdownMenuItem>
        )}
        {canEdit && (
          <DropdownMenuItem onClick={() => {
            document.getElementById('evolution-input-section')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            <PenLine className="h-4 w-4 mr-2" />
            Evoluir
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => setIsExamsDialogOpen(true)}>
          <ClipboardList className="h-4 w-4 mr-2" />
          Exames
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => patient && preparePrint(patient, bedNumber, authorProfiles)}
          disabled={isPreparing}
        >
          {isPreparing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Printer className="h-4 w-4 mr-2" />
          )}
          Imprimir
        </DropdownMenuItem>
        {canEdit && patient?.is_active && (
          <DropdownMenuItem onClick={() => setIsDischargeDialogOpen(true)}>
            <LogOut className="h-4 w-4 mr-2" />
            Registrar Desfecho
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Desktop action buttons
  const DesktopActions = () => (
    <div className="flex items-center gap-2">
      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditOpen(true)}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Editar Dados
        </Button>
      )}
      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            document.getElementById('evolution-input-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex items-center gap-2"
        >
          <PenLine className="h-4 w-4" />
          Evoluir
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExamsDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <ClipboardList className="h-4 w-4" />
        Exames
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => patient && preparePrint(patient, bedNumber, authorProfiles)}
        disabled={isPreparing}
        className="flex items-center gap-2"
      >
        {isPreparing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        Imprimir
      </Button>
      {canEdit && patient?.is_active && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDischargeDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Registrar Desfecho
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-card border-b px-4 md:px-6 py-3 md:py-4 flex-shrink-0 space-y-2 md:space-y-3">
          {/* Título e informações demográficas */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-foreground">
                Leito {bedNumber} - {patient?.initials || '...'}
              </h2>
              {patient && (
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                  {patient.age}a {patient.weight ? `| ${patient.weight}kg` : ''} | D{daysAdmitted}
                </p>
              )}
            </div>
            {/* Mobile: show dropdown in header */}
            {patient && isMobile && <MobileActions />}
          </div>

          {/* Desktop: Botões de ação em linha separada */}
          {patient && !isMobile && <DesktopActions />}

          {/* Badges - with horizontal scroll on mobile */}
          {patient && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
              {patient.main_diagnosis && (
                <Badge className="bg-destructive text-destructive-foreground whitespace-nowrap flex-shrink-0">
                  HD: {patient.main_diagnosis}
                </Badge>
              )}
              {comorbidityList.map((c, i) => (
                <Badge key={i} variant="secondary" className="bg-muted text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {c}
                </Badge>
              ))}
              {patient.is_palliative && (
                <Badge className="badge-pal whitespace-nowrap flex-shrink-0">PAL</Badge>
              )}
            </div>
          )}

          {/* Complexity Bar */}
          {patient && (
            <PatientComplexityBar 
              patient={patient}
              respiratorySupport={patient.respiratory_support as RespiratorySupport | null}
              precautions={(patient.patient_precautions as PatientPrecaution[]) || []}
            />
          )}
        </div>

        {/* Content */}
        {isInitialLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : patient ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 relative">
            {/* Plano Terapêutico - Full Width */}
            <TherapeuticPlan patient={patient} onUpdate={() => fetchPatient(true)} />
            
            {/* Grid - 1 coluna mobile, 2 colunas desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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

        {/* Discharge Dialog */}
        {patient && (
          <PatientDischargeDialog
            patientId={patient.id}
            patientInitials={patient.initials}
            bedId={patient.bed_id}
            hasActiveExternalTransfer={patient.patient_regulation?.some(
              r => r.is_active && r.status === 'aguardando_transferencia'
            )}
            isOpen={isDischargeDialogOpen}
            onClose={() => setIsDischargeDialogOpen(false)}
            onSuccess={onClose}
          />
        )}

        {/* Edit Patient Dialog */}
        {patient && (
          <EditPatientDialog
            patient={patient}
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSuccess={() => fetchPatient(true)}
          />
        )}

        {/* Exams Dialog */}
        {patient && (
          <PatientExamsDialog
            patientId={patient.id}
            isOpen={isExamsDialogOpen}
            onClose={() => setIsExamsDialogOpen(false)}
            onUpdate={() => fetchPatient(true)}
          />
        )}

        {/* Print Preview Modal */}
        {printData && (
          <PrintPreviewModal
            isOpen={showPreview}
            onClose={closePreview}
            patient={printData.patient}
            bedNumber={printData.bedNumber}
            evolutionSummary={printData.evolutionSummary}
            authorProfiles={printData.authorProfiles}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
