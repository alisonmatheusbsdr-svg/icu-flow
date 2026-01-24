
# Plano: Otimização do Layout de Impressão e Inclusão de Exames

## Resumo das Alterações

O usuário deseja maximizar o uso do espaço da folha A4 landscape com três melhorias principais:

1. **Mostrar 3 evoluções** (em vez de 2) + resumo IA
2. **Resumo IA com até 6 linhas** (em vez de 3)
3. **Nova seção de exames críticos/selecionados** na impressão

## Análise de Espaço Disponível

### Dimensões da Folha A4 Landscape
- Largura útil: ~277mm (297mm - 2×8mm margem)
- Altura útil: ~194mm (210mm - 2×8mm margem)
- Font base: 9pt (~3.2mm por linha com line-height 1.25)

### Estimativa de Caracteres por Seção

| Seção | Linhas | Caracteres (~100 char/linha) |
|-------|--------|------------------------------|
| Resumo IA (6 linhas) | 6 | ~600 caracteres |
| Evolução única | 3-4 | ~300-400 caracteres |
| 3 evoluções | 9-12 | ~900-1200 caracteres |

### Espaço Atual vs Proposto

```text
+-----------------------------------------------+
|            CABEÇALHO (azul)                   |   ~10mm
+-----------------------------------------------+
|            PLANO TERAPÊUTICO (amarelo)        |   ~15mm
+-----------------------------------------------+
| Dispositivos | Acessos | DVA | Resp           |   ~25mm
+-----------------------------------------------+
| Antibióticos      | Profilaxia | Dieta        |   ~20mm
+-----------------------------------------------+
| PRECAUÇÕES + PENDÊNCIAS                       |   ~15mm
+-----------------------------------------------+
|                                               |
|            EVOLUÇÕES (atual: ~50mm)           |
|            EVOLUÇÕES (proposto: ~90mm)        |
|                                               |
+-----------------------------------------------+
|            EXAMES CRÍTICOS (novo: ~25mm)      |   NOVO
+-----------------------------------------------+
```

## Alterações Propostas

### 1. Aumentar para 3 Evoluções

**Arquivo:** `src/components/print/PrintPatientSheet.tsx`

Alterar a linha 51:
```typescript
// De:
const latestEvolutions = evolutions.slice(0, 2);

// Para:
const latestEvolutions = evolutions.slice(0, 3);
```

Atualizar os labels (linhas 265-276):
```typescript
// De: "ÚLTIMA" / "PENÚLTIMA"
// Para: "ÚLTIMA" / "PENÚLTIMA" / "ANTEPENÚLTIMA"
const labels = ['ÚLTIMA', 'PENÚLTIMA', 'ANTEPENÚLTIMA'];
```

### 2. Expandir Resumo IA para 6 Linhas

**Arquivo:** `supabase/functions/summarize-evolutions/index.ts`

Atualizar o prompt do sistema (linhas 51-59):
```typescript
// De:
"- Resuma em NO MÁXIMO 3 linhas"

// Para:
"- Resuma em NO MÁXIMO 6 linhas"
"- Para internações curtas (< 5 evoluções), use 2-3 linhas"
"- Para internações longas (> 10 evoluções), use até 6 linhas"
```

Aumentar max_tokens (linha 79):
```typescript
// De:
max_tokens: 200

// Para:
max_tokens: 400
```

### 3. Nova Seção de Exames na Impressão

#### 3.1 Carregar exames no print data

**Arquivo:** `src/components/patient/PatientModal.tsx`

Adicionar fetch de `patient_exams` na linha 57:
```typescript
const [... , examsRes] = await Promise.all([
  // ... existing queries
  supabase.from('patient_exams')
    .select('*')
    .eq('patient_id', patientId)
    .order('exam_date', { ascending: false })
]);
```

E incluir no objeto `patientWithDetails`:
```typescript
patient_exams: examsRes.data || []
```

