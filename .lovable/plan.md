
# Alerta ao fechar modal com rascunho de evolucao nao salvo

## Problema

O plantonista pode digitar uma evolucao no campo de texto e fechar o modal do paciente sem validar nem salvar o rascunho. O texto digitado e perdido sem nenhum aviso.

## Solucao

Interceptar o fechamento do `PatientModal` quando houver texto no campo de evolucao que ainda nao foi salvo (nem validado nem salvo como rascunho). Exibir um `AlertDialog` perguntando se deseja sair, salvar rascunho ou cancelar.

## Detalhamento tecnico

### 1. `PatientEvolutions.tsx` - Expor estado do rascunho

- Adicionar uma prop `onDraftChange?: (hasDraft: boolean) => void` ao componente
- Chamar `onDraftChange(true)` quando `newEvolution.trim().length > 0` e `onDraftChange(false)` quando estiver vazio
- Usar um `useEffect` para monitorar `newEvolution` e notificar o pai

### 2. `PatientModal.tsx` - Controlar fechamento

- Adicionar estado `hasUnsavedDraft` (boolean) atualizado pelo callback do `PatientEvolutions`
- Adicionar estado `showDraftAlert` (boolean) para controlar o AlertDialog
- Modificar o `onOpenChange` do Dialog: se `hasUnsavedDraft` for `true`, mostrar o AlertDialog em vez de fechar
- Modificar o `onClose` interno da mesma forma

### 3. `PatientModal.tsx` - AlertDialog de confirmacao

Adicionar um `AlertDialog` com tres opcoes:

- **Salvar Rascunho e Sair**: salva no localStorage (`evolution_draft_{patientId}`) e fecha o modal
- **Sair sem Salvar**: fecha o modal sem salvar
- **Cancelar**: fecha o alerta e volta ao modal

O dialogo tera o texto: "Voce tem uma evolucao nao salva. Deseja salvar como rascunho antes de sair?"

### 4. Comunicacao entre componentes

Para que o `PatientModal` consiga acionar o salvamento do rascunho, o `PatientEvolutions` expora tambem uma ref ou callback `onSaveDraft` que o modal pode chamar. Alternativa mais simples: o modal salva diretamente no localStorage usando a mesma chave `evolution_draft_{patientId}`, ja que a logica de leitura ja existe no `PatientEvolutions`.

Para isso, o `PatientEvolutions` passara o texto atual via `onDraftChange` com o conteudo: `onDraftChange?: (draft: string) => void`. O modal armazena o texto e, se o usuario escolher "Salvar Rascunho", grava no localStorage.

### Fluxo

```text
Usuario clica em fechar modal
        |
   Tem texto digitado?
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
        e fecha
```

### Arquivos alterados

- `src/components/patient/PatientEvolutions.tsx` — adicionar prop `onDraftChange`
- `src/components/patient/PatientModal.tsx` — adicionar logica de interceptacao + AlertDialog
