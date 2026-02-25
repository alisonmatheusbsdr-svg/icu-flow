

# Cancelamento de Evoluções com Cópia do Texto

## Contexto

Atualmente, evoluções validadas são permanentes — não há como cancelar ou desfazer. O usuário precisa poder cancelar uma evolução já registrada, com o texto sendo copiado automaticamente para a área de transferência para facilitar a reescrita.

## O que muda para o usuário

- Cada evolução no histórico que foi criada **pelo próprio usuário** terá um botão discreto de cancelamento (ícone X ou lixeira)
- Ao clicar, um diálogo de confirmação aparece explicando que a evolução será removida e o texto será copiado
- Ao confirmar, o texto é copiado para a área de transferência e a evolução é deletada do banco
- Um toast confirma: "Evolução cancelada. Texto copiado para a área de transferência."

## Alterações necessárias

### 1. Banco de dados — nova política RLS

A tabela `evolutions` não tem política de DELETE. Será criada uma política permitindo que o autor da evolução possa deletá-la:

```sql
CREATE POLICY "Users can delete own evolutions"
  ON evolutions FOR DELETE
  USING (auth.uid() = created_by);
```

### 2. `src/components/patient/PatientEvolutions.tsx`

- Importar `AlertDialog` do Radix e ícone `Trash2` ou `X` do Lucide
- Adicionar estado para controlar o diálogo de confirmação (`evolutionToCancel`)
- Para cada evolução no histórico onde `evo.created_by === user?.id` e `canEdit`, exibir um botão pequeno de cancelamento
- No handler de confirmação:
  1. Copiar `evo.content` para o clipboard via `navigator.clipboard.writeText()`
  2. Executar `supabase.from('evolutions').delete().eq('id', evo.id)`
  3. Exibir toast de sucesso com instrução de colar
  4. Chamar `onUpdate()` para atualizar a lista
- O diálogo terá título "Cancelar evolução?" e texto explicando que o conteúdo será copiado

### Fluxo visual

```text
Histórico de evoluções:
┌─────────────────────────────────────────┐
│ Texto da evolução...                    │
│                    Dr. Silva - 25/02 14h │ [🗑]  ← só aparece para o autor
└─────────────────────────────────────────┘

Ao clicar [🗑]:
┌─────────────────────────────────┐
│  Cancelar evolução?             │
│                                 │
│  A evolução será removida e o   │
│  texto será copiado para a      │
│  área de transferência para     │
│  facilitar a correção.          │
│                                 │
│  [Manter]     [Cancelar Evolução]│
└─────────────────────────────────┘
```

## Segurança

- A política RLS garante que apenas o autor pode deletar sua própria evolução
- O botão de cancelar só aparece na UI para o autor logado
- Confirmação obrigatória via diálogo antes da exclusão

