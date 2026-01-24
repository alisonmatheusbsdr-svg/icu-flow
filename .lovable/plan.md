
# Plano: Renomear Sistema para "Sinapse | UTI"

## Visão Geral

Atualizar todas as referências do nome antigo "UTI Handoff Pro" e placeholders "Lovable App" para o novo nome **"Sinapse | UTI"**.

## Arquivos a Modificar

### 1. `index.html` - Meta Tags e Título da Página

| Linha | Antes | Depois |
|-------|-------|--------|
| 7 | `<title>Lovable App</title>` | `<title>Sinapse \| UTI</title>` |
| 8 | `content="Lovable Generated Project"` | `content="Sistema de Gestão e Passagem de Plantão em UTI"` |
| 12 | `og:title content="Lovable App"` | `og:title content="Sinapse \| UTI"` |
| 13 | `og:description content="Lovable Generated Project"` | `og:description content="Sistema de Gestão e Passagem de Plantão em UTI"` |

### 2. `src/pages/Auth.tsx` - Tela de Login

**Linha 99:**
```typescript
// Antes
<h1 className="text-2xl font-bold text-foreground">UTI Handoff Pro</h1>

// Depois
<h1 className="text-2xl font-bold text-foreground">Sinapse | UTI</h1>
```

### 3. `src/pages/SelectUnit.tsx` - Seleção de Unidade

**Linha 233:**
```typescript
// Antes
<h1 className="font-semibold text-lg">UTI Handoff Pro</h1>

// Depois
<h1 className="font-semibold text-lg">Sinapse | UTI</h1>
```

### 4. `src/components/dashboard/DashboardHeader.tsx` - Header do Dashboard

**Linha 121:**
```typescript
// Antes
<span className="font-semibold text-foreground">UTI Handoff Pro</span>

// Depois
<span className="font-semibold text-foreground">Sinapse | UTI</span>
```

## Resumo

| Arquivo | Alteração |
|---------|-----------|
| `index.html` | Título, descrição e meta tags OG |
| `src/pages/Auth.tsx` | Nome no header da tela de login |
| `src/pages/SelectUnit.tsx` | Nome no header de seleção de UTI |
| `src/components/dashboard/DashboardHeader.tsx` | Nome no header do dashboard |

## Resultado

O nome **"Sinapse | UTI"** aparecerá em:
- Aba do navegador
- Resultados de busca e compartilhamentos (meta tags)
- Tela de login
- Seleção de unidade
- Header do dashboard e admin
