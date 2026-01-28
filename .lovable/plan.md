

# Plano: Impossibilidade Clinica, Cancelamento e Expiracao de Prazo

## Visao Geral

A equipe assistencial precisa de duas novas acoes quando a vaga esta confirmada (`aguardando_transferencia`):

1. **Aguardar Melhora Clinica** - Paciente nao pode transferir agora, vaga mantida ate melhora
2. **Cancelar Regulacao** - Equipe cancela definitivamente a solicitacao
3. **Prazo Vencido** - Quando o prazo expira, equipe e sinalizada para nova decisao

Todas exigem justificativa e envolvem dupla checagem com o NIR.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO COMPLETO COM EXPIRACAO                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  EQUIPE                              NIR                              EQUIPE                 │
│  ──────                              ───                              ──────                 │
│                                                                                              │
│  Sinaliza impossibilidade ──────────► Define prazo (calendario) ──┐                         │
│  clinica com justificativa           Ex: "ate 30/01"              │                         │
│                                                                   │                         │
│                                                                   v                         │
│                                      ┌────────────────────────────────────────┐             │
│                                      │ Sistema monitora a data limite         │             │
│                                      └────────────────────────────────────────┘             │
│                                                   │                                         │
│                              ┌────────────────────┴────────────────────┐                    │
│                              │                                         │                    │
│                              v                                         v                    │
│                    Antes do prazo vencer                     Prazo venceu                   │
│                    ────────────────────                      ────────────                   │
│                    Equipe pode:                              Badge VERMELHO:                │
│                    • Confirmar transferencia                 "PRAZO VENCIDO"               │
│                    • Solicitar mais tempo                              │                    │
│                                                                        v                    │
│                                                              ┌─────────────────────────────┐│
│                                                              │ Equipe deve decidir:        ││
│                                                              │ • Confirmar Transferencia   ││
│                                                              │ • Solicitar Nova Listagem   ││
│                                                              │ • Cancelar Regulacao        ││
│                                                              └─────────────────────────────┘│
│                                                                                              │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Experiencia do Usuario

### Equipe - Quando Prazo Esta Vigente

Badge amarelo indica que esta aguardando melhora:

```text
┌─────────────────────────────────────┐
│ Leito 3                        5d   │
│ M.S.O. - 67 anos                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⏳ AGUARD. MELHORA - Neurologia │ │  <- Badge amarelo
│ │    Prazo: ate 30/01             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Equipe - Quando Prazo Venceu

Badge vermelho pulsante alerta que precisa de acao:

```text
┌─────────────────────────────────────┐
│ Leito 3                        5d   │
│ M.S.O. - 67 anos                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ⚠️ PRAZO VENCIDO - Neurologia   │ │  <- Badge vermelho pulsante
│ │    Venceu em 30/01              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Dialog de Prazo Vencido (Equipe)

Quando equipe clica no badge de prazo vencido:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Prazo de Melhora Clinica Vencido                           [x]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Neurologia - Prazo venceu em 30/01                              │
│                                                                 │
│ A vaga pode ter expirado. Escolha uma acao:                     │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ✅ Paciente melhorou - Confirmar Transferencia              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔄 Solicitar Nova Listagem                                  │ │
│ │    (Nova senha sera solicitada ao NIR)                      │ │
│ │                                                             │ │
│ │    Justificativa para nova listagem *                       │ │
│ │    ┌───────────────────────────────────────────────────┐    │ │
│ │    │ Paciente ainda instavel, porem com melhora...    │    │ │
│ │    └───────────────────────────────────────────────────┘    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ❌ Cancelar Regulacao                                       │ │
│ │    (Desistir da transferencia)                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### NIR - Ve Solicitacao de Nova Listagem

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🧠 Neurologia                               [Aguard. Transf.]   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔄 SOLICITACAO DE NOVA LISTAGEM                             │ │
│ │ "Paciente ainda instavel, porem com melhora parcial..."     │ │
│ │ Solicitado em: 31/01 as 08:00                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [ Solicitar Nova Senha ]  [ Cancelar Vaga ]                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Secao Tecnica

### 1. Alteracoes no Banco de Dados

```sql
ALTER TABLE patient_regulation
-- Impossibilidade clinica (equipe sinaliza)
ADD COLUMN IF NOT EXISTS clinical_hold_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clinical_hold_by UUID,
ADD COLUMN IF NOT EXISTS clinical_hold_reason TEXT,
-- Prazo definido pelo NIR
ADD COLUMN IF NOT EXISTS clinical_hold_deadline DATE,
ADD COLUMN IF NOT EXISTS clinical_hold_deadline_set_by UUID,
-- Solicitacao de nova listagem (quando prazo vence)
ADD COLUMN IF NOT EXISTS relisting_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS relisting_requested_by UUID,
ADD COLUMN IF NOT EXISTS relisting_reason TEXT,
-- Cancelamento solicitado pela equipe
ADD COLUMN IF NOT EXISTS team_cancel_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS team_cancel_requested_by UUID,
ADD COLUMN IF NOT EXISTS team_cancel_reason TEXT;
```

### 2. Atualizar Tipos TypeScript

**`src/types/database.ts`**:

