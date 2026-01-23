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
  const [comorbidities, setComorbidities] = useState(patient.comorbidities || "");
  const [isPalliative, setIsPalliative] = useState(patient.is_palliative);

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
          comorbidities: comorbidities.trim() || null,
          is_palliative: isPalliative,
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
            <Label htmlFor="comorbidities">Comorbidades</Label>
            <Textarea
              id="comorbidities"
              value={comorbidities}
              onChange={(e) => setComorbidities(e.target.value)}
              placeholder="Ex: HAS, DM, IRC"
              rows={2}
            />
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
