

## Plano: Tela Panorâmica do Coordenador - Visão de Todas as UTIs

### Objetivo
Criar uma tela principal para o Coordenador que exiba todos os cards de leitos de **todas as UTIs** simultaneamente, permitindo uma visão panorâmica completa do estado das unidades sob sua coordenação.

---

### Design Visual Proposto

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Logo] UTI Handoff Pro        [Dropdown UTIs]  [Imprimir]  [Admin]  [User]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ UTI Geral (10 leitos) ─── Ocupação: 8/10 (80%) ─────────────────────┐   │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                   │   │
│  │  │ L1 4d │ │ L2 1d │ │ L3    │ │ L4 7d │ │ L5 2d │                   │   │
│  │  │ AMS   │ │ AMBS  │ │   +   │ │ JCS   │ │ MLS   │                   │   │
│  │  │ [AA]  │ │ [TOT] │ │ Vago  │ │ [VNI] │ │ [O2]  │                   │   │
│  │  │ ▓▓▓85%│ │ ░░░0% │ │       │ │ ▓▓75% │ │ ▓▓▓90%│                   │   │
│  │  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘                   │   │
│  │  ... mais leitos ...                                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─ UTI Cardiológica (8 leitos) ─── Ocupação: 6/8 (75%) ────────────────┐   │
│  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐                   │   │
│  │  │ L1 2d │ │ L2    │ │ L3 5d │ │ L4 3d │ │ L5    │                   │   │
│  │  │ RCS   │ │   +   │ │ PSL   │ │ KLM   │ │   +   │                   │   │
│  │  │ [TQT] │ │ Vago  │ │ [AA]  │ │ [O2]  │ │ Vago  │                   │   │
│  │  │ ▓▓60% │ │       │ │ ▓▓▓95%│ │ ▓▓▓85%│ │       │                   │   │
│  │  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘                   │   │
│  │  ... mais leitos ...                                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Resumo Estatístico por UTI (Header de cada seção)

| Indicador | Descrição |
|-----------|-----------|
| Total Leitos | Número total de leitos na unidade |
| Ocupação | Leitos ocupados / total (percentual) |
| Altas Prováveis | Quantidade com probabilidade > 80% |
| Bloqueados | Quantidade com TOT/DVA ativos |
| Paliativos | Quantidade em CCPP |

---

### Fluxo de Navegação Proposto

```text
┌──────────────┐    Login    ┌─────────────────┐
│   Auth.tsx   │ ──────────→ │  Role Check     │
└──────────────┘             └────────┬────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ↓                 ↓                 ↓
             ┌──────────┐      ┌──────────┐      ┌──────────────┐
             │ Admin    │      │ Plantonista    │  Coordenador │
             │ → /admin │      │ → /select-unit │ │ → /dashboard│
             └──────────┘      └───────┬────────┘ └──────┬──────┘
                                       │                  │
                                       ↓                  ↓
                                ┌─────────────┐   ┌──────────────────┐
                                │  Dashboard  │   │  Dashboard com   │
                                │  (1 UTI)    │   │  TODAS as UTIs   │
                                └─────────────┘   └──────────────────┘
```

---

### Mudanças Técnicas

#### 1. Novo Componente: `src/components/dashboard/AllUnitsGrid.tsx`

Componente que busca todas as UTIs e renderiza cada uma com seu BedGrid:

```typescript
interface UnitSummary {
  id: string;
  name: string;
  bedCount: number;
  occupiedCount: number;
  bedsWithPatients: BedWithPatient[];
}

export function AllUnitsGrid() {
  // Buscar todas as UTIs
  // Para cada UTI, buscar todos os leitos e pacientes
  // Renderizar seções colapsáveis com resumos
}
```

**Estrutura:**
- Buscar todas as unidades via `supabase.from('units').select('*')`
- Para cada unidade, buscar leitos e dados clínicos (reutilizando lógica do BedGrid)
- Exibir cada UTI em uma seção com header contendo estatísticas
- Cards de leitos renderizados em grid dentro de cada seção

#### 2. Modificar: `src/pages/Dashboard.tsx`

Detectar se o usuário é Coordenador e renderizar a visão apropriada:

