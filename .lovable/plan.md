
# Plano: Esconder Badge VAGA quando há Impossibilidade Clínica

## Problema

Atualmente, o badge verde "VAGA" aparece para qualquer regulação em `aguardando_transferencia`, mesmo quando a equipe já sinalizou impossibilidade clínica. Isso causa confusão pois indica que o paciente está pronto para ir quando na verdade não está.

## Solução

Adicionar uma condição para verificar se **não há** sinalização de impossibilidade clínica (`clinical_hold_at` é null) antes de mostrar o badge.

## Alteração

### Arquivo: `src/components/dashboard/BedCard.tsx`

**Linha 271-275 - Condição atual:**
```tsx
const awaitingTransfer = patient.patient_regulation?.find(
  r => r.is_active && r.status === 'aguardando_transferencia'
);
if (!awaitingTransfer) return null;
```

**Nova condição:**
```tsx
const awaitingTransfer = patient.patient_regulation?.find(
  r => r.is_active && 
       r.status === 'aguardando_transferencia' &&
       !r.clinical_hold_at  // Não tem impossibilidade clínica sinalizada
);
if (!awaitingTransfer) return null;
```

## Lógica de Negócio

O badge "VAGA" só aparece quando:
1. A regulação está ativa (`is_active = true`)
2. O status é "aguardando transferência" (`status = 'aguardando_transferencia'`)
3. **Não há** sinalização de impossibilidade clínica (`clinical_hold_at = null`)

Quando a equipe sinaliza melhora clínica pendente, o `clinical_hold_at` é preenchido e o badge some do dashboard. Quando a equipe confirma que o paciente melhorou (ou o NIR limpa o hold), o badge volta a aparecer.

## Resultado Esperado

- Paciente com vaga **sem** impossibilidade: badge verde "VAGA" aparece
- Paciente com vaga **com** impossibilidade clínica: badge **não** aparece
- Dashboard reflete apenas pacientes realmente prontos para transferência
