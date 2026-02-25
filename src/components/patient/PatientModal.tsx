import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnit } from '@/hooks/useUnit';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeftRight, ClipboardList, Copy, Edit, Loader2, LogOut, MoreHorizontal, PenLine, Printer, Save, Sparkles, Volume2, Square } from 'lucide-react';
import { toast } from 'sonner';
import { TherapeuticPlan } from './TherapeuticPlan';
import { PatientClinicalData } from './PatientClinicalData';
import { PatientEvolutions } from './PatientEvolutions';
import { PatientDischargeDialog } from './PatientDischargeDialog';
import { EditPatientDialog } from './EditPatientDialog';
import { PatientExamsDialog } from './PatientExamsDialog';
import { PatientComplexityBar } from './PatientComplexityBar';
import { PrintPreviewModal } from '@/components/print/PrintPreviewModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TransferBedSelectDialog } from '@/components/nir/TransferBedSelectDialog';
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
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [currentUnitId, setCurrentUnitId] = useState<string | null>(null);
  const [currentDraft, setCurrentDraft] = useState('');
  const [showDraftAlert, setShowDraftAlert] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [clinicalSummary, setClinicalSummary] = useState<string | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const { isPreparing, printData, showPreview, preparePrint, closePreview } = usePrintPatient();
  const { canEdit, selectedUnit } = useUnit();
  const { hasRole } = useAuth();
  const isMobile = useIsMobile();
  const isNIR = hasRole('nir');

  const getSpecialtyAbbrev = (team: string): string => {
    const map: Record<string, string> = {
      'Ortopedia': 'ORTO',
      'Clínica Médica': 'CM',
      'Urologia': 'URO',
      'Cirurgia Geral': 'CG',
    };
    return map[team] || team;
  };

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

    // Calculate current 12h shift start
    const now = new Date();
    const currentHour = now.getHours();
    const isShiftA = currentHour >= 7 && currentHour < 19;
    const shiftStart = new Date(now);
    if (isShiftA) {
      shiftStart.setHours(7, 0, 0, 0);
    } else {
      if (currentHour < 7) {
        shiftStart.setDate(shiftStart.getDate() - 1);
      }
      shiftStart.setHours(19, 0, 0, 0);
    }

    const [devicesRes, drugsRes, antibioticsRes, plansRes, evolutionsRes, prophylaxisRes, venousAccessRes, respiratorySupportRes, tasksRes, precautionsRes, examsRes, regulationRes, bedRes, fluidBalanceRes] = await Promise.all([
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
      supabase.from('patient_regulation').select('*').eq('patient_id', patientId).eq('is_active', true).order('requested_at', { ascending: false }),
      patientData.bed_id ? supabase.from('beds').select('unit_id').eq('id', patientData.bed_id).maybeSingle() : null,
      supabase.from('fluid_balance').select('*').eq('patient_id', patientId).eq('shift_start', shiftStart.toISOString()).maybeSingle()
    ]);

    // Armazenar unit_id para transferência
    if (bedRes?.data?.unit_id) {
      setCurrentUnitId(bedRes.data.unit_id);
    }

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
      })),
      fluid_balance: fluidBalanceRes.data || null
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
        {isNIR && patient?.bed_id && currentUnitId && (
          <DropdownMenuItem onClick={() => setIsTransferDialogOpen(true)}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Transferir Leito
          </DropdownMenuItem>
        )}
        <DropdownMenuItem 
          onClick={handleGenerateSummary}
          disabled={isGeneratingSummary}
        >
          {isGeneratingSummary ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Resumo IA
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
        {isNIR && patient?.bed_id && currentUnitId && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTransferDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transferir Leito
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateSummary}
          disabled={isGeneratingSummary}
          className="flex items-center gap-2"
        >
          {isGeneratingSummary ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Resumo IA
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

  const handleDraftChange = useCallback((draft: string) => {
    setCurrentDraft(draft);
  }, []);

  const handleGenerateSummary = async () => {
    if (!patient) return;
    setIsGeneratingSummary(true);
    try {
      const activeEvolutions = patient.evolutions
        ?.filter((e: any) => !e.cancelled_at)
        .map((e: any) => ({ content: e.content, created_at: e.created_at, clinical_status: e.clinical_status })) || [];

      const payload = {
        initials: patient.initials,
        age: patient.age,
        weight: patient.weight,
        admission_date: patient.admission_date,
        main_diagnosis: patient.main_diagnosis,
        comorbidities: patient.comorbidities,
        diet_type: patient.diet_type,
        is_palliative: patient.is_palliative,
        specialty_team: patient.specialty_team,
        evolutions: activeEvolutions,
        devices: patient.invasive_devices?.map((d: any) => d.device_type) || [],
        venous_access: patient.venous_access?.map((v: any) => `${v.access_type} - ${v.insertion_site} - ${v.lumen_count}`) || [],
        vasoactive_drugs: patient.vasoactive_drugs?.map((d: any) => ({ drug_name: d.drug_name, dose_ml_h: d.dose_ml_h })) || [],
        antibiotics: patient.antibiotics?.map((a: any) => a.antibiotic_name) || [],
        respiratory: patient.respiratory_support ? {
          modality: (patient.respiratory_support as any).modality,
          ventilator_mode: (patient.respiratory_support as any).ventilator_mode,
          fio2: (patient.respiratory_support as any).fio2,
          peep: (patient.respiratory_support as any).peep,
          flow_rate: (patient.respiratory_support as any).flow_rate,
        } : null,
        precautions: patient.patient_precautions?.map((p: any) => p.precaution_type) || [],
        prophylaxis: patient.prophylaxis?.map((p: any) => p.prophylaxis_type) || [],
        therapeutic_plan: patient.therapeutic_plans?.[0]?.content || null,
      };

      const { data, error } = await supabase.functions.invoke('summarize-patient', {
        body: payload,
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.summary) {
        setClinicalSummary(data.summary);
        setShowSummaryDialog(true);
      }
    } catch (err: any) {
      console.error('Error generating summary:', err);
      toast.error('Erro ao gerar resumo clínico');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlayingAudio(false);
  }, []);

  const handlePlaySummary = async () => {
    if (isPlayingAudio) {
      stopAudio();
      return;
    }

    if (!clinicalSummary) return;

    setIsLoadingAudio(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: clinicalSummary, voiceId: "Xb7hH8MSUJpSbSDYk0k2" }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Erro ao gerar áudio");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        stopAudio();
      };

      await audio.play();
      setIsPlayingAudio(true);
    } catch (err: any) {
      console.error("Error playing audio:", err);
      toast.error(err.message || "Erro ao reproduzir áudio");
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && currentDraft.trim().length > 0) {
      const savedDraft = localStorage.getItem(`evolution_draft_${patientId}`) || '';
      if (currentDraft.trim() !== savedDraft.trim()) {
        setShowDraftAlert(true);
        return;
      }
    }
    if (!open) onClose();
  };

  const handleSaveDraftAndClose = () => {
    if (patientId && currentDraft.trim()) {
      localStorage.setItem(`evolution_draft_${patientId}`, currentDraft);
      toast.success('Rascunho salvo!');
    }
    setShowDraftAlert(false);
    onClose();
  };

  const handleDiscardAndClose = () => {
    setShowDraftAlert(false);
    onClose();
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-card border-b px-4 md:px-6 py-3 md:py-4 flex-shrink-0 space-y-2 md:space-y-3">
          {/* Título e informações demográficas */}
          <div className="flex items-start justify-between gap-2 pr-10 md:pr-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-foreground">
                  Leito {bedNumber} - {patient?.initials || '...'}
                </h2>
                {patient?.specialty_team && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    {getSpecialtyAbbrev(patient.specialty_team)}
                  </Badge>
                )}
              </div>
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
            <div className="flex gap-2 items-start overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
              {patient.main_diagnosis && (
                <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 flex-shrink-0">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium whitespace-nowrap">HD</span>
                  <Badge className="bg-destructive text-destructive-foreground whitespace-nowrap">
                    {patient.main_diagnosis}
                  </Badge>
                </div>
              )}
              {comorbidityList.length > 0 && (
                <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 flex-shrink-0">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium whitespace-nowrap">Comorbidades</span>
                  <div className="flex flex-wrap gap-1">
                    {comorbidityList.map((c, i) => (
                      <Badge key={i} variant="secondary" className="bg-secondary text-secondary-foreground whitespace-nowrap">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
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
              <PatientClinicalData patient={patient} onUpdate={() => fetchPatient(true)} canEdit={canEdit} />
              <PatientEvolutions 
                patient={patient} 
                authorProfiles={authorProfiles} 
                onUpdate={() => fetchPatient(true)}
                onDraftChange={handleDraftChange}
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

        {/* Transfer Bed Dialog - NIR only */}
        {patient && patient.bed_id && currentUnitId && (
          <TransferBedSelectDialog
            isOpen={isTransferDialogOpen}
            onClose={() => setIsTransferDialogOpen(false)}
            patient={{ id: patient.id, initials: patient.initials, age: patient.age }}
            currentBedId={patient.bed_id}
            currentBedNumber={bedNumber}
            currentUnitId={currentUnitId}
            onSuccess={onClose}
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
            unitId={selectedUnit?.id}
            unitName={selectedUnit?.name}
          />
        )}
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDraftAlert} onOpenChange={setShowDraftAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Evolução não salva</AlertDialogTitle>
          <AlertDialogDescription>
            Você tem texto na evolução que não foi salvo. Deseja salvar como rascunho antes de sair?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={() => setShowDraftAlert(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDiscardAndClose}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sair sem Salvar
          </AlertDialogAction>
          <AlertDialogAction
            onClick={handleSaveDraftAndClose}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar Rascunho e Sair
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Clinical Summary Dialog */}
    <Dialog open={showSummaryDialog} onOpenChange={(open) => {
      if (!open) stopAudio();
      setShowSummaryDialog(open);
    }}>
      <DialogContent className="max-w-lg">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Resumo Clínico - IA</h3>
          </div>
          <ScrollArea className="max-h-[60vh]">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {clinicalSummary}
            </p>
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlaySummary}
              disabled={isLoadingAudio}
              className="gap-2"
            >
              {isLoadingAudio ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : isPlayingAudio ? (
                <>
                  <Square className="h-4 w-4" />
                  Parar
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4" />
                  Ouvir
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (clinicalSummary) {
                  navigator.clipboard.writeText(clinicalSummary);
                  toast.success('Resumo copiado!');
                }
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
            <Button size="sm" onClick={() => {
              stopAudio();
              setShowSummaryDialog(false);
            }}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
