
# Plano: Termos de Uso e Politica de Privacidade

## Objetivo

Criar um documento completo de **"Termos de Uso e Politica de Privacidade"** (nome mais claro e profissional) que:
1. Aparece no formulario de cadastro como checkbox obrigatorio
2. Pode ser lido em um popup (Dialog) antes de aceitar
3. Nao permite copiar texto ou imprimir o conteudo
4. Registra no banco de dados que o usuario aceitou e quando

## Alteracoes

### 1. Migracao: Adicionar campo `accepted_terms_at` na tabela `profiles`

```sql
ALTER TABLE public.profiles 
ADD COLUMN accepted_terms_at timestamptz DEFAULT NULL;
```

Isso registra **quando** o usuario aceitou os termos. Se for `NULL`, nunca aceitou.

### 2. Novo Componente: `TermsAndPrivacyDialog.tsx`

Componente de Dialog com o documento completo, incluindo:

**Conteudo do documento:**
- Introducao e definicoes (Sinapse UTI, dados de saude)
- Objeto do sistema (passagem de plantao, gestao de leitos)
- Responsabilidades do usuario
- Coleta e tratamento de dados (LGPD - Lei 13.709/2018)
- Base legal para tratamento (art. 7 e art. 11 da LGPD)
- Compartilhamento de dados
- Seguranca da informacao
- Direitos do titular dos dados (art. 18 da LGPD)
- Retencao e exclusao de dados
- Atualizacoes dos termos
- Disposicoes finais

**Protecoes contra copia/impressao:**
- CSS: `user-select: none` no conteudo do documento
- CSS: `@media print { display: none }` para esconder na impressao
- JS: `onContextMenu={e => e.preventDefault()}` para bloquear menu de contexto
- JS: `onCopy={e => e.preventDefault()}` para bloquear Ctrl+C

### 3. Modificacao: `Auth.tsx` - Formulario de Cadastro

Adicionar antes do botao "Criar conta":

```
[x] Li e aceito os Termos de Uso e Politica de Privacidade
                        ↑ link clicavel que abre o Dialog
```

- Checkbox obrigatorio (`acceptedTerms` state)
- Validacao: se nao marcou, mostra erro "Voce precisa aceitar os termos para criar sua conta"
- Ao criar conta com sucesso, salva `accepted_terms_at` no profile

### 4. Modificacao: `useAuth.tsx` - Salvar aceite

Apos o signUp bem-sucedido, atualizar o profile com `accepted_terms_at: new Date().toISOString()`.

### 5. Nova Aba em TeamManagement: "Termos"

Adicionar uma terceira aba na pagina `/equipe` para que Admin/Coordenador possam visualizar o documento completo dos termos vigentes (somente leitura, sem edicao).

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| Nova migracao SQL | Adicionar `accepted_terms_at` em `profiles` |
| `src/components/terms/TermsAndPrivacyDialog.tsx` | Criar componente do documento |
| `src/components/terms/TermsContent.tsx` | Conteudo textual dos termos (separado para reutilizar) |
| `src/pages/Auth.tsx` | Adicionar checkbox + dialog no signup |
| `src/hooks/useAuth.tsx` | Salvar `accepted_terms_at` apos signup |
| `src/pages/TeamManagement.tsx` | Adicionar aba "Termos" |

## Fluxo do Usuario

```text
CADASTRO
1. Usuario preenche formulario
2. Ve checkbox: "Li e aceito os Termos de Uso e Politica de Privacidade"
3. Pode clicar no link para abrir popup e ler o documento
4. No popup: texto completo, scroll, sem possibilidade de copiar/imprimir
5. Fecha popup e marca o checkbox
6. Clica "Criar conta"
7. Sistema registra accepted_terms_at no profile

GESTAO (/equipe)
1. Coordenador/Admin acessa aba "Termos"
2. Visualiza o documento completo vigente
```

## Conteudo Resumido do Documento

O documento tera ~15 secoes cobrindo:

| Secao | Conteudo Principal |
|-------|-------------------|
| 1. Introducao | O que e o Sinapse UTI e a quem se destina |
| 2. Definicoes | Termos tecnicos: usuario, dados pessoais, dados sensiveis |
| 3. Objeto | Finalidade: passagem de plantao, gestao de leitos UTI |
| 4. Cadastro e Acesso | Responsabilidade por credenciais, aprovacao por admin |
| 5. Responsabilidades | Veracidade das informacoes, uso adequado |
| 6. Coleta de Dados | Quais dados sao coletados (nome, CRM, email, acoes) |
| 7. Base Legal LGPD | Art. 7 (consentimento) e Art. 11 (dados sensiveis de saude) |
| 8. Finalidade do Tratamento | Para que os dados sao usados |
| 9. Compartilhamento | Com quem dados podem ser compartilhados |
| 10. Seguranca | Medidas tecnicas (criptografia, RLS, controle de acesso) |
| 11. Direitos do Titular | Acesso, correcao, exclusao, portabilidade (Art. 18) |
| 12. Retencao | Prazo de armazenamento e politica de exclusao |
| 13. Cookies e Logs | Sessoes, logs de impressao, rastreabilidade |
| 14. Atualizacoes | Como os termos podem ser atualizados |
| 15. Contato e DPO | Canal para exercicio de direitos |

## Seguranca

- O aceite e registrado com timestamp no banco de dados
- O campo `accepted_terms_at` e auditavel
- Protecoes contra copia sao uma camada adicional (nao substituem direitos legais)
- O documento referencia explicitamente a LGPD (Lei 13.709/2018)
