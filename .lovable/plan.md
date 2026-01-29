

# ✅ CONCLUÍDO: Modo Somente Leitura nos Dados Clínicos para NIR

## Problema Identificado

O `PatientModal` usa `canEdit` do hook `useUnit()` para controlar os botões principais (Editar, Evoluir, Desfecho), **mas os componentes filhos de dados clínicos não verificavam essa permissão**.

---

## Solução Implementada

Propagação da prop `canEdit` do `PatientModal` para todos os componentes filhos que possuem controles de edição.

### Componentes Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/patient/PatientModal.tsx` | ✅ Passa `canEdit` para `PatientClinicalData` |
| `src/components/patient/PatientClinicalData.tsx` | ✅ Recebe `canEdit`, condiciona todos os botões "+", "X", dropdowns, dieta |
| `src/components/patient/RespiratorySection.tsx` | ✅ Recebe `canEdit`, condiciona botão de editar |
| `src/components/patient/VenousAccessSection.tsx` | ✅ Recebe `canEdit`, condiciona botões "+" e "X" |
| `src/components/patient/PatientPrecautions.tsx` | ✅ Recebe `canEdit`, condiciona controles de edição |

---

## Comportamento Implementado

### Para NIR (canEdit = false)

| Seção | Visualização | Edição |
|-------|-------------|--------|
| Dispositivos | ✅ Vê badges com dias e alertas | ❌ Sem botão "+", sem botão "X" |
| DVA | ✅ Vê drogas ativas e doses | ❌ Sem adicionar/remover |
| Antibióticos | ✅ Vê lista com dias | ❌ Sem adicionar/remover |
| Suporte Respiratório | ✅ Vê modalidade e parâmetros | ❌ Sem botão editar |
| Acessos Venosos | ✅ Vê acessos e alertas | ❌ Sem adicionar/remover |
| Dieta | ✅ Vê dieta atual | ❌ Sem trocar |
| Precauções | ✅ Vê badges de risco | ❌ Sem editar níveis |
| Profilaxias | ✅ Vê lista ativa | ❌ Sem adicionar/remover |

### Para Plantonista/Diarista (canEdit = true)
Comportamento atual mantido - todos os controles visíveis.

---

## Segurança

A prop `canEdit` controla apenas a **interface**. A segurança real é garantida pelo RLS do banco:
- NIR não tem permissão de UPDATE em tabelas clínicas
- Mesmo que tentasse manipular a UI, o backend rejeitaria
