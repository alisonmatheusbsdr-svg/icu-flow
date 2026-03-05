

## Plano: Botão manual para finalizar transcrição em ambientes barulhosos

### Problema
O `commit_strategy=vad` depende de silêncio para finalizar segmentos. Em ambientes ruidosos, o silêncio nunca é detectado e o texto parcial fica "preso" sem ser commitado.

### Solução
Adicionar um botão visível durante a gravação que envia um comando `commit` manual ao WebSocket, forçando a finalização do trecho parcial atual. A estratégia VAD continua funcionando normalmente — o botão serve como fallback.

### Mudanças

**`src/components/patient/PatientEvolutions.tsx`** e **`src/components/dashboard/AdmitPatientForm.tsx`** (mesma lógica nos dois):

1. Adicionar função `forceCommit` que envia `{ message_type: "commit" }` pelo WebSocket (`wsRef.current`)
2. Adicionar um botão "Finalizar trecho" (ícone `Check` ou `CornerDownLeft`) que aparece **apenas durante a gravação**, ao lado do indicador "Gravando"
3. O botão chama `forceCommit`, que transfere o `partialTranscript` atual para o texto commitado
4. Estilo: botão compacto, posicionado próximo ao indicador de gravação no canto superior do textarea

### UX
- O botão só aparece quando `isRecording === true`
- Ao clicar, o trecho parcial é finalizado imediatamente
- O VAD continua funcionando em paralelo para ambientes silenciosos

