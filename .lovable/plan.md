

# Plano: Abrir pop-up do paciente apos admissao (em vez de navegar para outra pagina)

## Problema

Apos admitir um paciente, o sistema navega para `/patient/:id`, que e uma pagina separada com layout diferente do pop-up (modal) ja construido. O correto e permanecer no dashboard e abrir o **PatientModal** (pop-up) do paciente recem-admitido.

## Solucao

Substituir o `navigate()` por uma chamada ao `onPatientClick`, que ja existe no `BedCard` e abre o `PatientModal` no dashboard.

## Alteracoes

### `src/components/dashboard/BedCard.tsx`

1. **Remover** o import e uso de `useNavigate`
2. No callback `onSuccess` do `AdmitPatientForm`, em vez de `navigate(/patient/...)`, chamar `onPatientClick(patientId)` que ja abre o modal existente
3. O `onUpdate()` continua sendo chamado para atualizar o grid de leitos

```typescript
// De:
onSuccess={(patientId) => { 
  setIsAdmitOpen(false); 
  onUpdate(); 
  navigate(`/patient/${patientId}`); 
}}

// Para:
onSuccess={(patientId) => { 
  setIsAdmitOpen(false); 
  onUpdate(); 
  onPatientClick?.(patientId); 
}}
```

### Nenhum outro arquivo precisa ser alterado

O `AdmitPatientForm` ja retorna o `patientId` corretamente. O `BedGrid` ja tem o `PatientModal` configurado e o handler `handlePatientClick`. A unica mudanca e trocar a navegacao pela abertura do modal.
