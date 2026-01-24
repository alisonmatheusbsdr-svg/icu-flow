
# Plano: Adicionar Impressão por UTI na Visão Geral do Coordenador

## Objetivo

Permitir que o coordenador imprima os pacientes de uma UTI específica diretamente da "Visão Geral", adicionando um botão de impressão no cabeçalho de cada seção colapsável de UTI.

## Situação Atual

- **BedGrid**: Já possui a lógica completa de impressão (`handlePrintUnit`) com:
  - Carregamento de dados clínicos
  - Geração de resumos IA
  - Abertura do `UnitPrintPreviewModal`
  
- **AllUnitsGrid**: Mostra todas as UTIs, mas não possui opção de impressão

## Abordagem

Extrair a lógica de impressão para um **hook reutilizável** (`useUnitPrint`) e usá-lo tanto no `BedGrid` quanto no `AllUnitsGrid`.

## Alterações

### 1. Criar Hook `useUnitPrint`

**Novo arquivo:** `src/hooks/useUnitPrint.ts`

Extrair toda a lógica de impressão do `BedGrid`:

```typescript
export function useUnitPrint() {
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [isPrintLoading, setIsPrintLoading] = useState(false);
  const [printLoadingStatus, setPrintLoadingStatus] = useState('Carregando...');
  const [printPatients, setPrintPatients] = useState<PatientPrintData[]>([]);
  const [printUnitName, setPrintUnitName] = useState('');

  const startPrint = async (unitId: string, unitName: string) => {
    // ... lógica atual do handlePrintUnit
  };

  const closePrint = () => {
    setIsPrintMode(false);
    setPrintPatients([]);
    setPrintUnitName('');
  };

  return {
    isPrintMode,
    isPrintLoading,
    printLoadingStatus,
    printPatients,
    printUnitName,
    startPrint,
    closePrint
  };
}
```

### 2. Simplificar `BedGrid`

Substituir a lógica interna pelo novo hook:

```typescript
const { 
  isPrintMode, isPrintLoading, printLoadingStatus, 
  printPatients, startPrint, closePrint 
} = useUnitPrint();

const handlePrintUnit = () => startPrint(unitId, unitName);
```

### 3. Adicionar Impressão no `AllUnitsGrid`

**Modificar:** `src/components/dashboard/AllUnitsGrid.tsx`

#### 3.1 Importar dependências

```typescript
import { UnitPrintPreviewModal } from '@/components/print/UnitPrintPreviewModal';
import { useUnitPrint } from '@/hooks/useUnitPrint';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import '@/components/print/print-styles.css';
```

#### 3.2 Usar o hook

```typescript
const { 
  isPrintMode, isPrintLoading, printLoadingStatus, 
  printPatients, printUnitName, startPrint, closePrint 
} = useUnitPrint();
```

#### 3.3 Adicionar botão no cabeçalho da UTI

No `CollapsibleTrigger`, adicionar um botão de impressão ao lado dos badges:

```tsx
<div className="flex items-center gap-3">
  {/* Badges existentes... */}
  
  {/* Botão de impressão */}
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7"
    onClick={(e) => {
      e.stopPropagation(); // Evita toggle do collapsible
      startPrint(unit.id, unit.name);
    }}
    disabled={stats.occupied === 0}
  >
    <Printer className="h-4 w-4" />
  </Button>
  
  <ChevronDown className="h-4 w-4 ..." />
</div>
```

#### 3.4 Adicionar Modal

No final do componente, antes do fechamento:

```tsx
<UnitPrintPreviewModal
  isOpen={isPrintMode}
  onClose={closePrint}
  unitName={printUnitName}
  patients={printPatients}
  isLoading={isPrintLoading}
  loadingStatus={printLoadingStatus}
/>
```

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useUnitPrint.ts` | **Criar** - hook reutilizável |
| `src/components/dashboard/BedGrid.tsx` | **Modificar** - usar o hook |
| `src/components/dashboard/AllUnitsGrid.tsx` | **Modificar** - adicionar botão e modal |

## Layout Visual do Botão

```text
┌──────────────────────────────────────────────────────────────┐
│ 🏥 UTI Adulto                                                │
│                     [10/12] [2 altas] [1 bloq] [🖨️] [▼]      │
├──────────────────────────────────────────────────────────────┤
│  [Card] [Card] [Card] [Card] [Card] [Card]                   │
│  [Card] [Card] [Card] [Card] [Card] [Card]                   │
└──────────────────────────────────────────────────────────────┘
```

O ícone 🖨️ representa o novo botão de impressão.

## Considerações

1. **`stopPropagation`**: Necessário para evitar que o clique no botão abra/feche o collapsible
2. **Desabilitar se vazio**: Se não há pacientes (`stats.occupied === 0`), o botão fica desabilitado
3. **Tooltip opcional**: Pode adicionar tooltip "Imprimir UTI" para clareza
4. **Reutilização**: O hook permite usar a mesma lógica em ambos os componentes

## Resultado Esperado

O coordenador poderá clicar no ícone de impressora em qualquer UTI da Visão Geral e abrir o preview de impressão daquela unidade específica.
