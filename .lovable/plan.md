
# Plano: Corrigir mensagem de seguranca no logout voluntario

## Problema

Quando o plantonista faz logout por conta propria, o sistema exibe a mensagem "Sua sessao foi encerrada por questoes de seguranca", que deveria aparecer apenas quando um coordenador ou admin encerra a sessao remotamente.

## Causa

O hook `useUnit.tsx` escuta em tempo real a exclusao de registros na tabela `active_sessions`. Quando o proprio usuario faz logout (via `signOut` no `useAuth`), a sessao e deletada, e o listener de realtime dispara o toast de seguranca sem distinguir se foi uma acao propria ou remota.

## Solucao

Adicionar um flag `isLoggingOut` (useRef) no `useUnit.tsx` que e ativado antes de deletar a sessao no logout. O listener de realtime verifica esse flag e ignora o toast quando o logout e voluntario.

## Alteracoes

### `src/hooks/useUnit.tsx`

1. Criar um `useRef<boolean>` chamado `isLoggingOutRef`, inicializado como `false`
2. Expor uma funcao `markLoggingOut()` no contexto do UnitProvider que seta `isLoggingOutRef.current = true`
3. No listener de realtime (linha ~163), antes de exibir o toast, verificar: se `isLoggingOutRef.current` for `true`, apenas limpar o estado sem mostrar o toast
4. Expor `markLoggingOut` via contexto

### `src/hooks/useAuth.tsx`

1. Importar `useUnit` ou receber a funcao `markLoggingOut` como dependencia
2. No metodo `signOut`, chamar `markLoggingOut()` antes de deletar a sessao do banco

**Alternativa mais simples (preferida):** Como `useAuth` nao pode importar `useUnit` (dependencia circular), a solucao mais limpa e mover a logica de limpeza de sessao para dentro do `useUnit`, expondo um `logout()` que faz o `markLoggingOut` + delete da sessao. O `signOut` do `useAuth` deixa de deletar a sessao diretamente.

### Detalhamento da alternativa preferida

**`src/hooks/useUnit.tsx`:**
- Adicionar `isLoggingOutRef = useRef(false)`
- Criar funcao `cleanupSession()` que seta `isLoggingOutRef.current = true` e deleta a sessao do banco
- No listener realtime: checar `isLoggingOutRef.current` — se `true`, nao mostrar toast
- Expor `cleanupSession` no contexto

**`src/hooks/useAuth.tsx`:**
- Remover a linha que deleta `active_sessions` diretamente no `signOut`
- O componente que chama `signOut` (ex: `DashboardHeader`) passa a chamar `cleanupSession()` antes de `signOut()`

**`src/components/dashboard/DashboardHeader.tsx`:**
- No `handleLogout`, chamar `cleanupSession()` do useUnit antes de `signOut()`
