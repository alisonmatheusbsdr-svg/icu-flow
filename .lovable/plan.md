

# Criar Container Visual para Comorbidades

## Problema

Atualmente, as comorbidades (HAS, DM, Obesidade, etc.) aparecem como badges soltos na mesma linha dos outros dados, sem nenhum indicativo visual de que pertencem ao grupo "comorbidades". Já a hipótese diagnóstica tem o prefixo "HD:" que a identifica claramente.

## Solução

Envolver os badges de comorbidades em um container sutil com um label "Comorbidades" ou um prefixo visual, mantendo o design limpo e consistente com o restante da interface.

### Visual proposto

```text
Antes:
  [HD: Sepse]  [HAS]  [DM]  [Obesidade]  [Hipotireoidismo]  [PAL]

Depois:
  [HD: Sepse]   ┌ Comorbidades ─────────────────────────┐   [PAL]
                │  HAS   DM   Obesidade   Hipotireoidismo │
                └───────────────────────────────────────────┘
```

O container terá:
- Borda sutil (`border rounded-lg`)
- Label pequeno "Comorbidades" no topo (texto `text-[10px]` ou `text-xs` em `text-muted-foreground`)
- Fundo levemente diferenciado (`bg-muted/30` ou similar)
- Os badges individuais dentro, mantendo o estilo atual

## Arquivo a Modificar

| Arquivo | Alteração |
|---|---|
| `src/components/patient/PatientModal.tsx` | Separar os badges de comorbidades em um container com label, linhas 372-388 |

## Detalhes Técnicos

Na seção de badges (linha 372-388 do `PatientModal.tsx`), reorganizar assim:

1. Manter o badge `HD: ...` fora do container (ele já tem identidade própria)
2. Criar um `div` container para as comorbidades com:
   - Classes: `flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-1`
   - Um `span` label: `text-[10px] uppercase tracking-wide text-muted-foreground font-medium` com texto "Comorbidades"
   - Os badges de comorbidades dentro, com gap reduzido
3. Manter o badge `PAL` fora do container
4. Só renderizar o container se houver comorbidades (`comorbidityList.length > 0`)

Nenhuma mudança no banco de dados ou lógica de dados.

