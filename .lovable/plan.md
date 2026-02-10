

# Corrigir alerta de rascunho: comparar com texto ja salvo

## Problema

O alerta de "evolucao nao salva" aparece mesmo quando o texto no campo e identico ao rascunho ja salvo no localStorage. Alem disso, se o usuario carrega um rascunho salvo, acrescenta texto e tenta fechar, o alerta aparece corretamente — mas o cenario inverso (texto carregado sem alteracao) tambem dispara o alerta desnecessariamente.

## Solucao

Comparar o texto atual do campo de evolucao com o que esta salvo no localStorage. O alerta so deve aparecer quando houver diferenca entre os dois.

## Detalhamento tecnico

### `PatientModal.tsx` — Comparar draft atual com o salvo

Modificar a funcao `handleOpenChange` (linha 298-303):

**Antes:**
```text
if (!open && currentDraft.trim().length > 0) {
  setShowDraftAlert(true);
  return;
}
```

**Depois:**
```text
if (!open && currentDraft.trim().length > 0) {
  const savedDraft = localStorage.getItem(`evolution_draft_${patientId}`) || '';
  if (currentDraft.trim() !== savedDraft.trim()) {
    setShowDraftAlert(true);
    return;
  }
}
```

Isso garante que:
- Se o texto e identico ao rascunho salvo, o modal fecha normalmente
- Se o usuario acrescentou ou modificou texto alem do rascunho salvo, o alerta aparece
- Se nao ha rascunho salvo e o campo esta vazio, o modal fecha normalmente
- Se nao ha rascunho salvo mas o usuario digitou algo novo, o alerta aparece

### Arquivos alterados

- `src/components/patient/PatientModal.tsx` — ajuste na condicao de `handleOpenChange` (apenas 1 linha adicionada + 1 modificada)

