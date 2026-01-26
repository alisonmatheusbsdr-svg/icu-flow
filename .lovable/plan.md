

# Plano: Perguntar sobre Alteração de Dieta ao Intubar Paciente (TOT)

## Contexto

Atualmente, já existe validação que impede selecionar dieta oral quando o paciente está em TOT (Tubo Orotraqueal). Porém, o cenário inverso não está coberto: quando um paciente **já está em dieta oral** e é intubado, o sistema deve perguntar se o usuário deseja alterar a dieta.

```
┌─────────────────────────────────────────────────────────────────┐
│ CENÁRIO ATUAL (já implementado):                                │
│ Paciente em TOT → tenta selecionar dieta oral → BLOQUEADO ✓    │
├─────────────────────────────────────────────────────────────────┤
│ CENÁRIO NOVO (a implementar):                                   │
│ Paciente em dieta oral → seleciona TOT → PERGUNTA ao usuário   │
└─────────────────────────────────────────────────────────────────┘
```

## Fluxo Proposto

```
1. Usuário abre o dialog de Suporte Respiratório
2. Seleciona modalidade "TOT" (Ventilação Invasiva)
3. Preenche os parâmetros (FiO2, data IOT, etc.)
4. Clica em "Salvar"
5. SE o paciente estava em dieta oral:
   → Mostra AlertDialog perguntando:
     "Paciente em dieta oral. Deseja alterar para Dieta Zero?"
     [Manter Oral] [Alterar para Zero]
6. Continua com o salvamento normalmente
```

## Alterações Necessárias

### Arquivo 1: `src/components/patient/RespiratorySection.tsx`

Passar a informação da dieta atual para o `EditRespiratoryDialog`:

**Modificar as props do componente:**
- Adicionar `currentDietType: DietType` nas props da interface

**Modificar a chamada do EditRespiratoryDialog:**
```tsx
<EditRespiratoryDialog
  patientId={patientId}
  respiratorySupport={respiratorySupport}
  currentDietType={currentDietType}  // NOVA PROP
  isOpen={isEditOpen}
  onClose={() => setIsEditOpen(false)}
  onSuccess={onSuccess}
/>
```

### Arquivo 2: `src/components/patient/PatientClinicalData.tsx`

Passar a dieta do paciente para o `RespiratorySection`:

```tsx
<RespiratorySection
  patientId={patient.id}
  respiratorySupport={patient.respiratory_support || null}
  currentDietType={patient.diet_type}  // NOVA PROP
  onUpdate={onUpdate}
/>
```

### Arquivo 3: `src/components/patient/EditRespiratoryDialog.tsx`

**1. Adicionar imports necessários:**
```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DietType } from '@/types/database';
```

**2. Adicionar nova prop na interface:**
```tsx
interface EditRespiratoryDialogProps {
  patientId: string;
  respiratorySupport: RespiratorySupport | null;
  currentDietType?: DietType;  // NOVA PROP
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**3. Adicionar estados para o dialog de confirmacao:**
```tsx
const [showDietAlert, setShowDietAlert] = useState(false);
const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
```

**4. Modificar o `handleSubmit`:**

Antes de salvar, verificar se:
- A nova modalidade e "tot"
- A modalidade anterior NAO era "tot" (ou nao existia)
- O paciente esta em dieta oral

Se todas as condicoes forem verdadeiras, mostrar o AlertDialog ao inves de salvar diretamente.

**5. Adicionar funcao para processar a resposta do usuario:**
```tsx
const handleDietAlertResponse = async (changeDiet: boolean) => {
  setShowDietAlert(false);
  
  if (changeDiet) {
    // Alterar dieta para zero
    await supabase
      .from('patients')
      .update({ diet_type: 'zero' })
      .eq('id', patientId);
    toast.info('Dieta alterada para Zero');
  }
  
  // Continuar com o salvamento do suporte respiratorio
  await saveRespiratoryData(pendingSubmitData);
};
```

**6. Adicionar o AlertDialog no JSX:**
```tsx
<AlertDialog open={showDietAlert} onOpenChange={setShowDietAlert}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Alterar Dieta?</AlertDialogTitle>
      <AlertDialogDescription>
        O paciente está atualmente em dieta oral. 
        Pacientes intubados geralmente não podem receber dieta via oral.
        Deseja alterar para Dieta Zero?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => handleDietAlertResponse(false)}>
        Manter Oral
      </AlertDialogCancel>
      <AlertDialogAction onClick={() => handleDietAlertResponse(true)}>
        Alterar para Zero
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Resultado Esperado

| Cenário | Comportamento |
|---------|---------------|
| Paciente sem dieta → intubar | Salva normalmente |
| Paciente em dieta zero → intubar | Salva normalmente |
| Paciente em SNE → intubar | Salva normalmente |
| Paciente em dieta oral → intubar | Pergunta: "Alterar para Zero?" |
| Usuario clica "Manter Oral" | Salva TOT, mantem dieta oral |
| Usuario clica "Alterar para Zero" | Salva TOT + altera dieta para zero |

---

## Secao Tecnica

### Logica de Verificacao (handleSubmit modificado)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validacoes existentes para TOT...
  if (modality === 'tot') {
    if (!intubationDate) {
      toast.error('Data da IOT e obrigatoria');
      return;
    }
    if (!fio2 || parseFloat(fio2) < 21) {
      toast.error('FiO2 e obrigatoria para TOT (minimo 21%)');
      return;
    }
  }
  
  // Preparar dados para salvamento
  const data = { /* ... dados existentes ... */ };
  
  // NOVA VERIFICACAO: Se mudando para TOT e paciente em dieta oral
  const isChangingToTOT = modality === 'tot' && respiratorySupport?.modality !== 'tot';
  const wasNotOnTOT = !respiratorySupport || respiratorySupport.modality !== 'tot';
  const isOnOralDiet = currentDietType === 'oral';
  
  if (isChangingToTOT && wasNotOnTOT && isOnOralDiet) {
    setPendingSubmitData(data);
    setShowDietAlert(true);
    return; // Aguarda resposta do usuario
  }
  
  // Continua com salvamento normal
  await saveRespiratoryData(data);
};
```

### Fluxo de Dados

```
PatientClinicalData (tem patient.diet_type)
         |
         v
RespiratorySection (recebe currentDietType)
         |
         v
EditRespiratoryDialog (usa currentDietType para verificacao)
         |
         v
[Se oral + TOT] → AlertDialog → usuario decide
         |
         v
Salva respiratory_support (e opcionalmente atualiza diet_type)
```

