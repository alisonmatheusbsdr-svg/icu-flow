

# Alerta de rascunhos nao validados ao fazer logout (segregado por UTI)

## Resumo

Ao clicar em "Sair", o sistema verifica se existem rascunhos de evolucao nao validados **apenas para pacientes da UTI em que o usuario esta logado**. Rascunhos de outras UTIs sao ignorados.

## Como funciona

```text
Usuario clica em "Sair"
        |
   Busca pacientes da UTI atual (beds -> patients)
        |
   Algum desses pacientes tem rascunho no localStorage?
   /              \
 Nao              Sim
  |                |
Logout          Mostra AlertDialog
normal          "X paciente(s) com evolucao nao validada"
                /              \
          Voltar            Sair mesmo assim
            |                    |
         Fecha alert          Executa logout
```

## Detalhamento tecnico

### 1. Novo arquivo: `src/lib/draft-utils.ts`

Criar funcao `getUnsavedDraftsForUnit(unitId: string)`:

- Consulta o banco: busca todos os `patient.id` onde `patient.bed_id` pertence a um `bed` com `unit_id` igual ao informado e `patient.is_active = true`
- Para cada patient ID retornado, verifica se existe `localStorage.getItem('evolution_draft_{patientId}')` com conteudo nao vazio
- Retorna array de objetos `{ patientId, initials, draft }` para exibir no alerta
- Funcao assincrona (por causa da consulta ao banco)

### 2. Editar: `src/components/dashboard/DashboardHeader.tsx`

- Importar `getUnsavedDraftsForUnit` e componentes do `AlertDialog`
- Adicionar estados: `showDraftAlert` (boolean), `pendingDrafts` (array de rascunhos encontrados)
- Modificar `handleLogout`:
  - Obter o `selectedUnit?.id` do contexto (ja disponivel via `useUnit`)
  - Se houver unidade selecionada, chamar `getUnsavedDraftsForUnit(selectedUnit.id)`
  - Se retornar rascunhos, salvar em `pendingDrafts` e mostrar o AlertDialog
  - Se nao houver rascunhos (ou nao houver unidade selecionada), prosseguir com logout normal
- Adicionar `AlertDialog` com:
  - Titulo: "Evolucoes nao validadas"
  - Descricao: "Voce possui rascunhos de evolucao em X paciente(s) que nao foram validados. Se sair, esses rascunhos serao perdidos."
  - Botao "Voltar" — fecha o alerta
  - Botao "Sair mesmo assim" (destructive) — executa o logout

### 3. Editar: `src/components/dashboard/MobileNav.tsx`

- Aplicar a mesma logica de interceptacao no botao "Sair"
- Como o `MobileNav` recebe `onLogout` como prop, a abordagem sera:
  - Adicionar prop `selectedUnitId?: string` para saber qual UTI esta ativa
  - No clique em "Sair", chamar `getUnsavedDraftsForUnit` antes de chamar `onLogout`
  - Exibir o mesmo AlertDialog internamente se houver rascunhos pendentes
- Alternativa mais simples: mover a logica de interceptacao para o `DashboardHeader` (que ja controla o `handleLogout` passado ao MobileNav). Assim, o `MobileNav` continua chamando `onLogout` normalmente e a interceptacao acontece no `DashboardHeader` para ambos os casos (desktop e mobile).

### Arquivos afetados

- **Novo:** `src/lib/draft-utils.ts`
- **Editado:** `src/components/dashboard/DashboardHeader.tsx`
- **Possivelmente editado:** `src/components/dashboard/MobileNav.tsx` (dependendo da abordagem escolhida)
