
# Plano: Permitir NIR Visualizar Dados do Paciente

## Objetivo

Permitir que o NIR clique no card do paciente para abrir o `PatientModal` em modo de visualização (read-only). O NIR poderá ver todos os dados clínicos, mas não poderá editá-los.

---

## Situação Atual

| Componente | Comportamento |
|------------|---------------|
| `NIRBedCard` | Não tem click handler no card - apenas botão "Regulação" |
| `NIRDashboard` | Não tem `PatientModal` - apenas renderiza cards |
| `BedGrid` | Usa `PatientModal` com estados `selectedPatientId` e `selectedBedNumber` |

O NIR não consegue acessar a tela do paciente porque:
1. O `NIRBedCard` não é clicável
2. O `NIRDashboard` não tem o `PatientModal` integrado

---

## Solução

### 1. Modificar NIRBedCard

Adicionar prop `onPatientClick` e tornar o card clicável:

```tsx
interface NIRBedCardProps {
  bed: Bed;
  patient: PatientWithModality;
  onUpdate: () => void;
  showProbabilityBar?: boolean;
  onPatientClick?: (patientId: string, bedNumber: number) => void; // Nova prop
}

// No card
<Card 
  className="bed-occupied cursor-pointer hover:shadow-md transition-shadow"
  onClick={() => onPatientClick?.(patient.id, bed.bed_number)}
>
```

### 2. Modificar NIRDashboard

Adicionar estados e PatientModal:

```tsx
// Novos estados
const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
const [selectedBedNumber, setSelectedBedNumber] = useState<number>(0);

// Handler
const handlePatientClick = (patientId: string, bedNumber: number) => {
  setSelectedPatientId(patientId);
  setSelectedBedNumber(bedNumber);
};

const handleCloseModal = () => {
  setSelectedPatientId(null);
  setSelectedBedNumber(0);
  fetchAllData(); // Refresh após fechar
};

// Passar callback para NIRBedCard
<NIRBedCard
  ...
  onPatientClick={handlePatientClick}
/>

// Adicionar PatientModal no final
<PatientModal
  patientId={selectedPatientId}
  bedNumber={selectedBedNumber}
  isOpen={!!selectedPatientId}
  onClose={handleCloseModal}
/>
```

---

## Comportamento do PatientModal para NIR

O `PatientModal` já usa o hook `useUnit().canEdit` para controlar permissões:
- Botões de edição só aparecem se `canEdit === true`
- NIR não tem sessão de unidade ativa, então `canEdit` será `false`
- NIR verá os dados em modo read-only automaticamente

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/nir/NIRBedCard.tsx` | Adicionar prop `onPatientClick`, tornar card clicável |
| `src/components/nir/NIRDashboard.tsx` | Adicionar estados, handler e PatientModal |

---

## Interface Visual

### Antes (sem click)
```text
┌────────────┐
│ Leito 1    │
│ JAB  D12   │  ← Não clicável
│ 67 anos    │
│ [TOT][DVA] │
│ [Regulação]│  ← Único ponto de interação
└────────────┘
```

### Depois (clicável)
```text
┌────────────┐
│ Leito 1    │
│ JAB  D12   │  ← Click abre PatientModal (read-only)
│ 67 anos    │
│ [TOT][DVA] │
│ [Regulação]│  ← Mantém funcionalidade de regulação
└────────────┘
```

---

## Resultado Esperado

| Ação | Resultado |
|------|-----------|
| Click no card | Abre PatientModal em modo read-only |
| NIR vê | Todos os dados clínicos, evoluções, exames |
| NIR não vê | Botões "Editar", "Evoluir", "Registrar Desfecho" |
| Click em "Regulação" | Continua abrindo dialog de regulação (não propagando click) |

---

## Segurança

- NIR já possui RLS de leitura para pacientes e dados clínicos
- O `PatientModal` respeita `canEdit` do `useUnit` hook
- Sem sessão de unidade = sem permissão de edição
- Apenas visualização, sem alterações
