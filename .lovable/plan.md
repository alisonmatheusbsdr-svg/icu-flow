

# Admissão em 2 Etapas com Transcrição por Voz (ElevenLabs STT)

## Resumo

Transformar o formulário de admissão em um fluxo de 2 passos:
- **Passo 1**: Formulário atual (iniciais, idade, peso, HD, equipe, comorbidades, paliativo)
- **Passo 2**: História de admissão com campo de texto livre + gravação por voz via ElevenLabs STT + melhoramento de texto via Lovable AI + botão de aprovação

Ao finalizar, o paciente é criado e a história de admissão é inserida automaticamente como a **primeira evolução** do paciente.

## Pré-requisitos

### 1. Conectar ElevenLabs
O workspace já tem uma conexão ElevenLabs disponível (`std_01kgad697eesa952q0mh2fzpy4`), mas ela ainda não está vinculada ao projeto. Precisaremos vinculá-la para que o `ELEVENLABS_API_KEY` fique disponível nas edge functions.

## Arquivos a Criar

| Arquivo | Finalidade |
|---|---|
| `supabase/functions/elevenlabs-scribe-token/index.ts` | Edge function para gerar token de transcrição em tempo real via ElevenLabs STT |
| `supabase/functions/improve-admission-text/index.ts` | Edge function que usa Lovable AI para melhorar/estruturar o texto transcrito |

## Arquivos a Modificar

| Arquivo | Alteração |
|---|---|
| `src/components/dashboard/AdmitPatientForm.tsx` | Transformar em formulário de 2 etapas com navegação entre passos |

## Detalhes Técnicos

### Edge Function: `elevenlabs-scribe-token`
- Gera um token de uso único para transcrição em tempo real
- Chama `POST https://api.elevenlabs.io/v1/single-use-token/realtime_scribe` com o `ELEVENLABS_API_KEY`
- Retorna o token ao frontend

### Edge Function: `improve-admission-text`
- Recebe o texto bruto (digitado ou transcrito por voz)
- Usa Lovable AI (`google/gemini-3-flash-preview`) para melhorar a redação clínica: corrigir gramática, estruturar em linguagem médica, manter o conteúdo fiel
- Retorna o texto melhorado para aprovação do médico

### AdmitPatientForm - Fluxo de 2 Etapas

```text
┌─────────────────────────────────────────────┐
│  Admitir Paciente - Leito X                 │
│                                             │
│  ● Passo 1        ○ Passo 2                │
│  ─────────────────────────────              │
│                                             │
│  [Formulário atual - sem alterações]        │
│                                             │
│             [Próximo →]                     │
└─────────────────────────────────────────────┘

                    ↓

┌─────────────────────────────────────────────┐
│  Admitir Paciente - Leito X                 │
│                                             │
│  ○ Passo 1        ● Passo 2                │
│  ─────────────────────────────              │
│                                             │
│  História de Admissão                       │
│  ┌─────────────────────────────────────┐    │
│  │ Texto livre da história...          │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [🎤 Gravar por Voz]  [✨ Melhorar Texto]  │
│                                             │
│  [← Voltar]              [Admitir Paciente] │
└─────────────────────────────────────────────┘
```

**Passo 1:**
- Todo o formulário atual permanece inalterado
- O botão "Admitir Paciente" é substituído por "Próximo →"
- Validação de campos obrigatórios (iniciais, idade) ao avançar

**Passo 2:**
- Textarea grande para história de admissão (texto livre, sem limite de caracteres rígido)
- Botão "Gravar por Voz" que usa `@elevenlabs/react` (`useScribe` hook) para transcrição em tempo real via WebSocket
  - Ao clicar, solicita permissão de microfone e inicia gravação
  - Transcrição parcial aparece em tempo real no textarea
  - Ao parar, o texto transcrito é inserido/concatenado ao textarea
- Botão "Melhorar Texto" que envia o texto para a edge function `improve-admission-text`
  - Exibe o texto melhorado para o médico revisar
  - O médico pode aceitar ou rejeitar a sugestão
- Botão "Voltar" para retornar ao Passo 1
- Botão "Admitir Paciente" que:
  1. Cria o paciente no banco (insert em `patients`)
  2. Marca o leito como ocupado (update em `beds`)
  3. Se houver texto na história de admissão, insere como primeira evolução (insert em `evolutions` com `clinical_status: 'inalterado'`)
  4. Chama `onSuccess(patientId)`
- A história de admissão é **opcional** — o médico pode pular e admitir sem ela

### Dependência: `@elevenlabs/react`
Será necessário instalar o pacote `@elevenlabs/react` para usar o hook `useScribe` de transcrição em tempo real.

### Fluxo de Dados da Evolução de Admissão

```text
Texto (digitado/transcrito) 
  → [Melhorar Texto] → Lovable AI → Texto melhorado
  → [Admitir Paciente] → INSERT patients → INSERT evolutions (primeira evolução)
  → onSuccess → Abre PatientModal com evolução já registrada
```

A evolução de admissão será inserida com:
- `patient_id`: ID do paciente recém-criado
- `content`: texto da história de admissão
- `created_by`: ID do usuário logado
- `clinical_status`: `'inalterado'` (status padrão para admissão)