```typescript
export default function Dashboard() {
  const { hasRole } = useAuth();
  const isCoordinator = hasRole('coordenador');
  
  // Se for coordenador, mostrar visão panorâmica
  if (isCoordinator && !selectedUnit) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container mx-auto px-4 py-6">
          <AllUnitsGrid />
        </main>
      </div>
    );
  }
  
  // Fluxo normal para outros roles
  return (/* ... código existente ... */);
}
```

#### 3. Modificar: `src/pages/Auth.tsx`

Ajustar redirecionamento pós-login para coordenadores:

```typescript
if (user && rolesLoaded) {
  if (hasRole('admin')) {
    navigate('/admin');
  } else if (hasRole('coordenador')) {
    navigate('/dashboard');  // Vai direto para dashboard panorâmico
  } else {
    navigate('/dashboard');
  }
}
```

#### 4. Modificar: `src/components/dashboard/DashboardHeader.tsx`

Para coordenadores na visão panorâmica, o dropdown de UTIs ficará opcional (pode selecionar uma para focar, ou ver todas):

```typescript
// Adicionar opção "Todas as UTIs" no dropdown para coordenador
{hasRole('coordenador') && (
  <SelectItem value="all">
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4" />
      Visão Geral
    </div>
  </SelectItem>
)}
```

---

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/dashboard/AllUnitsGrid.tsx` | **Criar** | Novo componente para renderizar todas as UTIs com seus leitos |
| `src/pages/Dashboard.tsx` | Modificar | Detectar role coordenador e renderizar AllUnitsGrid |
| `src/pages/Auth.tsx` | Modificar | Ajustar redirecionamento para coordenadores |
| `src/components/dashboard/DashboardHeader.tsx` | Modificar | Adicionar opção "Visão Geral" no dropdown para coordenadores |
| `src/hooks/useUnit.tsx` | Modificar | Adicionar suporte para `selectedUnit = null` significando "todas" |

---

### Comportamento Esperado

1. **Coordenador faz login** → Vai direto para `/dashboard` com visão panorâmica
2. **Visão panorâmica** → Mostra todas as UTIs em seções separadas
3. **Cada seção** → Header com nome da UTI, ocupação, e grid de BedCards
4. **BedCards funcionais** → Clicáveis, abrindo PatientModal normalmente
5. **Dropdown "Visão Geral"** → Permite alternar entre ver todas ou focar em uma UTI específica
6. **Dashboard Analytics** → Será desenvolvido em fase posterior

---

### Detalhes Técnicos

#### Query Otimizada para Todas as UTIs

Para evitar múltiplas queries, faremos uma busca consolidada:

```typescript
// 1. Buscar todas as unidades
const { data: units } = await supabase.from('units').select('*').order('name');

// 2. Buscar todos os leitos de todas as unidades
const { data: allBeds } = await supabase.from('beds').select('*').order('bed_number');

// 3. Buscar todos os pacientes ativos
const { data: allPatients } = await supabase
  .from('patients')
  .select('*')
  .eq('is_active', true);

// 4. Buscar dados clínicos em paralelo para todos os pacientes
const patientIds = allPatients.map(p => p.id);
const [resp, dva, atb, dev, ven, prec] = await Promise.all([...]);

// 5. Agrupar por unidade no frontend
```

#### Componente de Seção por UTI

```tsx
<Collapsible defaultOpen>
  <CollapsibleTrigger className="unit-section-header">
    <Building2 /> {unit.name}
    <Badge>{occupiedCount}/{bedCount}</Badge>
    <ChevronDown />
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {beds.map(bed => <BedCard ... />)}
    </div>
  </CollapsibleContent>
</Collapsible>
```

---

### Resultado Esperado

1. **Visão panorâmica**: Coordenador vê status de todas as UTIs simultaneamente
2. **Tomada de decisão rápida**: Identificar rapidamente UTIs com alta ocupação ou pacientes críticos
3. **Interação preservada**: Cards continuam funcionais, abrindo modal do paciente
4. **Performance adequada**: Query consolidada evita sobrecarga
5. **Preparação para Dashboard**: Estrutura pronta para adicionar analytics posteriormente

