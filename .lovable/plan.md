
# Plano: Simplificar Badge de Regulação no BedCard

## Objetivo

Manter apenas o badge verde "VAGA" no BedCard quando há uma regulação em `aguardando_transferencia`. Remover todos os outros badges relacionados a regulação (impossibilidade clínica, prazo vencido, cancelamento pendente, nova listagem).

## Alteração

### Arquivo: `src/components/dashboard/BedCard.tsx`

**Antes (linhas 270-361):** Lógica complexa com múltiplos badges condicionais:
- CANCELAMENTO PEND. (vermelho)
- NOVA LISTAGEM SOLIC. (azul)
- PRAZO VENCIDO (vermelho pulsante)
- AGUARD. MELHORA (amarelo)
- VAGA (verde pulsante)

**Depois:** Simplificado para mostrar apenas o badge "VAGA":

```tsx
{/* Awaiting transfer notification badge */}
{(() => {
  const awaitingTransfer = patient.patient_regulation?.find(
    r => r.is_active && r.status === 'aguardando_transferencia'
  );
  if (!awaitingTransfer) return null;

  // Only show green vacancy badge
  return (
    <div className="mt-2 p-2 bg-green-100 dark:bg-green-950/40 rounded-md border border-green-300 dark:border-green-800 animate-pulse">
      <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300 text-xs font-medium">
        <Truck className="h-3.5 w-3.5" />
        VAGA - {getSupportLabel(awaitingTransfer.support_type)}
      </div>
    </div>
  );
})()}
```

## Resultado

- Dashboard mais limpo e menos poluído visualmente
- Equipe vê apenas quando há vaga disponível
- Detalhes de status (impossibilidade clínica, prazos, etc.) ficam apenas dentro do modal do paciente na seção "Regulação"

## Limpeza de Código

Remover imports não utilizados após a simplificação:
- `isDeadlineExpired` e `formatDate` de `@/lib/regulation-config` (se não usados em outro lugar)
- `Clock` e `AlertTriangle` de `lucide-react` (se não usados em outro lugar)
