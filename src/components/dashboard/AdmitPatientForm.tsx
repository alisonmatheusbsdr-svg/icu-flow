import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { formatInitials } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Mic, MicOff, Sparkles, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';

const COMMON_COMORBIDITIES = ['HAS', 'DM', 'DAC', 'DPOC', 'ASMA', 'IRC', 'IRC-HD'];
const SPECIALTY_TEAMS = ['Ortopedia', 'Clínica Médica', 'Urologia', 'Cirurgia Geral'];

interface AdmitPatientFormProps {
  bedId: string;
  onSuccess: (patientId: string) => void;
}

export function AdmitPatientForm({ bedId, onSuccess }: AdmitPatientFormProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 state
  const [initials, setInitials] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [mainDiagnosis, setMainDiagnosis] = useState('');
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);
  const [otherComorbidities, setOtherComorbidities] = useState<string[]>([]);
  const [newComorbidity, setNewComorbidity] = useState('');
  const [isPalliative, setIsPalliative] = useState(false);
  const [specialtyTeam, setSpecialtyTeam] = useState<string | null>(null);

  // Step 2 state
  const [admissionHistory, setAdmissionHistory] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [improvedText, setImprovedText] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const toggleComorbidity = (comorbidity: string) => {
    setSelectedComorbidities(prev =>
      prev.includes(comorbidity)
        ? prev.filter(c => c !== comorbidity)
        : [...prev, comorbidity]
    );
  };

  const handleNextStep = () => {
    if (!initials || !age) {
      toast.error('Preencha os campos obrigatórios (Iniciais e Idade)');
      return;
    }
    setStep(2);
  };

  const startRecording = useCallback(async () => {
    try {
      // 1. Request microphone FIRST to preserve user gesture context
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      streamRef.current = stream;

      // 2. Then fetch the token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('elevenlabs-scribe-token');

      if (tokenError || !tokenData?.token) {
        toast.error('Erro ao iniciar gravação. Tente novamente.');
        console.error('Token error:', tokenError);
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        return;
      }

      // 3. Correct WebSocket URL with VAD commit strategy
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
            // 4. Correct message format
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
            setAdmissionHistory(prev => {
              const separator = prev.trim() ? ' ' : '';
              return prev.trim() + separator + data.text;
            });
            setPartialTranscript('');
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        toast.error('Erro na conexão de voz');
      };

      ws.onclose = () => {
        setIsProcessing(false);
        setPartialTranscript('');
      };

      wsRef.current = ws;
      setIsRecording(true);
    } catch (error) {
      if ((error as any)?.name === 'NotAllowedError') {
        toast.error('Permissão de microfone negada. Habilite nas configurações do navegador.');
      } else {
        toast.error('Erro ao iniciar gravação');
        console.error('Recording error:', error);
      }
      // Clean up stream on failure
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
    // Close WebSocket after a brief delay to allow final commits
    setTimeout(() => {
      wsRef.current?.close();
      wsRef.current = null;
    }, 1500);
  }, []);

  const handleImproveText = async () => {
    if (!admissionHistory.trim()) {
      toast.error('Digite ou grave um texto antes de melhorar');
      return;
    }
    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-admission-text', {
        body: { text: admissionHistory }
      });
      if (error) {
        toast.error('Erro ao melhorar texto');
        return;
      }
      if (data?.improved_text) {
        setImprovedText(data.improved_text);
      }
    } catch {
      toast.error('Erro ao melhorar texto');
    } finally {
      setIsImproving(false);
    }
  };

  const acceptImprovedText = () => {
    if (improvedText) {
      setAdmissionHistory(improvedText);
      setImprovedText(null);
      toast.success('Texto melhorado aplicado');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data: patientData, error: patientError } = await supabase.from('patients').insert({
        bed_id: bedId,
        initials: initials.replace(/\./g, '').toUpperCase(),
        age: parseInt(age),
        weight: weight ? parseFloat(weight) : null,
        main_diagnosis: mainDiagnosis || null,
        comorbidities: [...selectedComorbidities, ...otherComorbidities].filter(Boolean).join(', ') || null,
        is_palliative: isPalliative,
        specialty_team: specialtyTeam
      }).select('id').single();

      if (patientError || !patientData) {
        toast.error('Erro ao admitir paciente');
        setIsLoading(false);
        return;
      }

      await supabase.from('beds').update({ is_occupied: true }).eq('id', bedId);

      const historyText = admissionHistory.trim();
      if (historyText && user) {
        const { error: evolError } = await supabase.from('evolutions').insert({
          patient_id: patientData.id,
          content: historyText,
          created_by: user.id,
          clinical_status: 'inalterado'
        });
        if (evolError) {
          toast.warning('Paciente admitido, mas houve erro ao salvar a história de admissão.');
        }
      }

      toast.success('Paciente admitido com sucesso!');
      setIsLoading(false);
      onSuccess(patientData.id);
    } catch {
      toast.error('Erro ao admitir paciente');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={() => step === 2 && setStep(1)}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            step === 1 ? 'text-primary' : 'text-muted-foreground hover:text-foreground cursor-pointer'
          }`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>1</span>
          Dados do Paciente
        </button>
        <div className="h-px flex-1 bg-border" />
        <button
          type="button"
          onClick={() => { if (step === 1 && initials && age) setStep(2); }}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            step === 2 ? 'text-primary' : 'text-muted-foreground'
          } ${step === 1 && initials && age ? 'hover:text-foreground cursor-pointer' : ''}`}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>2</span>
          História de Admissão
        </button>
      </div>

      {step === 1 && (
        <form onSubmit={(e) => { e.preventDefault(); handleNextStep(); }} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initials">Iniciais *</Label>
              <Input id="initials" placeholder="J.M.S" value={initials} onChange={(e) => setInitials(formatInitials(e.target.value))} maxLength={9} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Idade *</Label>
              <Input id="age" type="number" placeholder="65" value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input id="weight" type="number" placeholder="70" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Hipótese Diagnóstica</Label>
            <Input id="diagnosis" placeholder="Ex: Sepse de foco pulmonar" value={mainDiagnosis} onChange={(e) => setMainDiagnosis(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Equipe Assistente</Label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_TEAMS.map((team) => (
                <Button
                  key={team}
                  type="button"
                  variant={specialtyTeam === team ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSpecialtyTeam(prev => prev === team ? null : team)}
                >
                  {team}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comorbidades</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_COMORBIDITIES.map((comorbidity) => (
                <Button
                  key={comorbidity}
                  type="button"
                  variant={selectedComorbidities.includes(comorbidity) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleComorbidity(comorbidity)}
                >
                  {comorbidity}
                </Button>
              ))}
            </div>
            {otherComorbidities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {otherComorbidities.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2.5 py-0.5 text-xs font-semibold">
                    {c}
                    <button type="button" onClick={() => setOtherComorbidities(prev => prev.filter(x => x !== c))} className="ml-0.5 hover:text-destructive">✕</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Obesidade"
                value={newComorbidity}
                onChange={(e) => setNewComorbidity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = newComorbidity.trim();
                    if (val && !otherComorbidities.includes(val) && !selectedComorbidities.includes(val.toUpperCase())) {
                      setOtherComorbidities(prev => [...prev, val]);
                      setNewComorbidity('');
                    }
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => {
                const val = newComorbidity.trim();
                if (val && !otherComorbidities.includes(val) && !selectedComorbidities.includes(val.toUpperCase())) {
                  setOtherComorbidities(prev => [...prev, val]);
                  setNewComorbidity('');
                }
              }}>+ Adicionar</Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isPalliative} onCheckedChange={setIsPalliative} />
            <Label>Cuidados Paliativos</Label>
          </div>

          <Button type="submit" className="w-full">
            Próximo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>História de Admissão <span className="text-muted-foreground text-xs font-normal">(opcional)</span></Label>
            <div className="relative">
              <Textarea
                placeholder={isRecording ? "🎤 Ouvindo... fale agora" : "Descreva a história clínica de admissão do paciente..."}
                value={admissionHistory}
                onChange={(e) => setAdmissionHistory(e.target.value)}
                className={`min-h-[160px] resize-y transition-all ${
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
            {(isRecording || isProcessing) && partialTranscript && (
              <p className="text-sm italic text-muted-foreground px-1 animate-pulse">
                {partialTranscript}
              </p>
            )}
          </div>

          {improvedText && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
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

          <div className="flex gap-2">
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
                  Processando transcrição...
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
              variant="outline"
              size="sm"
              onClick={handleImproveText}
              disabled={isImproving || !admissionHistory.trim() || isRecording || isProcessing}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              {isImproving ? 'Melhorando...' : 'Melhorar Texto'}
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || isRecording || isProcessing}
              className="flex-1"
            >
              {isLoading ? 'Admitindo...' : 'Admitir Paciente'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
