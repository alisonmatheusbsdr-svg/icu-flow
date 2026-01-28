
# Plano: Validação de Desfecho com Regulação Ativa

## Problema

Quando um paciente tem uma regulação ativa aguardando transferência externa, o usuário pode registrar um desfecho diferente (alta, óbito, etc.) sem nenhum aviso. Isso pode causar inconsistências nos dados e perda de rastreabilidade.

## Solução

Adicionar validação no dialog de desfecho que:
1. Detecta se há regulação ativa para transferência externa
2. Exibe alerta quando usuário seleciona desfecho diferente de "Transferência Externa"
3. Exige justificativa obrigatória para prosseguir com desfecho divergente

## Alterações

### 1. PatientModal.tsx

Passar informação sobre regulação ativa para o dialog:

```tsx
<PatientDischargeDialog
  patientId={patient.id}
  patientInitials={patient.initials}
  bedId={patient.bed_id}
  hasActiveExternalTransfer={patient.patient_regulation?.some(
    r => r.is_active && r.status === 'aguardando_transferencia'
  )}
  isOpen={isDischargeDialogOpen}
  onClose={() => setIsDischargeDialogOpen(false)}
  onSuccess={onClose}
/>
```

### 2. PatientDischargeDialog.tsx

**Novos imports:**
- `Textarea` para campo de justificativa
- `AlertTriangle` para ícone de aviso

**Nova prop:**
```tsx
interface PatientDischargeDialogProps {
  // ... props existentes
  hasActiveExternalTransfer?: boolean;
}
```

**Novos estados:**
```tsx
const [justification, setJustification] = useState('');
```

**Lógica de validação:**
```tsx
// Verifica se selecionou desfecho diferente de transferência externa
// quando há regulação ativa
const needsJustification = 
  hasActiveExternalTransfer && 
  outcome && 
  outcome !== 'transferencia_externa';
```

**UI - Alerta condicional:**
Exibir box de aviso amarelo/laranja quando `needsJustification` for true:

```tsx
{needsJustification && (
  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md space-y-3">
    <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="text-sm">
        <strong>Atenção:</strong> Este paciente possui uma vaga de transferência externa confirmada. 
        Você está selecionando um desfecho diferente.
      </div>
    </div>
    <Textarea
      placeholder="Justifique o motivo do desfecho diferente da transferência..."
      value={justification}
      onChange={(e) => setJustification(e.target.value)}
      className="min-h-[80px]"
    />
  </div>
)}
```

**Botão desabilitado:**
```tsx
<Button 
  disabled={!outcome || isLoading || (needsJustification && !justification.trim())}
>
```

**Mensagem de confirmação atualizada:**
Incluir aviso na confirmação quando há justificativa:

```tsx
{needsJustification && (
  <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-sm">
    <strong>Justificativa:</strong> {justification}
  </div>
)}
```

## Fluxo do Usuário

1. Usuário abre dialog de desfecho
2. Se não há regulação ativa -> comportamento normal
3. Se há regulação ativa:
   - Usuário seleciona "Transferência Externa" -> comportamento normal
   - Usuário seleciona outro desfecho -> aparece aviso + campo de justificativa
   - Botão fica desabilitado até preencher justificativa
   - Na confirmação, mostra a justificativa informada

## Resultado Visual

Select com desfecho -> Se divergente, aparece:
- Box amarelo com ícone de alerta
- Texto explicando que há vaga disponível
- Campo de texto para justificativa obrigatória
- Botão só habilita após preenchimento

## Consideração Futura (opcional)

A justificativa poderia ser salva em um campo do paciente ou em uma tabela de auditoria para rastreabilidade. Por ora, serve como barreira de segurança para evitar erros acidentais.
