

## Plano: Remover o dropdown de seleção de UTI do cabeçalho

### Contexto
O dropdown "Visão Geral" no header do dashboard (visível na imagem com a seta vermelha) é usado apenas pelo Admin para alternar entre unidades ou ver a visão geral. O usuário considera esse controle desnecessário.

### O que será removido
O bloco inteiro do seletor de unidade no header (linhas 178-226 do `DashboardHeader.tsx`), que inclui:
1. **Dropdown do Admin** — `<Select>` com opções "Visão Geral" e cada unidade
2. **Badge "Visão Geral"** — para Coordenadores/Diaristas
3. **Badge com cadeado** — para Plantonistas mostrando a unidade travada

### O que será mantido
- A navegação mobile (`MobileNav`) permanece inalterada, pois tem sua própria lógica
- O logo e nome "Sinapse | UTI" continuam no header
- Os indicadores de tempo, passagem de plantão e demais controles não são afetados
- A lógica de roteamento e permissões continua funcionando normalmente

### Impacto
- Admins perderão a capacidade de trocar de unidade pelo header — continuarão sempre na "Visão Geral" ou na unidade que selecionaram via `/select-unit`
- Coordenadores e Diaristas já viam apenas um badge estático, então não há mudança funcional
- Plantonistas já tinham o badge travado, então também sem impacto funcional

### Mudanças técnicas

**Arquivo:** `src/components/dashboard/DashboardHeader.tsx`
- Remover o bloco condicional de renderização do seletor (linhas 178-226)
- Remover imports não utilizados: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Building2`, `LayoutGrid`, `Lock`
- Remover variável `showUnitDropdown` (linha 83)

