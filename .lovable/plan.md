

# Plano: Sistema Completo de Regulação com Fluxo Expandido

## Visão Geral do Novo Fluxo

O sistema de regulação será reformulado para refletir a comunicação real entre equipe assistencial e NIR:

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FLUXO DE REGULAÇÃO                                          │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                │
│  EQUIPE ASSISTENCIAL                           NIR                                             │
│  ─────────────────                             ───                                             │
│                                                                                                │
│  ┌─────────────────────┐                                                                       │
│  │ 1. SOLICITA         │                                                                       │
│  │    REGULAÇÃO        │───────────────────────────────────────────────────────────────┐       │
│  └─────────────────────┘                                                               │       │
│                                                                                        v       │
│                                                                        ┌─────────────────────┐ │
│                                                                        │ 2. AGUARDANDO       │ │
│                                                                        │    REGULAÇÃO        │ │
│                                                                        └─────────────────────┘ │
│                                                                               │     │          │
│                                                                               │     v          │
│                                                                               │  ┌───────────┐ │
│                                                                               │  │ NEGADO    │ │
│                                                                               │  │ NIR       │ │
│                                                                               │  └───────────┘ │
│                                                                               v                │
│                                                                        ┌─────────────────────┐ │
│                                                                        │ 3. REGULADO         │ │
│                                                                        │ (Listado no sistema)│ │
│                                                                        └─────────────────────┘ │
│                                                                               │     │          │
│                                                                               │     v          │
│                                                                               │  ┌───────────┐ │
│                                                                               │  │ NEGADO    │ │
│                                                                               │  │ HOSPITAL  │ │
│                                                                               │  └───────────┘ │
│                                                                               v                │
│                                                                        ┌─────────────────────┐ │
│                                                                        │ 4. AGUARD. TRANSF.  │ │
│                                                                        │ (Vaga confirmada)   │ │
│                                                                        └─────────────────────┘ │
│                                                                               │                │
│                                                                               v                │
│                                                                        ┌─────────────────────┐ │
│                                                                        │ 5. TRANSFERIDO      │ │
│                                                                        │ (Finalizado)        │ │
│                                                                        └─────────────────────┘ │
│                                                                                                │
│  ═══════════════════════════════════════════════════════════════════════════════════════════   │
│                                                                                                │
│  MUDANÇA DE ESPECIALIDADE (A qualquer momento pela Eq. Assistencial)                          │
│  ─────────────────────────────────────────────────────────────────────                         │
│                                                                                                │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │  Neuro → Cardio  │  Exemplo: Paciente que estava listado para Neurologia                 │ │
│  │  + Justificativa │  agora precisa de Cardiologia. Retorna ao início do fluxo.           │ │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Estados do Sistema

| Status | Rótulo | Quem Altera | Descrição |
|--------|--------|-------------|-----------|
| `aguardando_regulacao` | Aguardando Regulação | Automático | Solicitação criada pela equipe |
| `regulado` | Regulado | NIR | NIR listou no sistema externo |
| `aguardando_transferencia` | Aguard. Transferência | NIR | Vaga confirmada pelo hospital |
| `transferido` | Transferido | NIR | Paciente foi transferido (finaliza) |
| `negado_nir` | Negado (NIR) | NIR | NIR recusou regular (com justificativa) |
| `negado_hospital` | Negado (Hospital) | NIR | Hospital recusou vaga (com justificativa) |

## Ações Disponíveis por Status

### NIR pode:

| Status Atual | Ações Possíveis |
|--------------|-----------------|
| Aguardando Regulação | `Regular` ou `Negar (NIR)` |
| Regulado | `Confirmar Vaga` ou `Negado (Hospital)` |
| Aguard. Transferência | `Marcar Transferido` |
| Negado NIR | - (estado final, mas equipe pode criar nova solicitação) |
| Negado Hospital | `Re-regular` (volta para Regulado) |

### Equipe Assistencial pode:

| Status Atual | Ações Possíveis |
|--------------|-----------------|
| Qualquer status ativo | `Alterar Especialidade` (com justificativa obrigatória) |
| Qualquer status | `Cancelar Solicitação` |

