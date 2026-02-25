

# Audiodescrição do Resumo Clínico

## O que muda para o usuário

- Um novo botão **"Ouvir"** (com ícone de alto-falante) aparece no Dialog do resumo clínico, ao lado do botão "Copiar"
- Ao clicar, o texto do resumo é enviado para a ElevenLabs TTS e reproduzido como áudio
- Durante a reprodução, o botão muda para **"Parar"** com ícone diferente, permitindo interromper
- O projeto já tem o conector ElevenLabs configurado (`ELEVENLABS_API_KEY` disponível)

## Arquivos a criar/modificar

| Arquivo | Alteração |
|---|---|
| `supabase/functions/elevenlabs-tts/index.ts` | Nova edge function para converter texto em áudio via ElevenLabs |
| `supabase/config.toml` | Entrada para a nova function |
| `src/components/patient/PatientModal.tsx` | Botão "Ouvir" no Dialog do resumo + estados de áudio |

## Detalhes Técnicos

### 1. Edge Function `elevenlabs-tts`

Recebe `{ text, voiceId }`, chama a API ElevenLabs TTS e retorna o áudio MP3 como binary. Usa autenticação via `getClaims` + `is_approved` (mesmo padrão das outras functions).

Voz padrão: **Alice** (`Xb7hH8MSUJpSbSDYk0k2`) — voz feminina clara, bom para leitura médica em português.

Modelo: `eleven_multilingual_v2` (suporte a português).

### 2. PatientModal — novos estados

```typescript
const [isPlayingAudio, setIsPlayingAudio] = useState(false);
const [isLoadingAudio, setIsLoadingAudio] = useState(false);
const audioRef = useRef<HTMLAudio | null>(null);
```

### 3. Função `handlePlaySummary`

Usa `fetch()` direto (não `supabase.functions.invoke()`) para receber o áudio binário como blob, cria um `URL.createObjectURL` e reproduz com `new Audio()`. Ao terminar ou ao clicar "Parar", para a reprodução e limpa a URL.

### 4. Botão no Dialog

Inserido ao lado do "Copiar":

```text
[🔊 Ouvir]  [📋 Copiar]  [Fechar]
```

Durante carregamento: `[⏳ Carregando...]`
Durante reprodução: `[⏹ Parar]`

Quando o Dialog fecha, o áudio para automaticamente.

