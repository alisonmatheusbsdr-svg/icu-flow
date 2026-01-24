

# Plano: Remover Seletor de UTI da Página Admin

## Problema

Na página `/admin`, o dropdown "Selecione a UTI" aparece no header, mas não tem função nesse contexto. O admin está gerenciando usuários e unidades, não visualizando pacientes.

## Solução

Ocultar o seletor de UTI quando o usuário está na rota `/admin`.

## Alteração

**Arquivo:** `src/components/dashboard/DashboardHeader.tsx`

**Linha 125:** Adicionar verificação `!isOnAdmin` para ocultar o seletor na página Admin:

```typescript
// Antes
{units.length > 0 && (
  canSwitchUnits ? (
    <Select ...>
    ...

// Depois
{units.length > 0 && !isOnAdmin && (
  canSwitchUnits ? (
    <Select ...>
    ...
```

A variável `isOnAdmin` já existe (linha 54) e verifica se a rota atual é `/admin`.

## Resultado

| Página | Comportamento |
|--------|---------------|
| `/admin` | Header sem seletor de UTI |
| `/dashboard` | Header com seletor de UTI (Visão Geral + UTIs) |

