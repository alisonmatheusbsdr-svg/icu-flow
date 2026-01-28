

# Plano: Adicionar Propriedades Avançadas ao Web App Manifest

## Visão Geral

Enriquecer o manifest PWA do Sinapse UTI com propriedades avançadas que melhoram a experiência do usuário e a integração com o sistema operacional.

## Propriedades a Adicionar

### 1. `categories` - Categorização do App
Define em quais categorias o app se encaixa nas lojas de aplicativos:

```typescript
categories: ["medical", "health", "productivity", "business"]
```

**Benefício**: Ajuda usuários a encontrar o app quando buscam por categoria.

---

### 2. `display_override` - Modos de Exibição Alternativos
Permite definir uma sequência de modos de exibição que o navegador tentará usar, em ordem de preferência:

```typescript
display_override: ["window-controls-overlay", "standalone", "minimal-ui"]
```

| Modo | Descrição |
|------|-----------|
| `window-controls-overlay` | Controles do sistema integrados na barra de título (desktop moderno) |
| `standalone` | App em tela cheia sem barra de navegação |
| `minimal-ui` | Fallback com controles mínimos |

**Benefício**: Experiência mais nativa em desktops Windows/macOS/Linux.

---

### 3. `prefer_related_applications` e `related_applications`
Para futuro, caso vocês lancem um app nativo:

```typescript
prefer_related_applications: false,
related_applications: []
```

Mantemos `false` para priorizar o PWA web. No futuro, se houver apps nativos para iOS/Android, podemos adicionar:

```typescript
related_applications: [
  {
    platform: "play",
    url: "https://play.google.com/store/apps/details?id=com.sinapse.uti",
    id: "com.sinapse.uti"
  }
]
```

---

### 4. `scope_extensions` - Extensões de Escopo (Experimental)
Permite que domínios adicionais sejam considerados "dentro do app":

```typescript
scope_extensions: [
  { origin: "https://sinapsehealthcare.lovable.app" },
  { origin: "https://*.lovable.app" }
]
```

**Nota**: Esta é uma API experimental e pode não funcionar em todos os navegadores ainda.

---

### 5. `iarc_rating_id` - Classificação Etária
Para aplicações médicas, geralmente é "para todos":

```typescript
iarc_rating_id: "" // Deixar vazio se não houver certificação IARC
```

**Nota**: Requer certificação formal do IARC. Para aplicações internas/profissionais, geralmente não é necessário.

---

## Outras Propriedades Úteis

### `shortcuts` - Atalhos Rápidos
Ações rápidas ao pressionar e segurar o ícone do app:

```typescript
shortcuts: [
  {
    name: "Dashboard",
    short_name: "Início",
    description: "Ir para o dashboard principal",
    url: "/dashboard",
    icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }]
  },
  {
    name: "Admin",
    short_name: "Admin",
    description: "Painel administrativo",
    url: "/admin",
    icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }]
  }
]
```

### `screenshots` - Screenshots para Instalação
Imagens exibidas no prompt de instalação:

```typescript
screenshots: [
  {
    src: "/screenshots/dashboard.png",
    sizes: "1280x720",
    type: "image/png",
    form_factor: "wide",
    label: "Dashboard de Leitos"
  },
  {
    src: "/screenshots/mobile.png",
    sizes: "390x844",
    type: "image/png",
    form_factor: "narrow",
    label: "Visão Mobile"
  }
]
```

---

## Configuração Final Proposta

```typescript
manifest: {
  name: "Sinapse UTI",
  short_name: "Sinapse",
  description: "Sistema de Gestão e Passagem de Plantão em UTI",
  theme_color: "#1e3a5f",
  background_color: "#f8fafc",
  display: "standalone",
  display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
  orientation: "portrait-primary",
  start_url: "/",
  scope: "/",
  categories: ["medical", "health", "productivity", "business"],
  prefer_related_applications: false,
  related_applications: [],
  shortcuts: [
    {
      name: "Dashboard",
      short_name: "Início",
      url: "/dashboard",
      icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }]
    },
    {
      name: "Administração",
      short_name: "Admin",
      url: "/admin",
      icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }]
    }
  ],
  icons: [
    // ... ícones existentes
  ]
}
```

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `vite.config.ts` | Modificar | Adicionar propriedades avançadas ao manifest |
| `public/screenshots/` | (Opcional) Criar | Screenshots para prompt de instalação |

---

## Resumo das Propriedades

| Propriedade | Valor | Necessidade |
|-------------|-------|-------------|
| `categories` | `["medical", "health", ...]` | Recomendado |
| `display_override` | `["window-controls-overlay", ...]` | Recomendado |
| `prefer_related_applications` | `false` | Opcional |
| `related_applications` | `[]` | Opcional (futuro) |
| `shortcuts` | Dashboard + Admin | Recomendado |
| `iarc_rating_id` | Vazio | Não aplicável |
| `scope_extensions` | Experimental | Não recomendado ainda |
| `screenshots` | Imagens | Opcional (melhora UX de instalação) |

---

## Detalhes Técnicos

### Compatibilidade de `display_override`
- Chrome 89+ (desktop/Android)
- Edge 89+
- Samsung Internet 15+
- iOS Safari: ignora (usa `display`)

### Compatibilidade de `shortcuts`
- Chrome 84+ (Android/Windows/macOS/Linux)
- Edge 84+
- iOS Safari: não suportado

### `scope_extensions`
- Ainda em proposta/experimentação
- Pode ser ignorado por navegadores atuais
- Alternativa: configurar redirects no servidor

