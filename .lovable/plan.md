

# Plano: Corrigir Dois Botões "X" nos Modais de Impressão

## Problema

Os modais de impressão exibem **dois ícones "X"** no canto superior direito:

| Origem | Localização |
|--------|-------------|
| `DialogContent` (automático) | `src/components/ui/dialog.tsx` linha 45-48 |
| Botão manual | Header customizado dos modais de impressão |

```text
┌─────────────────────────────────────────────────────────────────┐
│ Preview de Impressão - UTI 1     [Imprimir]  [X]  [X] ← DUPLICADOS
├─────────────────────────────────────────────────────────────────┤
```

## Solução

Remover o botão X manual dos modais de impressão, mantendo apenas o X automático do `DialogContent`.

## Arquivos a Modificar

### 1. `src/components/print/UnitPrintPreviewModal.tsx`

**Remover linhas 422-424:**

```tsx
// REMOVER este bloco
<Button variant="ghost" size="icon" onClick={onClose}>
  <X className="h-4 w-4" />
</Button>
```

**Também remover o import `X` se não for usado em outro lugar.**

### 2. `src/components/print/PrintPreviewModal.tsx`

**Remover linhas 288-290:**

```tsx
// REMOVER este bloco
<Button variant="ghost" size="icon" onClick={onClose}>
  <X className="h-4 w-4" />
</Button>
```

**Também remover o import `X` do lucide-react.**

## Resultado Esperado

```text
┌─────────────────────────────────────────────────────────────────┐
│ Preview de Impressão - UTI 1     [Imprimir Atual] [Imprimir Todos]  [X]
├─────────────────────────────────────────────────────────────────┤
```

Apenas um botão X visível, fornecido automaticamente pelo componente `DialogContent`.

---

## Seção Técnica

### Alterações Detalhadas

**UnitPrintPreviewModal.tsx:**
- Linha 4: Remover `X` do import de lucide-react
- Linhas 422-424: Remover o `<Button>` com ícone X

**PrintPreviewModal.tsx:**
- Linha 4: Remover `X` do import de lucide-react
- Linhas 288-290: Remover o `<Button>` com ícone X

### Comportamento Mantido

O X automático do `DialogContent` já:
- Fecha o modal ao ser clicado
- Dispara `onOpenChange(false)` que chama `onClose()`
- Possui styling e acessibilidade adequados

