

# Plano: Centralizar Ações de Regulação no Modal do Paciente

## ✅ IMPLEMENTADO

### Objetivo

Mover todas as ações de regulação (aguardar melhora clínica, cancelamento, solicitar nova listagem) para dentro da seção "Regulação" no modal do paciente (`PatientRegulation.tsx`), removendo essas opções de outros lugares como o dialog de alta e badges clicáveis.

### Alterações Realizadas

#### 1. PatientDischargeDialog.tsx ✅
- Removida a sugestão de transferência rápida (card verde)
- Removida a lógica que busca `awaitingTransferReg`
- Dialog agora apenas exibe select de desfecho e botão de confirmar

#### 2. PatientRegulation.tsx ✅
- Adicionados estados para gerenciar `actionRegulation` e `deadlineExpiredReg`
- Integrados `RegulationTeamActions` e `DeadlineExpiredDialog` diretamente no componente
- Adicionada lógica `getRegulationAlertState()` para detectar estados especiais
- Badges visuais dentro do popover indicam:
  - 🟢 Vaga disponível
  - 🟡 Aguardando melhora clínica
  - 🔴 Prazo vencido (pulsante)
  - 🔵 Nova listagem solicitada
  - 🔴 Cancelamento pendente
- Botões de ação condicionais no popover:
  - "Ações de Transferência" quando vaga disponível
  - "Ver Opções" quando prazo venceu

#### 3. BedCard.tsx ✅
- Badges agora são apenas indicadores visuais (não clicáveis)
- Removidos os dialogs `RegulationTeamActions` e `DeadlineExpiredDialog` do BedCard
- Removidos estados `selectedRegulation`, `isTeamActionsOpen`, `isDeadlineExpiredOpen`
- Usuário clica no card para abrir o modal do paciente

#### 4. PatientModal.tsx ✅
- Removida a prop `regulations` do `PatientDischargeDialog`

### Fluxo Final

```text
┌───────────────────────────────────────────────────────────────────────┐
│                          FLUXO CENTRALIZADO                           │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  BedCard (Dashboard)                                                  │
│  ──────────────────                                                   │
│  Mostra badges visuais (VAGA, AGUARD. MELHORA, etc.)                 │
│  Usuário clica no card → abre PatientModal                           │
│                                                                       │
│  PatientModal                                                         │
│  ────────────                                                         │
│  Seção "Regulação" (PatientRegulation.tsx)                           │
│       │                                                               │
│       ├──► Clica na regulação → Popover com detalhes                 │
│       │       │                                                       │
│       │       ├──► [Alterar Especialidade] (existente)               │
│       │       ├──► [Ações de Transferência] (quando aguard. transf.) │
│       │       │           │                                           │
│       │       │           ├──► Confirmar Transferência               │
│       │       │           ├──► Aguardar Melhora Clínica              │
│       │       │           └──► Cancelar Regulação                    │
│       │       │                                                       │
│       │       └──► [Remover] (existente)                             │
│       │                                                               │
│       └──► Botão [+] para adicionar nova regulação                   │
│                                                                       │
│  Dialog de Desfecho (separado)                                        │
│  ─────────────────────────────                                        │
│  Apenas registro de desfecho (alta, óbito, transferência)            │
│  Sem sugestões de regulação                                           │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```
