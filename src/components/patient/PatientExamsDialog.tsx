import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Radiation, Microscope, AlertTriangle, Trash2, Bug, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ExamType = 'imagem' | 'laboratorial' | 'cultura' | 'outros';

interface PatientExam {
  id: string;
  patient_id: string;
  exam_type: ExamType;
  exam_name: string;
  exam_date: string;
  is_critical: boolean;
  content: string;
  created_by: string;
  created_at: string;
}

interface PatientExamsDialogProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const CULTURE_TYPES = [
  'Hemocultura',
  'Urocultura',
  'Cultura de Secreção',
  'LCR',
  'Ponta de Cateter',
  'Outra'
];

export function PatientExamsDialog({ patientId, isOpen, onClose, onUpdate }: PatientExamsDialogProps) {
  const { user } = useAuth();
  const [exams, setExams] = useState<PatientExam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [examType, setExamType] = useState<ExamType>('laboratorial');
  const [examName, setExamName] = useState('');
  const [cultureType, setCultureType] = useState('');
  const [customCultureType, setCustomCultureType] = useState('');
  const [examDate, setExamDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isCritical, setIsCritical] = useState(false);
  const [content, setContent] = useState('');

  const fetchExams = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('patient_exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('exam_date', { ascending: false });

    if (error) {
      toast.error('Erro ao carregar exames');
    } else {
      setExams((data as PatientExam[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchExams();
    }
  }, [isOpen, patientId]);

  const resetForm = () => {
    setExamType('laboratorial');
    setExamName('');
    setCultureType('');
    setCustomCultureType('');
    setExamDate(format(new Date(), 'yyyy-MM-dd'));
    setIsCritical(false);
    setContent('');
  };

  const getExamNameForSubmit = (): string => {
    if (examType === 'cultura') {
      return cultureType === 'Outra' ? customCultureType.trim() : cultureType;
    }
    return examName.trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalExamName = getExamNameForSubmit();
    
    if (!finalExamName || !content.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from('patient_exams').insert({
      patient_id: patientId,
      exam_type: examType,
      exam_name: finalExamName,
      exam_date: examDate,
      is_critical: isCritical,
      content: content.trim(),
      created_by: user.id
    });

    if (error) {
      toast.error('Erro ao registrar exame');
    } else {
      toast.success('Exame registrado com sucesso');
      resetForm();
      fetchExams();
      onUpdate();
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (examId: string) => {
    const { error } = await supabase
      .from('patient_exams')
      .delete()
      .eq('id', examId);

    if (error) {
      toast.error('Erro ao remover exame');
    } else {
      toast.success('Exame removido');
      fetchExams();
      onUpdate();
    }
  };

  const getExamIcon = (type: ExamType) => {
    switch (type) {
      case 'imagem':
        return <Radiation className="h-4 w-4 text-orange-500 flex-shrink-0" />;
      case 'laboratorial':
        return <Microscope className="h-4 w-4 text-blue-500 flex-shrink-0" />;
      case 'cultura':
        return <Bug className="h-4 w-4 text-green-500 flex-shrink-0" />;
      case 'outros':
        return <ClipboardList className="h-4 w-4 text-purple-500 flex-shrink-0" />;
    }
  };

  const getDateLabel = () => {
    return examType === 'cultura' ? 'Data da Coleta' : 'Data de Realização';
  };

  const getNameLabel = () => {
    return examType === 'cultura' ? 'Tipo de Cultura *' : 'Nome do Exame *';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Registrar Exame</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 p-1">
            {/* Exam Type */}
            <div className="space-y-2">
              <Label>Tipo de Exame</Label>
              <RadioGroup
                value={examType}
                onValueChange={(val) => setExamType(val as ExamType)}
                className="grid grid-cols-2 gap-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="imagem" id="imagem" />
                  <Label htmlFor="imagem" className="flex items-center gap-2 cursor-pointer">
                    <Radiation className="h-4 w-4 text-orange-500" />
                    Imagem
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="laboratorial" id="laboratorial" />
                  <Label htmlFor="laboratorial" className="flex items-center gap-2 cursor-pointer">
                    <Microscope className="h-4 w-4 text-blue-500" />
                    Laboratorial
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cultura" id="cultura" />
                  <Label htmlFor="cultura" className="flex items-center gap-2 cursor-pointer">
                    <Bug className="h-4 w-4 text-green-500" />
                    Cultura
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="outros" id="outros" />
                  <Label htmlFor="outros" className="flex items-center gap-2 cursor-pointer">
                    <ClipboardList className="h-4 w-4 text-purple-500" />
                    Outros
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Exam Name/Culture Type and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam-name">{getNameLabel()}</Label>
                {examType === 'cultura' ? (
                  <Select value={cultureType} onValueChange={setCultureType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {CULTURE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="exam-name"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder={examType === 'outros' ? 'Ex: ECG, EEG...' : 'Ex: TC Crânio, Lactato...'}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-date">{getDateLabel()}</Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
            </div>

            {/* Custom Culture Type (when "Outra" is selected) */}
            {examType === 'cultura' && cultureType === 'Outra' && (
              <div className="space-y-2">
                <Label htmlFor="custom-culture">Especifique o tipo de cultura *</Label>
                <Input
                  id="custom-culture"
                  value={customCultureType}
                  onChange={(e) => setCustomCultureType(e.target.value)}
                  placeholder="Digite o tipo de cultura..."
                />
              </div>
            )}

            {/* Critical Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is-critical"
                checked={isCritical}
                onCheckedChange={(checked) => setIsCritical(checked === true)}
              />
              <Label htmlFor="is-critical" className="flex items-center gap-2 cursor-pointer">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Resultado crítico
              </Label>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="exam-content">
                {examType === 'cultura' ? 'Resultado/Achado *' : 'Achado *'}
              </Label>
              <Textarea
                id="exam-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  examType === 'cultura' 
                    ? 'Ex: Positivo para S. aureus MRSA, sensível a Vancomicina...'
                    : 'Descreva o achado relevante...'
                }
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registrar Exame
            </Button>
          </form>

          {/* Exams List */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">EXAMES REGISTRADOS</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : exams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum exame registrado
              </p>
            ) : (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className={`p-3 rounded-lg border ${
                      exam.is_critical ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getExamIcon(exam.exam_type)}
                        {exam.is_critical && (
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <span className="font-medium text-sm">{exam.exam_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(exam.exam_date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleDelete(exam.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 ml-6">
                      Registrado em {format(new Date(exam.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-sm mt-2 ml-6 whitespace-pre-wrap">{exam.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
