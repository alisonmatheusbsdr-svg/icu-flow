

## Plano: Bloquear Dieta Oral quando Paciente está em TOT

### Contexto Clínico
Pacientes com Tubo Orotraqueal (TOT) não podem receber dieta oral, pois o tubo passa pela via aérea e impede a deglutição segura. Esta é uma regra de segurança clínica importante.

---

### Comportamento Proposto

```text
┌────────────────────────────────────────────────┐
│ Paciente SEM TOT                               │
├────────────────────────────────────────────────┤
│ Dropdown Dieta:                                │
│  🚫 Dieta Zero                                 │
│  🍽️ Dieta Oral          ← disponível           │
│  🔄 Sonda Naso Enteral                         │
│  ...                                           │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ Paciente COM TOT                               │
├────────────────────────────────────────────────┤
│ Dropdown Dieta:                                │
│  🚫 Dieta Zero                                 │
│  🍽️ Dieta Oral          ← desabilitado/cinza   │
│  🔄 Sonda Naso Enteral                         │
│  ...                                           │
└────────────────────────────────────────────────┘
```

---

### Mudanças Técnicas

#### Arquivo: `src/components/patient/PatientClinicalData.tsx`

**1. Criar helper para verificar se paciente está em TOT:**

```typescript
// Verificar se paciente está em uso de TOT
const isPatientOnTOT = () => {
  return patient.respiratory_support?.modality === 'tot';
};
```

**2. Atualizar validação em `handleUpdateDiet`:**

```typescript
const handleUpdateDiet = async (dietType: DietType) => {
  // Bloquear dieta oral se paciente estiver em TOT
  if (dietType === 'oral' && isPatientOnTOT()) {
    toast.error('Dieta oral não permitida para pacientes em uso de TOT');
    return;
  }
  
  setIsLoading(true);
  // ... resto da lógica existente
};
```

**3. Atualizar dropdown para mostrar opção desabilitada:**

```tsx
<DropdownMenuContent align="end" className="w-56">
  {Object.entries(DIET_TYPES).map(([type, config]) => {
    // Verificar se a opção deve ser desabilitada
    const isDisabled = type === 'oral' && isPatientOnTOT();
    
    return (
      <DropdownMenuItem
        key={type}
        onClick={() => !isDisabled && handleUpdateDiet(type as DietType)}
        disabled={isDisabled}
        className={cn(
          'cursor-pointer',
          patient.diet_type === type && 'bg-accent',
          isDisabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className="mr-2">{config.emoji}</span>
        {config.label}
        {isDisabled && (
          <span className="ml-auto text-xs text-muted-foreground">
            (TOT ativo)
          </span>
        )}
      </DropdownMenuItem>
    );
  })}
  ...
</DropdownMenuContent>
```

**4. Auto-remover dieta oral se TOT for adicionado:**

Como uma camada extra de segurança, quando o suporte respiratório é alterado para TOT e o paciente tinha dieta oral, automaticamente mudar para dieta zero. Isso seria feito no `EditRespiratoryDialog.tsx`.

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/patient/PatientClinicalData.tsx` | Adicionar validação no `handleUpdateDiet` e desabilitar opção "Dieta Oral" no dropdown quando TOT está ativo |
| `src/components/patient/EditRespiratoryDialog.tsx` | (Opcional) Ao salvar TOT, verificar se paciente tem dieta oral e mudar para dieta zero automaticamente |

---

### Resultado Esperado

1. **Opção visual desabilitada**: "Dieta Oral" aparece cinza com indicador "(TOT ativo)" quando paciente está em TOT
2. **Validação dupla**: Mesmo se alguém tentar clicar, a função bloqueia com toast de erro
3. **Segurança clínica**: Impossível ter dieta oral + TOT simultaneamente
4. **UX clara**: Usuário entende imediatamente por que a opção está desabilitada

