
# Plano: Renomear Terminologia "Bloqueados" para "Críticos"

## Problema Identificado

O termo **"bloqueados"** na interface sugere leitos inativos, mas na verdade se refere a pacientes com **impossibilidade de alta** (intubados com TOT ou em uso de drogas vasoativas - DVA). Isso gera confusão com o conceito de "leito bloqueado" (indisponível para internação).

## Proposta de Novo Termo

| Antes | Depois |
|-------|--------|
| "3 bloqueados" | "3 críticos" |

**Justificativa:** O termo "críticos" transmite corretamente que são pacientes em condição clínica grave (TOT/DVA) que impede a alta, sem confundir com a disponibilidade física do leito.

## Alterações

### Arquivo: `src/components/dashboard/AllUnitsGrid.tsx`

**Linha 305** - Atualizar texto do badge:

```typescript
// Antes
{stats.blocked} bloqueado{stats.blocked > 1 ? 's' : ''}

// Depois
{stats.blocked} crítico{stats.blocked > 1 ? 's' : ''}
```

## Resultado Esperado

O badge nas estatísticas da unidade exibirá:
- **"1 crítico"** (singular)
- **"3 críticos"** (plural)

Mantém-se a mesma lógica (TOT + DVA), apenas com terminologia mais clara e clinicamente precisa.
