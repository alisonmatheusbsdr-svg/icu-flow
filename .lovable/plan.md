

# Plano: Desconectar Usuario da UTI (Admin/Coordenador)

## Contexto

A politica de seguranca (RLS) ja permite que Admins e Coordenadores deletem qualquer sessao ativa. O que falta e apenas a **interface** para essa acao.

## Onde adicionar

Na pagina **Admin** (`/admin`), na aba "Unidades" (`UnitManagement.tsx`), vamos mostrar quem esta conectado em cada UTI e um botao para desconectar.

Na pagina **Gestao** (`/equipe`), adicionar uma nova aba "Sessoes" para que Coordenadores tambem possam ver e encerrar sessoes.

## Alteracoes

### 1. Componente: `src/components/admin/ActiveSessionsCard.tsx` (novo)

Componente reutilizavel que:
- Busca sessoes ativas (tabela `active_sessions`) com join no `profiles` (nome) e `units` (nome da UTI)
- Filtra sessoes expiradas (> 30 min sem atividade)
- Lista cada sessao mostrando: nome do usuario, UTI, tempo conectado, status (bloqueante/visualizando/passagem)
- Botao "Desconectar" ao lado de cada sessao
- Confirmacao via AlertDialog antes de desconectar
- Ao confirmar, faz `DELETE` na `active_sessions` pelo `id` da sessao (ja permitido pela RLS)
- Subscription em realtime para atualizar automaticamente

### 2. Modificar: `src/components/admin/UnitManagement.tsx`

Importar e renderizar o `ActiveSessionsCard` acima da lista de unidades.

### 3. Modificar: `src/pages/TeamManagement.tsx`

Adicionar uma nova aba "Sessoes" com o mesmo componente `ActiveSessionsCard`.

## Fluxo do Usuario

```text
1. Admin/Coordenador acessa Admin ou Gestao
2. Ve card "Sessoes Ativas" com lista de quem esta conectado
3. Clica "Desconectar" ao lado de um usuario
4. Confirma no dialog: "Desconectar [Nome] da [UTI]?"
5. Sessao e deletada do banco
6. Plantonista desconectado vera que perdeu acesso na proxima interacao
```

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/admin/ActiveSessionsCard.tsx` | Criar componente de sessoes ativas |
| `src/components/admin/UnitManagement.tsx` | Adicionar card de sessoes |
| `src/pages/TeamManagement.tsx` | Adicionar aba "Sessoes" |

## Seguranca

- A RLS ja existe: "Admins can delete any session" permite `DELETE` para `admin` e `coordenador`
- Nenhuma migracao necessaria
- O componente usa o client Supabase autenticado, entao a RLS e respeitada automaticamente