```typescript
export interface PatientRegulation {
  // ... campos existentes ...
  // Impossibilidade clinica
  clinical_hold_at: string | null;
  clinical_hold_by: string | null;
  clinical_hold_reason: string | null;
  clinical_hold_deadline: string | null;
  clinical_hold_deadline_set_by: string | null;
  // Nova listagem (apos prazo vencer)
  relisting_requested_at: string | null;
  relisting_requested_by: string | null;
  relisting_reason: string | null;
  // Cancelamento solicitado pela equipe
  team_cancel_requested_at: string | null;
  team_cancel_requested_by: string | null;
  team_cancel_reason: string | null;
}
```

### 3. Logica de Verificacao de Prazo

**Funcao utilitaria em `src/lib/regulation-config.ts`**:

```typescript
export function isDeadlineExpired(deadline: string | null): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadlineDate < today;
}

export function getDeadlineStatus(reg: PatientRegulation): 'none' | 'pending' | 'expired' {
  if (!reg.clinical_hold_deadline) return 'none';
  return isDeadlineExpired(reg.clinical_hold_deadline) ? 'expired' : 'pending';
}
```

### 4. Criar Componente RegulationTeamActions

**`src/components/patient/RegulationTeamActions.tsx`**

Componente com todas as acoes possiveis para a equipe:
- Confirmar Transferencia (existente)
- Aguardar Melhora Clinica (novo - requer justificativa)
- Solicitar Nova Listagem (novo - quando prazo venceu, requer justificativa)
- Cancelar Regulacao (novo - requer justificativa)

### 5. Modificar BedCard

**`src/components/dashboard/BedCard.tsx`**

Badges visuais baseados no estado:

```tsx
// Status da regulacao
const awaitingTransferReg = patient.patient_regulation?.find(
  r => r.is_active && r.status === 'aguardando_transferencia'
);

if (awaitingTransferReg) {
  const hasDeadline = awaitingTransferReg.clinical_hold_deadline;
  const isExpired = hasDeadline && isDeadlineExpired(awaitingTransferReg.clinical_hold_deadline);
  
  if (isExpired) {
    // Badge vermelho pulsante - PRAZO VENCIDO
    return <Badge className="bg-red-500 animate-pulse">PRAZO VENCIDO</Badge>;
  } else if (awaitingTransferReg.clinical_hold_at) {
    // Badge amarelo - AGUARDANDO MELHORA
    return <Badge className="bg-amber-500">AGUARD. MELHORA - ate {formatDate(deadline)}</Badge>;
  } else {
    // Badge verde - VAGA DISPONIVEL (existente)
    return <Badge className="bg-green-500 animate-pulse">VAGA</Badge>;
  }
}
```

### 6. Criar Dialog de Prazo Vencido

**`src/components/patient/DeadlineExpiredDialog.tsx`**

Dialog que aparece quando equipe clica no badge de prazo vencido:
- Opcao 1: Confirmar Transferencia (paciente melhorou)
- Opcao 2: Solicitar Nova Listagem (com justificativa)
- Opcao 3: Cancelar Regulacao (com justificativa)

### 7. Modificar NIRRegulationDialog

**`src/components/nir/NIRRegulationDialog.tsx`**

Adicionar tratamento para:
- `clinical_hold_at` preenchido: mostrar date picker para definir prazo
- `relisting_requested_at` preenchido: mostrar opcoes de nova listagem ou cancelar
- `team_cancel_requested_at` preenchido: confirmar cancelamento

### 8. Atualizar BedGrid

**`src/components/dashboard/BedGrid.tsx`**

Incluir todos os novos campos na query de `patient_regulation`.

### 9. Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| **Migracao SQL** | Criar - todos os novos campos |
| `src/types/database.ts` | Modificar - adicionar novos campos |
| `src/lib/regulation-config.ts` | Modificar - funcoes de verificacao de prazo |
| `src/components/patient/RegulationTeamActions.tsx` | Criar - acoes da equipe |
| `src/components/patient/DeadlineExpiredDialog.tsx` | Criar - dialog de prazo vencido |
| `src/components/dashboard/BedCard.tsx` | Modificar - badges dinamicos |
| `src/components/patient/PatientDischargeDialog.tsx` | Modificar - integrar acoes |
| `src/components/nir/NIRRegulationDialog.tsx` | Modificar - date picker e nova listagem |
| `src/components/nir/NIRBedCard.tsx` | Modificar - indicadores visuais |
| `src/components/dashboard/BedGrid.tsx` | Modificar - carregar novos campos |

### 10. Ordem de Implementacao

1. Criar migracao SQL para novos campos
2. Atualizar tipos em `database.ts`
3. Adicionar funcoes de verificacao de prazo em `regulation-config.ts`
4. Criar componente `RegulationTeamActions.tsx`
5. Criar componente `DeadlineExpiredDialog.tsx`
6. Modificar `BedCard.tsx` com badges dinamicos
7. Modificar `PatientDischargeDialog.tsx` para usar novos componentes
8. Modificar `NIRRegulationDialog.tsx` com date picker e acoes de nova listagem
9. Atualizar `BedGrid.tsx` para carregar novos campos
10. Atualizar `NIRBedCard.tsx` com indicadores

