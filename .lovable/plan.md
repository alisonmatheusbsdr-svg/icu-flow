

# Plano: Expandir Dashboard NIR com Visão Panorâmica

## Objetivo

Permitir que o NIR visualize **todos os pacientes** internados com barra de probabilidade de alta, mantendo o botão "Regulação" apenas para pacientes que possuem regulação ativa.

---

## Situação Atual

- O `NIRDashboard` filtra e mostra **apenas** pacientes com regulação ativa
- O `NIRBedCard` sempre exibe o botão "Regulação"
- Não há indicador de probabilidade de alta para o NIR

---

## Solução

### 1. Adicionar Toggle de Modo de Visualização

| Modo | Comportamento |
|------|---------------|
| **Regulação** | Modo atual - só pacientes com regulação (default) |
| **Visão Geral** | Todos os leitos ocupados com probabilidade de alta |

### 2. Buscar Dados Clínicos Adicionais

Adicionar queries para os dados que alimentam a probabilidade de alta:
- `active_antibiotics_count`
- `active_devices_count`
- `has_central_access`
- `has_sepsis_or_shock`
- `has_tot_device`

### 3. Atualizar NIRBedCard

- Adicionar mini-barra de probabilidade de alta (reutilizar lógica do BedCard)
- Tornar o botão "Regulação" condicional (só aparece se houver regulação ativa)

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/nir/NIRDashboard.tsx` | Toggle de modo, queries adicionais, stats de ocupação |
| `src/components/nir/NIRBedCard.tsx` | Barra de probabilidade, botão condicional |

---

## Detalhes Técnicos

### NIRDashboard.tsx

**Novo estado e toggle:**
```tsx
const [viewMode, setViewMode] = useState<'regulation' | 'overview'>('regulation');
```

**Queries adicionais (dentro do fetchAllData):**
```typescript
// Buscar dados clínicos para cálculo de probabilidade
const [antibioticsResult, devicesResult, venousResult, precautionsResult] = await Promise.all([
  supabase.from('antibiotics').select('patient_id').in('patient_id', patientIds).eq('is_active', true),
  supabase.from('invasive_devices').select('patient_id, device_type').in('patient_id', patientIds).eq('is_active', true),
  supabase.from('venous_access').select('patient_id, access_type').in('patient_id', patientIds).eq('is_active', true),
  supabase.from('patient_precautions').select('patient_id, precaution_type').in('patient_id', patientIds).eq('is_active', true)
]);
```

**Nova lógica de filtro:**
```typescript
const filterBeds = (beds: BedWithPatient[]): BedWithPatient[] => {
  // Modo visão geral: todos os leitos ocupados
  if (viewMode === 'overview') {
    return beds.filter(b => b.patient !== null);
  }
  
  // Modo regulação: apenas com regulação ativa (lógica atual)
  return beds.filter(b => {
    const regs = b.patient?.patient_regulation || [];
    if (regs.length === 0) return false;
    if (statusFilter === 'all') return true;
    return regs.some(r => r.status === statusFilter);
  });
};
```

**Stats panorâmicos (modo visão geral):**
```tsx
// Calcular estatísticas globais
const totalOccupied = unitsWithBeds.reduce((sum, u) => sum + u.stats.occupied, 0);
const totalCritical = /* pacientes com TOT ou DVA */;
const totalProbableDischarges = /* pacientes com probabilidade >= 80% */;
```

### NIRBedCard.tsx

**Adicionar props para dados clínicos:**
```typescript
interface PatientWithModality extends Patient {
  // Existentes
  respiratory_modality?: string;
  has_active_dva?: boolean;
  patient_regulation?: PatientRegulation[];
  
  // Novos para cálculo de probabilidade
  active_antibiotics_count?: number;
  active_devices_count?: number;
  has_central_access?: boolean;
  has_sepsis_or_shock?: boolean;
  has_tot_device?: boolean;
}
```

**Reutilizar lógica de calculateDischargeProbability do BedCard:**
```typescript
// Copiar função calculateDischargeProbability
const { probability, status, color } = calculateDischargeProbability(patient);
```

**Botão condicional:**
```tsx
{/* Botão de regulação - só aparece se houver regulação ativa */}
{activeRegulations.length > 0 && (
  <Button
    variant={urgentStatus || hasUrgentSignal ? 'default' : 'outline'}
    size="sm"
    className="w-full gap-2 ..."
    onClick={() => setIsDialogOpen(true)}
  >
    <Building2 className="h-4 w-4" />
    Regulação
    {pendingCount > 0 && <Badge>{pendingCount}</Badge>}
  </Button>
)}

{/* Mini barra de probabilidade de alta */}
<div className="mt-2 flex items-center gap-2">
  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
    <div 
      className={cn("h-full transition-all", colorClasses[color])}
      style={{ width: `${barWidth}%` }}
    />
  </div>
  <span className="text-xs text-muted-foreground">
    {status === 'palliative' ? 'CP' : `${probability}%`}
  </span>
</div>
```

---

## Interface Visual

### Header com Toggle

```text
┌─────────────────────────────────────────────────────┐
│ 🏢 Painel de Regulação                              │
│                                                     │
│ [🔄 Regulação] [📊 Visão Geral]                     │
│                                                     │
│ (modo Regulação)          (modo Visão Geral)        │
│ 5 Aguard. | 3 Reg.        45 Ocup. | 8 Altas | 12 ♠│
└─────────────────────────────────────────────────────┘
```

### Cards no Modo Visão Geral

```text
┌────────────┐  ┌────────────┐  ┌────────────┐
│ Leito 1    │  │ Leito 2    │  │ Leito 3    │
│ JAB  D12   │  │ MCS  D5    │  │ PFS  D3    │
│ 67 anos    │  │ 45 anos    │  │ 72 anos    │
│ [TOT][DVA] │  │ [VNI]      │  │ [AA]       │
│ ▓▓▓▓▓▓▓▓▓▓ │  │ ▓▓▓▓▓▓░░░░ │  │ ▓▓▓▓▓▓▓▓▓░ │
│ 0%         │  │ 65%        │  │ 90%        │
│ [Regulação]│  │            │  │            │
└────────────┘  └────────────┘  └────────────┘
  (c/ regulação)  (s/ regulação)  (s/ regulação)
```

---

## Resultado Esperado

| Modo | O que o NIR vê |
|------|----------------|
| **Regulação** | Apenas pacientes com regulação ativa (comportamento atual) |
| **Visão Geral** | Todos os pacientes com barra de probabilidade de alta |

### Benefícios para o NIR:

1. **Previsibilidade** - Ver quais pacientes estão próximos de alta (barra verde >80%)
2. **Criticidade** - Identificar pacientes críticos (TOT/DVA) que não sairão tão cedo
3. **Planejamento** - Visão panorâmica para antecipar fluxo de leitos
4. **Foco** - Toggle para voltar ao modo regulação quando precisar agir

