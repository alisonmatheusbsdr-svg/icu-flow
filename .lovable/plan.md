
# Plano: Sincronizar Gestao de Usuarios entre Admin e Coordenador

## Problemas Atuais

1. **Admin nao consegue excluir usuarios** - A tela de Admin (`/admin`) nao tem botao de exclusao, embora a edge function `delete-user` ja suporte admins
2. **Coordenador nao consegue atribuir funcoes nem unidades** - A tela do Coordenador (`/equipe`) nao tem o dropdown de funcao nem os checkboxes de unidades
3. **Edge function retorna unidades apenas para Admin** - Coordenadores nao recebem a lista `allUnits`, impossibilitando a interface de unidades
4. **RLS bloqueia coordenadores** - As tabelas `user_roles` e `user_units` so permitem escrita por admins

## Solucao

Unificar a experiencia: ambos os perfis verao a mesma interface completa, com restricoes de permissao adequadas no backend.

## Alteracoes

### 1. Migracao SQL - Novas politicas RLS

Adicionar 3 novas politicas:

**`user_roles`** - Coordenadores podem gerenciar roles de plantonistas/diaristas:
```sql
CREATE POLICY "Coordenadores podem gerenciar roles de plantonistas e diaristas"
ON public.user_roles FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'coordenador') AND 
  role IN ('plantonista', 'diarista')
)
WITH CHECK (
  has_role(auth.uid(), 'coordenador') AND 
  role IN ('plantonista', 'diarista')
);
```

**`user_units`** - Coordenadores podem gerenciar unidades de plantonistas/diaristas:
```sql
CREATE POLICY "Coordenadores podem gerenciar unidades"
ON public.user_units FOR ALL TO authenticated
USING (has_role(auth.uid(), 'coordenador'))
WITH CHECK (has_role(auth.uid(), 'coordenador'));
```

**`units`** - Coordenadores podem ver todas as unidades (para popular os checkboxes):
```sql
CREATE POLICY "Coordenadores podem ver todas as unidades"
ON public.units FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'coordenador'));
```

### 2. Edge Function `get-users-with-email`

Alterar para retornar `allUnits` tambem para coordenadores (atualmente so retorna para admins na linha 123-135).

### 3. Tela do Admin (`UserManagement.tsx`) - Adicionar exclusao

- Importar `DeleteUserDialog` e `Trash2`
- Adicionar estado para controle do dialog de exclusao
- Adicionar logica `canDeleteUser` e `handleDeleteClick` / `handleDeleteConfirm`
- Adicionar botao de exclusao na tabela desktop e no `UserCard` mobile

### 4. Tela do Coordenador (`TeamUserManagement.tsx`) - Adicionar funcao e unidades

- Adicionar estado `allUnits` (vindo do endpoint)
- Adicionar funcoes `updateUserRole` e `toggleUserUnit`
- Adicionar coluna "Unidades" na tabela desktop com checkboxes
- Adicionar dropdown de funcao (restrito a Plantonista/Diarista)
- Na tabela desktop: adicionar colunas "Funcao" e "Unidades"

### 5. Card mobile do Coordenador (`TeamUserCard.tsx`) - Adicionar funcao e unidades

- Adicionar props para `allUnits`, `roles`, `onUpdateRole`, `onToggleUnit`
- Adicionar dropdown de funcao e checkboxes de unidades no card expandido (similar ao `UserCard` do admin)

### 6. Card mobile do Admin (`UserCard.tsx`) - Adicionar exclusao

- Adicionar props `canDeleteUser` e `onDeleteUser`
- Adicionar botao de exclusao

## Restricoes de Seguranca Mantidas

| Acao | Admin | Coordenador |
|------|-------|-------------|
| Ver usuarios | Todos | Apenas plantonistas, diaristas e sem funcao |
| Alterar funcao | Qualquer funcao | Apenas Plantonista ou Diarista |
| Vincular unidades | Qualquer usuario | Apenas plantonistas/diaristas |
| Excluir usuarios | Qualquer (exceto si mesmo) | Apenas plantonistas/diaristas |
| Aprovar/rejeitar | Todos | Apenas plantonistas/diaristas |

## Arquivos Modificados

| Arquivo | Acao |
|---------|------|
| Migracao SQL | 3 novas politicas RLS |
| `supabase/functions/get-users-with-email/index.ts` | Retornar `allUnits` para coordenadores |
| `src/components/admin/UserManagement.tsx` | Adicionar botao e dialog de exclusao |
| `src/components/admin/UserCard.tsx` | Adicionar botao de exclusao no mobile |
| `src/components/team/TeamUserManagement.tsx` | Adicionar dropdown funcao + checkboxes unidades |
| `src/components/team/TeamUserCard.tsx` | Adicionar funcao + unidades no card mobile |
