

# Plano: Reordenar Precauções acima de Regulação em Mobile

## Contexto Atual

A interface do modal do paciente em desktop tem duas colunas:
- **Coluna Esquerda** (`PatientClinicalData`): Dispositivos, Acessos, DVAs, Respiratório, ATB, Profilaxias, Dieta, **Regulação**
- **Coluna Direita** (`PatientEvolutions`): Histórico, Evolução, Pendências, **Precauções**

Em **mobile**, estas colunas são empilhadas verticalmente (grid de 1 coluna), resultando em:
1. PatientClinicalData (incluindo Regulação no final)
2. PatientEvolutions (incluindo Precauções no final)

Isso faz com que Regulação apareça **antes** de Precauções - o oposto do desejado.

---

## Solução Proposta

Mover a seção de **Precauções** para o componente `PatientClinicalData.tsx`, posicionando-a **antes** da seção de Regulação. Isso garantirá que em qualquer layout (desktop ou mobile), Precauções sempre apareça antes de Regulação.

### Antes (estrutura atual)
```text
PatientClinicalData:
  └── ... outras seções
  └── Dieta
  └── Regulação  ← final

PatientEvolutions:
  └── Histórico
  └── Evolução
  └── Pendências
  └── Precauções  ← final
```

### Depois (estrutura proposta)
```text
PatientClinicalData:
  └── ... outras seções
  └── Dieta
  └── Precauções  ← MOVIDO para cá
  └── Regulação

PatientEvolutions:
  └── Histórico
  └── Evolução
  └── Pendências
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/patient/PatientClinicalData.tsx` | Importar `PatientPrecautions` e adicionar a seção antes de Regulação |
| `src/components/patient/PatientEvolutions.tsx` | Remover a seção de Precauções |

---

## Detalhes Técnicos

### PatientClinicalData.tsx

**Adicionar import:**
```typescript
import { PatientPrecautions } from './PatientPrecautions';
```

**Adicionar seção (antes de Regulação, após Dieta):**
```tsx
{/* Precautions Section */}
<div className="section-card">
  <PatientPrecautions 
    patient={patient} 
    onUpdate={onUpdate} 
  />
</div>

{/* Regulation Section */}
<div className="section-card">
  <PatientRegulation ... />
</div>
```

### PatientEvolutions.tsx

**Remover a seção de Precauções (linhas 145-151):**
```tsx
// REMOVER:
{/* Precautions Section */}
<div className="section-card">
  <PatientPrecautions 
    patient={patient} 
    onUpdate={onUpdate} 
  />
</div>
```

**Remover import:**
```typescript
// REMOVER:
import { PatientPrecautions } from './PatientPrecautions';
```

---

## Resultado Esperado

Após a implementação:

| Dispositivo | Ordem das Seções |
|-------------|------------------|
| **Desktop** | Duas colunas - Precauções e Regulação na coluna esquerda, uma após a outra |
| **Mobile** | Coluna única - Precauções sempre aparece antes de Regulação |

A ordem final no fluxo vertical será:
1. Dieta
2. **Precauções** ← agora antes
3. **Regulação** ← agora depois
4. Histórico
5. Evolução
6. Pendências

