
# Plano: Adicionar Funcionalidade de Deletar Membro da Equipe

## Contexto

Atualmente o sistema permite:
- **Aceitar**: Aprovar cadastro pendente
- **Rejeitar**: Negar cadastro pendente  
- **Revogar**: Mudar status de aprovado para rejeitado

Falta a opção de **deletar permanentemente** um usuário do sistema.

## Requisitos de Segurança

| Papel | Pode deletar |
|-------|-------------|
| Admin | Qualquer usuário (exceto a si mesmo) |
| Coordenador | Apenas plantonistas e diaristas |

## Arquitetura da Solução

### 1. Nova Edge Function: `delete-user`

Necessária porque deletar usuários do Supabase Auth requer a `service_role_key`, que não pode ser exposta no frontend.

A função irá:
1. Verificar se o usuário solicitante é Admin ou Coordenador
2. Se Coordenador, verificar se o usuário-alvo é plantonista/diarista
3. Impedir auto-exclusão
4. Deletar registros relacionados (user_roles, user_units, active_sessions)
5. Deletar profile
6. Deletar usuário do auth.users

### 2. Diálogo de Confirmação

Criar componente `DeleteUserDialog` com:
- Aviso sobre ação irreversível
- Nome do usuário a ser deletado
- Botão de confirmação com texto "Excluir permanentemente"

### 3. Integração nos Componentes

**Arquivos a modificar:**
- `src/components/team/TeamUserManagement.tsx` - Adicionar função e botão de deletar
- `src/components/team/TeamUserCard.tsx` - Adicionar botão de deletar no card mobile

**Arquivos a criar:**
- `supabase/functions/delete-user/index.ts` - Edge function para deletar
- `src/components/team/DeleteUserDialog.tsx` - Diálogo de confirmação

## Detalhes Técnicos

### Edge Function: delete-user

```typescript
// Fluxo principal:
1. Validar token JWT do solicitante
2. Verificar papel (admin ou coordenador)
3. Buscar dados do usuário-alvo
4. Validar permissões (coordenador só deleta plantonista/diarista)
5. Impedir auto-exclusão
6. Deletar em cascata:
   - user_roles
   - user_units  
   - active_sessions
   - print_logs (SET NULL)
   - profiles
   - auth.users (via Admin API)
7. Retornar sucesso
```

### Interface do Botão

O botão "Excluir" aparecerá:
- Para **usuários rejeitados** (já não têm acesso, faz sentido limpar)
- Para **qualquer usuário** (Admin sempre, Coordenador conforme permissão)

Posicionamento: Junto aos outros botões de ação, com ícone de lixeira e cor vermelha.

### Diálogo de Confirmação

```text
┌─────────────────────────────────────────┐
│  ⚠️ Excluir Usuário                     │
├─────────────────────────────────────────┤
│                                         │
│  Tem certeza que deseja excluir         │
│  permanentemente o usuário:             │
│                                         │
│  Dr. João Silva (CRM: 12345-SP)         │
│                                         │
│  Esta ação não pode ser desfeita.       │
│  O usuário perderá acesso ao sistema    │
│  e precisará se cadastrar novamente.    │
│                                         │
│         [Cancelar]  [Excluir]           │
└─────────────────────────────────────────┘
```

## Fluxo do Usuário

```text
1. Coordenador vê lista de equipe
2. Clica no ícone de lixeira (🗑️) em um plantonista
3. Diálogo de confirmação aparece
4. Confirma a exclusão
5. Edge function executa a deleção
6. Lista atualiza automaticamente
7. Toast de sucesso exibido
```

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/delete-user/index.ts` | Criar edge function |
| `src/components/team/DeleteUserDialog.tsx` | Criar diálogo de confirmação |
| `src/components/team/TeamUserManagement.tsx` | Adicionar função e integrar diálogo |
| `src/components/team/TeamUserCard.tsx` | Adicionar botão de deletar (mobile) |

## Considerações de Segurança

- Edge function valida papel do solicitante no servidor
- Coordenador não pode deletar coordenadores, NIR ou admins
- Usuário não pode deletar a si mesmo
- Todas as ações são logadas no console da edge function
- Deleção em cascata garante limpeza completa dos dados

## Resultado Esperado

1. Novo botão "Excluir" visível na lista de usuários
2. Diálogo de confirmação antes de deletar
3. Usuário removido completamente do sistema
4. Interface atualizada automaticamente após exclusão
