

# Unificar Texto Parcial Dentro do Textarea

## Problema Atual

O texto parcial (partial transcript) aparece **fora** do textarea, em um `<p>` separado abaixo dele. O usuário quer que, ao falar, o texto já vá aparecendo **dentro** da própria caixa de texto, unificando tudo em um único local.

## Solução

Mostrar o valor do textarea como `admissionHistory + partialTranscript` durante a gravação, de forma que o texto sendo construído em tempo real apareça diretamente no campo. O `partialTranscript` será exibido visualmente diferenciado (não será possível estilizar dentro de um `<textarea>` nativo, mas o texto aparecerá concatenado naturalmente).

## Arquivo a Modificar

| Arquivo | Alteração |
|---|---|
| `src/components/dashboard/AdmitPatientForm.tsx` | Unificar partial transcript dentro do textarea e remover exibição separada |

## Detalhes Técnicos

### 1. Valor do Textarea durante gravação
Alterar o `value` do textarea para incluir o partial transcript em tempo real:

```typescript
value={isRecording && partialTranscript
  ? admissionHistory.trim() + (admissionHistory.trim() ? ' ' : '') + partialTranscript
  : admissionHistory}
```

### 2. Remover exibição separada do partial transcript
Remover o bloco `<p>` que exibe o `partialTranscript` abaixo do textarea (linhas 421-425), pois o texto já estará dentro da caixa.

### 3. Manter scroll automático
Não há necessidade de scroll automático especial — o textarea com `value` controlado já mantém o cursor no final naturalmente.

### Resultado
- Enquanto grava, o texto confirmado + texto parcial aparecem juntos dentro do textarea
- Ao receber `committed_transcript`, o texto é adicionado ao `admissionHistory` e o partial é limpo
- O ciclo se repete: o usuário vê o texto crescer continuamente dentro da mesma caixa

