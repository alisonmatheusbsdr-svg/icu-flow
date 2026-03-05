

## Plano: Manter o diálogo de admissão aberto e persistir rascunho

### Problema
O diálogo de admissão fecha ao clicar fora dele ou ao pressionar ESC, perdendo os dados preenchidos. Se o usuário navegar para outra página, o componente desmonta e os dados são perdidos.

### Solução em duas partes

**1. Impedir fechamento acidental do diálogo** (`BedCard.tsx`)
- Adicionar `onInteractOutside={(e) => e.preventDefault()}` e `onEscapeKeyDown={(e) => e.preventDefault()}` no `DialogContent` para impedir que cliques fora ou ESC fechem o diálogo
- O diálogo só fechará pelo botão X ou após a admissão ser concluída

**2. Persistir rascunho no localStorage** (`AdmitPatientForm.tsx`)
- Salvar automaticamente o estado do formulário no `localStorage` com chave `admit-draft-{bedId}` a cada alteração
- Restaurar os dados ao reabrir o formulário do mesmo leito
- Limpar o rascunho após admissão bem-sucedida
- Assim, mesmo que o usuário navegue para outra página (desmontando o componente), ao voltar os dados estarão lá

### Resultado esperado
- Clicar fora do diálogo → diálogo permanece aberto
- ESC → diálogo permanece aberto
- Navegar para outra página e voltar → dados restaurados automaticamente
- Admissão concluída → rascunho limpo

