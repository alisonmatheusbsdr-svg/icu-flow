
# Plano: Adicionar campo obrigatorio de status clinico (Melhor/Pior/Inalterado) na evolucao

## Objetivo

Adicionar 3 opcoes de selecao unica (Melhor, Pior, Inalterado) entre o titulo "SUA EVOLUCAO" e o textarea. A selecao e obrigatoria para registrar a evolucao e fica salva no banco.

## Alteracoes

### 1. Migracao SQL

Adicionar coluna `clinical_status` na tabela `evolutions`:

```sql
ALTER TABLE public.evolutions 
ADD COLUMN clinical_status TEXT DEFAULT NULL;
```

Valores possiveis: `melhor`, `pior`, `inalterado`

### 2. `src/components/patient/PatientEvolutions.tsx`

- Adicionar estado `clinicalStatus` (tipo `'melhor' | 'pior' | 'inalterado' | null`)
- Renderizar 3 checkboxes estilizados como radio (apenas um selecionavel) entre o titulo "SUA EVOLUCAO" e o textarea, com labels: **Melhor**, **Pior**, **Inalterado**
- Incluir `clinical_status` no insert do Supabase
- Tornar obrigatorio: o botao "Validar Evolucao" fica desabilitado se `clinicalStatus` for null
- Mostrar toast de erro se tentar submeter sem selecionar
- Resetar `clinicalStatus` apos submissao bem-sucedida
- No historico, exibir o status ao lado da data/autor (ex: badge colorido com "Melhor", "Pior" ou "Inalterado")

### 3. `src/components/print/PrintPatientSheet.tsx`

- Exibir o status clinico ao lado de cada evolucao na impressao

### 4. Mapa visual dos status

| Status | Label | Cor sugerida |
|---|---|---|
| melhor | Melhor | Verde |
| pior | Pior | Vermelho |
| inalterado | Inalterado | Cinza/Neutro |

## Arquivos modificados

| Arquivo | Acao |
|---|---|
| Migracao SQL | Nova coluna `clinical_status` |
| `src/components/patient/PatientEvolutions.tsx` | Seletor + validacao + exibicao no historico |
| `src/components/print/PrintPatientSheet.tsx` | Exibir status na impressao |
