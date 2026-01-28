

# Plano: Centralizar Acoes de Regulacao no Modal do Paciente

## Objetivo

Mover todas as acoes de regulacao (aguardar melhora clinica, cancelamento, solicitar nova listagem) para dentro da secao "Regulacao" no modal do paciente (`PatientRegulation.tsx`), removendo essas opcoes de outros lugares como o dialog de alta e badges clicaveis.

## Alteracoes Propostas

### 1. Remover Sugestao de Transferencia do PatientDischargeDialog

**Arquivo:** `src/components/patient/PatientDischargeDialog.tsx`

Remover:
- A logica que busca regulacao `awaitingTransferReg`
- O card verde com sugestao de transferencia rapida
- O texto "ou selecione outro desfecho"

O dialog ficara apenas com o select de desfecho e o botao de confirmar, como era originalmente.

### 2. Modificar PatientRegulation para Incluir Acoes

**Arquivo:** `src/components/patient/PatientRegulation.tsx`

Quando a regulacao estiver em `aguardando_transferencia`, mostrar botoes de acao dentro do Popover:

- **Confirmar Transferencia** - Verde (confirma saida do paciente)
- **Aguardar Melhora Clinica** - Amarelo (abre dialog de justificativa)
- **Cancelar Regulacao** - Vermelho (abre dialog de justificativa)

Quando houver prazo vencido (`clinical_hold_deadline` expirado), mostrar alerta e opcoes:

- **Paciente Melhorou** - Confirma transferencia
- **Solicitar Nova Listagem** - Com justificativa
- **Cancelar Regulacao** - Com justificativa

### 3. Integrar RegulationTeamActions no PatientRegulation

Em vez de ter um dialog separado (`RegulationTeamActions.tsx`), as acoes serao exibidas diretamente no Popover de cada regulacao dentro do `PatientRegulation.tsx`. O dialog so abre quando precisa de justificativa.

### 4. Simplificar Badges no BedCard

**Arquivo:** `src/components/dashboard/BedCard.tsx`

Os badges permanecem visuais (para alertar a equipe), mas nao abrem dialogs ao clicar. Sao apenas indicadores:

- Badge verde "VAGA" - Indica que ha vaga disponivel
- Badge amarelo "AGUARD. MELHORA" - Indica impossibilidade clinica
- Badge vermelho "PRAZO VENCIDO" - Alerta visual para prazo expirado
- Badge "CANCELAMENTO PEND." - Indica solicitacao de cancelamento

O usuario clica no card para abrir o modal e faz as acoes na secao de Regulacao.

---

## Secao Tecnica

### Modificacoes no PatientRegulation.tsx

```tsx
// Adicionar imports
import { RegulationTeamActions } from './RegulationTeamActions';
import { DeadlineExpiredDialog } from './DeadlineExpiredDialog';
import { isDeadlineExpired } from '@/lib/regulation-config';

// Adicionar estados
const [actionRegulation, setActionRegulation] = useState<PatientRegulationType | null>(null);
const [deadlineExpiredReg, setDeadlineExpiredReg] = useState<PatientRegulationType | null>(null);

// Dentro do Popover de cada regulacao, adicionar condicional:
{reg.status === 'aguardando_transferencia' && canManageRequests && (
  <div className="space-y-2 pt-2 border-t">
    {/* Se prazo venceu */}
    {reg.clinical_hold_deadline && isDeadlineExpired(reg.clinical_hold_deadline) ? (
      <div className="p-2 bg-red-50 rounded-lg">
        <p className="text-xs text-red-600 font-medium mb-2">
          Prazo vencido! Escolha uma acao:
        </p>
        <Button size="sm" onClick={() => setDeadlineExpiredReg(reg)}>
          Ver Opcoes
        </Button>
      </div>
    ) : (
      /* Acoes normais quando vaga disponivel */
      <Button 
        size="sm" 
        className="w-full gap-1"
        onClick={() => setActionRegulation(reg)}
      >
        Acoes de Transferencia
      </Button>
    )}
  </div>
)}
```

### Modificacoes no PatientDischargeDialog.tsx

Remover linhas 72-74 (awaitingTransferReg), linhas 139-143 (handleQuickTransfer), e linhas 163-215 (card de sugestao de transferencia).

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/patient/PatientRegulation.tsx` | Adicionar botoes de acao no Popover |
| `src/components/patient/PatientDischargeDialog.tsx` | Remover sugestao de transferencia rapida |
| `src/components/dashboard/BedCard.tsx` | Remover onClick dos badges de regulacao |

### Fluxo Final

```text
┌───────────────────────────────────────────────────────────────────────┐
│                          FLUXO CENTRALIZADO                           │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  BedCard (Dashboard)                                                  │
│  ──────────────────                                                   │
│  Mostra badges visuais (VAGA, AGUARD. MELHORA, etc.)                 │
│  Usuario clica no card → abre PatientModal                           │
│                                                                       │
│  PatientModal                                                         │
│  ────────────                                                         │
│  Secao "Regulacao" (PatientRegulation.tsx)                           │
│       │                                                               │
│       ├──► Clica na regulacao → Popover com detalhes                 │
│       │       │                                                       │
│       │       ├──► [Alterar Especialidade] (existente)               │
│       │       ├──► [Acoes de Transferencia] (quando aguard. transf.) │
│       │       │           │                                           │
│       │       │           ├──► Confirmar Transferencia               │
│       │       │           ├──► Aguardar Melhora Clinica              │
│       │       │           └──► Cancelar Regulacao                    │
│       │       │                                                       │
│       │       └──► [Remover] (existente)                             │
│       │                                                               │
│       └──► Botao [+] para adicionar nova regulacao                   │
│                                                                       │
│  Dialog de Desfecho (separado)                                        │
│  ─────────────────────────────                                        │
│  Apenas registro de desfecho (alta, obito, transferencia)            │
│  Sem sugestoes de regulacao                                           │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

