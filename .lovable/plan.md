

# Evolução Cancelada com Tachado + Collapsible + Timestamp

## O que muda para o usuário

- Ao cancelar uma evolução, ela **não é mais deletada** do banco. Em vez disso, recebe um "soft delete": fica marcada como `cancelled_at` com timestamp
- No histórico, a evolução cancelada aparece com **texto tachado** (strikethrough) e um badge "Cancelada" com a hora do cancelamento
- Quando uma **nova evolução é adicionada depois** da cancelada, o texto cancelado é **minimizado dentro de um Collapsible** (dropdown), mantendo o fluxo de leitura limpo
- Enquanto não houver evolução posterior, o texto cancelado fica visível (tachado) normalmente
- O diálogo de cancelamento continua com as 3 opções (Manter / Copiar e Cancelar / Apenas Cancelar), mas agora faz UPDATE em vez de DELETE

## Arquivos a modificar

| Arquivo | Alteração |
|---|---|
| **Migração SQL** | Adicionar coluna `cancelled_at` (timestamp nullable) na tabela `evolutions`; adicionar policy de UPDATE |
| `src/types/database.ts` | Adicionar `cancelled_at` ao tipo `Evolution` |
| `src/components/patient/PatientEvolutions.tsx` | Trocar DELETE por UPDATE, renderizar tachado e collapsible |

## Detalhes Técnicos

### 1. Migração SQL

```sql
ALTER TABLE public.evolutions 
  ADD COLUMN cancelled_at timestamptz DEFAULT NULL;

-- Permitir que o autor atualize (para marcar cancelled_at)
CREATE POLICY "Users can cancel own evolutions"
  ON public.evolutions
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
```

A coluna `cancelled_at` sendo `NULL` significa evolução ativa. Com valor preenchido, significa cancelada naquele momento.

### 2. Tipo `Evolution` atualizado

```typescript
export interface Evolution {
  id: string;
  patient_id: string;
  content: string;
  created_by: string;
  created_at: string;
  cancelled_at?: string | null;
}
```

### 3. Lógica de cancelamento (UPDATE em vez de DELETE)

```typescript
const handleCancelEvolution = async (copyText: boolean) => {
  if (!evolutionToCancel) return;
  if (copyText) {
    try { await navigator.clipboard.writeText(evolutionToCancel.content); } catch {}
  }
  const { error } = await supabase
    .from('evolutions')
    .update({ cancelled_at: new Date().toISOString() } as any)
    .eq('id', evolutionToCancel.id);
  // toast + onUpdate...
};
```

### 4. Renderização no histórico

Para cada evolução no `.map()`, verificar se está cancelada e se existe uma evolução posterior:

```typescript
const isCancelled = !!(evo as any).cancelled_at;
const hasLaterEvolution = patient.evolutions?.some(
  other => !(other as any).cancelled_at 
    && new Date(other.created_at) > new Date(evo.created_at)
);
```

**Se cancelada + tem evolução posterior → Collapsible minimizado:**
```tsx
<Collapsible>
  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground">
    <ChevronRight className="h-3 w-3" />
    Evolução cancelada em DD/MM HH:MM
  </CollapsibleTrigger>
  <CollapsibleContent>
    <p className="line-through text-muted-foreground">{evo.content}</p>
  </CollapsibleContent>
</Collapsible>
```

**Se cancelada + sem evolução posterior → Tachado visível:**
```tsx
<p className="line-through text-muted-foreground">{evo.content}</p>
<Badge>Cancelada às HH:MM</Badge>
```

**Se não cancelada → Renderização normal (como está hoje)**

### 5. Regra `canCancelEvolution` permanece igual

A lógica de 24h e verificação de evolução posterior de outro autor continua a mesma — só muda que agora considera apenas evoluções **não canceladas** como "posteriores":

```typescript
const hasLaterEvolutionByOther = patient.evolutions?.some(
  other => !(other as any).cancelled_at 
    && other.created_by !== evo.created_by 
    && new Date(other.created_at) > new Date(evo.created_at)
);
```

### 6. Impressão e resumo de IA

Os locais que buscam evoluções (print, summarize) continuarão funcionando normalmente — as evoluções canceladas serão incluídas nos dados mas podem ser filtradas no frontend. Nenhuma alteração necessária nesses componentes por ora (evoluções canceladas são ignoradas visualmente no print pelo tachado).

### Fluxo visual

```text
Histórico de Evoluções:

  ┌──────────────────────────────────────────┐
  │ Paciente estável, sem queixas...         │  ← normal
  │          Dr. Silva - 24/02 08:30  Melhor │
  ├──────────────────────────────────────────┤
  │ ▶ Evolução cancelada em 24/02 14:15     │  ← collapsible (minimizado)
  ├──────────────────────────────────────────┤
  │ Melhora clínica significativa...         │  ← normal (adicionada depois)
  │          Dr. Silva - 24/02 14:20  Melhor │
  ├──────────────────────────────────────────┤
  │ ̶P̶a̶c̶i̶e̶n̶t̶e̶ ̶c̶o̶m̶ ̶p̶i̶o̶r̶a̶.̶.̶.̶             │  ← tachado visível (sem evo posterior)
  │   Cancelada 24/02 18:00                  │
  │          Dr. Silva - 24/02 16:00  Pior   │
  └──────────────────────────────────────────┘
```

