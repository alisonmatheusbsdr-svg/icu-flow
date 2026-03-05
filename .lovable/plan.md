

## Plano: Corrigir parada de gravação e garantir commit do texto parcial

### Problemas identificados

1. **Gravação continua após clicar "Parar"**: O `stopRecording` desconecta o áudio e fecha o WebSocket com delay de 1.5s, mas não envia um `commit` antes de fechar. O processador de áudio pode ainda estar enviando dados antes de ser desconectado.

2. **Texto parcial se perde**: Se o usuário fala e clica "Parar" logo em seguida, o VAD não teve tempo de detectar silêncio, então o texto parcial nunca é commitado. O WebSocket fecha e o texto parcial é limpo no `onclose`.

### Solução

Alterar `stopRecording` nos dois arquivos (`AdmitPatientForm.tsx` e `PatientEvolutions.tsx`):

1. **Enviar `commit` forçado** antes de fechar o WebSocket — isso garante que qualquer texto parcial pendente seja finalizado
2. **Capturar o texto parcial manualmente** como fallback: se após o delay o `partialTranscript` ainda tiver conteúdo (commit não retornou a tempo), incorporá-lo diretamente no texto final
3. **Parar o áudio imediatamente** mas manter o WebSocket aberto por mais tempo (aumentar delay de 1.5s para 3s) para dar tempo ao servidor processar o commit
4. **Limpar `partialTranscript` corretamente** — mover o texto parcial remanescente para o texto principal antes de limpar

### Mudanças em ambos os arquivos

**`stopRecording` reescrito:**
- Primeiro: enviar `{ message_type: "commit" }` pelo WebSocket
- Segundo: parar microfone e processador de áudio (para de enviar dados)
- Terceiro: aguardar ~3s para o servidor processar o commit pendente
- Quarto: se ainda houver `partialTranscript` não commitado, incorporá-lo manualmente ao texto
- Quinto: fechar o WebSocket

**`ws.onclose` ajustado:**
- Antes de limpar `partialTranscript`, mover qualquer texto parcial restante para o campo principal (fallback de segurança)

### Arquivos alterados
- `src/components/dashboard/AdmitPatientForm.tsx`
- `src/components/patient/PatientEvolutions.tsx`

