
# Plano: Botão de Impressão na Visão Geral (Coordenador/Diarista)

## Contexto

Adicionar um botão de impressão (ícone de impressora) no header de cada unidade na tela "Visão Geral das UTIs". Isso permite que Coordenadores e Diaristas imprimam os dados de uma UTI específica diretamente da visão panorâmica, sem precisar entrar na unidade.

## Localização do Botão

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 UTI 1 - HMA    [👥 10/10] [↗ 5 altas] [⚠ 3 críticos] [🖨️] [▼]      │
│                                                          ↑              │
│                                                    NOVO BOTÃO           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Alterações

### Arquivo: `src/components/dashboard/AllUnitsGrid.tsx`

**1. Adicionar imports necessários**

```typescript
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnitPrintPreviewModal } from '@/components/print/UnitPrintPreviewModal';
import { toast } from 'sonner';
import type { PatientWithDetails, Profile } from '@/types/database';
```

**2. Adicionar interface PatientPrintData**

```typescript
interface PatientPrintData {
  patient: PatientWithDetails;
  bedNumber: number;
  evolutionSummary: string | null;
  authorProfiles: Record<string, Profile>;
}
```

**3. Adicionar estados para controle de impressão**

```typescript
// Estados de impressão
const [printingUnitId, setPrintingUnitId] = useState<string | null>(null);
const [isPrintLoading, setIsPrintLoading] = useState(false);
const [printLoadingStatus, setPrintLoadingStatus] = useState('Carregando...');
const [printPatients, setPrintPatients] = useState<PatientPrintData[]>([]);
const [printUnitName, setPrintUnitName] = useState('');
```

**4. Adicionar função handlePrintUnit**

Reutilizar a mesma lógica do `BedGrid`:
- Buscar leitos ocupados da unidade
- Buscar pacientes ativos
- Buscar dados clínicos em paralelo
- Gerar resumos IA para pacientes com 3+ evoluções
- Ordenar por número do leito
- Abrir modal de preview

**5. Adicionar botão no header de cada unidade**

Dentro do `CollapsibleTrigger`, antes dos badges:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-7 w-7"
  onClick={(e) => {
    e.stopPropagation(); // Evita toggle do Collapsible
    handlePrintUnit(unit.id, unit.name);
  }}
  disabled={stats.occupied === 0 || printingUnitId === unit.id}
>
  {printingUnitId === unit.id ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Printer className="h-4 w-4" />
  )}
</Button>
```

**6. Adicionar modal de preview**

No final do componente, antes do fechamento:

```tsx
<UnitPrintPreviewModal
  isOpen={!!printingUnitId && !isPrintLoading}
  onClose={handleClosePrintPreview}
  unitName={printUnitName}
  patients={printPatients}
  isLoading={isPrintLoading}
  loadingStatus={printLoadingStatus}
/>
```

## Fluxo de Uso

```text
1. Coordenador/Diarista na Visão Geral
2. Clica no ícone 🖨️ de uma UTI
3. Loading aparece no botão
4. Modal de preview abre com todos os pacientes
5. Pode navegar entre pacientes ou imprimir todos
```

## Resultado Esperado

- Botão de impressora visível no header de cada unidade
- Desabilitado quando a unidade não tem pacientes ocupados
- Loading visual durante carregamento
- Abre o mesmo modal de preview usado no BedGrid
- Permite imprimir paciente atual ou todos da unidade
