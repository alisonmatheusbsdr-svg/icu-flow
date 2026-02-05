
# Plano: Adicionar Azitromicina à Lista de Antibióticos

## Alteração Necessária

Adicionar **Azitromicina** como opção clicável na lista de antibióticos em `src/components/patient/PatientClinicalData.tsx`.

## Localização

Arquivo: `src/components/patient/PatientClinicalData.tsx`
Linha: ~268-275 (seção "Outros" da constante `COMMON_ANTIBIOTICS`)

## Mudança

Adicionar na categoria "outro":

```typescript
const COMMON_ANTIBIOTICS: Record<string, { category: string; emoji: string }> = {
  // ... betalactâmicos, glicopeptídeos, aminoglicosídeos existentes ...
  
  // Outros
  'Metronidazol': { category: 'outro', emoji: '🧪' },
  'Ciprofloxacino': { category: 'outro', emoji: '🧪' },
  'Polimixina B': { category: 'outro', emoji: '🧪' },
  'Linezolida': { category: 'outro', emoji: '🧪' },
  'Clindamicina': { category: 'outro', emoji: '🧪' },
  'Fluconazol': { category: 'outro', emoji: '🧪' },
  'Azitromicina': { category: 'outro', emoji: '🧪' },  // NOVA LINHA
};
```

## Resultado

A Azitromicina aparecerá como botão clicável no dropdown de antibióticos, na categoria "Outros".
