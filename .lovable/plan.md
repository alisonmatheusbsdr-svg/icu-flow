
# Plano: Melhorar Visibilidade das Cores no Modal de Desfecho

## Problema Identificado

No modal "Registrar Desfecho", quando uma opção está em hover/foco, o fundo teal (`--accent: 175 60% 40%`) entra em conflito com as cores de texto das opções (especialmente `text-green-600` da "Alta para Enfermaria"), tornando o texto difícil de ler.

## Solução

Alterar as cores das opções de desfecho para serem mais contrastantes e usar uma abordagem de "ícone colorido + texto neutro" para garantir legibilidade em qualquer estado:

| Opção | Antes | Depois |
|-------|-------|--------|
| Alta para Enfermaria | `text-green-600` (texto verde) | Ícone verde + texto neutro |
| Óbito | `text-red-600` | Ícone vermelho + texto neutro |
| Transferência Externa | `text-blue-600` | Ícone azul + texto neutro |
| Transferência Interna | `text-orange-600` | Ícone laranja + texto neutro |

## Alterações

**Arquivo:** `src/components/patient/PatientDischargeDialog.tsx`

### 1. Atualizar estrutura das opções (linhas 44-49)

Separar a cor do ícone da cor do texto:

```typescript
const outcomeOptions: { 
  value: DischargeOutcome; 
  label: string; 
  icon: React.ReactNode; 
  iconColor: string;
}[] = [
  { value: 'alta_enfermaria', label: 'Alta para Enfermaria', icon: <Home className="h-4 w-4" />, iconColor: 'text-emerald-600' },
  { value: 'obito', label: 'Óbito', icon: <Cross className="h-4 w-4" />, iconColor: 'text-red-600' },
  { value: 'transferencia_externa', label: 'Transferência Externa', icon: <Building2 className="h-4 w-4" />, iconColor: 'text-amber-600' },
  { value: 'transferencia_interna', label: 'Transferência Interna', icon: <ArrowRightLeft className="h-4 w-4" />, iconColor: 'text-blue-600' },
];
```

### 2. Atualizar renderização do SelectItem (linhas 136-143)

Aplicar cor apenas no ícone, mantendo texto legível:

```tsx
<SelectItem key={option.value} value={option.value}>
  <span className="flex items-center gap-2">
    <span className={option.iconColor}>{option.icon}</span>
    <span>{option.label}</span>
  </span>
</SelectItem>
```

## Cores Escolhidas

| Desfecho | Cor do Ícone | Justificativa |
|----------|--------------|---------------|
| Alta para Enfermaria | `emerald-600` | Verde vibrante, associado a alta/positivo |
| Óbito | `red-600` | Vermelho, alerta crítico |
| Transferência Externa | `amber-600` | Laranja/âmbar para movimento externo |
| Transferência Interna | `blue-600` | Azul para movimento interno |

## Resultado Esperado

- Texto sempre legível (cor neutra herdada do tema)
- Ícones coloridos mantêm a identificação visual rápida
- Funciona corretamente em hover/foco (fundo teal + texto branco)
- Consistente em modo claro e escuro
