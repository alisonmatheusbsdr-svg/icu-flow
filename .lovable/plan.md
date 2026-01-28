

# Plano: Carregar Regulações no BedGrid

## Problema Identificado

O componente `BedGrid.tsx` faz queries para vários dados clínicos (suporte respiratório, DVA, antibióticos, dispositivos, etc.), porém **não inclui** a query para `patient_regulation`. Como resultado, `patient.patient_regulation` chega como `undefined` no `BedCard`, e a verificação de vaga disponível nunca encontra dados.

## Solução

Adicionar a query de `patient_regulation` na função `fetchBeds()` do `BedGrid.tsx`, junto com as outras queries paralelas.

---

## Seção Técnica

### Arquivo a Modificar

**`src/components/dashboard/BedGrid.tsx`**

### Alterações Necessárias

1. **Adicionar interface para PatientRegulation:**
```typescript
interface PatientRegulationData {
  id: string;
  patient_id: string;
  support_type: string;
  status: string;
  is_active: boolean;
  team_confirmed_at: string | null;
}
```

2. **Atualizar BedWithPatient para incluir regulations:**
```typescript
interface BedWithPatient extends Bed {
  patient?: (Patient & { 
    // ... campos existentes ...
    patient_regulation?: PatientRegulationData[];
  }) | null;
}
```

3. **Adicionar query na Promise.all:**
```typescript
const [respResult, dvaResult, atbResult, devResult, venResult, precResult, regResult] = await Promise.all([
  // ... queries existentes ...
  supabase
    .from('patient_regulation')
    .select('id, patient_id, support_type, status, is_active, team_confirmed_at')
    .in('patient_id', patientIds)
    .eq('is_active', true)
]);

let regulations = regResult.data || [];
```

4. **Incluir regulations no objeto do paciente:**
```typescript
return {
  ...bed,
  patient: { 
    ...patient, 
    // ... campos existentes ...
    patient_regulation: regulations.filter(r => r.patient_id === patient.id)
  }
};
```

### Resultado Esperado

Após a correção, cada paciente terá suas regulações carregadas, e o BedCard poderá verificar se existe uma regulação com `status === 'aguardando_transferencia'` para exibir o badge pulsante "VAGA - [Especialidade]".