## Mudança de Especialidade

Quando a equipe assistencial muda a especialidade:

1. **Obrigatório**: Justificativa da mudança
2. **Resultado**: Status volta para `aguardando_regulacao`
3. **Histórico**: Registrado `previous_support_type` e `change_reason`

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Alterar Especialidade                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Especialidade Atual: 🧠 Neurologia                                          │
│                                                                             │
│ Nova Especialidade:                                                         │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │  ❤️ Cardiologia                                              ▼       │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ Justificativa da mudança: *                                                 │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │ Paciente evoluiu com arritmia grave necessitando de suporte          │   │
│ │ cardiológico. Indicação neurológica mantida, mas prioridade           │   │
│ │ agora é cardiologia.                                                  │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│ ⚠️ Atenção: Isso reiniciará o processo de regulação.                        │
│                                                                             │
│                                    [ Cancelar ]  [ Confirmar Mudança ]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Visualização para Equipe Assistencial

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  🏥 Regulação                                                         [+]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ 🧠 Neurologia                                     [Regulado] │          │
│  │    Solicitado: 27/01 | Regulado: 27/01                        │          │
│  │    [ ✏️ Alterar Especialidade ]                     [x]       │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ ❤️ Cardiologia                         [Aguard. Transferência]│          │
│  │    Solicitado: 26/01 | Vaga: 27/01                            │          │
│  │    ⚠️ Mudado de Neurologia em 26/01                           │          │
│  │       "Paciente evoluiu com complicação cardíaca"             │          │
│  │    [ ✏️ Alterar Especialidade ]                     [x]       │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │ 🫁 Torácica                                   [Negado - NIR]  │          │
│  │    "Paciente não elegível para programa de crônicos."        │  [x]     │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Seção Técnica

### 1. Alterações no Banco de Dados

Nova migração SQL para expandir a tabela `patient_regulation`:

```sql
-- Adicionar timestamps para cada etapa do fluxo
ALTER TABLE patient_regulation
ADD COLUMN IF NOT EXISTS regulated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ;

-- Campos para mudança de especialidade
ALTER TABLE patient_regulation
ADD COLUMN IF NOT EXISTS previous_support_type TEXT,
ADD COLUMN IF NOT EXISTS change_reason TEXT,
ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS changed_by UUID;

-- Migrar dados existentes
UPDATE patient_regulation 
SET status = 'aguardando_regulacao' 
WHERE status = 'aguardando';

UPDATE patient_regulation 
SET status = 'aguardando_transferencia',
    confirmed_at = updated_at
WHERE status = 'confirmado';

UPDATE patient_regulation 
SET status = 'negado_nir',
    denied_at = updated_at
WHERE status = 'negado';
```

### 2. Atualizar Tipos TypeScript

**`src/types/database.ts`**:

```typescript
export type RegulationStatus = 
  | 'aguardando_regulacao'
  | 'regulado'
  | 'aguardando_transferencia'
  | 'transferido'
  | 'negado_nir'
  | 'negado_hospital';

export interface PatientRegulation {
  id: string;
  patient_id: string;
  support_type: string;
  status: RegulationStatus;
  requested_at: string;
  regulated_at: string | null;
  confirmed_at: string | null;
  transferred_at: string | null;
  denied_at: string | null;
  denial_reason: string | null;
  // Mudança de especialidade
  previous_support_type: string | null;
  change_reason: string | null;
  changed_at: string | null;
  changed_by: string | null;
  // Outros
  updated_at: string;
  is_active: boolean;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
}
```

### 3. Novo STATUS_CONFIG Expandido

