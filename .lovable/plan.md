
# Plano: Adicionar Campo "Equipe Assistente" ao Paciente

## Objetivo

Adicionar um campo de selecao de especialidade assistente (Ortopedia, Clinica Medica, Urologia, Cirurgia Geral) que aparece na admissao, edicao, modal do paciente e na impressao.

## Alteracoes

### 1. Migracao SQL

Adicionar coluna `specialty_team` na tabela `patients`:

```sql
ALTER TABLE public.patients 
ADD COLUMN specialty_team TEXT DEFAULT NULL;
```

### 2. Formulario de Admissao (`AdmitPatientForm.tsx`)

- Adicionar estado `specialtyTeam`
- Adicionar um grupo de botoes (similar ao de comorbidades) com as 4 opcoes: **Ortopedia**, **Clinica Medica**, **Urologia**, **Cirurgia Geral**
- Posicionar entre "Hipotese Diagnostica" e "Comorbidades"
- Incluir `specialty_team` no insert do Supabase

### 3. Dialog de Edicao (`EditPatientDialog.tsx`)

- Adicionar estado `specialtyTeam` inicializado com `patient.specialty_team`
- Adicionar o mesmo seletor de especialidade
- Incluir `specialty_team` no update do Supabase

### 4. Modal do Paciente (`PatientModal.tsx`)

- Exibir a especialidade como um Badge ao lado das iniciais no header (onde a seta indica na imagem), similar ao formato ja existente: `Leito 2 - AMBS` ficaria `Leito 2 - J.M.S` com a sigla da especialidade ao lado
- Formato: exibir a sigla entre as informacoes demograficas (ex: `35a | 84kg | D1` com a especialidade como badge)

### 5. Impressao (`PrintPatientSheet.tsx`)

- Adicionar a especialidade no header da folha de impressao, entre as iniciais e a idade:
  `LEITO 2 | AMBS | J.M.S | 35a | D1 | HD: Sepse`
  Ficara: `LEITO 2 | J.M.S | ORTO | 35a | D1 | HD: Sepse`

### 6. Tipo TypeScript (`types/database.ts`)

- Adicionar `specialty_team: string | null;` na interface `Patient`

## Mapa de Siglas

| Especialidade | Sigla exibida |
|---|---|
| Ortopedia | ORTO |
| Clinica Medica | CM |
| Urologia | URO |
| Cirurgia Geral | CG |

## Arquivos Modificados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Nova coluna `specialty_team` |
| `src/types/database.ts` | Adicionar campo na interface Patient |
| `src/components/dashboard/AdmitPatientForm.tsx` | Seletor de especialidade na admissao |
| `src/components/patient/EditPatientDialog.tsx` | Seletor de especialidade na edicao |
| `src/components/patient/PatientModal.tsx` | Exibir especialidade no header |
| `src/components/print/PrintPatientSheet.tsx` | Exibir especialidade no header da impressao |
