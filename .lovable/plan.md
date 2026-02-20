
# Nova Seção: Balanço Hídrico (Últimas 12h de Plantão)

## Objetivo

Adicionar uma seção de Balanço Hídrico no modal do paciente, permitindo registrar entradas e saídas de volume das últimas 12 horas de plantão, com cálculo automático do saldo.

---

## Experiência do Usuário

- Uma nova seção "Balanço Hídrico" aparece na coluna esquerda do modal (dentro de `PatientClinicalData`), junto com as demais seções clínicas
- Exibe o saldo atual (Entradas − Saídas) com destaque visual: verde se positivo, vermelho se negativo
- Usuários com permissão de edição (`canEdit`) podem lançar valores de entrada e saída com dois campos numéricos simples (em mL)
- O registro é cumulativo dentro do mesmo turno de 12h — cada clique em "+" adiciona ao total

---

## Arquitetura da Solução

Como o balanço hídrico muda a cada plantão (12h), o dado precisa ser **persistido no banco**, e não apenas em estado local. Isso garante que todos os membros da equipe vejam o mesmo valor em tempo real.

### 1. Banco de Dados — Nova Tabela `fluid_balance`

```text
fluid_balance
├── id (uuid, PK)
├── patient_id (uuid, FK → patients)
├── shift_start (timestamptz) — início do turno de 12h
├── intake_ml (integer, default 0) — total de entradas
├── output_ml (integer, default 0) — total de saídas
├── created_by (uuid)
├── updated_by (uuid)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

RLS: usuários autenticados podem ler e editar registros da sua unidade.

### 2. Lógica de Turno

O turno de 12h é calculado automaticamente no frontend:
- Turno A: 07:00–19:00
- Turno B: 19:00–07:00

O registro ativo é sempre o do turno corrente. Se não existir, cria-se automaticamente ao primeiro lançamento.

### 3. Interface — Nova Seção em `PatientClinicalData`

Ícone: `Droplets` (lucide-react)

Layout:
```text
┌─────────────────────────────────────┐
│ 💧 Balanço Hídrico (plantão 12h)   │
├─────────────────────────────────────┤
│ Saldo: +450 mL  (destaque colorido) │
│                                     │
│ Entradas: [____] mL  [+ Adicionar]  │
│ Saídas:   [____] mL  [+ Adicionar]  │
│                                     │
│ Entradas: 1200 mL  |  Saídas: 750 mL│
└─────────────────────────────────────┘
```

### 4. Dados no `PatientWithDetails`

Será necessário buscar o balanço hídrico do turno atual junto com os outros dados do paciente na função `fetchPatient` do `PatientModal.tsx`.

---

## Arquivos a Modificar/Criar

| Arquivo | Ação |
|---|---|
| `supabase/migrations/...sql` | Criar tabela `fluid_balance` com RLS |
| `src/types/database.ts` | Adicionar interface `FluidBalance` e incluir em `PatientWithDetails` |
| `src/components/patient/PatientClinicalData.tsx` | Adicionar seção de Balanço Hídrico com lógica de turno e CRUD |
| `src/components/patient/PatientModal.tsx` | Buscar `fluid_balance` no `fetchPatient` e passar para `PatientClinicalData` |

---

## Comportamento de Negócio

- O saldo é **zerado automaticamente** a cada novo turno (novo registro criado)
- Lançamentos são **aditivos**: somar ao valor já existente (não substituir)
- Campo de entrada aceita apenas números inteiros positivos (mL)
- Saldo positivo = balanço hídrico positivo (mais entradas que saídas) — exibido em azul/verde
- Saldo negativo — exibido em laranja/vermelho
- Somente `canEdit` pode lançar valores; todos podem visualizar
