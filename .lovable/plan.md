

# Admissão em 2 Etapas com Transcrição por Voz

## Resumo

O conector ElevenLabs já foi vinculado ao projeto com sucesso — a `ELEVENLABS_API_KEY` está disponível nas funções backend. Agora implementaremos o fluxo completo.

## Arquivos a Criar

| Arquivo | Finalidade |
|---|---|
| `supabase/functions/elevenlabs-scribe-token/index.ts` | Gera token de uso único para transcrição em tempo real via ElevenLabs Scribe |
| `supabase/functions/improve-admission-text/index.ts` | Usa Lovable AI (Gemini) para melhorar/estruturar texto clínico |

## Arquivos a Modificar

| Arquivo | Alteração |
|---|---|
| `src/components/dashboard/AdmitPatientForm.tsx` | Transformar em stepper de 2 etapas com gravação por voz e melhoramento de texto |
| `supabase/config.toml` | Adicionar `verify_jwt = false` para as duas novas edge functions |

## Detalhes Técnicos

### Edge Function: `elevenlabs-scribe-token`
- Valida JWT do usuário via `getClaims()`
- Chama `POST https://api.elevenlabs.io/v1/single-use-token/realtime_scribe` com a `ELEVENLABS_API_KEY`
- Retorna o token ao frontend para conexão WebSocket

### Edge Function: `improve-admission-text`
- Valida JWT do usuário
- Recebe `{ text }` no body
- Envia ao Lovable AI (`google/gemini-3-flash-preview`) com prompt de melhoramento clínico
- Trata erros 429 (rate limit) e 402 (créditos)
- Retorna `{ improved_text }`

### AdmitPatientForm — Fluxo de 2 Etapas

**Passo 1** (formulário atual, inalterado):
- Iniciais, idade, peso, HD, equipe, comorbidades, paliativo
- Botão "Próximo →" com validação de campos obrigatórios

**Passo 2** (novo):
- Textarea para história de admissão (opcional, sem limite de caracteres)
- Botão "Gravar por Voz": conecta WebSocket ao ElevenLabs Scribe (`scribe_v2_realtime`, `language_code=por`), captura áudio via `AudioContext` + `ScriptProcessor` em PCM 16kHz, envia chunks base64, recebe `partial_transcript` e `committed_transcript` em tempo real
- Botão "Melhorar Texto": envia texto para `improve-admission-text`, exibe preview com botões Aceitar/Rejeitar
- Botão "Voltar" e "Admitir Paciente"
- Ao admitir: cria paciente → marca leito ocupado → se houver texto, insere como primeira evolução (`evolutions` com `clinical_status: 'inalterado'`, `created_by: user.id`)

### Indicador de Etapa

```text
  ● 1 Dados do Paciente ─────── ○ 2 História de Admissão
```

Navegação bidirecional entre os passos. O step indicator é clicável.

### Dependências
- Nenhum pacote npm adicional necessário — a transcrição usa WebSocket nativo + AudioContext ao invés de `@elevenlabs/react`, evitando dependência extra

