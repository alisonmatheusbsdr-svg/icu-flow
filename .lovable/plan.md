

## Plano: Impedir refresh automático do PWA ao alternar abas

### Causa raiz
O PWA está configurado com `registerType: "autoUpdate"` no `vite.config.ts`. Isso faz com que, ao detectar uma nova versão do Service Worker (o que pode ocorrer ao voltar para a aba), a página recarregue automaticamente — fechando qualquer diálogo aberto.

### Solução
Alterar o `registerType` de `"autoUpdate"` para `"prompt"` no `vite.config.ts`. O componente `UpdatePrompt.tsx` já existe e exibe um toast pedindo que o usuário clique para atualizar — ou seja, a infraestrutura de prompt já está pronta, basta ativá-la.

### Mudança técnica

**`vite.config.ts`** — linha 17:
- Trocar `registerType: "autoUpdate"` por `registerType: "prompt"`

Isso garante que a atualização do Service Worker nunca force um reload automático. O usuário verá o toast "Nova versão disponível" e decidirá quando atualizar.

A persistência de rascunho no localStorage (já implementada) serve como segunda camada de proteção caso o usuário escolha atualizar no meio de uma admissão.

