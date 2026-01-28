
# Plano: Corrigir Botão "Sair" não aparecendo no MobileNav

## Diagnóstico

O botão "Sair" **existe no código** (linhas 282-292 do MobileNav.tsx), mas não está aparecendo na tela. O problema é um erro de layout CSS:

```
Estrutura atual:
SheetContent
  └── SheetHeader (altura fixa)
  └── div.flex.flex-col.h-full  ← PROBLEMA: h-full não funciona corretamente aqui
      └── User Info (altura fixa)
      └── Unit Selection (altura fixa)
      └── Actions (flex-1)
      └── Logout (mt-auto)  ← Está fora da área visível
```

O `h-full` no container interno não calcula corretamente a altura porque o `SheetContent` não tem altura definida explicitamente - ele é calculado pelo conteúdo.

---

## Solução

Alterar a estrutura para usar uma altura calculada com `calc()` ou ajustar o layout para garantir que o botão de logout fique sempre visível no final do drawer.

### Alteração Proposta

**Arquivo:** `src/components/dashboard/MobileNav.tsx`

**Mudanças:**

1. Adicionar altura explícita ao container para caber na viewport
2. Ajustar o layout para usar `min-h-[calc(100vh-60px)]` onde 60px é aproximadamente a altura do SheetHeader
3. Garantir que a seção de logout fique sempre no final, visível

### Código Atual (Problema)
```tsx
<div className="flex flex-col h-full">
  {/* User Info */}
  <div className="p-4 border-b bg-muted/30">...</div>
  
  {/* Unit Selection */}
  <div className="p-4 border-b">...</div>
  
  {/* Actions */}
  <div className="flex-1 p-4 space-y-2 overflow-y-auto">...</div>
  
  {/* Logout */}
  <div className="p-4 border-t mt-auto">  ← Não aparece
    <Button>Sair</Button>
  </div>
</div>
```

### Código Corrigido
```tsx
<div className="flex flex-col min-h-[calc(100vh-60px)]">
  {/* User Info */}
  <div className="p-4 border-b bg-muted/30">...</div>
  
  {/* Unit Selection */}
  <div className="p-4 border-b">...</div>
  
  {/* Actions */}
  <div className="flex-1 p-4 space-y-2 overflow-y-auto">...</div>
  
  {/* Logout - agora visível */}
  <div className="p-4 border-t mt-auto">
    <Button>Sair</Button>
  </div>
</div>
```

---

## Resumo da Alteração

| Linha | Antes | Depois |
|-------|-------|--------|
| 111 | `className="flex flex-col h-full"` | `className="flex flex-col min-h-[calc(100vh-60px)]"` |

---

## Resultado Esperado

Após a correção:
- O drawer terá altura suficiente para exibir todo o conteúdo
- O botão "Sair" aparecerá fixo na parte inferior do drawer
- A área de ações (Liberar para Passagem, Meu Perfil) terá scroll se necessário
- Layout consistente em todos os tamanhos de tela mobile

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/dashboard/MobileNav.tsx` | Corrigir classe do container de `h-full` para `min-h-[calc(100vh-60px)]` |
