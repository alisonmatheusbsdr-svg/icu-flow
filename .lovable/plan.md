

# Plano: Revisão e Melhorias de Responsividade Mobile

## Diagnóstico Geral

Após análise detalhada do código, identifiquei os principais problemas de usabilidade em dispositivos móveis:

---

## Problemas Encontrados

### 1. **Header (`DashboardHeader.tsx`)** - CRÍTICO
O header é o componente mais problemático para mobile:

| Problema | Impacto |
|----------|---------|
| Todos os botões ficam em uma única linha | Transborda a tela em celulares |
| Nome do usuário + roles ocupam muito espaço | Fica cortado ou quebra layout |
| Select de unidade tem largura fixa (w-48) | Pode não caber |
| Múltiplos botões de ação (Perfil, Admin, Passagem) | Amontoados em tela pequena |

**Solução proposta:**
- Transformar em layout colapsável com menu hamburger em mobile
- Usar `Sheet` (drawer lateral) para menu mobile
- Ocultar texto dos botões, deixando apenas ícones em mobile
- Mover informações do usuário para o drawer

---

### 2. **Modal de Paciente (`PatientModal.tsx`)** - CRÍTICO
O modal ocupa 95vw mas tem problemas internos:

| Problema | Impacto |
|----------|---------|
| Grid de 2 colunas (`lg:grid-cols-2`) sem adaptação mobile | Telas médias ficam espremidas |
| Botões do header empilhados horizontalmente | Não cabem em mobile |
| Badges de diagnóstico transbordam | Ficam cortados |

**Solução proposta:**
- Em mobile: botões de ação em um dropdown único ou scroll horizontal
- Header do modal mais compacto
- Grid sempre 1 coluna em mobile (< 768px)
- Scroll horizontal para badges se necessário

---

### 3. **Tabela de Usuários (`UserManagement.tsx`)** - CRÍTICO
A página `/admin` usa uma tabela tradicional:

| Problema | Impacto |
|----------|---------|
| Tabela com 7 colunas | Impossível visualizar em mobile |
| Apenas `overflow-x-auto` como solução | Experiência ruim |
| Checkboxes de unidades em linha | Fica muito largo |

**Solução proposta:**
- Em mobile: trocar tabela por lista de cards
- Cada usuário vira um card expansível
- Ações e detalhes em accordion dentro do card
- Cards de estatísticas: `grid-cols-2` em vez de `grid-cols-4`

---

### 4. **Grid de Leitos (`BedGrid.tsx` e `AllUnitsGrid.tsx`)** - MODERADO
| Problema | Impacto |
|----------|---------|
| Mínimo de 2 colunas em mobile (`grid-cols-2`) | Leitos ficam muito pequenos |
| Cards com muito conteúdo comprimido | Difícil de ler |

**Solução proposta:**
- Em telas muito pequenas (< 400px): 1 coluna
- Melhorar breakpoints: `grid-cols-1 xs:grid-cols-2 sm:grid-cols-3`
- Adicionar classe `text-xs` para texto em mobile

---

### 5. **Página de Autenticação (`Auth.tsx`)** - BOM, mas ajustável
Já está bem responsiva, apenas ajustes menores:
- Padding pode ser reduzido em mobile
- Formulário poderia ter campos maiores (touch-friendly)

---

### 6. **NIR Dashboard (`NIRDashboard.tsx`)** - MODERADO
| Problema | Impacto |
|----------|---------|
| Select de filtro + badges na mesma linha | Transborda em mobile |
| Grid de beds começa em 2 colunas | Pode ser muito pequeno |

**Solução proposta:**
- Empilhar filtros verticalmente em mobile
- Badges de status em scroll horizontal
- Grid: 1 coluna em mobile

---

### 7. **Dados Clínicos (`PatientClinicalData.tsx`)** - MODERADO
Componente longo com várias seções:
- Dropdowns e inputs funcionam bem
- Precisa garantir que botões não transbordem

---

## Implementação Proposta

### Fase 1: Header Responsivo (Maior impacto)
1. Criar `MobileNav.tsx` usando `Sheet` component
2. Detectar mobile via `useIsMobile()` hook existente
3. Em mobile:
   - Logo + hamburger menu à esquerda
   - Drawer contém: seletor de unidade, perfil, botões de ação, logout
4. Em desktop: manter layout atual

### Fase 2: Modal de Paciente Responsivo
1. Botões de ação em dropdown `DropdownMenu` para mobile
2. Ajustar grid para `grid-cols-1` em telas < 768px
3. Header mais compacto com informações essenciais

### Fase 3: Admin Responsivo
1. Criar componente `UserCard.tsx` para visualização mobile
2. Usar `useIsMobile()` para alternar entre Table e Cards
3. Cards de estatísticas em 2 colunas no mobile

### Fase 4: Grids de Leitos
1. Ajustar breakpoints do grid
2. Adicionar classe custom para telas muito pequenas

### Fase 5: Ajustes Menores
1. NIR Dashboard: empilhar filtros
2. SelectUnit: já está bom, pequenos ajustes de padding
3. Formulários: aumentar `min-height` de inputs para 44px (touch-friendly)

---

## Arquivos a Modificar

| Arquivo | Alteração | Prioridade |
|---------|-----------|------------|
| `src/components/dashboard/DashboardHeader.tsx` | Refatorar para responsivo com drawer mobile | Alta |
| `src/components/patient/PatientModal.tsx` | Botões em dropdown + grid responsivo | Alta |
| `src/components/admin/UserManagement.tsx` | Alternar tabela/cards + stats grid | Alta |
| `src/components/dashboard/BedGrid.tsx` | Ajustar grid cols breakpoints | Média |
| `src/components/dashboard/AllUnitsGrid.tsx` | Ajustar grid cols breakpoints | Média |
| `src/components/nir/NIRDashboard.tsx` | Empilhar filtros em mobile | Média |
| `src/index.css` | Adicionar utilitários para xs breakpoint | Baixa |

---

## Arquivos Novos

| Arquivo | Descrição |
|---------|-----------|
| `src/components/dashboard/MobileNav.tsx` | Drawer de navegação mobile |
| `src/components/admin/UserCard.tsx` | Card de usuário para visualização mobile |

---

## Detalhes Técnicos

### Breakpoints Tailwind (referência)
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

### Custom XS breakpoint (a adicionar)
```css
@media (min-width: 400px) {
  .xs\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```

### Padrão de detecção mobile
```typescript
// Usar hook existente
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile();
// Renderização condicional baseada em isMobile
```

### Exemplo de Header Mobile
```typescript
{isMobile ? (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon">
        <Menu className="h-5 w-5" />
      </Button>
    </SheetTrigger>
    <SheetContent side="left">
      {/* Conteúdo do menu */}
    </SheetContent>
  </Sheet>
) : (
  // Header desktop atual
)}
```

---

## Resultado Esperado

Após implementação:

1. **Header**: Menu hamburger em mobile, todos os controles acessíveis via drawer
2. **Modal de Paciente**: Botões organizados, conteúdo em coluna única
3. **Admin**: Cards de usuário ao invés de tabela, fácil de navegar
4. **Grids**: Leitos legíveis em qualquer tamanho de tela
5. **Touch-friendly**: Todos os elementos clicáveis com área mínima de 44px

---

## Ordem de Implementação Sugerida

1. Header (maior impacto visual imediato)
2. Admin/UserManagement (você está nessa página agora)
3. PatientModal
4. Grids de leitos
5. Ajustes menores

