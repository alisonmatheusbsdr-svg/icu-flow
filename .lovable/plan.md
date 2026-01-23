

## Plano: Renomear Infectologia e Adicionar Botão de Culturas

### Objetivo
1. Renomear a seção de "Infectologia" para "Antibioticoterapia"
2. Adicionar um botão pequeno ao lado do título para acessar rapidamente os exames de cultura

---

### Design Visual Proposto

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ANTES                                                                │
├──────────────────────────────────────────────────────────────────────┤
│  🔗 Infectologia                                              [+]   │
│  ⓘ Nenhum antibiótico em uso                                        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ DEPOIS                                                               │
├──────────────────────────────────────────────────────────────────────┤
│  💊 Antibioticoterapia                           [🦠 Culturas] [+]  │
│  ⓘ Nenhum antibiótico em uso                                        │
└──────────────────────────────────────────────────────────────────────┘
```

O botão "Culturas" será pequeno, com o ícone TestTube (🧪/🦠), e abrirá o dialog de exames já filtrado para mostrar apenas as culturas.

---

### Mudanças Técnicas

#### Arquivo: `src/components/patient/PatientClinicalData.tsx`

**1. Adicionar imports necessários:**

```typescript
import { TestTube } from 'lucide-react';
import { PatientExamsDialog } from './PatientExamsDialog';
```

**2. Adicionar state para controlar o dialog de exames:**

```typescript
const [isExamsDialogOpen, setIsExamsDialogOpen] = useState(false);
```

**3. Renomear o título da seção:**

```diff
- Infectologia
+ Antibioticoterapia
```

**4. Adicionar botão de culturas no título:**

```tsx
<div className="section-title justify-between">
  <div className="flex items-center gap-2">
    <Pill className="h-4 w-4 text-[hsl(var(--status-atb))]" />
    Antibioticoterapia
  </div>
  
  <div className="flex items-center gap-2">
    {/* Botão Culturas */}
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
      onClick={() => setIsExamsDialogOpen(true)}
    >
      <TestTube className="h-3.5 w-3.5" />
      Culturas
    </Button>
    
    {/* Dropdown existente de adicionar antibiótico */}
    ...
  </div>
</div>
```

**5. Adicionar o PatientExamsDialog no componente:**

```tsx
{/* Dialog de Exames - abre filtrado em Culturas */}
<PatientExamsDialog
  patientId={patient.id}
  isOpen={isExamsDialogOpen}
  onClose={() => setIsExamsDialogOpen(false)}
  onUpdate={onUpdate}
  initialTypeFilter="cultura"  // <- novo prop necessário
/>
```

---

#### Arquivo: `src/components/patient/PatientExamsDialog.tsx`

**1. Adicionar prop opcional para filtro inicial:**

```typescript
interface PatientExamsDialogProps {
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  initialTypeFilter?: ExamType;  // Novo prop
}
```

**2. Usar o filtro inicial quando o dialog abre:**

```typescript
const [typeFilter, setTypeFilter] = useState<ExamType | 'all'>(
  initialTypeFilter || 'all'
);

// Resetar filtro quando o dialog abre com um filtro inicial
useEffect(() => {
  if (isOpen && initialTypeFilter) {
    setTypeFilter(initialTypeFilter);
  }
}, [isOpen, initialTypeFilter]);
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/patient/PatientClinicalData.tsx` | Renomear "Infectologia" → "Antibioticoterapia"; adicionar botão "Culturas" e dialog |
| `src/components/patient/PatientExamsDialog.tsx` | Adicionar prop `initialTypeFilter` para abrir com filtro pré-selecionado |

---

### Resultado Esperado

1. **Nome mais preciso**: "Antibioticoterapia" descreve melhor a seção focada em antibióticos
2. **Acesso rápido às culturas**: Botão "Culturas" abre diretamente a lista de exames microbiológicos
3. **Contexto clínico**: Facilita correlacionar antibióticos com resultados de culturas
4. **UX fluida**: Dialog abre já filtrado, sem passos extras

