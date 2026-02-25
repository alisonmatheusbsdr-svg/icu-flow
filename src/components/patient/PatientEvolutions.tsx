import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUnit } from '@/hooks/useUnit';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CharacterCounter } from '@/components/ui/character-counter';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, Clock, Save, TrendingUp, TrendingDown, Minus, Trash2, Mic, MicOff, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PatientTasks } from './PatientTasks';
import type { PatientWithDetails, Profile } from '@/types/database';

type ClinicalStatus = 'melhor' | 'pior' | 'inalterado';

const STATUS_CONFIG: Record<ClinicalStatus, { label: string; icon: typeof TrendingUp; className: string; badgeClass: string }> = {
  melhor: { label: 'Melhor', icon: TrendingUp, className: 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400', badgeClass: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  pior: { label: 'Pior', icon: TrendingDown, className: 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400', badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
  inalterado: { label: 'Inalterado', icon: Minus, className: 'border-muted-foreground bg-muted text-muted-foreground', badgeClass: 'bg-muted text-muted-foreground border-muted-foreground/30' },
};

const EVOLUTION_CHAR_LIMIT = 420;

interface PatientEvolutionsProps {
  patient: PatientWithDetails;
  authorProfiles: Record<string, Profile>;
  onUpdate: () => void;
  onDraftChange?: (draft: string) => void;
}

export function PatientEvolutions({ patient, authorProfiles, onUpdate, onDraftChange }: PatientEvolutionsProps) {
  const { user } = useAuth();
  const { canEdit } = useUnit();
  const [newEvolution, setNewEvolution] = useState('');
  const [clinicalStatus, setClinicalStatus] = useState<ClinicalStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [evolutionToCancel, setEvolutionToCancel] = useState<{ id: string; content: string } | null>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // AI improve states
  const [isImproving, setIsImproving] = useState(false);
  const [improvedText, setImprovedText] = useState<string | null>(null);

  const draftKey = `evolution_draft_${patient.id}`;

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      setNewEvolution(savedDraft);
    }
  }, [draftKey]);

  // Notify parent of draft changes
  useEffect(() => {
    onDraftChange?.(newEvolution);
  }, [newEvolution, onDraftChange]);

  // Scroll to bottom of history container only (not the whole page)
  useEffect(() => {
    if (historyContainerRef.current) {
      historyContainerRef.current.scrollTop = historyContainerRef.current.scrollHeight;
    }
  }, [patient.evolutions]);

  // Auto-scroll textarea during recording
  useEffect(() => {
    if (isRecording && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [partialTranscript, newEvolution, isRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });
      streamRef.current = stream;

      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (tokenError || !tokenData?.token) {
        toast.error('Erro ao iniciar gravação. Tente novamente.');
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        return;
      }

      const ws = new WebSocket(
        `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&language_code=por&commit_strategy=vad&token=${tokenData.token}`
      );

      ws.onopen = () => {
        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            const uint8 = new Uint8Array(pcm16.buffer);
            let binary = '';
            for (let i = 0; i < uint8.length; i++) {
              binary += String.fromCharCode(uint8[i]);
            }
            ws.send(JSON.stringify({ message_type: "input_audio_chunk", audio_base_64: btoa(binary) }));
          }
        };

        audioContextRef.current = audioContext;
        sourceRef.current = source;
        processorRef.current = processor;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message_type === 'partial_transcript' && data.text) {
            setPartialTranscript(data.text);
          }
          if (data.message_type === 'committed_transcript' && data.text) {
            setNewEvolution(prev => {
              const separator = prev.trim() ? ' ' : '';
              return prev.trim() + separator + data.text;
            });
            setPartialTranscript('');
          }
        } catch { /* ignore */ }
      };

      ws.onerror = () => toast.error('Erro na conexão de voz');
      ws.onclose = () => { setIsProcessing(false); setPartialTranscript(''); };

      wsRef.current = ws;
      setIsRecording(true);
    } catch (error) {
      if ((error as any)?.name === 'NotAllowedError') {
        toast.error('Permissão de microfone negada. Habilite nas configurações do navegador.');
      } else {
        toast.error('Erro ao iniciar gravação');
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setIsProcessing(true);
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    processorRef.current = null;
    sourceRef.current = null;
    audioContextRef.current = null;
    streamRef.current = null;
    setTimeout(() => { wsRef.current?.close(); wsRef.current = null; }, 1500);
  }, []);

  const handleImproveText = async () => {
    if (!newEvolution.trim()) {
      toast.error('Digite ou grave um texto antes de melhorar');
      return;
    }
    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-admission-text', {
        body: { text: newEvolution }
      });
      if (error) { toast.error('Erro ao melhorar texto'); return; }
      if (data?.improved_text) { setImprovedText(data.improved_text); }
    } catch { toast.error('Erro ao melhorar texto'); }
    finally { setIsImproving(false); }
  };

  const acceptImprovedText = () => {
    if (improvedText) {
      setNewEvolution(improvedText);
      setImprovedText(null);
      toast.success('Texto melhorado aplicado');
    }
  };

  const handleAddEvolution = async () => {
    if (!newEvolution.trim() || !user || !canEdit) return;
    setIsLoading(true);
    if (!clinicalStatus) {
      toast.error('Selecione o status clínico antes de registrar');
      setIsLoading(false);
      return;
    }
    const { error } = await supabase.from('evolutions').insert({ 
      patient_id: patient.id, 
      content: newEvolution, 
      created_by: user.id,
      clinical_status: clinicalStatus
    } as any);
    if (error) {
      toast.error('Erro ao registrar evolução');
    } else {
      toast.success('Evolução registrada!');
      setNewEvolution('');
      setClinicalStatus(null);
      localStorage.removeItem(draftKey);
      onUpdate();
    }
    setIsLoading(false);
  };

  const handleSaveDraft = () => {
    if (!newEvolution.trim()) return;
    localStorage.setItem(draftKey, newEvolution);
    toast.success('Rascunho salvo!');
  };

  const canCancelEvolution = (evo: { created_at: string; created_by: string }): boolean => {
    const hoursSinceCreation = (Date.now() - new Date(evo.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation >= 24) return false;
    const hasLaterEvolutionByOther = patient.evolutions?.some(
      other => other.created_by !== evo.created_by && new Date(other.created_at) > new Date(evo.created_at)
    );
    return !hasLaterEvolutionByOther;
  };

  const handleCancelEvolution = async () => {
    if (!evolutionToCancel) return;
    try { await navigator.clipboard.writeText(evolutionToCancel.content); } catch { /* silent */ }
    const { error } = await supabase.from('evolutions').delete().eq('id', evolutionToCancel.id);
    if (error) {
      toast.error('Erro ao cancelar evolução');
    } else {
      toast.success('Evolução cancelada. Texto copiado para a área de transferência.');
      onUpdate();
    }
    setEvolutionToCancel(null);
  };

  const isOverLimit = newEvolution.length > EVOLUTION_CHAR_LIMIT;

  return (
    <div className="space-y-4">
      {/* Evolution History */}
      <div className="section-card">
        <h3 className="section-title">
          <Clock className="h-4 w-4" />
          Histórico
        </h3>
        
        {patient.evolutions && patient.evolutions.length > 0 ? (
          <div ref={historyContainerRef} className="space-y-0 max-h-80 overflow-y-auto">
            {[...patient.evolutions].reverse().map((evo) => (
              <div key={evo.id} className="evolution-item">
                <p className="text-sm whitespace-pre-wrap text-foreground">{evo.content}</p>
                <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mt-1">
                  {(evo as any).clinical_status && STATUS_CONFIG[(evo as any).clinical_status as ClinicalStatus] && (
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_CONFIG[(evo as any).clinical_status as ClinicalStatus].badgeClass}`}>
                      {STATUS_CONFIG[(evo as any).clinical_status as ClinicalStatus].label}
                    </Badge>
                  )}
                  <span>
                    Dr. {authorProfiles[evo.created_by]?.nome || 'Desconhecido'} - {' '}
                    {new Date(evo.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {canEdit && evo.created_by === user?.id && canCancelEvolution(evo) && (
                    <button
                      type="button"
                      onClick={() => setEvolutionToCancel({ id: evo.id, content: evo.content })}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Cancelar evolução"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhuma evolução registrada</p>
        )}
      </div>

      {/* New Evolution - only show if canEdit */}
      {canEdit && (
        <div id="evolution-input-section" className="section-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">SUA EVOLUÇÃO</h3>
          
          <div className="flex gap-2 mb-3">
            {(Object.entries(STATUS_CONFIG) as [ClinicalStatus, typeof STATUS_CONFIG[ClinicalStatus]][]).map(([key, config]) => {
              const Icon = config.icon;
              const isSelected = clinicalStatus === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setClinicalStatus(isSelected ? null : key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-all ${
                    isSelected ? config.className + ' ring-1 ring-offset-1' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder={isRecording ? "🎤 Ouvindo... fale agora" : "Registrar evolução do plantão..."}
              value={isRecording && partialTranscript
                ? newEvolution.trim() + (newEvolution.trim() ? ' ' : '') + partialTranscript
                : newEvolution}
              onChange={(e) => setNewEvolution(e.target.value)}
              rows={5}
              className={`evolution-textarea transition-all ${
                isRecording ? 'ring-2 ring-destructive/70 animate-pulse border-destructive/50' : ''
              } ${isProcessing ? 'ring-2 ring-primary/50 border-primary/50' : ''}`}
              disabled={isRecording || isProcessing}
            />
            {isRecording && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-destructive/10 text-destructive rounded-full px-2.5 py-1 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Gravando
              </div>
            )}
            {isProcessing && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Processando...
              </div>
            )}
          </div>

          <CharacterCounter current={newEvolution.length} max={EVOLUTION_CHAR_LIMIT} className="mb-1" />
          {isOverLimit && !isRecording && !isProcessing && (
            <p className="text-xs text-warning flex items-center gap-1 mb-3">
              <Sparkles className="h-3 w-3" />
              Texto longo — use "Melhorar Texto" para condensar com IA
            </p>
          )}

          {improvedText && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 mb-3">
              <div className="flex items-center justify-between">
                <Label className="text-primary text-sm font-medium">Texto Melhorado</Label>
                <div className="flex gap-1.5">
                  <Button type="button" size="sm" variant="outline" onClick={() => setImprovedText(null)} className="h-7 px-2">
                    <X className="h-3.5 w-3.5 mr-1" /> Rejeitar
                  </Button>
                  <Button type="button" size="sm" onClick={acceptImprovedText} className="h-7 px-2">
                    <Check className="h-3.5 w-3.5 mr-1" /> Aceitar
                  </Button>
                </div>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap bg-background rounded-md p-2 border max-h-[200px] overflow-y-auto">
                {improvedText}
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              variant={isRecording ? "destructive" : isProcessing ? "secondary" : "outline"}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processando...
                </>
              ) : isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-1.5" />
                  Parar Gravação
                  <span className="ml-1.5 w-2.5 h-2.5 rounded-full bg-destructive-foreground/70 animate-pulse" />
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-1.5" />
                  Gravar por Voz
                </>
              )}
            </Button>
            <Button
              type="button"
              variant={isOverLimit ? "default" : "outline"}
              size="sm"
              onClick={handleImproveText}
              disabled={isImproving || !newEvolution.trim() || isRecording || isProcessing}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {isImproving ? 'Melhorando...' : 'Melhorar Texto'}
            </Button>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline"
              onClick={handleSaveDraft} 
              disabled={isLoading || !newEvolution.trim() || isRecording || isProcessing}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Salvar Rascunho
            </Button>
            <Button 
              onClick={handleAddEvolution} 
              disabled={isLoading || !newEvolution.trim() || !clinicalStatus || isRecording || isProcessing}
              className="bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white gap-2"
            >
              <Check className="h-4 w-4" />
              Validar Evolução
            </Button>
          </div>
        </div>
      )}

      {/* Pending Tasks Section */}
      <PatientTasks 
        patient={patient} 
        authorProfiles={authorProfiles} 
        onUpdate={onUpdate} 
      />
      {/* Cancel Evolution Confirmation Dialog */}
      <AlertDialog open={!!evolutionToCancel} onOpenChange={(open) => !open && setEvolutionToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar evolução?</AlertDialogTitle>
            <AlertDialogDescription>
              A evolução será removida e o texto será copiado para a área de transferência para facilitar a correção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelEvolution} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancelar Evolução
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
