

# Três Opções no Diálogo de Cancelamento de Evolução

## Problema atual

O diálogo de cancelamento tem apenas duas opções: "Manter" e "Cancelar Evolução" (que sempre copia o texto). O usuário quer a possibilidade de cancelar sem copiar também.

## O que muda

O diálogo passa a ter **3 botões**:

1. **Manter** — fecha o diálogo sem fazer nada (já existe)
2. **Copiar e Cancelar** — copia o texto para a área de transferência e depois deleta a evolução
3. **Apenas Cancelar** — deleta a evolução sem copiar o texto

## Arquivo a modificar

| Arquivo | Alteração |
|---|---|
| `src/components/patient/PatientEvolutions.tsx` | Refatorar `handleCancelEvolution` para aceitar parâmetro `copyText`, atualizar o diálogo com 3 botões |

## Detalhes Técnicos

### Função `handleCancelEvolution`

Recebe um booleano `copyText` para decidir se copia ou não:

```typescript
const handleCancelEvolution = async (copyText: boolean) => {
  if (!evolutionToCancel) return;
  if (copyText) {
    try { await navigator.clipboard.writeText(evolutionToCancel.content); } catch { /* silent */ }
  }
  const { error } = await supabase.from('evolutions').delete().eq('id', evolutionToCancel.id);
  if (error) {
    toast.error('Erro ao cancelar evolução');
  } else {
    toast.success(copyText 
      ? 'Evolução cancelada. Texto copiado para a área de transferência.' 
      : 'Evolução cancelada.');
    onUpdate();
  }
  setEvolutionToCancel(null);
};
```

### Diálogo atualizado

```text
┌──────────────────────────────────────────┐
│  Cancelar evolução?                      │
│                                          │
│  A evolução será removida. Você pode     │
│  copiar o texto antes de cancelar.       │
│                                          │
│  [Manter]  [Copiar e Cancelar]  [Cancelar]│
└──────────────────────────────────────────┘
```

- **Manter**: `AlertDialogCancel` (já existe)
- **Copiar e Cancelar**: botão `outline` com estilo destrutivo suave, chama `handleCancelEvolution(true)`
- **Apenas Cancelar**: botão `destructive`, chama `handleCancelEvolution(false)`

A descrição do diálogo muda para: "A evolução será removida. Você pode copiar o texto antes de cancelar."

