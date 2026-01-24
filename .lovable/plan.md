

# Plano: Visão Geral para Admin + Fluxo de Alternância Assistencial/Admin

## Objetivo

1. Dar ao **Admin** acesso à mesma **Visão Geral** panorâmica que Coordenadores e Diaristas possuem quando em modo assistencial
2. Melhorar o fluxo de alternância entre painel administrativo e acesso assistencial

## Situação Atual

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO ATUAL DO ADMIN                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Login → /admin (painel administrativo)                                     │
│                                                                             │
│  [Acesso Assistencial] → /select-unit?mode=assistencial                     │
│                       → Seleciona UTI específica                            │
│                       → /dashboard (vê só aquela UTI)                       │
│                                                                             │
│  ❌ NÃO tem acesso à "Visão Geral" panorâmica                              │
│  ❌ Precisa selecionar UTI antes de ver pacientes                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Novo Comportamento

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOVO FLUXO DO ADMIN                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Login → /admin (painel administrativo)                                     │
│                                                                             │
│  [Acesso Assistencial] → /dashboard (Visão Geral diretamente!)              │
│                       → Dropdown para alternar entre:                       │
│                           • Visão Geral (todas as UTIs)                     │
│                           • UTI específica                                  │
│                                                                             │
│  ✅ Admin tem acesso imediato à Visão Geral panorâmica                     │
│  ✅ Dropdown com botão "Admin" para voltar facilmente                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Alterações Técnicas

### 1. Modificar `useUnit.tsx` - Incluir Admin na Visão Geral

**Arquivo:** `src/hooks/useUnit.tsx`

**Linha 64:** Adicionar `admin` à verificação de `canViewAllUnits`:

```typescript
// Antes
const canViewAllUnits = rolesLoaded && (roles.includes('coordenador') || roles.includes('diarista'));

// Depois
const canViewAllUnits = rolesLoaded && (roles.includes('coordenador') || roles.includes('diarista') || roles.includes('admin'));
```

**Linha 400:** A função `selectAllUnits` já usa `canViewAllUnits`, então funcionará automaticamente.

### 2. Modificar `Dashboard.tsx` - Incluir Admin na Visão Geral

**Arquivo:** `src/pages/Dashboard.tsx`

**Linha 21:** Adicionar `admin` à verificação:

```typescript
// Antes
const canViewAllUnits = hasRole('coordenador') || hasRole('diarista');

// Depois
const canViewAllUnits = hasRole('coordenador') || hasRole('diarista') || hasRole('admin');
```

### 3. Modificar `DashboardHeader.tsx` - Incluir Admin na Visão Geral

**Arquivo:** `src/components/dashboard/DashboardHeader.tsx`

**Linha 53:** Adicionar `admin` à verificação:

```typescript
// Antes
const canViewAllUnits = hasRole('coordenador') || hasRole('diarista');

// Depois
const canViewAllUnits = hasRole('coordenador') || hasRole('diarista') || hasRole('admin');
```

**Linha 260-263:** Modificar botão "Acesso Assistencial" para ir direto ao dashboard:

```typescript
// Antes
<Button variant="outline" size="sm" onClick={() => navigate('/select-unit?mode=assistencial')} className="gap-2">
  <Stethoscope className="h-4 w-4" />
  Acesso Assistencial
</Button>

// Depois
<Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
  <Stethoscope className="h-4 w-4" />
  Acesso Assistencial
</Button>
```

### 4. Modificar `SelectUnit.tsx` - Redirecionar Admin para Dashboard

**Arquivo:** `src/pages/SelectUnit.tsx`

**Linha 63-65:** Modificar lógica para redirecionar admin em modo assistencial também:

```typescript
// Antes
if (!authLoading && !unitsLoading && canBypassSelection && !activeSession && !isAssistencialMode) {
  navigate('/dashboard');
}

// Depois - Admin em modo assistencial também vai direto ao dashboard
if (!authLoading && !unitsLoading && canBypassSelection && !activeSession) {
  navigate('/dashboard');
}
```

Isso faz com que, mesmo que o admin tente acessar `/select-unit?mode=assistencial`, seja redirecionado automaticamente para `/dashboard` onde terá a Visão Geral.

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useUnit.tsx` | Adicionar `admin` a `canViewAllUnits` |
| `src/pages/Dashboard.tsx` | Adicionar `admin` a `canViewAllUnits` |
| `src/components/dashboard/DashboardHeader.tsx` | Adicionar `admin` a `canViewAllUnits` + simplificar navegação |
| `src/pages/SelectUnit.tsx` | Redirecionar admin direto para dashboard |

## Resultado Final

**Fluxo do Admin:**

1. **Login** → Vai para `/admin` (painel administrativo)
2. **Clica "Acesso Assistencial"** → Vai direto para `/dashboard` com **Visão Geral**
3. **No Dashboard** → Usa dropdown para alternar entre:
   - 📊 **Visão Geral** (todas as UTIs)
   - 🏥 **UTI específica**
4. **Clica "Admin"** → Volta para `/admin`

O fluxo fica simétrico e fluido, permitindo alternância rápida entre administração e visão clínica panorâmica.

