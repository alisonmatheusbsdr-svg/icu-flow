import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { formatInitials } from '@/lib/utils';

const COMMON_COMORBIDITIES = ['HAS', 'DM', 'DAC', 'DPOC', 'ASMA', 'IRC', 'IRC-HD'];
const SPECIALTY_TEAMS = ['Ortopedia', 'Clínica Médica', 'Urologia', 'Cirurgia Geral'];

interface AdmitPatientFormProps {
  bedId: string;
  onSuccess: (patientId: string) => void;
}

export function AdmitPatientForm({ bedId, onSuccess }: AdmitPatientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [initials, setInitials] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [mainDiagnosis, setMainDiagnosis] = useState('');
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);
  const [otherComorbidities, setOtherComorbidities] = useState('');
  const [isPalliative, setIsPalliative] = useState(false);
  const [specialtyTeam, setSpecialtyTeam] = useState<string | null>(null);

  const toggleComorbidity = (comorbidity: string) => {
    setSelectedComorbidities(prev =>
      prev.includes(comorbidity)
        ? prev.filter(c => c !== comorbidity)
        : [...prev, comorbidity]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initials || !age) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsLoading(true);

    const { data: patientData, error: patientError } = await supabase.from('patients').insert({
      bed_id: bedId,
      initials: initials.replace(/\./g, '').toUpperCase(),
      age: parseInt(age),
      weight: weight ? parseFloat(weight) : null,
      main_diagnosis: mainDiagnosis || null,
      comorbidities: [...selectedComorbidities, otherComorbidities.trim()].filter(Boolean).join(', ') || null,
      is_palliative: isPalliative,
      specialty_team: specialtyTeam
    }).select('id').single();

    if (patientError || !patientData) {
      toast.error('Erro ao admitir paciente');
      setIsLoading(false);
      return;
    }

    await supabase.from('beds').update({ is_occupied: true }).eq('id', bedId);

    toast.success('Paciente admitido com sucesso!');
    setIsLoading(false);
    onSuccess(patientData.id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Input
          placeholder="Outras: Obesidade, Hipotireoidismo..."
          value={otherComorbidities}
          onChange={(e) => setOtherComorbidities(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={isPalliative} onCheckedChange={setIsPalliative} />
        <Label>Cuidados Paliativos</Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Admitindo...' : 'Admitir Paciente'}
      </Button>
    </form>
  );
}