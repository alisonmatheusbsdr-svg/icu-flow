
## Diagnóstico (o que está acontecendo de verdade)

Pelos requests capturados no navegador, o erro atual do `/admin` **não é mais “token inválido”** na função — é **CORS bloqueando a chamada antes do POST acontecer**.

Evidência:
- O browser está chamando a função com `Origin: https://deb97400-6ef9-479c-a47d-70385f8c2cdb.lovableproject.com`
- Esse domínio **não está** no `allowedOrigins` da função
- O preflight (OPTIONS) recebe `Access-Control-Allow-Origin` diferente do `Origin` (cai no “fallback” para `https://sinapsehealthcare.app`)
- Resultado: o navegador bloqueia e o frontend vê `Failed to fetch / Failed to send a request to the Edge Function`

Evidência adicional:
- Chamando a função diretamente via ferramenta (sem CORS), ela respondeu **200** e retornou usuários e unidades corretamente, então a lógica de autenticação/admin está OK.

Portanto, para o Admin funcionar tanto no preview quanto no publicado (e evitar quebrar novamente quando a URL do preview mudar), precisamos trocar o modelo de CORS.

---

## Objetivo

1. Garantir que **todas** as backend functions chamadas pelo frontend funcionem em:
   - domínio publicado (sinapsehealthcare.app / sinapsehealthcare.lovable.app)
   - preview (domínios `*.lovableproject.com` e eventuais variantes)
2. Evitar manutenção manual de allowlist (que volta a quebrar quando o domínio do preview muda)
3. Manter segurança: as funções já exigem JWT / role / setup key, então liberar o origin não expõe dados por si só.

---

## Mudanças propostas (código)

### 1) Padronizar CORS em todas as backend functions (recomendado)
Arquivos:
- `supabase/functions/get-users-with-email/index.ts`
- `supabase/functions/summarize-evolutions/index.ts`
- `supabase/functions/seed-admin/index.ts`
- `supabase/functions/seed-test-users/index.ts`

Substituir o modelo atual `allowedOrigins + fallback` por um modelo robusto:
- **Refletir o Origin** quando existir: `Access-Control-Allow-Origin: <origin-do-request>`
- Se não houver `Origin` (chamada server-to-server), usar `*`
- **Remover** `Access-Control-Allow-Credentials` (não é necessário para `Authorization` header e evita incompatibilidade com `*`)
- Incluir lista completa de headers recomendados para compatibilidade com supabase-js em navegadores:
  - `authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`
- (Opcional, mas recomendado) adicionar `Access-Control-Allow-Methods: GET,POST,OPTIONS`

Exemplo de bloco a aplicar em cada função:
- Calcular `origin = req.headers.get("Origin")`
- Montar `corsHeaders` em função do `origin`
- `if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })`
- Garantir que **toda Response** (sucesso/erro) inclua `...corsHeaders`

Isso elimina o problema atual e também previne futuros breaks por mudança de domínio do preview.

---

### 2) Harmonizar autenticação do `summarize-evolutions` (para evitar outro 401 mais adiante)
Hoje `summarize-evolutions` ainda usa:
- `supabaseClient.auth.getUser()` (pode falhar em ambientes com signing-keys)

Atualizar para a mesma abordagem robusta usada no `get-users-with-email`:
- Validar `Authorization: Bearer <token>` com regex case-insensitive
- Usar `supabaseClient.auth.getClaims(token)` para obter `sub`
- Usar `sub` como `userId` ao chamar `rpc("is_approved", { _user_id: userId })`

Isso evita regressão de 401 em produção/preview para a funcionalidade de resumo.

---

## Sequência de implementação

1. Editar `get-users-with-email`:
   - Trocar CORS para “reflect origin / wildcard”
   - (Manter getClaims como está; só melhorar parsing do token se necessário)
2. Editar `summarize-evolutions`:
   - Trocar CORS para o mesmo padrão
   - Trocar `getUser()` por `getClaims()` + `sub`
3. Editar `seed-admin` e `seed-test-users`:
   - Trocar CORS para o mesmo padrão (mesmo sendo funções de setup, isso evita “Failed to fetch” caso sejam usadas no preview)
4. Deploy automático das funções pelo build.
5. Validação ponta-a-ponta.

---

## Como vamos validar (checklist)

### Admin (principal)
- Abrir `/admin` no preview e clicar em “Atualizar”
- Confirmar que:
  - tabela carrega os usuários
  - contadores (Total/Pendentes/Aprovados/Rejeitados) aparecem corretos
- No DevTools > Network:
  - `POST /functions/v1/get-users-with-email` deve retornar 200
  - Response headers devem conter `Access-Control-Allow-Origin` igual ao Origin do request

### Resumo de evoluções (impacto secundário)
- Abrir um paciente com evoluções suficientes e acionar o resumo
- Confirmar 200 e geração de texto

---

## Riscos / notas

- Abrir CORS “para qualquer origin” pode soar mais permissivo, mas:
  - A função continua exigindo JWT e papel admin/aprovação
  - Logo, não há vazamento de dados por CORS sozinho
- Se em algum cenário futuro vocês decidirem permitir cookies (credenciais), aí precisamos reintroduzir allowlist e `Allow-Credentials`. Hoje não é necessário.

---

## Entregáveis

- Correção definitiva de CORS para funcionar em qualquer URL de preview e em produção
- Redução de erros “Failed to fetch” e falsos 401 no frontend
- `summarize-evolutions` alinhado ao mesmo padrão de validação JWT (getClaims)

