

## Plano: Alinhar Cálculo de Altas Prováveis com BedCard

### Problema Identificado
O cálculo atual no `AllUnitsGrid` usa uma heurística simplificada que não corresponde ao cálculo real de probabilidade usado no `BedCard`. Isso causa inconsistência entre o badge "X altas" no header e o que realmente aparece nos cards.

---

### Lógica Atual (Incorreta) - AllUnitsGrid (linhas 156-163)

```typescript
// Heurística simplificada que não reflete o cálculo real
const highDischargeCount = occupiedBeds.filter(b => {
  if (!b.patient || b.patient.is_palliative) return false;
  if (b.patient.has_tot_device || b.patient.has_active_dva) return false;
  return (b.patient.active_devices_count || 0) === 0 && 
         (b.patient.active_antibiotics_count || 0) <= 1 &&
         !b.patient.has_sepsis_or_shock;
}).length;
```

---

### Lógica Correta (BedCard) - Linhas 20-72

O BedCard calcula a probabilidade aplicando descontos sobre 100%:

| Fator | Desconto |
|-------|----------|
| **Bloqueadores absolutos (TOT, DVA)** | → 0% imediato |
| Suporte respiratório (TQT, VNI) | -15% |
| 1-2 antibióticos | -5% |
| 3 antibióticos | -10% |
| 4+ antibióticos | -15% |
| 2-3 dispositivos | -5% |
| 4-5 dispositivos | -10% |
| 6+ dispositivos | -15% |
| Acesso central | -5% |
| Sepse/Choque | -10% |
| 14-30 dias internado | -5% |
| 30+ dias internado | -10% |

**Probabilidade = 100 - (soma dos descontos)**

Alta provável = probabilidade ≥ 80%

---

### Solução Proposta

Extrair a função `calculateDischargeProbability` do `BedCard` e reutilizá-la no `AllUnitsGrid` para garantir consistência:

#### 1. Modificar `AllUnitsGrid.tsx`

Adicionar a mesma função de cálculo usada no BedCard:

```typescript
// Função de cálculo de probabilidade (igual ao BedCard)
const calculateDischargeProbability = (patient: BedWithPatient['patient']) => {
  if (!patient) return { probability: 0, status: 'empty' as const };
  
  if (patient.is_palliative) {
    return { probability: 100, status: 'palliative' as const };
  }
  
  const isOnTOT = patient.respiratory_modality === 'tot' || patient.has_tot_device;
  if (isOnTOT || patient.has_active_dva) {
    return { probability: 0, status: 'blocked' as const };
  }
  
  let discount = 0;
  
  // Respiratory support
  if (['traqueostomia', 'vni'].includes(patient.respiratory_modality || '')) {
    discount += 15;
  }
  
  // Antibiotics
  const atbCount = patient.active_antibiotics_count || 0;
  if (atbCount >= 4) discount += 15;
  else if (atbCount === 3) discount += 10;
  else if (atbCount >= 1) discount += 5;
  
  // Devices
  const devCount = patient.active_devices_count || 0;
  if (devCount >= 6) discount += 15;
  else if (devCount >= 4) discount += 10;
  else if (devCount >= 2) discount += 5;
  
  // Central access
  if (patient.has_central_access) discount += 5;
  
  // Sepsis/Shock
  if (patient.has_sepsis_or_shock) discount += 10;
  
  // LOS (days hospitalized)
  const days = Math.ceil((Date.now() - new Date(patient.admission_date).getTime()) / 86400000);
  if (days > 30) discount += 10;
  else if (days > 14) discount += 5;
  
  const probability = Math.max(0, 100 - discount);
  return { probability, status: 'normal' as const };
};
```

#### 2. Substituir o cálculo de highDischarge (linhas 155-163)

```typescript
// High discharge probability calculation usando mesma lógica do BedCard
const highDischargeCount = occupiedBeds.filter(b => {
  if (!b.patient) return false;
  const { probability, status } = calculateDischargeProbability(b.patient);
  // Alta provável = probabilidade >= 80% e não é palliativo nem bloqueado
  return status === 'normal' && probability >= 80;
}).length;
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/AllUnitsGrid.tsx` | Adicionar função `calculateDischargeProbability` e usar no cálculo de stats |

---

### Resultado Esperado

1. **Consistência**: O badge "X altas" no header refletirá exatamente os pacientes com probabilidade ≥ 80%
2. **Precisão**: Mesma lógica de descontos aplicada em ambos os componentes
3. **Confiabilidade**: Coordenador pode confiar que o número mostrado corresponde à realidade dos cards

