
# Plano Revisado: Incluir Plantonista na Autorização de Desfecho

## Diagnóstico Confirmado

A análise detalhada do banco de dados revelou que:

1. **O log de erro mostra um UPDATE direto na tabela patients**, não uma chamada RPC:
```sql
UPDATE "public"."patients" SET "bed_id" = ..., "is_active" = ..., "outcome" = ...
```

2. **O código atual está correto** (`PatientDischargeDialog.tsx` usa RPC `discharge_patient`)

3. **O erro ocorreu às 15:39:28** - provavelmente o site publicado ainda não refletiu as últimas mudanças de código

4. **A função `discharge_patient` exige:**
   - `has_privileged_role` (não inclui plantonista)
   - OU `has_active_session_in_unit` (depende da sessão estar ativa)

## Problema Principal

Mesmo com o RPC implementado, a função `discharge_patient` falha para plantonistas quando:
- A sessão expirou (>30 min sem atividade)
- Ou há problemas no reconhecimento da sessão

Como você mencionou que o erro ocorre **mesmo logo após o login**, isso sugere que o site publicado pode estar usando código antigo ou há um problema de sincronização.

## Solução em Duas Partes

### Parte 1: Atualizar a Função `discharge_patient`

Adicionar verificação específica para o role `plantonista`, permitindo desfecho com base apenas em:
- Usuário aprovado
- Possui acesso à unidade (`has_unit_access`)

Isso elimina a dependência da sessão ativa para desfechos.

### Parte 2: Garantir que o Código Publicado Está Atualizado

Verificar se a versão publicada do site contém a chamada RPC correta.

## Detalhes Técnicos

### Nova Função SQL

```sql
CREATE OR REPLACE FUNCTION public.discharge_patient(
  _patient_id uuid,
  _outcome patient_outcome,
  _user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bed_id uuid;
  _bed_unit_id uuid;
  _is_plantonista boolean;
BEGIN
  -- Verificar se o usuário está aprovado
  IF NOT is_approved(_user_id) THEN
    RAISE EXCEPTION 'User not approved';
  END IF;
  
  -- Obter dados do paciente e leito
  SELECT p.bed_id, b.unit_id 
  INTO _bed_id, _bed_unit_id
  FROM patients p
  LEFT JOIN beds b ON b.id = p.bed_id
  WHERE p.id = _patient_id AND p.is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Patient not found or not active';
  END IF;
  
  -- Verificar se é plantonista
  _is_plantonista := has_role(_user_id, 'plantonista');
  
  -- Verificar acesso (NOVA LÓGICA):
  -- 1. Privileged roles (admin, coord, diarista, nir) - sem restrição
  -- 2. Plantonista com acesso à unidade - permitido
  -- 3. Qualquer usuário com sessão ativa na unidade - permitido
  IF NOT (
    has_privileged_role(_user_id) OR 
    (_is_plantonista AND _bed_unit_id IS NOT NULL 
       AND has_unit_access(_user_id, _bed_unit_id)) OR
    (_bed_unit_id IS NOT NULL 
       AND has_active_session_in_unit(_user_id, _bed_unit_id))
  ) THEN
    RAISE EXCEPTION 'User does not have access to this patient';
  END IF;
  
  -- Atualizar paciente
  UPDATE patients
  SET 
    outcome = _outcome,
    outcome_date = NOW(),
    is_active = false,
    bed_id = NULL
  WHERE id = _patient_id;
  
  -- Liberar leito
  IF _bed_id IS NOT NULL THEN
    UPDATE beds
    SET is_occupied = false
    WHERE id = _bed_id;
  END IF;
  
  RETURN true;
END;
$$;
```

### Comparação: Antes vs Depois

| Condição | Antes | Depois |
|----------|-------|--------|
| Privileged (admin, coord, diarista, nir) | Permitido | Permitido |
| Plantonista com sessão ativa | Permitido | Permitido |
| Plantonista com acesso à unidade (sem sessão) | **Bloqueado** | **Permitido** |
| Outro role sem sessão | Bloqueado | Bloqueado |

### Segurança Mantida

A nova lógica é segura porque:
- O usuário **deve estar aprovado** (`is_approved`)
- O plantonista **deve ter atribuição à unidade** (`has_unit_access`)
- Não há bypass para usuários sem permissão

### Restrições do Plantonista Preservadas

| Funcionalidade | Plantonista |
|----------------|-------------|
| Registrar desfecho | ✅ (após correção) |
| Editar plano terapêutico | ❌ Bloqueado |
| Ver múltiplas UTIs | ❌ Bloqueado |
| Editar dados clínicos | ✅ Com sessão ativa |

## Passos de Implementação

1. Criar migração SQL para atualizar a função `discharge_patient`
2. Publicar as alterações para o ambiente de produção
3. Testar o fluxo de desfecho como plantonista

## Resultado Esperado

- Plantonistas conseguirão registrar desfechos independente do estado da sessão
- A segurança é mantida via verificação de aprovação e acesso à unidade
- Comportamento consistente entre preview e produção
