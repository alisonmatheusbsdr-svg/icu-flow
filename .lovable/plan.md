

# Plano: Atualizar a Logo do Sinapse | UTI

## Nova Logo

A nova logo é um **"S" estilizado** com elementos de sinapse/conexões neurais, usando um gradiente azul-teal que combina perfeitamente com a paleta de cores do sistema.

## Locais Onde a Logo Será Atualizada

| Local | Descrição |
|-------|-----------|
| **DashboardHeader** | Logo no canto superior esquerdo do dashboard |
| **Auth (Login)** | Logo centralizada na tela de login |
| **SelectUnit** | Logo no header da seleção de UTI |
| **Favicon** | Ícone da aba do navegador |
| **Meta tags (og:image)** | Imagem de compartilhamento social |

## Mudança Visual

| Antes | Depois |
|-------|--------|
| Ícone `Activity` (Lucide) em caixa azul | Nova logo em formato de imagem |

## Arquivos a Modificar

1. **Copiar a imagem para o projeto**
   - Copiar para `src/assets/sinapse-logo.png` (para imports em componentes React)
   - Copiar também para `public/sinapse-logo.png` (para favicon e meta tags)

2. **`src/components/dashboard/DashboardHeader.tsx`**
   - Substituir o ícone `Activity` pela nova imagem
   - Ajustar tamanho para aproximadamente 32x32px

3. **`src/pages/Auth.tsx`**
   - Substituir o ícone `Activity` pela nova imagem
   - Tamanho maior (~40x40px) para destaque na tela de login

4. **`src/pages/SelectUnit.tsx`**
   - Substituir o ícone `Building2` pela nova logo
   - Manter consistência visual com outras páginas

5. **`index.html`**
   - Atualizar o favicon para usar a nova logo
   - Atualizar og:image para compartilhamento social

---

## Seção Técnica

### Estrutura do Componente de Logo

Para manter consistência, será criado um componente reutilizável:

```typescript
// src/components/SinapseLogo.tsx
import sinapseLogoSrc from '@/assets/sinapse-logo.png';

interface SinapseLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-6 w-6',   // Header
  md: 'h-8 w-8',   // SelectUnit
  lg: 'h-10 w-10' // Auth/Login
};

export function SinapseLogo({ size = 'md', className }: SinapseLogoProps) {
  return (
    <img 
      src={sinapseLogoSrc} 
      alt="Sinapse Logo" 
      className={cn(sizes[size], className)}
    />
  );
}
```

### Atualizações nos Componentes

**DashboardHeader.tsx:**
```tsx
// Antes:
<div className="p-1.5 bg-primary rounded-lg">
  <Activity className="h-5 w-5 text-primary-foreground" />
</div>

// Depois:
<SinapseLogo size="sm" />
```

**Auth.tsx:**
```tsx
// Antes:
<div className="p-2 bg-primary rounded-lg">
  <Activity className="h-8 w-8 text-primary-foreground" />
</div>

// Depois:
<SinapseLogo size="lg" />
```

**SelectUnit.tsx:**
```tsx
// Antes:
<div className="p-2 bg-primary rounded-lg">
  <Building2 className="h-6 w-6 text-primary-foreground" />
</div>

// Depois:
<SinapseLogo size="md" />
```

### Favicon

```html
<!-- index.html -->
<link rel="icon" type="image/png" href="/sinapse-logo.png" />
```

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/assets/sinapse-logo.png` | **Novo** - Imagem da logo |
| `public/sinapse-logo.png` | **Novo** - Logo para favicon/meta |
| `src/components/SinapseLogo.tsx` | **Novo** - Componente reutilizável |
| `src/components/dashboard/DashboardHeader.tsx` | Usar novo componente |
| `src/pages/Auth.tsx` | Usar novo componente |
| `src/pages/SelectUnit.tsx` | Usar novo componente |
| `index.html` | Atualizar favicon e meta tags |

