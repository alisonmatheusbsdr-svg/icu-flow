
# Plano: Corrigir CORS em Todas as Edge Functions

## Problema Identificado

Todas as 4 Edge Functions do projeto têm a mesma lista de origens CORS que **não inclui os domínios publicados**:

```typescript
// Configuração atual (bloqueando produção)
const allowedOrigins = [
  "https://id-preview--deb97400-6ef9-479c-a47d-70385f8c2cdb.lovable.app",
  "https://lovable.dev",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000"
];
```

Isso bloqueia requisições de:
- `https://sinapsehealthcare.app` (domínio customizado)
- `https://sinapsehealthcare.lovable.app` (URL publicada padrão)

## Impacto por Função

| Função | Uso | Impacto |
|--------|-----|---------|
| `get-users-with-email` | Painel Admin | Não carrega lista de usuários |
| `summarize-evolutions` | Ficha do paciente | IA não consegue resumir evoluções |
| `seed-admin` | Setup inicial | Baixo (raramente usado) |
| `seed-test-users` | Testes | Baixo (raramente usado) |

## Solução

Adicionar os domínios de produção em todas as 4 Edge Functions.

## Alterações Necessárias

### 1. `get-users-with-email/index.ts`

Atualizar a lista de origens (linhas 8-14):

```typescript
const allowedOrigins = [
  "https://sinapsehealthcare.app",
  "https://sinapsehealthcare.lovable.app",
  "https://id-preview--deb97400-6ef9-479c-a47d-70385f8c2cdb.lovable.app",
  "https://lovable.dev",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000"
];
```

### 2. `summarize-evolutions/index.ts`

Mesma atualização (linhas 5-11):

```typescript
const allowedOrigins = [
  "https://sinapsehealthcare.app",
  "https://sinapsehealthcare.lovable.app",
  "https://id-preview--deb97400-6ef9-479c-a47d-70385f8c2cdb.lovable.app",
  "https://lovable.dev",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000"
];
```

### 3. `seed-admin/index.ts`

Mesma atualização (linhas 8-14):

```typescript
const allowedOrigins = [
  "https://sinapsehealthcare.app",
  "https://sinapsehealthcare.lovable.app",
  "https://id-preview--deb97400-6ef9-479c-a47d-70385f8c2cdb.lovable.app",
  "https://lovable.dev",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000"
];
```

### 4. `seed-test-users/index.ts`

Mesma atualização (linhas 8-14):

```typescript
const allowedOrigins = [
  "https://sinapsehealthcare.app",
  "https://sinapsehealthcare.lovable.app",
  "https://id-preview--deb97400-6ef9-479c-a47d-70385f8c2cdb.lovable.app",
  "https://lovable.dev",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000"
];
```

## Resultado Esperado

Após as alterações e reimplantação:

1. Painel Admin (`/admin`) carregará a lista de usuários corretamente
2. Resumo de evoluções por IA funcionará na ficha do paciente
3. Funções de setup continuarão funcionando em ambiente de desenvolvimento

## Verificação

Testar no domínio publicado (`https://sinapsehealthcare.app`):
1. Acessar `/admin` e verificar se a lista de usuários carrega
2. Abrir ficha de um paciente com evoluções e verificar se o resumo IA funciona
