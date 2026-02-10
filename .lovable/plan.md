

# Afastar o botao X do menu de acoes no mobile

## Problema

No mobile, o botao "Acoes" (dropdown) fica sobreposto ao botao X de fechar o modal. No desktop isso nao acontece porque as acoes ficam em uma linha separada.

## Solucao

Adicionar `pr-10` apenas no mobile na div que contem o titulo e o botao "Acoes", usando a classe responsiva `md:pr-0` para nao afetar o desktop.

## Detalhamento tecnico

### `src/components/patient/PatientModal.tsx` (linha ~248)

```
// De:
<div className="flex items-start justify-between gap-2">

// Para:
<div className="flex items-start justify-between gap-2 pr-10 md:pr-0">
```

### Arquivo alterado

- `src/components/patient/PatientModal.tsx` — 1 classe CSS adicionada

