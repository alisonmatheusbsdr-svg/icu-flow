

## Plano: Eliminar Redundância entre Seções de Dispositivos

### Objetivo
Remover a duplicação de informação entre as seções, fazendo com que:

1. **TOT e TQT** sejam automaticamente derivados do **Suporte Respiratório** → aparecem em "Dispositivos Invasivos" como badges não-editáveis
2. **CVC** (Cateter Venoso Central) seja automaticamente derivado dos **Acessos Venosos** → aparece em "Dispositivos Invasivos" como badge derivado

---

### Comportamento Atual vs. Proposto

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        ATUAL (com redundância)                      │
├─────────────────────────────────────────────────────────────────────┤
│ Dispositivos Invasivos:  [TOT D4] [CVC D1] [PAI D1]                │
│                          ↑ manual  ↑ manual                         │
│                                                                     │
│ Acessos Venosos:         [CVC Jugular D1]                          │
│                          ↑ manual (dados separados)                 │
│                                                                     │
│ Suporte Respiratório:    TOT (Ventilação Invasiva)                 │
│                          ↑ manual (dados separados)                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      PROPOSTO (sem redundância)                     │
├─────────────────────────────────────────────────────────────────────┤
│ Dispositivos Invasivos:  [TOT D4 🔗] [CVC D1 🔗] [PAI D1]          │
│                          ↑ derivado  ↑ derivado  ↑ manual           │
│                                                                     │
│ Acessos Venosos:         [CVC Jugular D1] ← fonte da verdade       │
│                                                                     │
│ Suporte Respiratório:    TOT (Ventilação Invasiva) ← fonte verdade │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Regras de Derivação

#### 1. TOT (Tubo Orotraqueal)
- **Fonte de dados**: `respiratory_support.modality === 'tot'`
- **Dias de uso**: Calculado a partir de `respiratory_support.intubation_date`
- **Aparição**: Badge especial em "Dispositivos Invasivos" com indicador de que é derivado
- **Remoção do dropdown**: TOT não aparece mais como opção selecionável em dispositivos

#### 2. TQT (Traqueostomia)
- **Fonte de dados**: `respiratory_support.modality === 'traqueostomia'`
- **Dias de uso**: Não há campo de data específico (será adicionado no futuro se necessário)
- **Aparição**: Badge especial derivado
- **Remoção do dropdown**: TQT não aparece mais como opção selecionável

#### 3. CVC (Cateter Venoso Central)
- **Fonte de dados**: `venous_access` com `access_type` em `['central_nao_tunelizado', 'central_tunelizado', 'hemodialise']`
- **Dias de uso**: Calculado a partir de `venous_access.insertion_date`
- **Aparição**: Um badge para cada CVC ativo, mostrando local e dias
- **Remoção do dropdown**: CVC não aparece mais como opção selecionável

---

### Mudanças Técnicas

#### Arquivo: `src/components/patient/PatientClinicalData.tsx`

**1. Atualizar constantes de dispositivos:**

```typescript
// Dispositivos que não devem aparecer no dropdown (são derivados)
const DERIVED_DEVICES = ['TOT', 'TQT', 'CVC', 'CVD'];

// Filtrar STANDARD_DEVICES para excluir os derivados
const SELECTABLE_DEVICES = STANDARD_DEVICES.filter(d => !DERIVED_DEVICES.includes(d));
// Resultado: ['PAI', 'SNE', 'SVD']
```

**2. Criar componente/lógica para dispositivos derivados:**

