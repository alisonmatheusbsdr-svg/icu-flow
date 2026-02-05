
# Plano: Corrigir RLS de Patients para Permitir Desfecho por Plantonista

## Diagnóstico

### Problema Identificado
O log do banco de dados mostra:
```
new row violates row-level security policy for table "patients"
```

### Causa Raiz
A política de UPDATE na tabela `patients` foi recentemente alterada para exigir segurança baseada em sessão ativa. O problema ocorre na seguinte sequência:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Plantonista tenta registrar DESFECHO (Transferência Externa)   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  UPDATE patients SET                                            │
│    bed_id = NULL,        ← Libera o leito                       │
│    is_active = false,                                           │
│    outcome = 'transferencia_externa'                            │
│  WHERE id = '...'                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Política RLS (UPDATE) - USANDO apenas USING sem WITH CHECK     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ANTES do UPDATE (verificação USING):                           │
│  • bed_id = 'abc123' (não nulo)                                 │
│  • has_active_session_in_unit() → TRUE ✅                       │
│                                                                 │
│  DEPOIS do UPDATE (mesmo USING reutilizado como WITH CHECK):    │
│  • bed_id = NULL                                                │
│  • Entra em: (bed_id IS NULL AND has_privileged_role())        │
│  • has_privileged_role('plantonista') → FALSE ❌                │
│                                                                 │
│  RESULTADO: Violação de RLS!                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

O administrador consegue porque `has_privileged_role('admin')` retorna TRUE.

## Solução

Adicionar uma cláusula `WITH CHECK` separada à política de UPDATE que permita:
1. Plantonistas com sessão ativa definir `bed_id = NULL` (registrar desfecho)
2. Manter a segurança: só pode "soltar" paciente se tinha acesso ao leito original

### Lógica da Nova Política

| Cenário | USING (linha original) | WITH CHECK (linha resultante) |
|---------|------------------------|-------------------------------|
| Plantonista atualiza dados | Sessão ativa na unidade do leito ✅ | Mesmo leito mantido ✅ |
| Plantonista registra desfecho | Sessão ativa na unidade do leito ✅ | bed_id = NULL permitido ✅ |
| Plantonista tenta mover para outra unidade | ✅ | Falha (sem acesso à nova unidade) ❌ |
| Admin/Coordenador/Diarista | Privileged role ✅ | Qualquer alteração permitida ✅ |

## Alterações Necessárias

### 1. Nova Migração SQL

```sql
-- Recria política de UPDATE com WITH CHECK separado
DROP POLICY IF EXISTS "Approved users can update patients in assigned units" 
ON public.patients;

CREATE POLICY "Approved users can update patients in assigned units"
ON public.patients FOR UPDATE
USING (
  -- Verifica acesso à linha ORIGINAL
  (auth.uid() IS NOT NULL) AND 
  is_approved(auth.uid()) AND 
  (
    (bed_id IS NULL AND has_privileged_role(auth.uid())) OR 
    (bed_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM beds b
      WHERE b.id = patients.bed_id 
      AND has_unit_access(auth.uid(), b.unit_id)
      AND (
        has_active_session_in_unit(auth.uid(), b.unit_id) OR
        has_privileged_role(auth.uid())
      )
    ))
  )
)
WITH CHECK (
  -- Verifica se o resultado é permitido
  (auth.uid() IS NOT NULL) AND 
  is_approved(auth.uid()) AND 
  (
    -- Privileged roles podem fazer qualquer alteração
    has_privileged_role(auth.uid()) OR
    
    -- Plantonistas podem:
    (
      -- Liberar leito (desfecho) - bed_id vai para NULL
      (bed_id IS NULL) OR
      
      -- Manter no mesmo leito ou mover dentro da mesma unidade com sessão ativa
      (bed_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM beds b
        WHERE b.id = bed_id 
        AND has_unit_access(auth.uid(), b.unit_id)
        AND has_active_session_in_unit(auth.uid(), b.unit_id)
      ))
    )
  )
);
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migração SQL | Recriar política de UPDATE com WITH CHECK apropriado |

## Segurança Mantida

- Plantonistas só podem atualizar pacientes em unidades onde têm sessão ativa
- Plantonistas podem definir `bed_id = NULL` (necessário para desfecho)
- Plantonistas NÃO podem mover pacientes para unidades sem sessão ativa
- Roles privilegiados (admin, coordenador, diarista, nir) mantêm acesso flexível

## Resultado Esperado

Após a correção, o fluxo funcionará:
1. Plantonista abre modal do paciente regulado
2. Clica em "Registrar Desfecho"
3. Seleciona "Transferência Externa"
4. Confirma → UPDATE executa com sucesso
5. Leito é liberado automaticamente
