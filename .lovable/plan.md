

## Plano: Fechar diálogo de admissão com confirmação + badge de rascunho

### Mudanças

**1. `src/components/dashboard/BedCard.tsx`**
- Remover `onInteractOutside` e `onEscapeKeyDown` que bloqueiam o fechamento
- Substituir `onOpenChange={setIsAdmitOpen}` por uma função que verifica se existe rascunho no localStorage (`admit-draft-{bedId}`)
  - Se não há dados preenchidos: fecha normalmente
  - Se há dados: abre um `AlertDialog` com 3 opções:
    - "Salvar Rascunho" — mantém o localStorage e fecha o diálogo
    - "Descartar" — limpa o localStorage e fecha
    - "Cancelar" — volta ao formulário
- No estado de leito vago, verificar se existe `admit-draft-{bedId}` no localStorage e, se sim, exibir um badge "Rascunho" (ícone de arquivo/edit) no card do leito, indicando que há preenchimento pendente

**2. `src/components/dashboard/AdmitPatientForm.tsx`**
- Expor uma função/prop `onRequestClose` ou usar um callback para que o `BedCard` consiga verificar se há dados preenchidos antes de fechar
- Alternativa mais simples: o `BedCard` lê diretamente o localStorage para checar se o rascunho existe (já que o form salva automaticamente)

### Detalhes de implementação

- O badge "Rascunho" no card vago será um pequeno indicador (ex: `FileEdit` icon + texto "Rascunho") com cor amarela/amber, posicionado abaixo do texto "Vago"
- O `AlertDialog` será renderizado dentro do `BedCard` e controlado por estado local
- A verificação de rascunho no card usará um `useState` + `useEffect` que lê o localStorage na montagem e escuta o evento `storage` para atualizações

