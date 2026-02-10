
# Alerta ao fechar modal do paciente com texto de evolucao nao salvo

## Problema

O usuario pode digitar uma evolucao no campo de texto dentro do modal do paciente e fechar o modal sem salvar o rascunho nem validar a evolucao. O texto digitado e perdido sem aviso.

## Solucao

Interceptar o fechamento do `PatientModal` quando houver texto no campo de evolucao. Exibir um `AlertDialog` com tres opcoes: salvar rascunho e sair, sair sem salvar, ou cancelar.

## Detalhamento tecnico

### 1. `PatientEvolutions.tsx` - Expor o texto atual

- Adicionar prop `onDraftChange?: (draft: string) => void`
- Usar `useEffect` para chamar `onDraftChange(newEvolution)` sempre que `newEvolution` mudar
- Isso permite que o `PatientModal` saiba se ha texto nao salvo

### 2. `PatientModal.tsx` - Interceptar fechamento

- Adicionar estado `currentDraft` (string) atualizado pelo callback `onDraftChange`
- Adicionar estado `showDraftAlert` (boolean)
- Modificar a linha 291 (`onOpenChange`): se `currentDraft.trim().length > 0`, mostrar o AlertDialog em vez de fechar
- Adicionar `AlertDialog` com:
  - **Titulo**: "Evolucao nao salva"
  - **Descricao**: "Voce tem texto na evolucao que nao foi salvo. Deseja salvar como rascunho antes de sair?"
  - **Salvar Rascunho e Sair**: grava `currentDraft` no `localStorage` com chave `evolution_draft_{patientId}`, mostra toast de confirmacao e fecha o modal
  - **Sair sem Salvar**: fecha o modal sem salvar
  - **Cancelar**: fecha o alerta e volta ao modal

### Fluxo

```text
Usuario clica em fechar modal (X ou overlay)
        |
   Tem texto no campo de evolucao?
   /              \
 Nao              Sim
  |                |
Fecha modal    Mostra AlertDialog
               /       |        \
        Salvar      Sair sem    Cancelar
        Rascunho    Salvar        |
           |           |       Volta ao
        Salva no    Fecha       modal
        localStorage modal
        + toast
        e fecha
```

### Arquivos alterados

- `src/components/patient/PatientEvolutions.tsx` — adicionar prop `onDraftChange`
- `src/components/patient/PatientModal.tsx` — interceptar fechamento + AlertDialog
