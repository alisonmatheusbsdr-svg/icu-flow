
# Plano: Corrigir Persistência do Erro de RLS no Desfecho por Plantonista

## Diagnóstico

### Problema Atual
O erro de RLS continua ocorrendo mesmo após a migração que adicionou a cláusula `WITH CHECK`. A análise detalhada revelou que:

1. A migração `20260205120728` foi aplicada corretamente
2. A cláusula `WITH CHECK` permite `bed_id = NULL` (verificado diretamente no banco)
3. O problema está na **cláusula USING**, não na WITH CHECK

### Causa Raiz
A cláusula `USING` da política de UPDATE ainda exige **sessão ativa** para acessar o registro do paciente:

```text
┌──────────────────────────────────────────────────────────────────┐
│ Cenário de Falha                                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Plantonista abre modal do paciente (sessão ativa: 25min)     │
│  2. Navega pelo sistema, faz outras coisas                       │
│  3. Volta ao modal para confirmar desfecho (sessão: 32min)       │
│  4. Sessão EXPIROU (>30 min de inatividade)                      │
│  5. USING retorna FALSE → Acesso negado ao registro              │
│  6. UPDATE falha com "violates row-level security"               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

O heartbeat acontece ao clicar/teclar/scroll no **Dashboard**, mas quando o usuário está dentro de um **modal** do paciente, as interações podem não estar triggando o heartbeat corretamente.

### Verificação Adicional
A sessão do plantonista de teste (`dcddc2aa-66ed-464e-8d30-c868d6fdc63f`) mostra:
- `last_activity`: 2026-02-05 12:21:25
- `time_since_last_activity`: 01:24:41 (expirada)

## Solução

Implementar duas correções:

### 1. Atualizar Heartbeat no Modal do Paciente
Adicionar listener de atividade na página de detalhes do paciente (`PatientDetails.tsx`), garantindo que interações dentro do modal também atualizem a sessão.

### 2. Atualizar Sessão Antes de Operações Críticas
Modificar `PatientDischargeDialog` para chamar `updateActivity()` antes de executar o UPDATE, garantindo que a sessão esteja ativa no momento da operação.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/PatientDetails.tsx` | Adicionar listener de atividade como no Dashboard |
| `src/components/patient/PatientDischargeDialog.tsx` | Chamar `updateActivity` antes do UPDATE |

## Detalhes Técnicos

### PatientDetails.tsx

```typescript
// Adicionar imports
import { useUnit } from '@/hooks/useUnit';
import { useCallback, useRef, useEffect } from 'react';

// Dentro do componente
const { updateActivity, activeSession } = useUnit();
const lastActivityUpdate = useRef<number>(0);
const ACTIVITY_DEBOUNCE_MS = 30 * 1000; // 30 seconds

const handleUserActivity = useCallback(() => {
  if (!activeSession) return;
  const now = Date.now();
  if (now - lastActivityUpdate.current >= ACTIVITY_DEBOUNCE_MS) {
    lastActivityUpdate.current = now;
    updateActivity();
  }
}, [activeSession, updateActivity]);

useEffect(() => {
  if (!activeSession) return;
  window.addEventListener('click', handleUserActivity);
  window.addEventListener('keypress', handleUserActivity);
  window.addEventListener('scroll', handleUserActivity);

  return () => {
    window.removeEventListener('click', handleUserActivity);
    window.removeEventListener('keypress', handleUserActivity);
    window.removeEventListener('scroll', handleUserActivity);
  };
}, [activeSession, handleUserActivity]);
```

### PatientDischargeDialog.tsx

```typescript
// Adicionar import
import { useUnit } from '@/hooks/useUnit';

// Dentro do componente
const { updateActivity } = useUnit();

const handleDischarge = async () => {
  if (!outcome) return;
  setIsLoading(true);

  try {
    // Atualizar sessão antes da operação crítica
    await updateActivity();
    
    const { error: patientError } = await supabase
      .from('patients')
      .update({...})
      .eq('id', patientId);
    // ... resto do código
  }
}
```

## Resultado Esperado

1. Interações na página de detalhes do paciente também atualizam a sessão
2. Antes de operações críticas (desfecho), a sessão é explicitamente atualizada
3. Plantonistas conseguem registrar desfechos mesmo após navegação prolongada
4. Nenhuma alteração em políticas RLS necessária (já estão corretas)

## Segurança Mantida

- A lógica de sessão ativa continua sendo verificada
- Apenas a atualização de atividade é acionada automaticamente
- Não há bypass de segurança - apenas garantia de que sessões válidas não expirem indevidamente

## Testes Sugeridos

1. Login como plantonista
2. Abrir modal do paciente
3. Aguardar alguns minutos sem interação
4. Confirmar que clicar no modal atualiza a sessão
5. Registrar desfecho com sucesso
