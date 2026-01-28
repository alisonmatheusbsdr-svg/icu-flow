

# Plano: Remover Coordenador do Dropdown de Cadastro e Adicionar NIR

## Situação Atual

O dropdown de "Papel" no formulário de cadastro possui 3 opções:
- Plantonista
- Diarista
- **Coordenador** ← A ser removido

## Alteração Proposta

| Antes | Depois |
|-------|--------|
| Plantonista | Plantonista |
| Diarista | Diarista |
| Coordenador | **NIR (Regulação)** ← Substituir |

## Justificativa

- O **Coordenador** é um papel único e sempre atribuído a um membro da equipe assistencial
- O administrador pode promover um Plantonista ou Diarista para Coordenador pelo painel de administração
- O **NIR** precisa de auto-cadastro pois são membros de um setor separado (Núcleo Interno de Regulação)

## Resultado Visual

```text
┌──────────────────────────────┐
│ Papel                        │
├──────────────────────────────┤
│ 🩺 Plantonista               │
│ 🩺 Diarista                  │
│ 📋 NIR (Regulação)           │
└──────────────────────────────┘
```

---

## Seção Técnica

### Arquivo a Modificar

**`src/pages/Auth.tsx`**

### Mudanças

1. **Importar ícone ClipboardList** (linha 11):
   ```typescript
   import { Stethoscope, UserPlus, LogIn, ClipboardList } from 'lucide-react';
   ```
   - Remove `Activity` (não será mais usado)
   - Adiciona `ClipboardList` para o NIR

2. **Substituir opção Coordenador por NIR** (linhas 194-199):
   ```tsx
   // Antes:
   <SelectItem value="coordenador">
     <div className="flex items-center gap-2">
       <Activity className="h-4 w-4" />
       Coordenador
     </div>
   </SelectItem>
   
   // Depois:
   <SelectItem value="nir">
     <div className="flex items-center gap-2">
       <ClipboardList className="h-4 w-4" />
       NIR (Regulação)
     </div>
   </SelectItem>
   ```

### Fluxo de Atribuição de Coordenador

Após esta alteração, o fluxo para criar um Coordenador será:

1. Usuário se cadastra como **Plantonista** ou **Diarista**
2. Administrador aprova o usuário
3. Administrador altera o papel para **Coordenador** no painel de administração (`/admin` → Usuários)

