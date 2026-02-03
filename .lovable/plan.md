
# Plano: Sistema de Transferência de Leitos com Drag & Drop para NIR

## Objetivo

Permitir que usuários NIR transfiram pacientes entre leitos da mesma UTI arrastando o card do paciente para um leito vago, com diálogo de confirmação antes de efetivar a mudança.

## Fluxo de Uso

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         NIR Dashboard                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│   │ Leito 1 │  │ Leito 2 │  │ Leito 3 │  │ Leito 4 │               │
│   │  J.S.   │  │  VAGO   │  │  M.R.   │  │BLOQUEADO│               │
│   │ [Drag]  │  │ [Drop]  │  │ [Drag]  │  │    🔒   │               │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘               │
│                     │                                                │
│         ┌───────────┴───────────┐                                   │
│         │    Arrasta J.S.       │                                   │
│         │    para Leito 2       │                                   │
│         └───────────────────────┘                                   │
│                     │                                                │
│                     ▼                                                │
│   ┌────────────────────────────────────────────────────┐            │
│   │        Dialog de Confirmação                        │            │
│   │                                                     │            │
│   │  Confirmar Transferência de Leito?                  │            │
│   │                                                     │            │
│   │  Paciente: J.S. (72a)                               │            │
│   │  De: Leito 1 → Para: Leito 2                        │            │
│   │                                                     │            │
│   │        [Cancelar]    [Confirmar Transferência]      │            │
│   └────────────────────────────────────────────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Regras de Negócio

| Regra | Descrição |
|-------|-----------|
| Origem | Apenas cards com pacientes podem ser arrastados |
| Destino | Apenas leitos VAGOS aceitam drop (não bloqueados, não ocupados) |
| Mesma UTI | Transferência apenas dentro da mesma unidade |
| Permissão | Apenas usuários NIR podem executar essa ação |
| Confirmação | Dialog obrigatório antes de efetivar |
| Feedback Visual | Leito vago destaca quando válido como drop target |

## Arquitetura Técnica

### 1. Nova Dependência

```bash
npm install @dnd-kit/core @dnd-kit/utilities
```

### 2. Novos Componentes

| Componente | Responsabilidade |
|------------|------------------|
| `NIRDndContext.tsx` | Provider do DnD Kit que envolve o grid |
| `NIRDraggableBedCard.tsx` | Wrapper draggable para NIRBedCard |
| `NIRDroppableEmptyBed.tsx` | Wrapper droppable para leitos vagos |
| `TransferBedDialog.tsx` | Modal de confirmação de transferência |

### 3. Estrutura de Arquivos

```text
src/components/nir/
├── NIRDashboard.tsx          (modificar - adicionar DndContext)
├── NIRBedCard.tsx            (existente - sem mudanças)
├── NIREmptyBedCard.tsx       (existente - sem mudanças)
├── NIRDraggableBedCard.tsx   (novo - wrapper draggable)
├── NIRDroppableEmptyBed.tsx  (novo - wrapper droppable)
└── TransferBedDialog.tsx     (novo - dialog confirmação)
```

## Implementação Detalhada

### Passo 1: Instalar DnD Kit

Adicionar ao projeto:
- `@dnd-kit/core` - biblioteca principal
- `@dnd-kit/utilities` - helpers para CSS transforms

### Passo 2: NIRDraggableBedCard

Componente que torna o NIRBedCard arrastável:

```tsx
// Encapsula NIRBedCard com useDraggable
// Dados no drag: { patientId, patientInitials, bedId, bedNumber, unitId }
// Visual: cursor grab, opacidade durante drag
```

### Passo 3: NIRDroppableEmptyBed

Componente que aceita drop em leitos vagos:

```tsx
// Encapsula NIREmptyBedCard com useDroppable
// Aceita apenas: leito vago (não bloqueado) da mesma unidade
// Visual: borda destacada quando over (isOver), fundo verde claro
```

### Passo 4: TransferBedDialog

