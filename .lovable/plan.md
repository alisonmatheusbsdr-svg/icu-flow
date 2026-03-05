

## Plano: Corrigir refresh ao alternar abas (Alt+Tab)

### Causa raiz identificada

O problema **não é um reload real da página**. É um re-render completo causado pela cadeia:

1. Ao voltar à aba, o Supabase Auth detecta o evento `visibilitychange` e tenta renovar o token
2. Isso dispara `onAuthStateChange` no `useAuth.tsx`
3. O callback chama `fetchRoles()`, que faz `setRolesLoaded(false)` na linha 55
4. No `useUnit.tsx`, `isLoading` depende de `rolesLoaded`: `isLoading: isLoading || !rolesLoaded`
5. O Dashboard vê `isLoading = true` → mostra "Carregando..." → desmonta toda a árvore de componentes incluindo o diálogo de admissão
6. Quando `rolesLoaded` volta a `true`, o Dashboard remonta tudo — mas o diálogo já foi destruído

### Solução

**`src/hooks/useAuth.tsx`** — Modificar `fetchRoles` para não resetar `rolesLoaded` quando já temos roles carregadas (ou seja, em refreshes subsequentes). Assim, o token refresh do Supabase não causa o flash de loading:

- Mudar `fetchRoles` para só fazer `setRolesLoaded(false)` na primeira carga, não em refreshes
- No `onAuthStateChange`, verificar se é um evento de `TOKEN_REFRESHED` e, nesse caso, não refazer o fetch de profile/roles (os dados não mudam com refresh de token)
- Alternativamente, simplesmente remover o `setRolesLoaded(false)` de dentro de `fetchRoles` e controlá-lo apenas no fluxo inicial

### Mudança específica

**`src/hooks/useAuth.tsx`**:
- Na função `fetchRoles`: remover `setRolesLoaded(false)` — manter o estado anterior enquanto recarrega
- No `onAuthStateChange`: filtrar eventos `TOKEN_REFRESHED` para não re-buscar profile e roles desnecessariamente, já que esses dados não mudam com renovação de token

Isso elimina o flash de "Carregando..." ao alternar abas, mantendo o diálogo aberto e os dados intactos.