```typescript
// Função para gerar badges derivados do Suporte Respiratório
const getDerivedRespiratoryDevice = () => {
  if (!patient.respiratory_support) return null;
  
  const modality = patient.respiratory_support.modality;
  
  if (modality === 'tot') {
    const days = patient.respiratory_support.intubation_date 
      ? Math.ceil((Date.now() - new Date(patient.respiratory_support.intubation_date).getTime()) / 86400000)
      : null;
    return { type: 'TOT', days, source: 'respiratory' };
  }
  
  if (modality === 'traqueostomia') {
    return { type: 'TQT', days: null, source: 'respiratory' };
  }
  
  return null;
};

// Função para gerar badges derivados dos Acessos Venosos
const getDerivedVenousDevices = () => {
  const centralTypes = ['central_nao_tunelizado', 'central_tunelizado', 'hemodialise'];
  const centralAccesses = (patient.venous_access || [])
    .filter(a => centralTypes.includes(a.access_type));
  
  return centralAccesses.map(access => ({
    type: 'CVC',
    days: Math.ceil((Date.now() - new Date(access.insertion_date).getTime()) / 86400000),
    source: 'venous_access',
    details: INSERTION_SITES[access.insertion_site]?.label || access.insertion_site,
    accessId: access.id
  }));
};
```

**3. Atualizar renderização da seção "Dispositivos Invasivos":**

```typescript
{/* Dispositivos derivados do Suporte Respiratório */}
{getDerivedRespiratoryDevice() && (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm"
           style={{ backgroundColor, borderColor, color }}>
        <span className="font-medium">{device.type}</span>
        {device.days !== null && <span className="text-xs opacity-80">D{device.days}</span>}
        <Link className="h-3 w-3 opacity-60" /> {/* Indicador de derivado */}
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>Derivado do Suporte Respiratório</p>
      <p className="text-xs">Altere em "Suporte Respiratório"</p>
    </TooltipContent>
  </Tooltip>
)}

{/* Dispositivos derivados dos Acessos Venosos */}
{getDerivedVenousDevices().map(device => (
  <Tooltip key={device.accessId}>
    <TooltipTrigger asChild>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm"
           style={{ backgroundColor, borderColor, color }}>
        <span className="font-medium">CVC</span>
        <span className="text-xs opacity-60">D{device.days}</span>
        <Link className="h-3 w-3 opacity-60" />
      </div>
    </TooltipTrigger>
    <TooltipContent>
      <p>Derivado de Acessos Venosos</p>
      <p className="text-xs">{device.details}</p>
    </TooltipContent>
  </Tooltip>
))}
```

**4. Atualizar o dropdown de adicionar dispositivo:**

```typescript
// Ao invés de usar getDevicesWithStatus(), usar apenas SELECTABLE_DEVICES
const getSelectableDevices = () => {
  return SELECTABLE_DEVICES.filter(device => !activeDeviceTypes.has(device))
    .map(device => ({ device, isDisabled: false }));
};
```

**5. Remover dispositivos manuais duplicados:**

- Na renderização dos dispositivos ativos, filtrar para não mostrar TOT/TQT/CVC manuais se existirem dados derivados
- Ou seja, se há `respiratory_support.modality === 'tot'`, ignorar qualquer TOT manual em `invasive_devices`

---

### Lógica de Alerta (Mantida)

Os alertas de tempo (warning/danger) continuam funcionando:

- **TOT**: Usa os thresholds existentes (7 dias warning, 15 dias danger)
- **CVC**: Usa os thresholds do `VenousAccessSection` baseados no tipo e local de inserção

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/patient/PatientClinicalData.tsx` | Principal - implementar badges derivados, remover TOT/TQT/CVC do dropdown, ajustar renderização |

---

### Importação Adicional

Importar o ícone `Link` do lucide-react para indicar visualmente que o badge é derivado de outra seção.

---

### Resultado Esperado

1. **Sem duplicação**: Usuário cadastra TOT em Suporte Respiratório uma vez, aparece em Dispositivos automaticamente
2. **Dados consistentes**: Dias de uso sempre vêm da fonte correta
3. **UI intuitiva**: Badge derivado tem ícone de "link" e tooltip explicativo
4. **Fluxo natural**: Menos cliques para registrar o mesmo dado

