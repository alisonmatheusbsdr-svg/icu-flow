

# Plano: Modo Somente Leitura nos Dados Clínicos para NIR

## Problema Identificado

O `PatientModal` usa `canEdit` do hook `useUnit()` para controlar os botões principais (Editar, Evoluir, Desfecho), **mas os componentes filhos de dados clínicos não verificam essa permissão**:

| Componente | Problema |
|------------|----------|
| `PatientClinicalData` | Botões "+" para adicionar dispositivos, drogas, antibióticos, dieta sempre visíveis |
| `RespiratorySection` | Botão "Editar" sempre visível |
| `VenousAccessSection` | Botão "+" e botões "X" para remover acessos sempre visíveis |
| `PatientPrecautions` | Botões de edição sempre visíveis |

---

## Solução

Propagar a prop `canEdit` do `PatientModal` para todos os componentes filhos que possuem controles de edição.

### Componentes a Modificar

#### 1. PatientModal.tsx
Já obtém `canEdit` do `useUnit()`. Precisamos passá-lo para `PatientClinicalData`:

```tsx
<PatientClinicalData 
  patient={patient} 
  onUpdate={() => fetchPatient(true)} 
  canEdit={canEdit}  // Nova prop
/>
```

#### 2. PatientClinicalData.tsx
Receber `canEdit` e condicionar todos os controles de edição:

```tsx
interface PatientClinicalDataProps {
  patient: PatientWithDetails;
  onUpdate: () => void;
  canEdit?: boolean;  // Nova prop (default true para compatibilidade)
}

// Condicionar botões de adicionar
{canEdit && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="icon" className="h-7 w-7">
        <Plus className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    ...
  </DropdownMenu>
)}

// Condicionar botões de remover (X) em cada badge
{canEdit && (
  <button onClick={() => handleRemoveDevice(device.id)}>
    <X className="h-3 w-3" />
  </button>
)}
```

#### 3. RespiratorySection.tsx
Receber e usar `canEdit`:

```tsx
interface RespiratorySectionProps {
  patientId: string;
  respiratorySupport: RespiratorySupport | null;
  currentDietType?: DietType;
  onUpdate: () => void;
  canEdit?: boolean;  // Nova prop
}

// Condicionar botão de editar
{canEdit && (
  <Button onClick={() => setIsEditOpen(true)}>
    <Edit2 className="h-4 w-4" />
  </Button>
)}
```

#### 4. VenousAccessSection.tsx
Receber e usar `canEdit`:

```tsx
interface VenousAccessSectionProps {
  patientId: string;
  venousAccess: VenousAccess[];
  hasActiveVasoactiveDrugs: boolean;
  onUpdate: () => void;
  canEdit?: boolean;  // Nova prop
}

// Condicionar botão de adicionar
{canEdit && (
  <Button onClick={() => setIsAddDialogOpen(true)}>
    <Plus className="h-4 w-4" />
  </Button>
)}

// Condicionar botão de remover
{canEdit && (
  <button onClick={() => handleRemove(access.id)}>
    <X className="h-3 w-3" />
  </button>
)}
```

#### 5. PatientPrecautions.tsx
Receber e usar `canEdit` para os controles de precauções.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/patient/PatientModal.tsx` | Passar `canEdit` para `PatientClinicalData` |
| `src/components/patient/PatientClinicalData.tsx` | Receber `canEdit`, condicionar todos os botões "+", "X", dropdowns, dieta |
| `src/components/patient/RespiratorySection.tsx` | Receber `canEdit`, condicionar botão de editar |
| `src/components/patient/VenousAccessSection.tsx` | Receber `canEdit`, condicionar botões "+" e "X" |
| `src/components/patient/PatientPrecautions.tsx` | Receber `canEdit`, condicionar controles de edição |

---

## Comportamento Esperado

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

### Para Plantonista/Diarista (canEdit = true)
Comportamento atual mantido - todos os controles visíveis.

---

## Segurança

A prop `canEdit` controla apenas a **interface**. A segurança real é garantida pelo RLS do banco:
- NIR não tem permissão de UPDATE em tabelas clínicas
- Mesmo que tentasse manipular a UI, o backend rejeitaria