Dialog de confirmação:

```tsx
interface TransferBedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  patient: { id: string; initials: string; age: number };
  fromBed: { number: number };
  toBed: { id: string; number: number };
  isLoading: boolean;
}
```

Conteúdo:
- Título: "Confirmar Transferência de Leito?"
- Info: Paciente, idade, leito origem → leito destino
- Botões: Cancelar | Confirmar Transferência

### Passo 5: Modificar NIRDashboard

Integrar o sistema de drag and drop:

```tsx
import { DndContext, DragEndEvent, DragOverlay } from '@dnd-kit/core';

// Estado para controlar o dialog
const [transferData, setTransferData] = useState<TransferData | null>(null);

// Handler do drop
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  
  if (!over) return; // Drop fora de área válida
  
  // Extrair dados do drag
  const patientData = active.data.current;
  const targetBedData = over.data.current;
  
  // Verificar se é transferência válida
  if (targetBedData.type === 'empty-bed' && !targetBedData.isBlocked) {
    setTransferData({
      patient: patientData,
      fromBedNumber: patientData.bedNumber,
      toBed: targetBedData
    });
  }
}

// Executar transferência no banco
async function executeTransfer() {
  // 1. Atualizar bed_id do paciente
  await supabase.from('patients')
    .update({ bed_id: transferData.toBed.id })
    .eq('id', transferData.patient.id);
    
  // 2. Atualizar is_occupied dos leitos
  await supabase.from('beds')
    .update({ is_occupied: false })
    .eq('id', originalBedId);
    
  await supabase.from('beds')
    .update({ is_occupied: true })
    .eq('id', transferData.toBed.id);
    
  // 3. Refresh data
  fetchAllData();
}
```

### Passo 6: Feedback Visual

Durante o drag:
- Card sendo arrastado: opacidade reduzida, sombra elevada
- Leitos vagos válidos: borda verde brilhante
- Leito sob hover: fundo verde claro pulsante

Cursor states:
- Card com paciente: `cursor-grab` → `cursor-grabbing` durante drag
- Leito vago: `cursor-copy` quando há item sendo arrastado
- Leito bloqueado: `cursor-not-allowed`

## Alterações no Banco de Dados

Nenhuma migração necessária. A transferência usa campos existentes:
- `patients.bed_id` - atualizado para novo leito
- `beds.is_occupied` - alternado entre leitos

## Políticas RLS

As políticas existentes já suportam:
- NIR pode ler pacientes de todas unidades (via `is_approved`)
- NIR pode atualizar pacientes (via `is_approved`)
- Verificação de unidade via `has_unit_access`

## Arquivos a Criar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/nir/NIRDraggableBedCard.tsx` | Novo | Wrapper draggable |
| `src/components/nir/NIRDroppableEmptyBed.tsx` | Novo | Wrapper droppable |
| `src/components/nir/TransferBedDialog.tsx` | Novo | Dialog confirmação |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `package.json` | Adicionar @dnd-kit/core e @dnd-kit/utilities |
| `src/components/nir/NIRDashboard.tsx` | Integrar DndContext e handlers |

## Considerações de UX

1. **Mobile**: DnD Kit suporta touch nativamente
2. **Acessibilidade**: Keyboard support via @dnd-kit/accessibility
3. **Animações**: Transições suaves ao soltar
4. **Undo**: Se erro na API, mostrar toast com opção de tentar novamente

## Sequência de Implementação

1. Instalar dependências (@dnd-kit/core, @dnd-kit/utilities)
2. Criar TransferBedDialog (pode testar isoladamente)
3. Criar NIRDraggableBedCard
4. Criar NIRDroppableEmptyBed
5. Integrar no NIRDashboard com DndContext
6. Testar fluxo completo

## Resultado Esperado

O NIR poderá reorganizar pacientes entre leitos de forma intuitiva, arrastando cards e confirmando a transferência, melhorando a eficiência operacional na gestão de leitos.
