
# Plano: Substituir Botão "Imprimir" por Botão de Perfil

## Objetivo

Remover o botão "Imprimir" que não está funcional e substituí-lo por um botão "Perfil" que permite ao usuário editar seus dados pessoais e alterar sua senha.

## Alterações

### 1. Criar Componente `ProfileDialog`

**Novo arquivo:** `src/components/profile/ProfileDialog.tsx`

Modal com duas abas:

```text
┌────────────────────────────────────────────┐
│ Meu Perfil                             [X] │
├────────────────────────────────────────────┤
│  [Dados Pessoais]  [Alterar Senha]         │
│                                            │
│  Nome Completo                             │
│  ┌──────────────────────────────────────┐  │
│  │ Dr. João Silva                       │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  CRM                                       │
│  ┌──────────────────────────────────────┐  │
│  │ CRM-PE 123456                        │  │
│  └──────────────────────────────────────┘  │
│                                            │
│                    [Cancelar] [Salvar]     │
└────────────────────────────────────────────┘
```

**Componentes utilizados:**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger`
- `Input`, `Label`, `Button`

**Funcionalidades:**

| Aba | Campos | Ação |
|-----|--------|------|
| Dados Pessoais | Nome, CRM | Atualiza tabela `profiles` |
| Alterar Senha | Nova senha, Confirmar senha | `supabase.auth.updateUser()` |

### 2. Atualizar `useAuth.tsx`

Adicionar função `updateProfile` ao contexto:

```typescript
updateProfile: (updates: { nome?: string; crm?: string }) => Promise<{ error: Error | null }>;
updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
```

### 3. Atualizar `DashboardHeader.tsx`

**Linha 7:** Trocar import `Printer` por `User`

**Linhas 247-250:** Substituir botão "Imprimir":

```tsx
// Antes
<Button variant="outline" size="sm" className="gap-2">
  <Printer className="h-4 w-4" />
  Imprimir
</Button>

// Depois
<Button 
  variant="outline" 
  size="sm" 
  className="gap-2"
  onClick={() => setIsProfileOpen(true)}
>
  <User className="h-4 w-4" />
  Perfil
</Button>
```

**Adicionar:**
- Estado `isProfileOpen`
- Import e renderização do `ProfileDialog`

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/profile/ProfileDialog.tsx` | **Criar** |
| `src/hooks/useAuth.tsx` | **Modificar** - adicionar `updateProfile` e `updatePassword` |
| `src/components/dashboard/DashboardHeader.tsx` | **Modificar** - trocar botão |

## Validações

**Dados Pessoais:**
- Nome: obrigatório, mínimo 3 caracteres
- CRM: obrigatório

**Alterar Senha:**
- Nova senha: mínimo 6 caracteres
- Confirmação deve ser igual à nova senha
- Feedback visual de sucesso/erro com toast

## Segurança

- Atualização de senha usa `supabase.auth.updateUser()` que valida a sessão
- Tabela `profiles` já tem RLS: usuário só edita seu próprio registro
- Não é necessário pedir senha atual (Supabase valida o token)