#### 3.2 Renderizar exames na impressão

**Arquivo:** `src/components/print/PrintPatientSheet.tsx`

Adicionar nova seção após as evoluções:

```typescript
{/* Critical Exams Section */}
{patient.patient_exams && patient.patient_exams.filter(e => e.is_critical).length > 0 && (
  <div className="print-exams">
    <strong>⚠️ EXAMES CRÍTICOS:</strong>
    {patient.patient_exams
      .filter(e => e.is_critical)
      .slice(0, 4) // Limitar a 4 exames críticos
      .map(exam => (
        <div key={exam.id} className="print-exam-item">
          <span className="print-exam-name">{exam.exam_name}</span>
          <span className="print-exam-date">{formatDate(exam.exam_date)}</span>
          <span className="print-exam-content">{truncate(exam.content, 80)}</span>
        </div>
      ))}
  </div>
)}
```

#### 3.3 Estilos CSS para exames

**Arquivo:** `src/components/print/print-styles.css`

Adicionar na seção `@media print` e `@media screen`:

```css
.print-exams {
  margin: 6px 0;
  padding: 6px;
  background: #fff8e1 !important;  /* Amarelo claro para destaque */
  border: 1px solid #ffb300;
  border-radius: 4px;
  font-size: 8pt;
}

.print-exam-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px dashed #ffcc80;
}

.print-exam-item:last-child {
  border-bottom: none;
}

.print-exam-name {
  font-weight: bold;
  min-width: 100px;
}

.print-exam-date {
  color: #666;
  font-size: 7pt;
}

.print-exam-content {
  flex: 1;
  color: #d32f2f;  /* Vermelho para destacar criticidade */
}
```

### 4. Lógica de Truncamento por Caracteres

Para otimizar o espaço, definir limites baseados em caracteres:

| Elemento | Limite Atual | Limite Proposto |
|----------|--------------|-----------------|
| Plano Terapêutico | 200 chars | 250 chars |
| Cada Evolução | 300 chars | 280 chars |
| Resumo IA | ~200 chars | ~400 chars |
| Cada Exame Crítico | - | 80 chars |

Atualizar a função `truncate` em `PrintPatientSheet.tsx`:
```typescript
// Evoluções: 280 chars
{truncate(evo.content, 280)}

// Plano: 250 chars  
{truncate(currentPlan, 250)}
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/print/PrintPatientSheet.tsx` | 3 evoluções, seção de exames, labels, truncate |
| `supabase/functions/summarize-evolutions/index.ts` | Prompt 6 linhas, max_tokens 400 |
| `src/components/print/print-styles.css` | Estilos para `.print-exams` |
| `src/components/patient/PatientModal.tsx` | Fetch de patient_exams |
| `src/hooks/usePrintPatient.ts` | (sem alteração, exams já estão em PatientWithDetails) |

## Lógica de Gatilho para Sumarização

Manter o gatilho atual (≥4 evoluções, já que agora mostramos 3 inteiras):

```typescript
// Em usePrintPatient.ts, ajustar o threshold:
// De: if (evolutions.length >= 3)
// Para: if (evolutions.length >= 4)
```

Isso significa:
- **1-3 evoluções**: Mostra todas inteiras, sem resumo IA
- **4+ evoluções**: Mostra 3 mais recentes inteiras + resumo IA das anteriores

## Considerações de Performance

1. **Edge Function**: Aumentar max_tokens de 200 para 400 não afeta significativamente o tempo de resposta
2. **Exames**: Filtrar apenas críticos (`is_critical: true`) reduz o volume de dados
3. **Limite de 4 exames**: Evita overflow mesmo com muitos exames críticos

## Teste Recomendado

Após implementação:
1. Testar com Leito 1 (20 evoluções) → verificar resumo de 6 linhas
2. Testar com paciente com vários exames críticos → verificar layout
3. Verificar se a folha A4 landscape comporta todo o conteúdo sem overflow
