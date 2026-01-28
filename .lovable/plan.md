
# Plano: Implementação do NIR (Núcleo Interno de Regulação)

## Visão Geral

O NIR (Núcleo Interno de Regulação) é um setor hospitalar que atua como elo entre a equipe assistencial e os hospitais externos. Precisa de um novo papel (role) no sistema com permissões específicas.

## Modelo de Permissões

| Role | Visualizar Pacientes | Editar Dados Clínicos | Regulação: Solicitar/Cancelar | Regulação: Alterar Status/Justificativa |
|------|---------------------|----------------------|-------------------------------|----------------------------------------|
| Plantonista | Sim | Sim | Sim | Nao |
| Diarista | Sim | Sim | Sim | Nao |
| Coordenador | Sim | Sim | Sim | Nao |
| **NIR** | **Sim (somente leitura)** | **Nao** | **Nao** | **Sim (exclusivo)** |
| Admin | Sim | Sim | Sim | Sim |

## Fluxo de Trabalho

```text
1. Equipe Assistencial solicita regulacao (Cardiologia, Neurologia, etc.)
   - Status inicial: "Aguardando"
   
2. NIR recebe a solicitacao no seu dashboard
   - Ve todos os pacientes com regulacoes ativas
   - Clica no botao de regulacao abaixo do card
   
3. NIR atualiza o status:
   - "Confirmado" - vaga aprovada
   - "Negado" - vaga recusada (com justificativa obrigatoria)
   - "Aguardando" - ainda em analise
   
4. Equipe ve o status atualizado no modal do paciente
```

## Interface do NIR

O NIR tera uma visao panoramica similar ao Coordenador, mas com foco em regulacao:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Sinapse | UTI                          [Perfil] [Sair]          │
├─────────────────────────────────────────────────────────────────┤
│ 🏥 Painel de Regulacao                                          │
│ Filtros: [Todas UTIs ▼] [Todos Status ▼]                        │
├─────────────────────────────────────────────────────────────────┤
│ UTI Adulto                                                      │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│ │ Leito 1     │  │ Leito 5     │  │ Leito 8     │               │
│ │ ABC         │  │ XYZ         │  │ JKL         │               │
│ │ 65 anos     │  │ 72 anos     │  │ 58 anos     │               │
│ │ [TOT] [DVA] │  │ [VNI]       │  │ [TQT]       │               │
│ │             │  │             │  │             │               │
│ │ [Regulacao] │  │ [Regulacao] │  │ [Regulacao] │  <- Botao NIR │
│ └─────────────┘  └─────────────┘  └─────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Dialog de Regulacao (ao clicar no botao)

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🏥 Regulacao - ABC (Leito 1)                              [x]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Solicitacoes Ativas:                                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🧠 Neurologia                                                │ │
│ │ Solicitado em: 27/01/2026 14:30                             │ │
│ │                                                              │ │
│ │ Status: [Aguardando ▼]                                       │ │
│ │                                                              │ │
│ │ Justificativa:                                               │ │
│ │ ┌───────────────────────────────────────────────────────┐   │ │
│ │ │ (obrigatorio para status "Negado")                    │   │ │
│ │ └───────────────────────────────────────────────────────┘   │ │
│ │                                                              │ │
│ │                                        [Salvar Alteracoes]   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ❤️ Cardiologia (Confirmado em 26/01)                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Mudancas na Regulacao Existente

O componente `PatientRegulation` tera comportamento diferente baseado no role:

| Acao | Equipe Assistencial | NIR |
|------|---------------------|-----|
| Adicionar nova solicitacao | Sim | Nao |
| Remover/Cancelar solicitacao | Sim | Nao |
| Alterar status (Aguardando/Confirmado/Negado) | Nao | Sim |
| Adicionar justificativa | Nao | Sim |

---

## Secao Tecnica

### 1. Adicionar Novo Role ao Enum

```sql
ALTER TYPE app_role ADD VALUE 'nir';
```

### 2. Atualizar Funcao has_role

A funcao `has_role` ja existe e funcionara automaticamente com o novo role.

### 3. Adicionar Coluna de Justificativa na Tabela patient_regulation

```sql
ALTER TABLE patient_regulation 
ADD COLUMN denial_reason TEXT,
ADD COLUMN updated_by UUID REFERENCES auth.users(id);
```

