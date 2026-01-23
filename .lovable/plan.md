

## Plano: Mini Barra de Probabilidade de Alta nos Cards de Leito

### Objetivo
Adicionar uma representação visual compacta da probabilidade de alta em cada card de leito ocupado, permitindo uma visão panorâmica do status de todos os pacientes da UTI.

---

### Design Visual Proposto

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ANTES (sem indicador)                                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Leito 1   4d │  │ Leito 2   1d │  │ Leito 3      │               │
│  │ AMS          │  │ AMBS         │  │     +        │               │
│  │ 35 anos      │  │ 35 anos      │  │   Vago       │               │
│  │ [AA]         │  │ [TOT]        │  │              │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ DEPOIS (com mini barra)                                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Leito 1   4d │  │ Leito 2   1d │  │ Leito 3      │               │
│  │ AMS          │  │ AMBS         │  │     +        │               │
│  │ 35 anos      │  │ 35 anos      │  │   Vago       │               │
│  │ [AA]         │  │ [TOT] [DVA]  │  │              │               │
│  │ ▓▓▓▓▓▓▓▓░░ 85%│  │ ░░░░░░░░░░ 0% │  │              │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│       verde           vermelho                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Comportamento por Situação

| Situação | Cor | Visual |
|----------|-----|--------|
| 80-100% Alta Provável | Verde | Barra quase cheia |
| 60-79% Moderada | Amarelo | Barra ~70% |
| 30-59% Baixa | Laranja | Barra ~45% |
| 1-29% Muito Baixa | Vermelho | Barra pequena |
| 0% Bloqueado (TOT/DVA) | Vermelho | Barra vazia |
| Cuidados Paliativos | Cinza | Barra cheia cinza |

---

### Dados Necessários

Para calcular a probabilidade no card, precisamos buscar dados adicionais no `BedGrid.tsx`:

1. **Antibióticos ativos** - contagem para desconto
2. **Dispositivos invasivos ativos** - contagem para desconto
3. **Acessos venosos ativos** - tipo central para desconto
4. **Precauções ativas** - sepse/choque para desconto
5. **is_palliative** - já disponível no patient

---

### Mudanças Técnicas

#### 1. Arquivo: `src/components/dashboard/BedGrid.tsx`

Buscar dados adicionais para cálculo de probabilidade:

```typescript
// Adicionar queries paralelas para:
const [antibioticsResult, devicesResult, venousResult, precautionsResult] = await Promise.all([
  supabase.from('antibiotics').select('patient_id, is_active').in('patient_id', patientIds),
  supabase.from('invasive_devices').select('patient_id, is_active').in('patient_id', patientIds),
  supabase.from('venous_access').select('patient_id, access_type, is_active').in('patient_id', patientIds),
  supabase.from('patient_precautions').select('patient_id, precaution_type, is_active').in('patient_id', patientIds)
]);

// Passar contagens/flags para o BedCard
```

#### 2. Arquivo: `src/components/dashboard/BedCard.tsx`

Adicionar interface e props para os dados de probabilidade:

```typescript
interface PatientWithModality extends Patient {
  respiratory_modality?: string;
  has_active_dva?: boolean;
  // Novos campos para cálculo
  active_antibiotics_count?: number;
  active_devices_count?: number;
  has_central_access?: boolean;
  has_sepsis_or_shock?: boolean;
}
```

Criar função para calcular probabilidade simplificada:

```typescript
const calculateDischargeProbability = (patient: PatientWithModality) => {
  // Paliativos = caso especial
  if (patient.is_palliative) {
    return { probability: 100, status: 'palliative', color: 'gray' };
  }
  
  // Bloqueadores absolutos
  if (patient.respiratory_modality === 'tot' || patient.has_active_dva) {
    return { probability: 0, status: 'blocked', color: 'red' };
  }
  
  // Calcular descontos
  let discount = 0;
  
  // Suporte respiratório
  if (['traqueostomia', 'vni'].includes(patient.respiratory_modality || '')) {
    discount += 15;
  }
  
  // Antibióticos
  const atbCount = patient.active_antibiotics_count || 0;
  if (atbCount >= 4) discount += 15;
  else if (atbCount === 3) discount += 10;
  else if (atbCount >= 1) discount += 5;
  
  // Dispositivos
  const devCount = patient.active_devices_count || 0;
  if (devCount >= 6) discount += 15;
  else if (devCount >= 4) discount += 10;
  else if (devCount >= 2) discount += 5;
  
  // Acesso central
  if (patient.has_central_access) discount += 5;
  
  // Sepse/Choque
  if (patient.has_sepsis_or_shock) discount += 10;
  
  // LOS (dias internado)
  const days = Math.ceil((Date.now() - new Date(patient.admission_date).getTime()) / 86400000);
  if (days > 30) discount += 10;
  else if (days > 14) discount += 5;
  
  const probability = Math.max(0, 100 - discount);
  
  // Determinar cor
  let color = 'green';
  if (probability < 30) color = 'red';
  else if (probability < 60) color = 'orange';
  else if (probability < 80) color = 'yellow';
  
  return { probability, status: 'normal', color };
};
```

Adicionar mini barra no render:

```tsx
{/* Mini barra de probabilidade - após os badges */}
{(() => {
  const { probability, status, color } = calculateDischargeProbability(patient);
  
  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    gray: 'bg-gray-400'
  };
  
  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all", colorClasses[color])}
          style={{ width: status === 'palliative' ? '100%' : `${probability}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground min-w-[28px] text-right">
        {status === 'palliative' ? 'CP' : `${probability}%`}
      </span>
    </div>
  );
})()}
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/BedGrid.tsx` | Adicionar queries para antibióticos, dispositivos, acessos venosos e precauções; passar dados agregados ao BedCard |
| `src/components/dashboard/BedCard.tsx` | Adicionar função de cálculo de probabilidade simplificada; renderizar mini barra de progresso no card |

---

### Resultado Esperado

1. **Visão panorâmica**: Ao olhar para a grid de leitos, identificar rapidamente quais pacientes têm alta probabilidade de alta (verde) vs. bloqueados (vermelho)
2. **Consistência visual**: Mesmas cores e lógica do `PatientComplexityBar` completo
3. **Performance**: Apenas uma query adicional com joins, não impactando significativamente o carregamento
4. **UX intuitiva**: Barra pequena + porcentagem em cada card, sem poluir visualmente

