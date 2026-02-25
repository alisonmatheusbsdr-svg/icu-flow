

# Limite de Tempo e Sequência para Cancelamento de Evoluções

## Regras de negócio

O botão de cancelar uma evolução só deve aparecer quando **ambas** as condições forem verdadeiras:

1. A evolução foi criada **há menos de 24 horas**
2. **Nenhum outro usuário** inseriu uma evolução para o mesmo paciente **depois** desta

## Arquivo a modificar

| Arquivo | Alteração |
|---|---|
| `src/components/patient/PatientEvolutions.tsx` | Adicionar função de verificação das duas condições antes de exibir o botão de cancelar |

## Detalhes Técnicos

### Função `canCancelEvolution`

Criar uma função auxiliar que recebe a evolução e a lista completa de evoluções do paciente:

```typescript
const canCancelEvolution = (evo: Evolution): boolean => {
  // Condição 1: criada há menos de 24h
  const hoursSinceCreation = (Date.now() - new Date(evo.created_at).getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation >= 24) return false;

  // Condição 2: nenhum OUTRO usuário inseriu evolução depois desta
  const hasLaterEvolutionByOther = patient.evolutions?.some(
    other => other.created_by !== evo.created_by 
          && new Date(other.created_at) > new Date(evo.created_at)
  );
  if (hasLaterEvolutionByOther) return false;

  return true;
};
```

### Alteração na renderização

A condição atual do botão de cancelar:
```typescript
canEdit && evo.created_by === user?.id
```

Passa a ser:
```typescript
canEdit && evo.created_by === user?.id && canCancelEvolution(evo)
```

### Sem alterações no banco de dados

A política RLS de DELETE já existe e restringe ao autor. As novas regras são validações de UI — o banco já protege contra deleções não autorizadas. Opcionalmente, poderíamos adicionar uma validação no banco via trigger, mas como o botão simplesmente não aparece quando as condições não são atendidas, e a RLS já garante que só o autor pode deletar, a proteção é suficiente.

### Fluxo visual

```text
Evolução criada há < 24h, sem evolução posterior de outro usuário:
  [🗑] aparece → pode cancelar

Evolução criada há > 24h:
  [🗑] não aparece

Evolução criada há < 24h, MAS outro usuário já evoluiu depois:
  [🗑] não aparece
```

