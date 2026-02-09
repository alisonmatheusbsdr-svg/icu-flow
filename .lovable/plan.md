

# Plano: Tornar o botao "Sair" sempre visivel no menu lateral mobile

## Problema

Em alguns dispositivos moveis, o botao "Sair" (Logout) fica abaixo da area visivel do menu lateral. O usuario precisa rolar para baixo para encontra-lo, o que dificulta a descoberta.

## Causa

O container interno do menu usa `min-h-[calc(100vh-60px)]` e o botao "Sair" esta posicionado com `mt-auto`, mas a area de conteudo (`flex-1 overflow-y-auto`) pode empurrar o botao para fora da tela quando ha muitos itens ou em dispositivos com tela menor.

## Solucao

Alterar a estrutura do `MobileNav.tsx` para que a area de acoes tenha rolagem independente, mantendo o botao "Sair" sempre fixo e visivel na base do drawer.

## Alteracoes

### `src/components/dashboard/MobileNav.tsx`

- Trocar `min-h-[calc(100vh-60px)]` por `h-[calc(100vh-60px)]` no container principal, garantindo que ele nunca ultrapasse a tela
- Isso forca o `flex-1 overflow-y-auto` a funcionar corretamente como area rolavel
- O botao "Sair" com `mt-auto` permanece ancorado na base, sempre visivel

Essa e uma mudanca de uma unica classe CSS (`min-h` para `h`) que resolve o problema sem alterar a estrutura dos componentes.

