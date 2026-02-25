import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PatientWithDetails } from "@/types/database";
import { formatInitials } from "@/lib/utils";

const COMMON_COMORBIDITIES = ['HAS', 'DM', 'DAC', 'DPOC', 'ASMA', 'IRC', 'IRC-HD'];
const SPECIALTY_TEAMS = ['Ortopedia', 'Clínica Médica', 'Urologia', 'Cirurgia Geral'];

const parseExistingComorbidities = (comorbidities: string | null) => {
  if (!comorbidities) return { selected: [] as string[], others: [] as string[] };
  
  const parts = comorbidities.split(/[,;]/).map(c => c.trim());
  const selected = parts.filter(c => 
    COMMON_COMORBIDITIES.includes(c.toUpperCase())
  ).map(c => c.toUpperCase());
  const others = parts.filter(c => 
    !COMMON_COMORBIDITIES.includes(c.toUpperCase()) && c.length > 0
  );
  
  return { selected, others };
};

interface EditPatientDialogProps {
  patient: PatientWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditPatientDialog({
  patient,
  isOpen,
  onClose,
  onSuccess,
}: EditPatientDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [initials, setInitials] = useState(formatInitials(patient.initials));
  const [age, setAge] = useState(patient.age.toString());
  const [weight, setWeight] = useState(patient.weight?.toString() || "");
  const [mainDiagnosis, setMainDiagnosis] = useState(patient.main_diagnosis || "");
  const { selected, others } = parseExistingComorbidities(patient.comorbidities);
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>(selected);
  const [otherComorbidities, setOtherComorbidities] = useState<string[]>(others);
  const [newComorbidity, setNewComorbidity] = useState('');
  const [isPalliative, setIsPalliative] = useState(patient.is_palliative);
  const [specialtyTeam, setSpecialtyTeam] = useState<string | null>(patient.specialty_team || null);

  const toggleComorbidity = (comorbidity: string) => {
    setSelectedComorbidities(prev =>
      prev.includes(comorbidity)
        ? prev.filter(c => c !== comorbidity)
        : [...prev, comorbidity]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!initials.trim() || !age) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("patients")
        .update({
          initials: initials.replace(/\./g, '').trim().toUpperCase(),
          age: parseInt(age),
          weight: weight ? parseFloat(weight) : null,
          main_diagnosis: mainDiagnosis.trim() || null,
          comorbidities: [...selectedComorbidities, ...otherComorbidities].filter(Boolean).join(', ') || null,
          is_palliative: isPalliative,
          specialty_team: specialtyTeam,
        })
        .eq("id", patient.id);

      if (error) throw error;

      toast.success("Dados do paciente atualizados!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Erro ao atualizar paciente:", error);
      toast.error("Erro ao atualizar dados do paciente");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Dados do Paciente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initials">Iniciais *</Label>
              <Input
                id="initials"
                value={initials}
                onChange={(e) => setInitials(formatInitials(e.target.value))}
                placeholder="Ex: J.P.S"
                maxLength={9}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Idade *</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                min="0"
                max="150"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Peso (kg)</Label>
            <Input
              id="weight"
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ex: 75"
              step="0.1"
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mainDiagnosis">Hipótese Diagnóstica</Label>
            <Input
              id="mainDiagnosis"
              value={mainDiagnosis}
              onChange={(e) => setMainDiagnosis(e.target.value)}
              placeholder="Ex: Sepse de foco pulmonar"
            />
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

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="palliative" className="cursor-pointer">
              Cuidados Paliativos
            </Label>
            <Switch
              id="palliative"
              checked={isPalliative}
              onCheckedChange={setIsPalliative}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