```typescript
const STATUS_CONFIG = {
  aguardando_regulacao: {
    label: 'Aguardando Regulação',
    shortLabel: 'Aguard. Reg.',
    className: 'bg-amber-100 text-amber-800 border-amber-300 ...',
    icon: Clock,
    description: 'Aguardando NIR registrar no sistema'
  },
  regulado: {
    label: 'Regulado',
    shortLabel: 'Regulado',
    className: 'bg-blue-100 text-blue-800 border-blue-300 ...',
    icon: FileCheck,
    description: 'NIR listou na central de regulação'
  },
  aguardando_transferencia: {
    label: 'Aguard. Transferência',
    shortLabel: 'Aguard. Transf.',
    className: 'bg-green-100 text-green-800 border-green-300 ...',
    icon: Ambulance,
    description: 'Vaga confirmada, aguardando transporte'
  },
  transferido: {
    label: 'Transferido',
    shortLabel: 'Transferido',
    className: 'bg-teal-100 text-teal-800 border-teal-300 ...',
    icon: CheckCircle2,
    description: 'Paciente transferido com sucesso'
  },
  negado_nir: {
    label: 'Negado (NIR)',
    shortLabel: 'Neg. NIR',
    className: 'bg-red-100 text-red-800 border-red-300 ...',
    icon: XCircle,
    description: 'NIR recusou regular esta solicitação'
  },
  negado_hospital: {
    label: 'Negado (Hospital)',
    shortLabel: 'Neg. Hospital',
    className: 'bg-orange-100 text-orange-800 border-orange-300 ...',
    icon: Building2,
    description: 'Hospital destino recusou a vaga'
  }
} as const;
```

### 4. Lógica de Transições

```typescript
// Transições que o NIR pode fazer
const NIR_TRANSITIONS: Record<RegulationStatus, {status: RegulationStatus, label: string, variant?: string}[]> = {
  aguardando_regulacao: [
    { status: 'regulado', label: 'Marcar Regulado' },
    { status: 'negado_nir', label: 'Negar Regulação', variant: 'destructive' }
  ],
  regulado: [
    { status: 'aguardando_transferencia', label: 'Confirmar Vaga' },
    { status: 'negado_hospital', label: 'Negado pelo Hospital', variant: 'destructive' }
  ],
  aguardando_transferencia: [
    { status: 'transferido', label: 'Marcar Transferido' }
  ],
  transferido: [],
  negado_nir: [],
  negado_hospital: [
    { status: 'regulado', label: 'Re-regular' }
  ]
};
```

### 5. Novo Componente: ChangeSpecialtyDialog

Novo componente para mudança de especialidade pela equipe assistencial:

```tsx
// src/components/patient/ChangeSpecialtyDialog.tsx
interface ChangeSpecialtyDialogProps {
  regulation: PatientRegulation;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

// Permite selecionar nova especialidade e exige justificativa
// Ao confirmar:
// 1. Salva previous_support_type = support_type atual
// 2. Salva change_reason = justificativa
// 3. Atualiza support_type = nova especialidade
// 4. Reseta status para 'aguardando_regulacao'
// 5. Limpa regulated_at, confirmed_at, denied_at
```

### 6. Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| **Migração SQL** | Novas colunas para timestamps e mudança de especialidade |
| `src/types/database.ts` | Atualizar tipo PatientRegulation com novos campos |
| `src/components/patient/PatientRegulation.tsx` | Novo STATUS_CONFIG, botão de alterar especialidade, exibição de histórico de mudança |
| `src/components/patient/ChangeSpecialtyDialog.tsx` | **NOVO** - Dialog para mudança de especialidade |
| `src/components/nir/NIRRegulationDialog.tsx` | Novo STATUS_CONFIG, botões de ação baseados em transições permitidas |
| `src/components/nir/NIRDashboard.tsx` | Atualizar filtros para novos status |
| `src/components/nir/NIRBedCard.tsx` | Badge com status detalhado |

### 7. Ordem de Implementação

1. Criar migração SQL com novos campos
2. Atualizar tipos em `database.ts`
3. Criar componente `ChangeSpecialtyDialog.tsx`
4. Atualizar `PatientRegulation.tsx` (view da equipe assistencial)
5. Atualizar `NIRRegulationDialog.tsx` (ações do NIR)
6. Atualizar `NIRDashboard.tsx` (filtros e contadores)
7. Atualizar `NIRBedCard.tsx` (badges de status)

