

# Melhorar Adição de Comorbidades: Input + Botão Adicionar

## Problema

Hoje o campo "Outras comorbidades" é um texto livre onde o usuário precisa separar por vírgulas manualmente. Isso gera erros e dificuldade.

## Solução

Substituir o campo de texto livre por um sistema de **input + botão "Adicionar"**. Cada comorbidade adicionada aparece como um badge removível (com X), igual aos botões de comorbidades comuns já existentes.

## Experiência do Usuário

```text
┌─────────────────────────────────────────┐
│ Comorbidades                            │
│                                         │
│ [HAS] [DM] [DAC] [DPOC] [ASMA] ...     │  ← botões toggle (já existem)
│                                         │
│ [Obesidade ×] [Hipotireoidismo ×]       │  ← badges removíveis (novo)
│                                         │
│ [___________________] [+ Adicionar]     │  ← input + botão (novo)
└─────────────────────────────────────────┘
```

- Usuário digita a comorbidade no campo e clica "Adicionar" (ou pressiona Enter)
- A comorbidade aparece como badge removível acima do campo
- Clicar no X do badge remove a comorbidade
- Na submissão, tudo é unido em string separada por vírgula (compatível com o banco atual)

## Arquivos a Modificar

| Arquivo | Alteração |
|---|---|
| `src/components/dashboard/AdmitPatientForm.tsx` | Substituir input de texto livre por input + botão + badges removíveis |
| `src/components/patient/EditPatientDialog.tsx` | Mesma alteração; ajustar parse de comorbidades existentes para popular array de "outras" |

## Detalhes Técnicos

- `otherComorbidities` muda de `string` para `string[]` (array)
- Novo estado `newComorbidity` (string) para o campo de input
- Função `addComorbidity`: push no array se não vazio e não duplicado
- Função `removeComorbidity`: filter do array
- Na submissão: `[...selectedComorbidities, ...otherComorbidities].filter(Boolean).join(', ')`
- `parseExistingComorbidities` no EditPatientDialog já separa "others" como string; mudar para retornar array
- Enter no input dispara `addComorbidity` (previne submit do form)

