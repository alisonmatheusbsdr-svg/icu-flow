

# Alinhar Containers HD e Comorbidades + Melhorar Visibilidade

## Problema

O badge de HD (Hipótese Diagnóstica) e o container de comorbidades têm estilos visuais diferentes — o HD é um badge solto e o container de comorbidades tem borda mas com cores muito apagadas (`bg-muted/20`, `text-muted-foreground`), dificultando a leitura.

## Solução

1. **Envolver o badge HD em um container similar** ao de comorbidades, com borda e label, para manter consistência visual entre os dois grupos
2. **Aumentar contraste dos badges de comorbidades** — trocar `bg-muted text-muted-foreground` por `bg-secondary text-foreground` para que fiquem mais legíveis
3. **Ajustar o container de comorbidades** — usar `border-border` (mais visível que `border-border/60`) e `bg-muted/40` (mais presente que `/20`)

### Visual proposto

```text
┌ HD ──────┐   ┌ COMORBIDADES ─────────────────────────┐   [PAL]
│  Sepse   │   │  HAS   DM   Obesidade   Hipotireoidismo │
└──────────┘   └───────────────────────────────────────────┘
```

Ambos os containers com o mesmo padrão visual: borda sutil, label uppercase pequeno, badges internos com bom contraste.

## Arquivo a Modificar

| Arquivo | Alteração |
|---|---|
| `src/components/patient/PatientModal.tsx` | Linhas 374-390: envolver HD em container com label; aumentar contraste dos badges de comorbidades |

## Detalhes Técnicos

Na seção de badges (linhas 374-390):

1. **HD container**: Envolver o badge de diagnóstico em um `div` com as mesmas classes do container de comorbidades, com label "HD" em `text-[10px] uppercase`. O badge interno usa `bg-destructive text-destructive-foreground` (mantém a cor vermelha que já identifica diagnóstico)
2. **Comorbidades container**: 
   - Container: trocar `border-border/60 bg-muted/20` por `border-border bg-muted/40`
   - Badges internos: trocar `bg-muted text-muted-foreground` por `bg-secondary text-secondary-foreground` para melhor legibilidade
3. Ambos os containers com `flex-shrink-0` para manter integridade no scroll horizontal mobile

