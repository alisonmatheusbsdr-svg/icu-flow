
# Mover o botao "Sair" para o final da lista de acoes no menu mobile

## Problema

O botao "Sair" esta fixo na base do menu lateral, mas em alguns dispositivos ele nao fica visivel. A solucao e move-lo para dentro da area de acoes, como ultimo item da lista.

## Alteracao

### `src/components/dashboard/MobileNav.tsx`

1. Remover o bloco separado do botao "Sair" (o `div` com `border-t mt-auto` nas linhas ~207-216)
2. Adicionar o botao "Sair" como ultimo item dentro da area de acoes (`div` com `flex-1 p-4 space-y-2 overflow-y-auto`), apos um `Separator`
3. Remover o container externo com `min-h` ou `h` fixo, ja que nao ha mais necessidade de fixar o botao na base

A estrutura ficara:

```text
+-------------------------+
| Sinapse | UTI           |
+-------------------------+
| Avatar + Nome + Role    |
| Badges de status        |
+-------------------------+
| Unidade (select)        |
+-------------------------+
| Liberar para Passagem   |
| ----------------------- |
| Meu Perfil              |
| Administracao           |
| Equipe                  |
| ----------------------- |
| Sair                    |  <-- ultimo item da lista
+-------------------------+
```
