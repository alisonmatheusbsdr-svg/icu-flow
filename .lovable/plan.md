
## Plano: Sistema de Impressão de Documentos UTI

### Visão Geral

Criar um sistema de impressão em formato **paisagem** que condense todas as informações clínicas de um paciente em uma única página, com suporte para impressão individual e de toda a UTI.

---

### Layout do Documento (Paisagem A4)

```text
+-------------------------------------------------------------------------------------------+
|  LEITO 05 | A.B.C. | 65a | D12                                                            |
+-------------------------------------------------------------------------------------------+
|  PLANO TERAPÊUTICO: Desmame ventilatório. Alta para enfermaria se manter estabilidade... |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  DISPOSITIVOS         | ACESSOS VENOSOS       | DVA              | SUPORTE RESP          |
|  ☑ SNE (D8)          | CVC Jugular (D5)      | Nora 10ml/h      | TOT D7                 |
|  ☑ SVD (D12)         | AVP MSE (D2)          | 0.15µg/kg/min    | PEEP 10, FiO2 40%      |
|  ☑ PAI (D3)          |                       |                  | VM: PSV                |
|                       |                       |                  |                        |
+-------------------------------------------------------------------------------------------+
|  ANTIBIÓTICOS                    | PROFILAXIAS              | DIETA                      |
|  Meropenem D5  |  Vancomicina D3 | TEV | LPP (Alto)          | SNE                        |
|                                  | Cabeceira elevada        |                            |
+-------------------------------------------------------------------------------------------+
|  PRECAUÇÕES: 🔴 Sepse | 🟡 LPP (Alto) | 🟣 Aerossóis                                      |
+-------------------------------------------------------------------------------------------+
|  PENDÊNCIAS: ☐ Solicitar TC crânio | ☐ Avaliar troca de ATB | ☑ Colher HMC (realizado)  |
+-------------------------------------------------------------------------------------------+
|                                                                                           |
|  📋 RESUMO (IA): Paciente em desmame ventilatório após 7 dias de IOT por SDRA.           |
|  Melhora progressiva, redução de FiO2 e parâmetros. Aguardando resolução infecciosa.     |
|                                                                                           |
|  📝 ÚLTIMA EVOLUÇÃO (24/01 14:30 - Dr. João):                                            |
|  Estável. Em PSV com boa tolerância. Gasometria sem alterações...                        |
|                                                                                           |
|  📝 PENÚLTIMA EVOLUÇÃO (24/01 08:00 - Dr. Maria):                                        |
|  Mantém parâmetros. Reduzido FiO2 de 50% para 40%...                                     |
+-------------------------------------------------------------------------------------------+
```

---

### Fluxo de Impressão

1. **Impressão Individual (Modal do Paciente)**
   - Botão "Imprimir" no header do modal
   - Gera documento apenas daquele paciente

2. **Impressão de Toda UTI (Dashboard)**
   - Botão "Imprimir UTI" no header da unidade
   - Gera documento com todos os leitos ocupados
   - Cada leito em uma página separada (page-break)

---

### Arquitetura Técnica

#### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/components/print/PrintPatientSheet.tsx` | Componente de layout para impressão de um paciente |
| `src/components/print/PrintableUnitDocument.tsx` | Wrapper que agrupa múltiplos pacientes para impressão em lote |
| `src/components/print/print-styles.css` | Estilos CSS específicos para impressão |
| `supabase/functions/summarize-evolutions/index.ts` | Edge function que usa IA para resumir evoluções |

#### Modificações

| Arquivo | Mudança |
|---------|---------|
| `src/components/patient/PatientModal.tsx` | Adicionar botão "Imprimir" |
| `src/components/dashboard/BedGrid.tsx` | Adicionar botão "Imprimir UTI" no header |
| `src/index.css` | Importar estilos de impressão |

---

### Detalhes de Implementação

#### 1. PrintPatientSheet Component

Componente React que renderiza o layout condensado:

