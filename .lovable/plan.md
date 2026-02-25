

# Correção do Erro na Conexão de Voz (ElevenLabs Scribe)

## Diagnóstico

Identifiquei tres problemas no código atual que causam o erro "Erro na conexão de voz":

### 1. URL do WebSocket incorreta
O código usa `wss://api.elevenlabs.io/v1/scribe?...` mas o endpoint correto da API ElevenLabs para transcrição em tempo real é:
```
wss://api.elevenlabs.io/v1/speech-to-text/realtime?...
```

### 2. Formato da mensagem de áudio incorreto
O código envia:
```json
{ "audio": "base64..." }
```
Mas a API espera:
```json
{ "message_type": "input_audio_chunk", "audio_base_64": "base64..." }
```

### 3. Perda do contexto de gesto do navegador
O `getUserMedia` (permissão de microfone) é chamado **depois** do `await supabase.functions.invoke(...)`, o que pode causar falha por perda do contexto de interação do usuário. O microfone deve ser solicitado **antes** de qualquer operação assíncrona.

## Arquivo a Modificar

| Arquivo | Alteração |
|---|---|
| `src/components/dashboard/AdmitPatientForm.tsx` | Corrigir URL do WebSocket, formato da mensagem, e ordem das chamadas assíncronas |

## Detalhes da Correção

Na função `startRecording`:

1. Chamar `navigator.mediaDevices.getUserMedia()` **primeiro** (diretamente no handler do clique)
2. Depois buscar o token via `supabase.functions.invoke`
3. Corrigir a URL do WebSocket para `wss://api.elevenlabs.io/v1/speech-to-text/realtime`
4. Adicionar `commit_strategy=vad` nos parâmetros da URL para commits automáticos por detecção de voz
5. Corrigir o payload para `{ message_type: "input_audio_chunk", audio_base_64: ... }`
6. Adicionar handler `ws.onclose` com logging para melhor diagnóstico de erros futuros
7. Limpar o stream de áudio em caso de falha no token ou na conexão WebSocket

