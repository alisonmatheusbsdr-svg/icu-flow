

# Plano: Diarista com Perfil Igual ao Coordenador

## Objetivo

Modificar o perfil do **Diarista** para ter o mesmo comportamento de navegação do **Coordenador**, incluindo:
- Acesso à **Visão Geral** panorâmica de todas as UTIs
- Dropdown para alternar entre "Visão Geral" e UTIs específicas
- Manter a capacidade exclusiva de criar/editar o **Plano Terapêutico**

## Situação Atual

```text
┌─────────────────────────────────────────────────────────────────┐
│                         COMPORTAMENTO                           │
├──────────────┬──────────────────────────────────────────────────┤
│ Plantonista  │ Seleciona UTI → Fica bloqueado → Timeout 30min   │
├──────────────┼──────────────────────────────────────────────────┤
│ Diarista     │ Vai direto ao Dashboard com dropdown de UTIs     │
│              │ NÃO tem "Visão Geral"                            │
├──────────────┼──────────────────────────────────────────────────┤
│ Coordenador  │ Dashboard com "Visão Geral" + dropdown de UTIs   │
│              │ Pode ver todas UTIs simultaneamente              │
└──────────────┴──────────────────────────────────────────────────┘
```

## Alterações

### 1. Modificar `useUnit.tsx` - Adicionar Diarista à Visão Geral

**Arquivo:** `src/hooks/useUnit.tsx`

Linha 64 - A verificação de coordenador para mostrar "Visão Geral" precisa incluir diarista:

```typescript
// Antes
const isCoordinator = rolesLoaded && roles.includes('coordenador');

// Depois - renomear para ser mais genérico
const canViewAllUnits = rolesLoaded && (roles.includes('coordenador') || roles.includes('diarista'));
```

Linha 398-404 - Ajustar `selectAllUnits` para incluir diarista:

```typescript
// Antes
const selectAllUnits = () => {
  if (isCoordinator) {
    setSelectedUnit(null);
    setShowAllUnits(true);
  }
};

// Depois
const selectAllUnits = () => {
  if (canViewAllUnits) {
    setSelectedUnit(null);
    setShowAllUnits(true);
  }
};
```

### 2. Modificar `Dashboard.tsx` - Incluir Diarista na Visão Geral

**Arquivo:** `src/pages/Dashboard.tsx`

Linha 21 - Verificar se é diarista ou coordenador:

```typescript
// Antes
const isCoordinator = hasRole('coordenador');

// Depois
const canViewAllUnits = hasRole('coordenador') || hasRole('diarista');
```

Linhas 58, 84, 91 - Usar a nova variável no lugar de `isCoordinator`:

```typescript
// Em todos os lugares onde usa isCoordinator para redirecionamento
// Substituir por canViewAllUnits
```

### 3. Modificar `DashboardHeader.tsx` - Mostrar Dropdown de Visão Geral para Diarista

**Arquivo:** `src/components/dashboard/DashboardHeader.tsx`

Linha 53 - Adicionar diarista à verificação:

```typescript
// Antes
const isCoordinator = hasRole('coordenador');

// Depois
const canViewAllUnits = hasRole('coordenador') || hasRole('diarista');
```

Linha 143 - Usar a nova variável para mostrar "Visão Geral" no dropdown:

```typescript
// Antes
{isCoordinator && (
  <SelectItem value="all">
    <div className="flex items-center gap-2">
      <LayoutGrid className="h-4 w-4" />
      Visão Geral
    </div>
  </SelectItem>
)}

// Depois
{canViewAllUnits && (
  // ... mesmo código
)}
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useUnit.tsx` | Adicionar `diarista` à lógica de `canViewAllUnits` |
| `src/pages/Dashboard.tsx` | Substituir `isCoordinator` por `canViewAllUnits` |
| `src/components/dashboard/DashboardHeader.tsx` | Mostrar "Visão Geral" no dropdown para diarista |

## Funcionalidades Preservadas

O Plano Terapêutico continuará funcionando **exatamente igual**. A verificação em `TherapeuticPlan.tsx` (linha 27) permanece:

```typescript
const canEditPlan = hasRole('diarista') && canEdit;
```

Isso significa que:
- Apenas **Diaristas** podem criar/editar planos terapêuticos
- A política RLS no banco já garante isso também

## Resultado Esperado

```text
┌─────────────────────────────────────────────────────────────────┐
│                      NOVO COMPORTAMENTO                         │
├──────────────┬──────────────────────────────────────────────────┤
│ Plantonista  │ (sem alteração)                                  │
├──────────────┼──────────────────────────────────────────────────┤
│ Diarista     │ Dashboard com "Visão Geral" + dropdown de UTIs   │
│              │ MANTÉM: edição de Plano Terapêutico              │
├──────────────┼──────────────────────────────────────────────────┤
│ Coordenador  │ (sem alteração)                                  │
└──────────────┴──────────────────────────────────────────────────┘
```

O Diarista agora terá a mesma experiência de navegação do Coordenador, podendo visualizar todas as UTIs simultaneamente na "Visão Geral" ou focar em uma UTI específica através do dropdown.

