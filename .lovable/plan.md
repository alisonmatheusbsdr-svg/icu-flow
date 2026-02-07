

# Plano: Redirecionar para tela do paciente apos admissao

## Problema

Ao admitir um paciente, o sistema fecha o dialog e volta ao dashboard. O ideal e abrir direto a tela de detalhes do paciente recem-admitido.

## Alteracoes

### 1. `AdmitPatientForm.tsx`

- Alterar `onSuccess` de `() => void` para `(patientId: string) => void`
- Apos o insert, capturar o `id` do paciente retornado pelo Supabase (usando `.select().single()`)
- Chamar `onSuccess(patientId)` com o ID do paciente criado

### 2. `BedCard.tsx`

- Importar `useNavigate` do react-router-dom
- No callback `onSuccess` do `AdmitPatientForm`, navegar para `/patient/{patientId}` em vez de apenas fechar o dialog

## Detalhes tecnicos

```typescript
// AdmitPatientForm.tsx - capturar o ID retornado
const { data: patientData, error } = await supabase
  .from('patients')
  .insert({ ... })
  .select('id')
  .single();

onSuccess(patientData.id);

// BedCard.tsx - navegar para o paciente
const navigate = useNavigate();
<AdmitPatientForm 
  bedId={bed.id} 
  onSuccess={(patientId) => { 
    setIsAdmitOpen(false); 
    onUpdate(); 
    navigate(`/patient/${patientId}`); 
  }} 
/>
```

## Arquivos modificados

| Arquivo | Acao |
|---|---|
| `src/components/dashboard/AdmitPatientForm.tsx` | Retornar `patientId` no callback |
| `src/components/dashboard/BedCard.tsx` | Navegar para `/patient/:id` apos admissao |

