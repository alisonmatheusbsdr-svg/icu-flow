

# Plano: Permitir que Coordenadores Aprovem Cadastros da Equipe Assistencial

## Objetivo

Permitir que usuários com role **coordenador** possam aprovar/rejeitar cadastros de **plantonistas** e **diaristas**, sem acesso a gerenciar coordenadores, NIR ou admins.

---

## Regras de Negócio

| Ator | Pode gerenciar |
|------|----------------|
| **Admin** | Todos os usuários (plantonista, diarista, nir, coordenador, admin) |
| **Coordenador** | Apenas plantonista e diarista |
| **Outros** | Nenhum acesso à gestão de usuários |

### O que "gerenciar" significa para o coordenador:
- Aprovar ou rejeitar cadastros pendentes
- Visualizar lista de usuários (apenas plantonistas e diaristas)
- **NÃO** pode alterar roles (isso seria escalação de privilégio)
- **NÃO** pode atribuir unidades (isso fica com admin)

---

## Implementação

### 1. Atualizar Edge Function `get-users-with-email`

**Arquivo:** `supabase/functions/get-users-with-email/index.ts`

Alterar a lógica de autorização para aceitar coordenadores, mas filtrar os dados:

```typescript
// Verificar se é admin OU coordenador
const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
  _user_id: userId,
  _role: "admin",
});

const { data: isCoordenador } = await supabaseAdmin.rpc("has_role", {
  _user_id: userId,
  _role: "coordenador",
});

if (!isAdmin && !isCoordenador) {
  return new Response(
    JSON.stringify({ error: "Forbidden" }),
    { status: 403, ... }
  );
}

// Se for coordenador (não admin), filtrar apenas plantonistas e diaristas
const allowedRoles = isCoordenador && !isAdmin 
  ? ['plantonista', 'diarista'] 
  : null; // null = sem filtro (admin vê tudo)

// Filtrar usuários retornados
const filteredUsers = allowedRoles 
  ? usersWithEmail.filter(u => 
      u.roles.some(r => allowedRoles.includes(r)) || 
      u.roles.length === 0 // usuários sem role ainda
    )
  : usersWithEmail;
```

---

### 2. Criar Nova RLS Policy para Profiles (UPDATE por Coordenador)

**Migração SQL:**

```sql
-- Permitir coordenadores atualizarem approval_status de plantonistas/diaristas
CREATE POLICY "Coordenadores podem aprovar plantonistas e diaristas"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- O coordenador só pode atualizar profiles de usuários que são plantonistas ou diaristas
  public.has_role(auth.uid(), 'coordenador') 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = profiles.id 
    AND ur.role IN ('plantonista', 'diarista')
  )
)
WITH CHECK (
  -- Mesma condição no WITH CHECK
  public.has_role(auth.uid(), 'coordenador') 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = profiles.id 
    AND ur.role IN ('plantonista', 'diarista')
  )
);

-- Permitir coordenadores verem profiles de plantonistas e diaristas
CREATE POLICY "Coordenadores podem ver perfis de plantonistas e diaristas"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'coordenador') 
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = profiles.id 
    AND ur.role IN ('plantonista', 'diarista')
  )
);
```

---

### 3. Criar Nova Página para Coordenadores

**Arquivo:** `src/pages/TeamManagement.tsx`

Nova página acessível para coordenadores em `/equipe`:

```typescript
// Rota: /equipe
// Acesso: coordenador OU admin
// Funcionalidades:
//   - Listar usuários pendentes (plantonistas/diaristas)
//   - Aprovar/rejeitar cadastros
//   - NÃO mostra: selector de role, atribuição de unidades
```

---

### 4. Criar Componente de Gestão Simplificada

**Arquivo:** `src/components/team/TeamUserManagement.tsx`

Versão simplificada do `UserManagement.tsx` que:
- Mostra apenas plantonistas e diaristas
- Oculta o seletor de role
- Oculta a atribuição de unidades
- Permite apenas aprovar/rejeitar

---

### 5. Atualizar Navegação

**Arquivo:** `src/components/dashboard/DashboardHeader.tsx`

Adicionar botão para coordenadores acessarem a gestão de equipe:

```tsx
{!isOnAdmin && hasRole('coordenador') && !hasRole('admin') && (
  <Button variant="outline" size="sm" onClick={() => navigate('/equipe')} className="gap-2">
    <Users className="h-4 w-4" />
    Equipe
  </Button>
)}
```

**Arquivo:** `src/components/dashboard/MobileNav.tsx`

Adicionar item de menu para coordenadores no drawer mobile.

---

### 6. Atualizar Rotas

**Arquivo:** `src/App.tsx`

Adicionar rota protegida:

```tsx
<Route path="/equipe" element={<TeamManagement />} />
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/TeamManagement.tsx` | Página de gestão de equipe para coordenadores |
| `src/components/team/TeamUserManagement.tsx` | Componente de listagem/aprovação simplificado |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/get-users-with-email/index.ts` | Aceitar coordenadores e filtrar dados |
| `src/components/dashboard/DashboardHeader.tsx` | Botão "Equipe" para coordenadores |
| `src/components/dashboard/MobileNav.tsx` | Menu "Equipe" para coordenadores em mobile |
| `src/App.tsx` | Adicionar rota `/equipe` |

---

## Migração de Banco de Dados

Novas RLS policies para permitir que coordenadores:
1. Visualizem profiles de plantonistas/diaristas
2. Atualizem approval_status de plantonistas/diaristas

---

## Segurança

| Verificação | Local |
|-------------|-------|
| Autorização no backend | Edge function verifica role antes de retornar dados |
| Filtro de dados | Coordenadores só recebem dados de plantonistas/diaristas |
| RLS no banco | Políticas impedem UPDATE em profiles de coordenadores/admins |
| Sem acesso a roles | Coordenadores não podem alterar roles (não há policy para isso) |
| Sem acesso a unidades | Coordenadores não podem atribuir unidades (não há policy para isso) |

---

## Fluxo do Coordenador

```text
1. Login como coordenador
2. Clica em "Equipe" no header
3. Vê lista de plantonistas e diaristas
4. Vê usuários pendentes em destaque
5. Clica em Aprovar/Rejeitar
6. Sistema atualiza via RLS (backend valida)
```

---

## Resultado Esperado

- **Coordenadores**: Podem aprovar equipe assistencial rapidamente
- **Admins**: Mantêm controle total sobre coordenadores e configurações
- **Segurança**: Não há escalação de privilégios - coordenadores não podem se promover ou promover outros

