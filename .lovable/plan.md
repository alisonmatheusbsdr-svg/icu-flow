

# Limite de 500 Caracteres na História de Admissão com Sugestão de IA

## O que muda para o usuário

- Um contador de caracteres (ex: `320/500`) aparece abaixo do textarea da história de admissão
- Ao atingir 80% (400 caracteres), o contador fica amarelo como aviso
- Ao atingir ou ultrapassar 500 caracteres, o contador fica vermelho e uma mensagem aparece sugerindo usar o "Melhorar Texto" por IA para condensar
- O texto **não é bloqueado** — o usuário pode digitar além de 500, mas recebe o aviso visual e a sugestão
- O botão "Melhorar Texto" ganha destaque visual (variant muda para `default` em vez de `outline`) quando o limite é excedido, chamando atenção para a funcionalidade de IA

## Arquivo a modificar

| Arquivo | Alteração |
|---|---|
| `src/components/dashboard/AdmitPatientForm.tsx` | Adicionar `CharacterCounter`, destaque no botão de IA quando excede limite |

## Detalhes Técnicos

### 1. Importar o componente existente `CharacterCounter`

O projeto já tem `src/components/ui/character-counter.tsx` pronto. Basta importá-lo e usá-lo.

### 2. Adicionar contador abaixo do textarea

Após o bloco `</div>` que fecha o textarea (linha ~431), inserir:

```tsx
<CharacterCounter current={admissionHistory.length} max={500} />
```

### 3. Destaque no botão "Melhorar Texto" quando excede limite

Alterar o `variant` do botão de melhorar texto de `"outline"` fixo para dinâmico:

```tsx
variant={admissionHistory.length > 500 ? "default" : "outline"}
```

### 4. Mensagem contextual quando excede

Quando `admissionHistory.length > 500`, exibir uma dica abaixo do contador sugerindo usar a IA:

```tsx
{admissionHistory.length > 500 && !isRecording && !isProcessing && (
  <p className="text-xs text-amber-600 flex items-center gap-1">
    <Sparkles className="h-3 w-3" />
    Texto longo — use "Melhorar Texto" para condensar com IA
  </p>
)}
```

### Fluxo visual

```text
┌──────────────────────────────────────────┐
│ História de admissão...                  │
│                                          │
│                                          │
└──────────────────────────────────────────┘
                                    320/500   ← verde (normal)

                                    450/500   ← amarelo (aviso)

                                    530/500   ← vermelho
                              Excede limite para impressão
  ✨ Texto longo — use "Melhorar Texto" para condensar com IA

  [🎤 Gravar por Voz]  [✨ Melhorar Texto]  ← botão fica destacado
```

