
# Plano: Corrigir Badge Duplicada e Carregamento de Unidades

## Problemas Identificados

1. **Badge "Aprovado" duplicada**: A tabela desktop tem a coluna "Status" (linha 378) E uma segunda chamada a `getStatusBadge` (linha 422) logo antes da coluna "Acoes". Isso gera o badge verde duplicado que aparece na imagem.

2. **Unidades nao carregam**: A funcao `fetchUsers` (linha 83) salva `response.data.users` mas nunca salva `response.data.allUnits` no estado `allUnits`. A edge function ja retorna `allUnits` corretamente, mas o frontend ignora esse dado.

## Alteracoes

### `src/components/team/TeamUserManagement.tsx`

1. **Remover a linha 422** que renderiza `getStatusBadge` duplicado (a segunda `<TableCell>` com status entre "Unidades" e "Acoes")

2. **Adicionar `setAllUnits`** na funcao `fetchUsers` (linha 83):
   ```typescript
   setUsers(response.data.users || []);
   setAllUnits(response.data.allUnits || []);
   ```

Sao apenas 2 alteracoes pontuais, sem impacto em outros componentes.
