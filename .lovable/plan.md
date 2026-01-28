

# Plano: Implementar PWA Completo com Service Worker

## Visão Geral

Transformar o Sinapse UTI em um Progressive Web App (PWA) completo que pode ser instalado como aplicativo nativo e funcionar offline. Isso permitirá que médicos e enfermeiros acessem informações críticas mesmo sem conexão à internet.

## Benefícios para o Usuário

- **Instalação na tela inicial** - O app aparece como ícone no celular/computador
- **Funcionamento offline** - Dados em cache disponíveis sem internet
- **Carregamento instantâneo** - Assets ficam salvos no dispositivo
- **Atualizações automáticas** - O app atualiza em segundo plano
- **Push notifications** (futuro) - Alertas de pacientes críticos

## O que será implementado

### 1. Instalar dependência `vite-plugin-pwa`

O plugin vai gerenciar automaticamente:
- Geração do manifest.json
- Criação e registro do Service Worker
- Estratégias de cache (Workbox)
- Atualizações automáticas

### 2. Configurar `vite.config.ts`

Adicionar o plugin com configurações otimizadas para aplicação médica:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'sinapse-logo.png'],
      manifest: {
        name: 'Sinapse UTI',
        short_name: 'Sinapse',
        description: 'Sistema de Gestão e Passagem de Plantão em UTI',
        theme_color: '#1e3a5f',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [...]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // Cache para API do Supabase
          // Cache para imagens
        ]
      }
    })
  ]
});
```

### 3. Atualizar `index.html`

Adicionar meta tags essenciais para PWA:

```html
<!-- Theme color -->
<meta name="theme-color" content="#1e3a5f">

<!-- iOS support -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Sinapse">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">

<!-- Manifest (gerado automaticamente pelo plugin) -->
```

### 4. Criar ícones PWA

Criar pasta `public/icons/` com ícones em múltiplos tamanhos usando o logo Sinapse:

| Tamanho | Uso |
|---------|-----|
| 72x72 | Android antigo |
| 96x96 | Android |
| 128x128 | Chrome Web Store |
| 144x144 | Windows tiles |
| 152x152 | iPad |
| 192x192 | Android (padrão) |
| 384x384 | Android (grande) |
| 512x512 | Splash screen |

### 5. Criar componente de atualização (opcional)

Um toast que aparece quando há nova versão disponível:

```typescript
// src/components/pwa/UpdatePrompt.tsx
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const { needRefresh, updateServiceWorker } = useRegisterSW();
  
  if (needRefresh) {
    return (
      <Toast>
        Nova versão disponível!
        <Button onClick={() => updateServiceWorker()}>
          Atualizar
        </Button>
      </Toast>
    );
  }
}
```

## Estratégias de Cache do Service Worker

### Cache First (Assets estáticos)
- JavaScript, CSS, fontes
- Ícones e imagens da interface
- **Vantagem**: Carregamento instantâneo

### Network First (Dados do Supabase)
- Dados de pacientes
- Evoluções e prescrições
- **Vantagem**: Sempre atualizado, com fallback offline

### Stale While Revalidate (Listas)
- Lista de unidades
- Lista de leitos
- **Vantagem**: Rápido + atualização em background

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `package.json` | Modificar | Adicionar vite-plugin-pwa |
| `vite.config.ts` | Modificar | Configurar plugin PWA |
| `index.html` | Modificar | Adicionar meta tags PWA |
| `public/icons/` | Criar | 8 ícones em diferentes tamanhos |
| `src/components/pwa/UpdatePrompt.tsx` | Criar | Toast de atualização |
| `src/App.tsx` | Modificar | Incluir UpdatePrompt |

## Cores do Tema

Baseado no design system existente:
- **Theme color**: `#1e3a5f` (azul escuro da sidebar)
- **Background**: `#f8fafc` (background claro)

## Resultado Esperado

Após implementação:

1. **Android**: Banner "Adicionar à tela inicial" aparece automaticamente
2. **iOS**: Safari > Compartilhar > "Adicionar à Tela de Início"
3. **Desktop Chrome**: Ícone de instalação na barra de endereços
4. **Offline**: App abre e mostra últimos dados carregados
5. **Atualizações**: Toast notifica quando há nova versão

## Validação

1. Testar instalação no celular (Android/iOS)
2. Verificar se app abre sem barra do navegador
3. Desligar WiFi e verificar se app ainda abre
4. Verificar pontuação no Lighthouse (aba PWA)
5. Confirmar que atualizações são detectadas

## Detalhes Técnicos

### Workbox Runtime Caching

```typescript
runtimeCaching: [
  {
    urlPattern: /^https:\/\/.*supabase.*\/rest\/v1\/.*/,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'api-cache',
      expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
    }
  },
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'image-cache',
      expiration: { maxEntries: 100, maxAgeSeconds: 604800 }
    }
  }
]
```

### Registro do Service Worker

O `vite-plugin-pwa` gera automaticamente:
- `sw.js` - Service Worker compilado
- `registerSW.js` - Script de registro
- `manifest.webmanifest` - Manifest gerado

