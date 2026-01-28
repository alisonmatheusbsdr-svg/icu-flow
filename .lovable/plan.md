
# Plano: Adicionar Botão "Paciente Melhorou" para Clinical Hold

## Problema

Quando a equipe sinaliza impossibilidade clínica e o NIR define um prazo, a equipe não tem como informar que o paciente melhorou antes do prazo vencer. Atualmente só aparece a mensagem "Aguardando prazo de melhora clínica" sem nenhuma ação disponível.

## Solução

Adicionar um botão "Paciente Melhorou" que permite à equipe sinalizar que o paciente está pronto para transferência, limpando o clinical hold e reativando o fluxo.

## Alteração

### Arquivo: `src/components/patient/PatientRegulation.tsx`

**Linha 284-287 - Antes:**
```tsx
) : alertState === 'clinical_hold' ? (
  <div className="text-xs text-muted-foreground text-center">
    Aguardando prazo de melhora clínica
  </div>
```

**Depois:**
```tsx
) : alertState === 'clinical_hold' ? (
  <div className="space-y-2">
    <div className="text-xs text-muted-foreground text-center">
      Aguardando prazo de melhora clínica
    </div>
    <Button 
      size="sm" 
      className="w-full gap-1 bg-green-600 hover:bg-green-700"
      onClick={() => setActionRegulation(reg)}
    >
      <CheckCircle className="h-3 w-3" />
      Paciente Melhorou
    </Button>
  </div>
```

### Arquivo: `src/components/patient/PatientRegulation.tsx`

Adicionar import do ícone `CheckCircle` na linha 11:
```tsx
import { Building2, Plus, X, Calendar, Info, Pencil, AlertTriangle, Truck, Clock, RefreshCw, CheckCircle } from 'lucide-react';
```

## Fluxo

1. Equipe sinaliza impossibilidade clínica -> `clinical_hold_at` é preenchido
2. NIR define prazo de reavaliação -> `clinical_hold_deadline` é preenchido  
3. **NOVO:** Paciente melhora antes do prazo -> Equipe clica em "Paciente Melhorou"
4. Dialog de ações abre com opção de confirmar transferência
5. Ao confirmar, `clinical_hold_at` e campos relacionados são limpos
6. Badge "VAGA" reaparece no dashboard (pois clinical_hold_at = null)

## Comportamento do Dialog RegulationTeamActions

O dialog já possui a função `handleConfirmTransfer` que:
- Define `team_confirmed_at` e `team_confirmed_by`
- Limpa todos os campos de clinical hold
- Permite seguir com a transferência

Portanto, ao clicar em "Paciente Melhorou" quando há clinical hold, a equipe verá as mesmas opções do menu principal, podendo confirmar a transferência.

## Resultado Esperado

- Equipe pode informar ao NIR que o paciente melhorou a qualquer momento
- Não precisa esperar o prazo vencer para tomar ação
- Dashboard volta a mostrar badge "VAGA" após confirmação