### 4. Atualizar RLS Policies da Regulacao

```sql
-- NIR pode atualizar status e justificativa
DROP POLICY IF EXISTS "Approved users can update regulation" ON patient_regulation;

CREATE POLICY "NIR and admins can update regulation status"
  ON patient_regulation FOR UPDATE
  USING (
    is_approved(auth.uid()) AND 
    (has_role(auth.uid(), 'nir') OR has_role(auth.uid(), 'admin'))
  );

-- Equipe assistencial pode cancelar (soft delete via is_active)
CREATE POLICY "Care team can deactivate own regulations"
  ON patient_regulation FOR UPDATE
  USING (
    is_approved(auth.uid()) AND 
    NOT has_role(auth.uid(), 'nir')
  )
  WITH CHECK (
    -- So pode atualizar is_active para false
    is_active = false
  );
```

### 5. Atualizar types/database.ts

```typescript
export type AppRole = 'admin' | 'diarista' | 'plantonista' | 'coordenador' | 'nir';

export interface PatientRegulation {
  // ... campos existentes ...
  denial_reason: string | null;
  updated_by: string | null;
}
```

### 6. Atualizar useUnit.tsx

Adicionar NIR aos roles privilegiados (pode ver todas as unidades):

```typescript
const PRIVILEGED_ROLES = ['admin', 'coordenador', 'diarista', 'nir'];

// NIR tem canEdit = false (somente visualizacao)
const canEdit = !isHandoverReceiver && !roles.includes('nir');

// Nova flag para identificar NIR
const isNIR = roles.includes('nir');
```

### 7. Atualizar useAuth.tsx

Exportar o contexto com a nova verificacao de NIR.

### 8. Criar Componente NIRDashboard

Novo componente `src/components/nir/NIRDashboard.tsx`:

- Grid de todas as UTIs (similar a AllUnitsGrid)
- Filtro por status de regulacao
- Cards de pacientes com botao "Regulacao" abaixo
- Mostra apenas pacientes com regulacoes ativas

### 9. Criar Componente NIRRegulationDialog

Novo componente `src/components/nir/NIRRegulationDialog.tsx`:

- Abre ao clicar no botao de regulacao
- Lista todas as regulacoes do paciente
- Permite alterar status
- Campo de justificativa (obrigatorio para "Negado")
- Botao salvar

### 10. Atualizar PatientRegulation.tsx

```typescript
const { hasRole } = useAuth();
const { canEdit } = useUnit();
const isNIR = hasRole('nir');

// Equipe pode adicionar/remover, NIR nao
const canManageRequests = canEdit && !isNIR;

// NIR pode alterar status, equipe nao
const canUpdateStatus = isNIR || hasRole('admin');
```

### 11. Atualizar Dashboard.tsx

```typescript
const isNIR = hasRole('nir');

// NIR usa dashboard especial
if (isNIR && (showAllUnits || !selectedUnit)) {
  return <NIRDashboard />;
}
```

### 12. Atualizar UserManagement.tsx

Adicionar NIR a lista de roles:

```typescript
const ROLES = [
  { value: 'plantonista', label: 'Plantonista' },
  { value: 'diarista', label: 'Diarista' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'nir', label: 'NIR (Regulacao)' },
  { value: 'admin', label: 'Administrador' },
];
```

### Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Adicionar role 'nir', coluna denial_reason, atualizar RLS |
| `src/types/database.ts` | Adicionar 'nir' ao AppRole, atualizar PatientRegulation |
| `src/hooks/useUnit.tsx` | Adicionar NIR aos privilegiados, flag isNIR |
| `src/hooks/useAuth.tsx` | Garantir que hasRole funciona com 'nir' |
| `src/components/nir/NIRDashboard.tsx` | **Novo** - Dashboard do NIR |
| `src/components/nir/NIRRegulationDialog.tsx` | **Novo** - Dialog de edicao de regulacao |
| `src/components/nir/NIRBedCard.tsx` | **Novo** - Card com botao de regulacao |
| `src/components/patient/PatientRegulation.tsx` | Logica condicional por role |
| `src/pages/Dashboard.tsx` | Renderizar NIRDashboard para role NIR |
| `src/components/admin/UserManagement.tsx` | Adicionar NIR a lista de roles |
