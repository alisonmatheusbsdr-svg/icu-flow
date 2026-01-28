

# Plano: Corrigir Politica RLS para Acoes da Equipe Assistencial

## Problema Identificado

O erro "Erro ao sinalizar impossibilidade" ocorre porque as politicas RLS da tabela `patient_regulation` nao permitem que a equipe assistencial atualize os novos campos de clinical hold e cancelamento.

**Politica atual:**
```
Care team can deactivate regulations:
- qual: is_approved(auth.uid()) AND NOT has_role(auth.uid(), 'nir')
- with_check: is_active = false
```

Isso significa que a equipe assistencial **so pode fazer UPDATE quando `is_active = false`**, bloqueando atualizacoes nos campos `clinical_hold_at`, `clinical_hold_reason`, `team_cancel_requested_at`, etc.

## Solucao

Criar uma nova politica RLS que permita a equipe assistencial atualizar os campos especificos de sinalizacao (clinical hold, cancelamento e relisting) sem a restricao de `is_active = false`.

---

## Secao Tecnica

### Migracao SQL Necessaria

```sql
-- Drop a politica restritiva atual para care team
DROP POLICY IF EXISTS "Care team can deactivate regulations" ON patient_regulation;

-- Criar politica para permitir equipe assistencial desativar regulacoes
CREATE POLICY "Care team can deactivate regulations"
ON patient_regulation
FOR UPDATE
TO authenticated
USING (
  is_approved(auth.uid()) AND 
  NOT has_role(auth.uid(), 'nir'::app_role)
)
WITH CHECK (is_active = false);

-- Criar nova politica para permitir equipe assistencial sinalizar acoes
CREATE POLICY "Care team can signal clinical actions"
ON patient_regulation
FOR UPDATE
TO authenticated
USING (
  is_approved(auth.uid()) AND 
  NOT has_role(auth.uid(), 'nir'::app_role) AND
  status = 'aguardando_transferencia'
)
WITH CHECK (
  -- Permite atualizar campos de sinalizacao, mas nao o status principal
  status = 'aguardando_transferencia'
);
```

### Explicacao da Nova Politica

A nova politica "Care team can signal clinical actions":

1. **USING (quem pode):** Usuarios aprovados que NAO sao NIR, e a regulacao esta em `aguardando_transferencia`
2. **WITH CHECK (o que pode):** Permite atualizar desde que o status permaneca `aguardando_transferencia` (nao pode mudar o status)

Isso permite que a equipe atualize:
- `clinical_hold_at`, `clinical_hold_by`, `clinical_hold_reason`
- `team_cancel_requested_at`, `team_cancel_requested_by`, `team_cancel_reason`
- `relisting_requested_at`, `relisting_requested_by`, `relisting_reason`
- `team_confirmed_at`, `team_confirmed_by`

### Resultado Esperado

Apos a migracao, a equipe assistencial podera:
- Sinalizar impossibilidade clinica
- Solicitar cancelamento
- Solicitar nova listagem
- Confirmar transferencia

Sem alterar o status principal da regulacao (que continua sendo responsabilidade do NIR).

