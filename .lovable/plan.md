
# Plano: Adicionar Opção de Transferência de Leito no Menu do Modal (Alternativa Mobile)

## Contexto

O drag-and-drop funciona bem em desktop, mas em celulares pode ser difícil ou impossível de usar. A solução é adicionar uma opção "Transferir Leito" no menu de ações do modal do paciente, visível apenas para usuários NIR.

## Fluxo de Uso Proposto

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    Modal do Paciente (NIR)                          │
├─────────────────────────────────────────────────────────────────────┤
│ Leito 3 - AMBS                                              X       │
│ 35a | 80kg | D2                                                     │
│                                                                      │
│  [ Exames ]  [ Imprimir ]  [ Transferir Leito ]  ← Novo botão       │
│                                                                      │
│  HD: sepse pulmonar   HAS   DM   DAC                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│             Dialog: Selecionar Leito de Destino                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Transferir AMBS (35a) do Leito 3 para:                            │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  Selecione o leito de destino                           ▼   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Leitos vagos disponíveis:                                         │
│   • Leito 5 (vago)                                                  │
│   • Leito 8 (vago)                                                  │
│   • Leito 12 (vago)                                                 │
│                                                                      │
│            [ Cancelar ]      [ Confirmar Transferência ]            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| Visibilidade | Botão só aparece para usuários com role `nir` |
| Destino válido | Apenas leitos vagos (não bloqueados) da MESMA unidade |
| Confirmação | Dialog com seleção do leito destino antes de efetivar |
| Feedback | Toast de sucesso/erro após a operação |

## Componentes Afetados

### 1. PatientModal.tsx

Adicionar verificação de role NIR e botão/menu item:

- **Desktop**: Novo botão `[ Transferir Leito ]` após "Imprimir"
- **Mobile**: Novo item no dropdown `Transferir Leito`
- Abre um novo dialog para selecionar o leito destino

### 2. Novo: TransferBedSelectDialog.tsx

Dialog específico para seleção do leito de destino:

```tsx
interface TransferBedSelectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (toBedId: string) => Promise<void>;
  patient: { id: string; initials: string; age: number };
  currentBedNumber: number;
  currentUnitId: string;
  isLoading: boolean;
}
```

**Funcionalidades:**
- Busca leitos vagos da mesma unidade do paciente
- Select/RadioGroup para escolher o leito destino
- Mostra número do leito e status "Vago"
- Botão de confirmar desabilitado até selecionar leito
- Executa a mesma lógica de transferência do drag-and-drop

## Arquitetura

```text
PatientModal
    │
    ├── Verifica se usuário é NIR
    │
    ├── [Desktop] Botão "Transferir Leito"
    │        └── onClick → abre TransferBedSelectDialog
    │
    └── [Mobile] DropdownMenuItem "Transferir Leito"
             └── onClick → abre TransferBedSelectDialog

TransferBedSelectDialog
    │
    ├── Busca leitos vagos da mesma unidade (useEffect)
    │
    ├── Select para escolher leito destino
    │
    └── onConfirm → Executa transferência:
            ├── UPDATE patients SET bed_id = toBedId
            ├── UPDATE beds SET is_occupied = false (leito antigo)
            └── UPDATE beds SET is_occupied = true (leito novo)
```

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/nir/TransferBedSelectDialog.tsx` | Dialog para seleção do leito destino |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/patient/PatientModal.tsx` | Adicionar botão/item de menu "Transferir Leito" para NIR |

## Detalhes Técnicos

### Verificação de Role NIR

```tsx
// Importar useAuth para verificar role
const { profile } = useAuth();
const isNIR = profile?.role === 'nir';
```

### Busca de Leitos Vagos

```tsx
// No TransferBedSelectDialog
const [availableBeds, setAvailableBeds] = useState<Bed[]>([]);

useEffect(() => {
  if (isOpen && currentUnitId) {
    supabase
      .from('beds')
      .select('*')
      .eq('unit_id', currentUnitId)
      .eq('is_occupied', false)
      .eq('is_blocked', false)
      .order('bed_number')
      .then(({ data }) => setAvailableBeds(data || []));
  }
}, [isOpen, currentUnitId]);
```

### Lógica de Transferência

Reutilizar a mesma lógica do `executeTransfer` do NIRDashboard:

```tsx
async function handleTransfer(toBedId: string) {
  // 1. Atualizar bed_id do paciente
  await supabase.from('patients')
    .update({ bed_id: toBedId })
    .eq('id', patient.id);

  // 2. Liberar leito antigo
  await supabase.from('beds')
    .update({ is_occupied: false })
    .eq('id', currentBedId);

  // 3. Ocupar novo leito
  await supabase.from('beds')
    .update({ is_occupied: true })
    .eq('id', toBedId);
}
```

## UX Mobile

O botão no menu dropdown aparece com ícone de setas:

```tsx
<DropdownMenuItem onClick={() => setIsTransferDialogOpen(true)}>
  <ArrowLeftRight className="h-4 w-4 mr-2" />
  Transferir Leito
</DropdownMenuItem>
```

## Resultado Esperado

- Usuários NIR podem transferir pacientes de leito tanto por drag-and-drop (desktop) quanto por menu (mobile)
- A experiência mobile é intuitiva com select/lista de leitos disponíveis
- Mantém consistência com o sistema existente de confirmação
