
# Plano: Bloquear Leitos (Admin/Coordenador)

## Contexto

Adicionar funcionalidade para Admins e Coordenadores bloquearem leitos fisicamente (indisponível para admissão), diferente do conceito de "paciente crítico" (TOT/DVA que impede alta).

## Alterações de Schema

### 1. Migração - Adicionar coluna `is_blocked` na tabela `beds`

```sql
ALTER TABLE beds 
ADD COLUMN is_blocked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE beds 
ADD COLUMN blocked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE beds 
ADD COLUMN blocked_by UUID REFERENCES auth.users(id);

ALTER TABLE beds 
ADD COLUMN blocked_reason TEXT;
```

## Alterações de Código

### Arquivo: `src/types/database.ts`

Atualizar interface `Bed`:

```typescript
export interface Bed {
  id: string;
  unit_id: string;
  bed_number: number;
  is_occupied: boolean;
  is_blocked: boolean;           // NOVO
  blocked_at: string | null;     // NOVO
  blocked_by: string | null;     // NOVO
  blocked_reason: string | null; // NOVO
  created_at: string;
}
```

### Arquivo: `src/components/dashboard/BedCard.tsx`

1. Adicionar novo estado visual para leito bloqueado (fundo vermelho/cinza com ícone de cadeado)
2. Adicionar DropdownMenu com opção "Bloquear Leito" ou "Desbloquear Leito" para Admin/Coordenador
3. Quando bloqueado, não permite admitir paciente

```text
Leito Bloqueado:
┌─────────────────┐
│  Leito 5        │
│     🔒          │
│  BLOQUEADO      │
│ (Manutenção)    │
│                 │
│ [Desbloquear]   │ ← Só Admin/Coord
└─────────────────┘
```

### Novo Arquivo: `src/components/dashboard/BlockBedDialog.tsx`

Modal para bloquear leito com campo de motivo opcional:

```text
┌────────────────────────────────┐
│  Bloquear Leito 5              │
├────────────────────────────────┤
│  Motivo (opcional):            │
│  ┌────────────────────────┐    │
│  │ Manutenção, limpeza... │    │
│  └────────────────────────┘    │
│                                │
│  [Cancelar]  [Confirmar]       │
└────────────────────────────────┘
```

### Arquivo: `src/components/dashboard/AllUnitsGrid.tsx`

1. Adicionar contador de leitos bloqueados nas estatísticas
2. Mostrar badge "X bloqueados" (agora sim referindo-se a leitos físicos)

```typescript
stats: {
  total: number;
  occupied: number;
  blocked: number;      // Leitos fisicamente bloqueados (NOVO)
  highDischarge: number;
  critical: number;     // Renomear de 'blocked' (TOT/DVA)
  palliative: number;
}
```

### Arquivo: `src/hooks/useAuth.tsx`

Já temos `hasRole()` disponível - usaremos para verificar permissão.

## Fluxo de Uso

```text
┌─────────────────────────────────────────────────────────┐
│                    LEITO VAGO                           │
│                                                         │
│   ┌─────────┐                        ┌─────────┐       │
│   │ Admitir │  ← Plantonista         │   ⋮     │       │
│   └─────────┘                        └────┬────┘       │
│                                           │            │
│                           ┌───────────────┴──────┐     │
│                           │ • Bloquear Leito     │     │
│                           └──────────────────────┘     │
│                              ↑ Admin/Coordenador       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   LEITO BLOQUEADO                       │
│                                                         │
│            🔒 BLOQUEADO                                 │
│            "Manutenção"                                 │
│                                                         │
│   ┌──────────────┐                                     │
│   │ Desbloquear  │  ← Admin/Coordenador                │
│   └──────────────┘                                     │
└─────────────────────────────────────────────────────────┘
```

## Regras de Negócio

| Situação | Pode Bloquear? | Pode Desbloquear? | Pode Admitir? |
|----------|----------------|-------------------|---------------|
| Leito Vago | ✅ Admin/Coord | N/A | ✅ Todos |
| Leito Ocupado | ❌ | N/A | N/A |
| Leito Bloqueado | N/A | ✅ Admin/Coord | ❌ |

## Resultado Esperado

1. **Leito vago**: Mostra botão "+" para admitir + menu de contexto com "Bloquear" (Admin/Coord)
2. **Leito bloqueado**: Exibe visual diferenciado (cadeado vermelho), motivo, e botão "Desbloquear" (Admin/Coord)
3. **Estatísticas**: Badge "X bloqueados" na Visão Geral referindo-se a leitos físicos indisponíveis

---

## Seção Técnica

### RLS Policy para bloqueio

```sql
-- Apenas Admin e Coordenador podem bloquear/desbloquear
CREATE POLICY "Admins and coordinators can block beds"
ON beds
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'coordenador')
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'coordenador')
);
```

### Componente BedCard - Lógica de Renderização

```typescript
// Ordem de prioridade de exibição:
if (bed.is_blocked) {
  return <BlockedBedCard />; // Visual de bloqueado
}
if (!patient) {
  return <EmptyBedCard />;   // Visual de vago
}
return <OccupiedBedCard />;  // Visual com paciente
```
