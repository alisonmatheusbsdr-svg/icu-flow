

# Plano: Seção de Regulação para UTIs com Suportes Externos

## Objetivo

Criar uma nova seção no modal do paciente para registrar e gerenciar solicitações de vagas em UTIs especializadas com suportes externos (Neurologia, Cardiologia, Crônicos, Torácica, etc.).

## Localização

A seção será adicionada abaixo das "Precauções" no componente `PatientClinicalData`, na área indicada na imagem:

```
┌─────────────────────────────────────────────────────────┐
│ PENDÊNCIAS                                              │
│ ☐ Trocar CVC (D21)                                      │
│ ☐ Repetir culturas de vigilância                        │
│ ☐ Discutir caso com família                             │
│ ☐ Avaliar necessidade de TQT                            │
├─────────────────────────────────────────────────────────┤
│ ⚠ PRECAUÇÕES                                        [+] │
│ [Sepse x] [Choque x] [LPP x] [Isolamento Aerossóis x]  │
├─────────────────────────────────────────────────────────┤
│ 🏥 REGULAÇÃO                                        [+] │  ← NOVA SEÇÃO
│ [Neuro - Aguardando 📅 27/01] [Cardio - Negado x]      │
└─────────────────────────────────────────────────────────┘
```

## Funcionalidades

| Ação | Descrição |
|------|-----------|
| Adicionar | Escolher tipo de suporte (dropdown) e registrar solicitação |
| Status | Aguardando, Confirmado, Negado |
| Remover | Clicar no "x" para cancelar/remover solicitação |
| Visualizar | Badges coloridas mostrando tipo + status + data |

## Tipos de Suporte Externo

- **Neurologia** (Neurocirurgia, AVC)
- **Cardiologia** (Hemodinâmica, Pós-op cardíaco)
- **Crônicos** (Ventilação prolongada)
- **Torácica** (Cirurgia torácica)
- **Oncologia** (Tratamento oncológico)
- **Nefrologia** (Diálise, Transplante renal)
- **Outros** (Campo livre)

## Cores dos Status

| Status | Cor | Significado |
|--------|-----|-------------|
| Aguardando | Amarelo/Âmbar | Solicitação ativa, aguardando resposta |
| Confirmado | Verde | Vaga confirmada, aguardando transferência |
| Negado | Vermelho | Solicitação negada |

---

## Seção Técnica

### 1. Nova Tabela no Banco de Dados

```sql
CREATE TABLE patient_regulation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  support_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aguardando',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID NOT NULL
);

ALTER TABLE patient_regulation ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Approved users can view regulation"
  ON patient_regulation FOR SELECT
  USING (is_approved(auth.uid()));

CREATE POLICY "Approved users can insert regulation"
  ON patient_regulation FOR INSERT
  WITH CHECK (is_approved(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Approved users can update regulation"
  ON patient_regulation FOR UPDATE
  USING (is_approved(auth.uid()));

CREATE POLICY "Approved users can delete regulation"
  ON patient_regulation FOR DELETE
  USING (is_approved(auth.uid()));
```

### 2. Atualizar Types (src/types/database.ts)

Adicionar nova interface:

```typescript
export interface PatientRegulation {
  id: string;
  patient_id: string;
  support_type: string;
  status: 'aguardando' | 'confirmado' | 'negado';
  requested_at: string;
  updated_at: string;
  is_active: boolean;
  notes: string | null;
  created_by: string;
}
```

Adicionar ao `PatientWithDetails`:

```typescript
export interface PatientWithDetails extends Patient {
  // ... existing fields ...
  patient_regulation?: PatientRegulation[];
}
```

### 3. Novo Componente (src/components/patient/PatientRegulation.tsx)

Componente seguindo o padrão do `PatientPrecautions`:

- Header com ícone 🏥 e botão "+"
- Dialog para adicionar nova solicitação
- Dropdown com tipos de suporte
- Lista de badges removíveis com status colorido
- Popover para editar status (Aguardando → Confirmado/Negado)

Estrutura do componente:

```typescript
const SUPPORT_TYPES = [
  { type: 'NEUROLOGIA', label: 'Neurologia', emoji: '🧠' },
  { type: 'CARDIOLOGIA', label: 'Cardiologia', emoji: '❤️' },
  { type: 'CRONICOS', label: 'Crônicos', emoji: '🏥' },
  { type: 'TORACICA', label: 'Torácica', emoji: '🫁' },
  { type: 'ONCOLOGIA', label: 'Oncologia', emoji: '🎗️' },
  { type: 'NEFROLOGIA', label: 'Nefrologia', emoji: '💧' },
] as const;

const STATUS_STYLES = {
  aguardando: 'bg-amber-100 text-amber-800 border-amber-300',
  confirmado: 'bg-green-100 text-green-800 border-green-300',
  negado: 'bg-red-100 text-red-800 border-red-300',
};
```

### 4. Atualizar PatientModal.tsx

Buscar dados de regulação junto com os outros dados do paciente:

```typescript
// Na função fetchPatient, adicionar:
const regulationRes = await supabase
  .from('patient_regulation')
  .select('*')
  .eq('patient_id', patientId)
  .eq('is_active', true);

// Adicionar ao patientWithDetails:
patient_regulation: regulationRes.data || []
```

### 5. Atualizar PatientClinicalData.tsx

Importar e renderizar o novo componente após as Precauções:

```tsx
import { PatientRegulation } from './PatientRegulation';

// No JSX, após PatientPrecautions:
<PatientRegulation 
  patient={patient} 
  onUpdate={onUpdate} 
/>
```

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar tabela `patient_regulation` com RLS |
| `src/types/database.ts` | Adicionar interface `PatientRegulation` |
| `src/components/patient/PatientRegulation.tsx` | **Novo** - Componente da seção |
| `src/components/patient/PatientModal.tsx` | Buscar dados de regulação |
| `src/components/patient/PatientClinicalData.tsx` | Renderizar nova seção |

### Fluxo de Uso

```
1. Usuário abre modal do paciente
2. Clica em [+] na seção "Regulação"
3. Dialog abre com dropdown de tipos de suporte
4. Seleciona "Neurologia" (por exemplo)
5. Clica "Adicionar" → Badge aparece: [Neuro - Aguardando 📅 27/01]
6. Clica na badge para editar status → Popover com opções
7. Seleciona "Confirmado" → Badge fica verde
8. Ou clica no "x" para remover/cancelar
```

