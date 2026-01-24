

# Plano: Reverter para 2 Evoluções com Limite Ampliado

## Objetivo

Voltar para **2 evoluções + resumo IA de 6 linhas**, aumentando o limite de caracteres por evolução para ~420-450, garantindo que quase nunca haverá truncamento de dados clínicos importantes.

## Justificativa

1. **O resumo IA já cumpre o papel de contexto histórico** - não precisa mostrar 3 evoluções completas
2. **Evoluções truncadas perdem valor clínico** - podem cortar justamente a conduta
3. **Com ~420-450 chars por evolução**, cobrimos a maioria dos registros sem corte

## Cálculo de Espaço

### Espaço Disponível para Evoluções

Com base no layout A4 landscape (altura útil ~194mm):

| Seção | Altura estimada |
|-------|-----------------|
| Cabeçalho | ~10mm |
| Plano terapêutico | ~15mm |
| Grid clínico (4 cols) | ~25mm |
| Grid secundário (3 cols) | ~20mm |
| Precauções + Pendências | ~15mm |
| Exames críticos | ~20mm |
| **Restante para evoluções** | **~89mm** |

### Distribuição do Espaço de Evoluções

Com font 8pt (line-height ~3mm):

| Componente | Linhas | Altura | Caracteres |
|------------|--------|--------|------------|
| Resumo IA (6 linhas) | 6-7 | ~21mm | ~600 chars |
| Evolução ÚLTIMA | 5-6 | ~18mm | **~450 chars** |
| Evolução PENÚLTIMA | 5-6 | ~18mm | **~450 chars** |
| Headers + espaçamento | - | ~12mm | - |
| **Total** | - | ~69mm | - |
| **Margem de segurança** | - | ~20mm | - |

## Alterações

### 1. Reverter para 2 Evoluções

**Arquivo:** `src/components/print/PrintPatientSheet.tsx`

Linha 51-52:
```typescript
// De:
const latestEvolutions = evolutions.slice(0, 3);
const evolutionLabels = ['ÚLTIMA', 'PENÚLTIMA', 'ANTEPENÚLTIMA'];

// Para:
const latestEvolutions = evolutions.slice(0, 2);
const evolutionLabels = ['ÚLTIMA', 'PENÚLTIMA'];
```

### 2. Aumentar Limite de Caracteres por Evolução

**Arquivo:** `src/components/print/PrintPatientSheet.tsx`

Linha 274:
```typescript
// De:
{truncate(evo.content, 280)}

// Para:
{truncate(evo.content, 420)}
```

### 3. Ajustar Threshold para IA (Manter ≥3)

**Arquivo:** `src/hooks/usePrintPatient.ts`

Linha 30:
```typescript
// De:
if (evolutions.length >= 4) {

// Para:
if (evolutions.length >= 3) {
```

**Lógica resultante:**
- **1-2 evoluções**: Mostra todas inteiras, sem resumo IA
- **3+ evoluções**: Mostra 2 mais recentes inteiras + resumo IA das anteriores

## Resumo das Alterações

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `PrintPatientSheet.tsx` | 51 | `slice(0, 3)` → `slice(0, 2)` |
| `PrintPatientSheet.tsx` | 52 | Remover `'ANTEPENÚLTIMA'` do array |
| `PrintPatientSheet.tsx` | 274 | `truncate(..., 280)` → `truncate(..., 420)` |
| `usePrintPatient.ts` | 30 | `>= 4` → `>= 3` |

## Resultado Final

| Elemento | Limite |
|----------|--------|
| Plano Terapêutico | 250 chars |
| Cada Evolução (2x) | **420 chars** |
| Resumo IA | 6 linhas (~600 chars) |
| Cada Exame Crítico (4x) | 80 chars |

## Teste Recomendado

Após implementação, testar "Imprimir UTI" e verificar:
1. Leito 1 (20 evoluções): resumo IA + 2 evoluções maiores
2. Verificar se não há overflow no layout A4 landscape
3. Confirmar que evoluções com ~400 chars não são truncadas

