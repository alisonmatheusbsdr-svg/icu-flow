

# Voz → Texto + Melhorar Texto + Aviso de Limite na Evolução

## O que muda para o usuário

- Na seção "SUA EVOLUÇÃO", três novos botões aparecem abaixo do textarea: **Gravar por Voz**, **Melhorar Texto** e **Salvar Rascunho**
- O usuário pode ditar a evolução por voz usando o mesmo sistema de transcrição em tempo real (ElevenLabs Scribe) já usado na admissão
- O texto parcial aparece diretamente no textarea enquanto o usuário fala, com feedback visual (borda vermelha pulsante)
- Após digitar ou ditar, pode usar "Melhorar Texto" para refinar com IA — o texto melhorado aparece para aceitar ou rejeitar
- Quando o texto excede 420 caracteres, uma mensagem sugere usar "Melhorar Texto" para condensar, e o botão de IA ganha destaque visual
- O CharacterCounter já existente continua funcionando normalmente

## Arquivo a modificar

| Arquivo | Alteração |
|---|---|
| `src/components/patient/PatientEvolutions.tsx` | Adicionar gravação por voz, melhora de texto por IA, e aviso de limite |

## Detalhes Técnicos

### 1. Novos estados e refs

Adicionar os mesmos estados usados no `AdmitPatientForm`:
- `isRecording`, `isProcessing`, `partialTranscript` — para controle da gravação
- `isImproving`, `improvedText` — para controle da melhora por IA
- Refs: `wsRef`, `textareaRef`, `audioContextRef`, `processorRef`, `sourceRef`, `streamRef`

### 2. Gravação por voz (padrão idêntico ao AdmitPatientForm)

Reutilizar a mesma lógica de `startRecording` / `stopRecording`:
1. Pedir permissão de microfone
2. Obter token via `supabase.functions.invoke('elevenlabs-scribe-token')`
3. Conectar WebSocket ao ElevenLabs Scribe com VAD
4. Enviar áudio PCM16 em tempo real
5. `partial_transcript` → atualizar `partialTranscript`
6. `committed_transcript` → concatenar em `newEvolution`

### 3. Melhora de texto por IA

Reutilizar a edge function `improve-admission-text` existente (o prompt é genérico o suficiente para evoluções clínicas):
- `handleImproveText`: invoca a function com o texto atual
- Exibe o resultado em um bloco de comparação com botões Aceitar/Rejeitar
- Ao aceitar, substitui o conteúdo de `newEvolution`

### 4. Aviso de limite de caracteres

Quando `newEvolution.length > EVOLUTION_CHAR_LIMIT (420)`:
- Exibir mensagem com ícone Sparkles: "Texto longo — use 'Melhorar Texto' para condensar com IA"
- Botão "Melhorar Texto" muda de `variant="outline"` para `variant="default"`

### 5. Alterações no textarea

- Adicionar `ref={textareaRef}` ao textarea existente
- Quando gravando, exibir `newEvolution + partialTranscript` como valor
- Desabilitar textarea durante gravação/processamento
- Adicionar classes visuais de gravação (borda vermelha pulsante) e processamento

### 6. Layout dos botões

Reorganizar a área de botões em duas linhas:
- **Linha 1**: Gravar por Voz | Melhorar Texto
- **Linha 2**: Salvar Rascunho | Validar Evolução

### 7. Bloco de texto melhorado

Quando `improvedText` existe, exibir entre o textarea e os botões:
- Texto melhorado em bloco destacado com borda primary
- Botões "Rejeitar" e "Aceitar"

### Nenhuma edge function nova necessária

A edge function `improve-admission-text` já existe e será reutilizada. A edge function `elevenlabs-scribe-token` também já está configurada.

### Fluxo visual

```text
┌─────────────────────────────────────────────┐
│ SUA EVOLUÇÃO                                │
│                                             │
│  [Melhor] [Pior] [Inalterado]               │
│                                             │
│  ┌─────────────────────────────────────────┐│
│  │ Texto da evolução...          🎤 Gravando││
│  │                                         ││
│  └─────────────────────────────────────────┘│
│                                      380/420│
│                                             │
│  ┌ Texto Melhorado ────────────────────────┐│
│  │ Versão melhorada pela IA...             ││
│  │                    [Rejeitar] [Aceitar]  ││
│  └─────────────────────────────────────────┘│
│                                             │
│  [🎤 Gravar por Voz]  [✨ Melhorar Texto]   │
│  [💾 Salvar Rascunho] [✅ Validar Evolução] │
└─────────────────────────────────────────────┘
```

