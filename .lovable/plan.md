

# Plano: Sistema de Dupla Checagem para Transferência

## Visao Geral do Novo Fluxo

A transferencia passa a ser confirmada em duas etapas para garantir que ambos os lados (NIR e equipe assistencial) estejam alinhados:

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                              FLUXO DE DUPLA CHECAGEM                                         │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  NIR                                              EQUIPE ASSISTENCIAL                        │
│  ───                                              ─────────────────                          │
│                                                                                              │
│  ┌─────────────────────────┐                                                                 │
│  │ 1. Confirma Vaga        │                                                                 │
│  │    (Aguard. Transf.)    │─────────────────────────────────────────────────────────┐       │
│  └─────────────────────────┘                                                         │       │
│                                                                                      v       │
│                                                   ┌─────────────────────────────────────────┐│
│                                                   │ 2. Ve notificacao:                      ││
│                                                   │    "VAGA DISPONIVEL - Neurologia"       ││
│                                                   │    Badge verde piscando no BedCard      ││
│                                                   └─────────────────────────────────────────┘│
│                                                                      │                       │
│                                                                      v                       │
│                                                   ┌─────────────────────────────────────────┐│
│                                                   │ 3. Registra Desfecho:                   ││
│                                                   │    "Transferencia Externa"              ││
│                                                   │    (Paciente saiu fisicamente)          ││
│                                                   └─────────────────────────────────────────┘│
│                                                                      │                       │
│  ┌─────────────────────────┐                                         │                       │
│  │ 4. Ve sinalizacao:      │<────────────────────────────────────────┘                       │
│  │    "Equipe confirmou"   │                                                                 │
│  │    Botao habilitado     │                                                                 │
│  └─────────────────────────┘                                                                 │
│            │                                                                                 │
│            v                                                                                 │
│  ┌─────────────────────────┐                                                                 │
│  │ 5. Marca Transferido    │                                                                 │
│  │    (Dupla checagem OK)  │                                                                 │
│  └─────────────────────────┘                                                                 │
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Experiencia do Usuario

### Equipe Assistencial - BedCard com Notificacao

Quando o NIR confirma a vaga, aparece um indicador visual no card do paciente:

```text
┌─────────────────────────────────────┐
│ Leito 3                        5d   │
│                                     │
│ M.S.O.                              │
│ 67 anos                             │
│                                     │
│ [TOT] [DVA]                         │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🚀 VAGA DISPONIVEL - Neurologia │ │  <- Badge verde pulsante
│ └─────────────────────────────────┘ │
│                                     │
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░  15% │
└─────────────────────────────────────┘
```

### Equipe Assistencial - Ao Registrar Desfecho

Se houver regulacao aguardando transferencia, o dialog sugere automaticamente:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Registrar Desfecho                                                     [x]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ 🚀 Vaga disponivel para Neurologia                                     │ │
│ │    Deseja registrar Transferencia Externa?                             │ │
│ │                                                                        │ │
│ │ [ Sim, transferir para Neurologia ]                                    │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│ --- ou selecione outro desfecho ---                                         │
│                                                                             │
│ ┌───────────────────────────────────────────────────────────────────────┐   │
│ │  Selecione o desfecho                                              ▼ │   │
│ └───────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### NIR - Aguardando Confirmacao da Equipe

Apos confirmar a vaga, o NIR ve que precisa aguardar a equipe:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🧠 Neurologia                               [Aguard. Transferencia]         │
│ Solicitado: 27/01 | Vaga: 28/01                                             │
│                                                                             │
│ ⏳ Aguardando equipe assistencial confirmar a saida do paciente.            │
│                                                                             │
│ [ Marcar Transferido ] <- Desabilitado                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### NIR - Equipe Confirmou Transferencia

Quando a equipe registra o desfecho, o NIR pode finalizar:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🧠 Neurologia                               [Aguard. Transferencia]         │
│ Solicitado: 27/01 | Vaga: 28/01                                             │
│                                                                             │
│ ✅ Equipe confirmou saida em 28/01 as 14:30                                 │
│                                                                             │
│ [ Marcar Transferido ] <- Habilitado                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Secao Tecnica

### 1. Alteracoes no Banco de Dados

Adicionar campos para rastrear a confirmacao da equipe:

```sql
ALTER TABLE patient_regulation
ADD COLUMN IF NOT EXISTS team_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS team_confirmed_by UUID;
```

### 2. Atualizar Tipos TypeScript

**`src/types/database.ts`**:

```typescript
export interface PatientRegulation {
  // ... campos existentes ...
  // Confirmacao pela equipe (dupla checagem)
  team_confirmed_at: string | null;
  team_confirmed_by: string | null;
}
```

### 3. Logica de Transicoes Atualizada

**`src/lib/regulation-config.ts`**:

