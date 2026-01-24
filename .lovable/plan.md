
# Plano: Modo de Passagem de Plantão

## Objetivo

Permitir que, durante a passagem de plantão, dois plantonistas visualizem a mesma UTI simultaneamente:
- **O plantonista ativo** clica em "Liberar para Passagem"
- **Um segundo plantonista** pode entrar em **modo visualização** (sem edição)
- **Após a passagem**, o novo assume e o anterior encerra a sessão

## Fluxo de Uso

```text
┌─────────────────────────────────────────────────────────────────────┐
│  PLANTONISTA ATIVO (Dr. João)                                       │
│                                                                     │
│  Header: [UTI Adulto] [25min] [🔓 Liberar para Passagem]            │
│                           ↓ clique                                  │
│  Header: [UTI Adulto] [25min] [🔴 Em Passagem] [Encerrar Passagem]  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  TELA DE SELEÇÃO DE UTI (Dr. Maria)                                 │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────┐        │
│  │ UTI Adulto                                              │        │
│  │ 🔴 Em passagem (Dr. João)                               │        │
│  │                                                         │        │
│  │ [Entrar para Receber Plantão]   ← só visível em modo    │        │
│  │                                   passagem              │        │
│  └─────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PLANTONISTA RECEBENDO (Dr. Maria) - MODO VISUALIZAÇÃO              │
│                                                                     │
│  Header: [UTI Adulto] [👁️ Visualizando]                             │
│                                                                     │
│  ⚠️ Banner: "Você está em modo visualização. Aguarde a conclusão    │
│              da passagem para editar."                              │
│                                                                     │
│  [Botões de edição desabilitados]                                   │
│  [Assumir Plantão] ← ao clicar, assume como bloqueante              │
└─────────────────────────────────────────────────────────────────────┘
```

## Alterações no Banco de Dados

### 1. Adicionar coluna `handover_mode` na tabela `active_sessions`

```sql
ALTER TABLE public.active_sessions 
ADD COLUMN handover_mode BOOLEAN NOT NULL DEFAULT false;
```

**Lógica:**
- `handover_mode = true` → UTI está em passagem, permite segunda sessão não-bloqueante
- `handover_mode = false` → comportamento normal (exclusivo)

### 2. Modificar unique index para permitir segunda sessão em modo passagem

O índice atual `idx_active_sessions_blocking_unit` impede mais de uma sessão bloqueante por UTI. Isso já está correto - a sessão de visualização será `is_blocking = false`.

### 3. Adicionar coluna `is_handover_receiver` para identificar quem está recebendo

```sql
ALTER TABLE public.active_sessions 
ADD COLUMN is_handover_receiver BOOLEAN NOT NULL DEFAULT false;
```

**Lógica:**
- `is_handover_receiver = true` → está recebendo o plantão (modo visualização)
- `is_handover_receiver = false` → sessão normal

## Alterações no Frontend

### 1. Atualizar `useUnit.tsx`

Adicionar:
- `isInHandoverMode: boolean` - se a sessão atual está em modo passagem
- `isHandoverReceiver: boolean` - se o usuário é quem está recebendo
- `startHandoverMode(): Promise<void>` - plantonista ativo libera para passagem
- `endHandoverMode(): Promise<void>` - encerra modo passagem
- `joinAsHandoverReceiver(unitId): Promise<{ error: string | null }>` - entrar como receptor
- `assumeShift(): Promise<void>` - receptor assume como bloqueante

Atualizar interface `ActiveSession`:
```typescript
interface ActiveSession {
  // ... campos existentes
  handover_mode: boolean;
  is_handover_receiver: boolean;
}
```

### 2. Atualizar `DashboardHeader.tsx`

Adicionar botões condicionais:
- **Se plantonista ativo e não em passagem**: `[🔓 Liberar para Passagem]`
- **Se plantonista ativo e em passagem**: `[🔴 Em Passagem] [Encerrar Passagem]`
- **Se receptor de passagem**: `[👁️ Visualizando] [Assumir Plantão]`

### 3. Atualizar `SelectUnit.tsx`

Mostrar opção diferenciada quando UTI está em modo passagem:
- Badge: "🔴 Em passagem" ao invés de "🔒 Ocupada"
- Botão: "Entrar para Receber Plantão" (visível para plantonistas)

### 4. Criar contexto de permissão de edição

Novo hook ou extensão do `useUnit`:
```typescript
const { canEdit } = useUnit();
// canEdit = false se is_handover_receiver = true
```

### 5. Desabilitar edições no modo visualização

Componentes afetados:
- `PatientEvolutions.tsx` - textarea e botões disabled
- `TherapeuticPlan.tsx` - botão "Editar" disabled
- `PatientClinicalData.tsx` - todos os botões de adicionar/editar disabled
- `PatientTasks.tsx` - checkbox e adicionar disabled
- `PatientPrecautions.tsx` - toggles disabled
- `PatientModal.tsx` - botões "Evoluir", "Editar Dados" disabled

Abordagem: passar prop `readOnly={!canEdit}` ou usar contexto global.

### 6. Banner de modo visualização

Adicionar banner no topo do `Dashboard.tsx` quando `isHandoverReceiver`:
```tsx
{isHandoverReceiver && (
  <Alert variant="warning" className="m-4">
    <Eye className="h-4 w-4" />
    <AlertDescription>
      Você está em modo visualização. Clique em "Assumir Plantão" para começar a editar.
    </AlertDescription>
  </Alert>
)}
```

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/xxx_handover_mode.sql` | **Criar** - adicionar colunas |
| `src/hooks/useUnit.tsx` | **Modificar** - adicionar lógica de passagem |
| `src/components/dashboard/DashboardHeader.tsx` | **Modificar** - botões de passagem |
| `src/pages/SelectUnit.tsx` | **Modificar** - mostrar modo passagem |
| `src/pages/Dashboard.tsx` | **Modificar** - banner de visualização |
| `src/components/patient/PatientEvolutions.tsx` | **Modificar** - prop readOnly |
| `src/components/patient/TherapeuticPlan.tsx` | **Modificar** - prop readOnly |
| `src/components/patient/PatientClinicalData.tsx` | **Modificar** - prop readOnly |
| `src/components/patient/PatientTasks.tsx` | **Modificar** - prop readOnly |
| `src/components/patient/PatientPrecautions.tsx` | **Modificar** - prop readOnly |
| `src/components/patient/PatientModal.tsx` | **Modificar** - botões disabled |

## Regras de Negócio

1. **Apenas plantonista ativo pode liberar passagem**
   - Botão visível só para quem tem `is_blocking = true`

2. **Apenas um receptor por vez**
   - Quando alguém entra como receptor, outros veem UTI como ocupada

3. **Timeout do modo passagem**
   - Após 30 minutos em modo passagem sem receptor assumir, volta ao normal

4. **Receptor pode assumir a qualquer momento**
   - Ao assumir, sua sessão vira `is_blocking = true`
   - Sessão do plantonista anterior é encerrada automaticamente

5. **Plantonista pode cancelar passagem**
   - Botão "Encerrar Passagem" remove o modo e expulsa o receptor

## Segurança (RLS)

As policies existentes já cobrem:
- Usuários só podem inserir/atualizar suas próprias sessões
- Admins/Coordenadores podem deletar qualquer sessão

Adicionar validação no frontend para evitar que receptor tente editar dados.

## Resultado Esperado

- Passagem de plantão segura e controlada
- Dois usuários podem ver a mesma UTI simultaneamente
- Quem está recebendo não pode editar (evita conflitos)
- Transição clara quando o novo plantonista assume
