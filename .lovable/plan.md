

# Plano: Notificacao em Tempo Real ao Ser Desconectado Remotamente

## Problema

Quando um Admin/Coordenador desconecta remotamente um plantonista, a sessao e deletada no banco mas o plantonista nao recebe nenhum aviso -- ele so percebe quando tenta fazer algo e falha.

## Solucao

Adicionar um listener de Realtime no hook `useUnit.tsx` que monitora mudancas na tabela `active_sessions`. Quando detectar que a sessao do usuario foi deletada externamente (por outro usuario), exibir um toast de aviso e redirecionar para a tela de selecao de unidade.

## Alteracoes

### 1. Modificar: `src/hooks/useUnit.tsx`

Dentro do `UnitProvider`, adicionar uma subscription Realtime que escuta eventos `DELETE` na tabela `active_sessions` filtrados pelo `user_id` do usuario logado:

- Quando receber um evento DELETE cujo `old.id` corresponde ao `activeSession.id` atual:
  - Limpar o estado local (`activeSession = null`, `selectedUnit = null`)
  - Disparar um toast com a mensagem: "Sua sessao foi encerrada por questoes de seguranca. Caso ainda esteja no plantao na UTI, conecte-se novamente."

O redirect para `/select-unit` ja acontece automaticamente pelo `Dashboard.tsx` (linha 59), que redireciona plantonistas sem sessao ativa.

**Detalhe tecnico**: Para que o Realtime envie o registro antigo em eventos DELETE, a tabela `active_sessions` precisa ter `REPLICA IDENTITY FULL`. Vou verificar se ja esta configurado; caso contrario, sera necessaria uma migracao simples.

### 2. Verificar/Adicionar migracao (se necessario)

Se a tabela `active_sessions` nao tiver `REPLICA IDENTITY FULL`, criar uma migracao:

```sql
ALTER TABLE public.active_sessions REPLICA IDENTITY FULL;
```

Isso permite que o Realtime envie os dados do registro deletado (incluindo `user_id` e `id`), necessario para filtrar corretamente.

## Fluxo

```text
1. Plantonista esta conectado na UTI, com sessao ativa
2. Admin/Coordenador clica "Desconectar" no painel de sessoes
3. Sessao e deletada do banco
4. Realtime envia evento DELETE para todos os subscribers
5. useUnit detecta que o registro deletado e a sessao do usuario
6. Toast aparece: "Sua sessao foi encerrada por questoes de seguranca..."
7. Estado local e limpo -> Dashboard redireciona para /select-unit
```

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/hooks/useUnit.tsx` | Adicionar subscription Realtime para detectar DELETE da propria sessao e exibir toast |
| Migracao SQL (se necessario) | `ALTER TABLE active_sessions REPLICA IDENTITY FULL` |

## Seguranca

- Nenhuma alteracao de RLS necessaria
- O listener apenas observa eventos -- nao faz nenhuma operacao de escrita
- A mensagem e generica ("questoes de seguranca") para nao expor detalhes de quem desconectou