```typescript
// NIR so pode marcar transferido se equipe ja confirmou
export const NIR_TRANSITIONS: Record<RegulationStatus, TransitionConfig[]> = {
  // ...
  aguardando_transferencia: [
    { 
      status: 'transferido', 
      label: 'Marcar Transferido',
      requiresTeamConfirmation: true  // NOVO FLAG
    }
  ],
  // ...
};
```

### 4. Modificar BedCard - Notificacao Visual

**`src/components/dashboard/BedCard.tsx`**:

Adicionar badge pulsante quando paciente tem vaga aguardando transferencia:

```tsx
// Verificar se paciente tem regulacao aguardando transferencia
const hasAwaitingTransfer = patient.patient_regulation?.some(
  r => r.is_active && r.status === 'aguardando_transferencia'
);

// No render, apos os badges existentes:
{hasAwaitingTransfer && (
  <Badge className="bg-green-500 text-white animate-pulse text-xs gap-1">
    <Truck className="h-3 w-3" />
    VAGA
  </Badge>
)}
```

### 5. Modificar PatientDischargeDialog

**`src/components/patient/PatientDischargeDialog.tsx`**:

Adicionar prop de regulacoes e sugerir transferencia externa quando apropriado:

```tsx
interface PatientDischargeDialogProps {
  // ... props existentes ...
  regulations?: PatientRegulation[];  // NOVO
}

// No componente:
const awaitingTransferReg = regulations?.find(
  r => r.is_active && r.status === 'aguardando_transferencia'
);

// Se houver regulacao aguardando, mostrar sugestao destacada
{awaitingTransferReg && (
  <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
    <div className="flex items-center gap-2 text-green-800">
      <Truck className="h-5 w-5" />
      <span className="font-medium">
        Vaga disponivel para {getSupportLabel(awaitingTransferReg.support_type)}
      </span>
    </div>
    <Button
      className="w-full mt-2 bg-green-600 hover:bg-green-700"
      onClick={() => handleTransferExternal(awaitingTransferReg.id)}
    >
      Confirmar Transferencia Externa
    </Button>
  </div>
)}

// Funcao para registrar desfecho E marcar confirmacao na regulacao
const handleTransferExternal = async (regulationId: string) => {
  // 1. Atualizar patient_regulation com team_confirmed_at/by
  await supabase
    .from('patient_regulation')
    .update({
      team_confirmed_at: new Date().toISOString(),
      team_confirmed_by: user.id
    })
    .eq('id', regulationId);

  // 2. Registrar desfecho normal (transferencia_externa)
  await handleDischarge('transferencia_externa');
};
```

### 6. Modificar NIRRegulationDialog

**`src/components/nir/NIRRegulationDialog.tsx`**:

Bloquear botao "Marcar Transferido" ate equipe confirmar:

```tsx
// No render de cada regulacao:
const canMarkTransferred = reg.status === 'aguardando_transferencia' && reg.team_confirmed_at;

// Botao de transicao:
{transition.status === 'transferido' && !reg.team_confirmed_at ? (
  // Mostrar mensagem de aguardando equipe
  <div className="text-xs text-muted-foreground italic flex items-center gap-2">
    <Clock className="h-4 w-4" />
    Aguardando equipe confirmar saida do paciente
  </div>
) : transition.status === 'transferido' && reg.team_confirmed_at ? (
  // Mostrar confirmacao e botao habilitado
  <div className="space-y-2">
    <div className="text-xs text-green-600 flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4" />
      Equipe confirmou em {formatDateTime(reg.team_confirmed_at)}
    </div>
    <Button onClick={() => handleTransition(reg, 'transferido')}>
      Marcar Transferido
    </Button>
  </div>
) : (
  // Outros botoes normais
  <Button onClick={() => handleActionClick(reg, transition.status)}>
    {transition.label}
  </Button>
)}
```

### 7. Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| **Migracao SQL** | Adicionar `team_confirmed_at` e `team_confirmed_by` |
| `src/types/database.ts` | Atualizar interface PatientRegulation |
| `src/lib/regulation-config.ts` | Adicionar flag `requiresTeamConfirmation` |
| `src/components/dashboard/BedCard.tsx` | Badge pulsante "VAGA" quando aguardando transferencia |
| `src/components/patient/PatientModal.tsx` | Passar regulations para PatientDischargeDialog |
| `src/components/patient/PatientDischargeDialog.tsx` | Sugestao de transferencia e marcacao de team_confirmed |
| `src/components/nir/NIRRegulationDialog.tsx` | Bloquear "Transferido" ate equipe confirmar |
| `src/components/nir/NIRBedCard.tsx` | Indicador de equipe confirmou |

### 8. Ordem de Implementacao

1. Criar migracao SQL para novos campos
2. Atualizar tipos em `database.ts`
3. Modificar `BedCard.tsx` para mostrar notificacao de vaga
4. Modificar `PatientDischargeDialog.tsx` para sugerir transferencia
5. Modificar `PatientModal.tsx` para passar regulations
6. Modificar `NIRRegulationDialog.tsx` para dupla checagem
7. Atualizar `NIRBedCard.tsx` com indicadores

