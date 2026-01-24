

# Plano: Corrigir Sobreposição de Elementos no Modal de Impressão

## Problema

O botão X automático do `DialogContent` está posicionado com `absolute right-4 top-4`, sobrepondo-se aos botões de impressão no header customizado do modal.

```
┌─────────────────────────────────────────────────────────────────┐
│ Preview de Impressão    [Imprimir Atual] [Imprimir Todos] [X]  │
│                                          ↑ SOBREPOSIÇÃO ↑      │
└─────────────────────────────────────────────────────────────────┘
│                [Anterior]    Leito 5    [Próximo]              │
└─────────────────────────────────────────────────────────────────┘
```

## Causa

O componente `DialogContent` adiciona automaticamente um botão X com posição absoluta:

```tsx
// dialog.tsx linha 45-48
<DialogPrimitive.Close className="absolute right-4 top-4 ...">
  <X className="h-4 w-4" />
</DialogPrimitive.Close>
```

Quando usamos `p-0` no DialogContent e criamos um header customizado com botões, o X absoluto fica por cima de tudo.

## Solução

Reorganizar o header para acomodar o botão X automático, adicionando espaço à direita (padding) para que os botões de impressão não fiquem embaixo do X.

## Alteração

### Arquivo: `src/components/print/UnitPrintPreviewModal.tsx`

Modificar o header (linhas 402-423) para adicionar `pr-12` (padding-right de 48px) que acomoda o botão X automático:

```tsx
{/* Header */}
<div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50 pr-12">
  <h2 className="text-lg font-semibold">Preview de Impressão - {unitName}</h2>
  <div className="flex items-center gap-2">
    {/* Botões de impressão ficam com espaço antes do X */}
  </div>
</div>
```

### Arquivo: `src/components/print/PrintPreviewModal.tsx`

Aplicar a mesma correção no outro modal de impressão.

## Resultado Esperado

```
┌─────────────────────────────────────────────────────────────────────┐
│ Preview de Impressão    [Imprimir Atual] [Imprimir Todos]       [X]│
│                                                          espaço ↑  │
└─────────────────────────────────────────────────────────────────────┘
```

Os botões de impressão ficam visíveis e o X fica isolado no canto superior direito sem sobreposição.

