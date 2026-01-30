

# Plano: Melhorar Visibilidade do Botão "Editar" no Plano Terapêutico

## Problema

O botão "Editar" está com baixa visibilidade porque:
- Usa `variant="ghost"` (sem fundo, apenas texto)
- Cor do texto é `warning` (amarelo)
- Fundo da seção é `warning/10` (amarelo claro)
- Resultado: texto amarelo em fundo amarelo = quase invisível

```text
┌─────────────────────────────────────────────┐
│ 📄 Plano Terapêutico            [Editar]   │  ← Botão quase invisível
│                                              │     (amarelo em amarelo)
│ Conteúdo do plano...                         │
└─────────────────────────────────────────────┘
```

## Solução

Trocar o estilo do botão para ter mais contraste visual mantendo a identidade da seção:

### Opção Proposta: Botão com fundo warning

```tsx
<Button 
  variant="outline" 
  size="sm" 
  onClick={() => {
    setNewPlan(currentPlan?.content || '');
    setIsPlanEditing(true);
  }}
  className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
>
  <Edit2 className="h-3.5 w-3.5 mr-1" />
  Editar
</Button>
```

### Mudanças Visuais

| Antes | Depois |
|-------|--------|
| `variant="ghost"` | `variant="outline"` |
| Sem borda | Borda amarela visível |
| Sem ícone | Ícone de lápis para reforço visual |
| Hover discreto | Hover com fundo amarelo sólido |

### Visual Esperado

```text
┌─────────────────────────────────────────────┐
│ 📄 Plano Terapêutico     [ ✏️ Editar ]     │  ← Botão com borda
│                                              │     e ícone visível
│ Conteúdo do plano...                         │
└─────────────────────────────────────────────┘
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/patient/TherapeuticPlan.tsx` | Mudar estilo do botão "Editar" |

## Código Final

```tsx
// Linha 56-67 atual:
{canEditPlan && !isPlanEditing && (
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={() => { ... }}
    className="text-[hsl(var(--warning))] hover:text-[hsl(var(--warning))]"
  >
    Editar
  </Button>
)}

// Novo:
{canEditPlan && !isPlanEditing && (
  <Button 
    variant="outline" 
    size="sm" 
    onClick={() => { ... }}
    className="border-warning text-warning hover:bg-warning hover:text-warning-foreground gap-1"
  >
    <Edit2 className="h-3.5 w-3.5" />
    Editar
  </Button>
)}
```

## Resultado

- Botão claramente visível com borda amarela
- Ícone de lápis reforça a ação
- Hover com feedback visual (fundo amarelo sólido)
- Mantém identidade visual da seção (cores warning)

