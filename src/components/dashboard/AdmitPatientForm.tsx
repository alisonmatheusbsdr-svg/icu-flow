import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface AdmitPatientFormProps {
  bedId: string;
  onSuccess: () => void;
}

export function AdmitPatientForm({ bedId, onSuccess }: AdmitPatientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [initials, setInitials] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [mainDiagnosis, setMainDiagnosis] = useState('');
  const [comorbidities, setComorbidities] = useState('');
  const [isPalliative, setIsPalliative] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initials || !age) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsLoading(true);

    const { error: patientError } = await supabase.from('patients').insert({
      bed_id: bedId,
      initials: initials.toUpperCase(),
      age: parseInt(age),
      weight: weight ? parseFloat(weight) : null,
      main_diagnosis: mainDiagnosis || null,
      comorbidities: comorbidities || null,
      is_palliative: isPalliative
    });

    if (patientError) {
      toast.error('Erro ao admitir paciente');
      setIsLoading(false);
      return;
    }

    await supabase.from('beds').update({ is_occupied: true }).eq('id', bedId);

    toast.success('Paciente admitido com sucesso!');
    setIsLoading(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="initials">Iniciais *</Label>
          <Input id="initials" placeholder="JMS" value={initials} onChange={(e) => setInitials(e.target.value)} maxLength={5} />
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
        <Label htmlFor="comorbidities">Comorbidades</Label>
        <Textarea id="comorbidities" placeholder="HAS, DM, DPOC..." value={comorbidities} onChange={(e) => setComorbidities(e.target.value)} />
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