```tsx
interface PrintPatientSheetProps {
  patient: PatientWithDetails;
  bedNumber: number;
  evolutionSummary?: string;
  isLoadingSummary?: boolean;
}
```

**Seções:**
- Header: Leito, Iniciais, Idade, Dias de internação
- Plano Terapêutico (destaque)
- Grid de dados clínicos (4 colunas):
  - Dispositivos com dias (D{n})
  - Acessos venosos com dias
  - Drogas vasoativas com dose
  - Suporte respiratório
- Segunda linha (3 colunas):
  - Antibióticos com dias
  - Profilaxias
  - Dieta
- Precauções (badges coloridos)
- Pendências (checkboxes)
- Evoluções:
  - Resumo IA (se disponível)
  - 2 últimas evoluções na íntegra

#### 2. Edge Function: summarize-evolutions

Usa a API Lovable AI (Gemini) para gerar resumo contextualizado:

```typescript
// Prompt otimizado para contexto clínico
const prompt = `
Você é um médico intensivista. Resuma as evoluções clínicas abaixo em no máximo 3 linhas,
focando em: diagnóstico atual, tendência clínica, e próximos passos.
Evoluções:
${evolutions.map(e => e.content).join('\n---\n')}
`;
```

- Usa modelo `google/gemini-2.5-flash` (rápido e econômico)
- Cache do resumo por 1 hora (localStorage)
- Fallback: mostrar apenas últimas evoluções se IA falhar

#### 3. CSS de Impressão

```css
@media print {
  /* Esconder elementos não-impressos */
  .no-print, header, nav, footer { display: none !important; }
  
  /* Configuração de página paisagem */
  @page { 
    size: A4 landscape; 
    margin: 10mm; 
  }
  
  /* Cada paciente em página separada */
  .print-patient-sheet { 
    page-break-after: always; 
  }
  
  /* Tipografia otimizada para impressão */
  body { 
    font-size: 10pt;
    line-height: 1.3;
    color: black !important;
  }
}
```

#### 4. Fluxo de Impressão

```text
+----------------+     +------------------+     +----------------+
| Clique em      | --> | Carrega dados    | --> | Chama Edge     |
| "Imprimir UTI" |     | completos        |     | Function IA    |
+----------------+     +------------------+     +----------------+
                                                       |
                                                       v
+----------------+     +------------------+     +----------------+
| window.print() | <-- | Renderiza        | <-- | Recebe resumo  |
|                |     | PrintableDoc     |     | das evoluções  |
+----------------+     +------------------+     +----------------+
```

---

### Tratamento de Evoluções Extensas

| Cenário | Comportamento |
|---------|---------------|
| 0 evoluções | "Sem evoluções registradas" |
| 1-2 evoluções | Mostrar todas na íntegra |
| 3+ evoluções | Resumo IA + 2 últimas na íntegra |
| IA indisponível | Mostrar apenas 2 últimas (sem resumo) |
| Texto muito longo | Truncar com "..." após ~300 caracteres por evolução |

---

### Ordenação das Informações

1. **Header** (Leito + identificação)
2. **Plano Terapêutico** (destaque amarelo)
3. **Dados Clínicos** (grid compacto)
4. **Precauções + Pendências**
5. **Evoluções** (resumo + últimas)

---

### Considerações de UX

- **Loading State**: Mostrar spinner enquanto gera resumo IA
- **Botão Print**: Desabilitado até resumo carregar (com timeout de 10s)
- **Preview**: Ao clicar, abre nova aba com layout de impressão (opcional)
- **Fallback Gracioso**: Se IA falhar, continua com impressão sem resumo

---

### Estimativa de Complexidade

| Item | Esforço |
|------|---------|
| PrintPatientSheet (layout) | Médio |
| Edge Function IA | Baixo |
| Integração com Modal | Baixo |
| Integração com BedGrid | Médio |
| CSS de impressão | Baixo |
| **Total** | **~4-5 iterações** |
