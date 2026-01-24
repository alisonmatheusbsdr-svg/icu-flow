
# Plano: Adicionar Opção "Alta" no Modal de Desfecho

## Contexto

O usuário deseja reorganizar as opções de desfecho do paciente, adicionando a opção **"Alta"** (alta direta para casa) e reordenando as opções existentes.

## Nova Estrutura de Desfechos

| Opção | Descrição | Ícone | Cor |
|-------|-----------|-------|-----|
| **Alta** | Alta para casa direto da UTI (raro) | `Heart` | Verde claro |
| **Alta para Enfermaria** | Alta do paciente para enfermaria | `Home` | Verde (emerald) |
| **Transferência Interna** | Transferência entre UTIs | `ArrowRightLeft` | Azul |
| **Transferência Externa** | Transferência para outro serviço | `Building2` | Âmbar |
| **Óbito** | Registro de óbito | `Cross` | Vermelho |

## Alterações Necessárias

### Arquivo: `src/components/patient/PatientDischargeDialog.tsx`

**1. Atualizar tipo DischargeOutcome (linha 42)**

Adicionar `'alta'` ao tipo:

```typescript
type DischargeOutcome = 'alta' | 'alta_enfermaria' | 'transferencia_interna' | 'transferencia_externa' | 'obito';
```

**2. Importar ícone adicional (linha 30)**

Adicionar `HeartPulse` para representar alta domiciliar:

```typescript
import { Loader2, Home, Cross, ArrowRightLeft, Building2, HeartPulse } from 'lucide-react';
```

**3. Atualizar array de opções (linhas 44-49)**

Reorganizar na ordem solicitada:

```typescript
const outcomeOptions: { value: DischargeOutcome; label: string; icon: React.ReactNode; iconColor: string }[] = [
  { value: 'alta', label: 'Alta', icon: <HeartPulse className="h-4 w-4" />, iconColor: 'text-green-500' },
  { value: 'alta_enfermaria', label: 'Alta para Enfermaria', icon: <Home className="h-4 w-4" />, iconColor: 'text-emerald-600' },
  { value: 'transferencia_interna', label: 'Transferência Interna', icon: <ArrowRightLeft className="h-4 w-4" />, iconColor: 'text-blue-600' },
  { value: 'transferencia_externa', label: 'Transferência Externa', icon: <Building2 className="h-4 w-4" />, iconColor: 'text-amber-600' },
  { value: 'obito', label: 'Óbito', icon: <Cross className="h-4 w-4" />, iconColor: 'text-red-600' },
];
```

## Compatibilidade

O valor `'alta'` já existe no enum `patient_outcome` do banco de dados, portanto não são necessárias alterações de schema:

```text
patient_outcome: ["alta", "obito", "transferencia", "alta_enfermaria", "transferencia_externa", "transferencia_interna"]
```

## Resultado Esperado

O modal de desfecho exibirá 5 opções na ordem:
1. Alta (ícone de coração/pulso verde claro)
2. Alta para Enfermaria (ícone de casa verde)
3. Transferência Interna (ícone de setas azul)
4. Transferência Externa (ícone de prédio âmbar)
5. Óbito (ícone de cruz vermelho)
