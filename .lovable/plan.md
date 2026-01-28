

# Plano: Adaptar Visão Geral do NIR para Exibir Leitos Vagos (Igual ao Coordenador)

## Objetivo

Modificar a "Visão Geral" do NIRDashboard para exibir **todos os leitos** (ocupados e vagos), utilizando o mesmo design visual do `AllUnitsGrid` usado pelo Diarista e Coordenador.

---

## Situação Atual

| Componente | Modo Regulação | Modo Visão Geral |
|------------|----------------|------------------|
| **NIRDashboard** | Mostra apenas leitos com regulação | Mostra apenas leitos ocupados |
| **AllUnitsGrid** (Coord/Diarista) | N/A | Mostra **todos os leitos** (ocupados + vagos) |

A imagem de referência mostra o design do coordenador com:
- Cards de leitos ocupados com paciente, badges e barra de probabilidade
- Cards de leitos vagos com ícone "+" verde e texto "Vago"
- Header por unidade mostrando ocupação (ex: 2/10), altas prováveis e críticos

---

## Solução

### Modificar NIRDashboard.tsx

**1. Ajustar função `filterBeds`:**
- No modo "Visão Geral": retornar **todos os leitos** (não só ocupados)
- Isso inclui leitos vagos e bloqueados

```typescript
const filterBeds = (beds: BedWithPatient[]): BedWithPatient[] => {
  if (viewMode === 'overview') {
    return beds; // Retornar TODOS os leitos, incluindo vagos
  }
  // Modo regulação: apenas com regulação ativa (lógica atual)
  ...
};
```

**2. Atualizar renderização do grid:**
- Quando `bed.patient === null`: renderizar card de leito vago (estilo `BedCard` vago)
- Quando `bed.is_blocked`: renderizar card de leito bloqueado

---

### Criar Componente NIREmptyBedCard

Novo componente simples para renderizar leitos vagos no contexto do NIR (sem ações de admissão):

```tsx
// src/components/nir/NIREmptyBedCard.tsx
export function NIREmptyBedCard({ bed }: { bed: Bed }) {
  // Leito bloqueado
  if (bed.is_blocked) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px]">
          <div className="text-lg font-semibold text-muted-foreground mb-2">Leito {bed.bed_number}</div>
          <Lock className="h-5 w-5 text-destructive" />
          <span className="text-sm font-medium text-destructive mt-2">BLOQUEADO</span>
        </CardContent>
      </Card>
    );
  }

  // Leito vago
  return (
    <Card className="bed-empty">
      <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px]">
        <div className="text-lg font-semibold text-muted-foreground mb-2">Leito {bed.bed_number}</div>
        <div className="p-2 rounded-full bg-success/10">
          <Plus className="h-5 w-5 text-success" />
        </div>
        <span className="text-sm text-muted-foreground mt-2">Vago</span>
      </CardContent>
    </Card>
  );
}
```

---

### Atualizar Renderização no NIRDashboard

Modificar a seção de grid para renderizar o componente correto:

```tsx
{filteredBeds.map((bed) => (
  bed.patient ? (
    <NIRBedCard
      key={bed.id}
      bed={bed}
      patient={bed.patient}
      onUpdate={fetchAllData}
      showProbabilityBar={viewMode === 'overview'}
    />
  ) : (
    <NIREmptyBedCard key={bed.id} bed={bed} />
  )
))}
```

---

## Arquivos a Modificar/Criar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/nir/NIRDashboard.tsx` | Ajustar `filterBeds` para retornar todos os leitos no modo overview; atualizar grid para renderizar componente vazio |
| `src/components/nir/NIREmptyBedCard.tsx` | **Criar** - Componente para exibir leitos vagos/bloqueados no NIR |

---

## Resultado Esperado

### Modo Visão Geral (Após alteração)

```text
┌─────────────────────────────────────────────────────────┐
│ UTI 1 - HMA                     [2/10] [1 alta] [1 crítico] │
├─────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│ │ Leito 1│ │ Leito 2│ │ Leito 3│ │ Leito 4│ │ Leito 5│ │
│ │ AMBS   │ │ JMS    │ │   +    │ │   +    │ │   +    │ │
│ │ 35 anos│ │ 65 anos│ │ Vago   │ │ Vago   │ │ Vago   │ │
│ │[AA][DVA]││ [AA]   │ │        │ │        │ │        │ │
│ │▓▓▓ 0%  │ │▓▓ 100% │ │        │ │        │ │        │ │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Benefícios

| Aspecto | Benefício |
|---------|-----------|
| **Consistência visual** | Mesmo design do coordenador/diarista |
| **Visão completa** | NIR vê ocupação real + leitos disponíveis |
| **Previsibilidade** | Identificar quantos leitos estarão vagos em breve |
| **Planejamento de fluxo** | Melhor gestão de admissões e transferências |

