

# Resumo Clínico por IA — Botão ao lado de "Imprimir"

## O que muda para o usuário

- Um novo botão **"Resumo IA"** aparece ao lado do botão "Imprimir" (desktop) e como item no dropdown "Ações" (mobile)
- Ao clicar, a IA recebe todo o contexto clínico do paciente e gera um resumo textual integrado
- O resultado aparece em um Dialog com opção de copiar o texto

## Arquivos a criar/modificar

| Arquivo | Alteração |
|---|---|
| `supabase/functions/summarize-patient/index.ts` | Nova edge function com prompt dedicado ao resumo clínico completo |
| `supabase/config.toml` | Entrada `[functions.summarize-patient]` com `verify_jwt = false` |
| `src/components/patient/PatientModal.tsx` | Botão "Resumo IA" + estados + Dialog de resultado |

## Detalhes Técnicos

### 1. Edge Function `summarize-patient`

Recebe um body com todos os dados clínicos do paciente (já disponíveis no estado do PatientModal):

```typescript
{
  initials, age, weight, admission_date, main_diagnosis, comorbidities,
  diet_type, is_palliative, specialty_team,
  evolutions: [{ content, created_at, clinical_status }],  // só não-canceladas
  devices: ["TOT", "CVC subclávio D"],
  venous_access: ["CVC - Subclávio D - Duplo lúmen"],
  vasoactive_drugs: [{ drug_name, dose_ml_h }],
  antibiotics: ["Meropenem", "Vancomicina"],
  respiratory: { modality, ventilator_mode, fio2, peep, ... },
  precautions: ["Contato", "Aerossol"],
  prophylaxis: ["TVP", "Úlcera de estresse"],
  therapeutic_plan: "texto do plano"
}
```

Prompt: médico intensivista que integra todas as informações num resumo textual corrido de 8-15 linhas, linguagem médica formal, português brasileiro. Usa `google/gemini-3-flash-preview`.

Autenticação e rate limit handling seguem o mesmo padrão das outras functions (getClaims + is_approved + tratamento de 429/402).

### 2. PatientModal — novos estados

```typescript
const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
const [clinicalSummary, setClinicalSummary] = useState<string | null>(null);
const [showSummaryDialog, setShowSummaryDialog] = useState(false);
```

### 3. Função `handleGenerateSummary`

Coleta os dados do `patient` (já carregado), filtra evoluções canceladas, e invoca a edge function. Ao receber resposta, abre o Dialog.

### 4. Botão no Desktop e Mobile

**Desktop (DesktopActions):** Novo botão `variant="outline"` com ícone `Sparkles` inserido imediatamente antes do botão "Imprimir".

**Mobile (MobileActions):** Novo `DropdownMenuItem` antes do item "Imprimir".

### 5. Dialog de resultado

```text
┌────────────────────────────────────────┐
│  Resumo Clínico - IA          [X]     │
│                                        │
│  Paciente JPS, 67 anos, internado há   │
│  12 dias por SDRA secundária a pneu-   │
│  monia comunitária grave...            │
│                                        │
│              [📋 Copiar]  [Fechar]     │
└────────────────────────────────────────┘
```

Usa `Dialog` + `DialogContent` com ScrollArea. Botão "Copiar" usa `navigator.clipboard.writeText`.

