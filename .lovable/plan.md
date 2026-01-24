
# Plano: Criar Cenários de Teste com Múltiplas Evoluções

## Objetivo

Testar os limites da sumarização IA e do layout de impressão com diferentes volumes de evoluções (5, 10, 20) para identificar possíveis problemas de overflow ou perda de informação.

## Análise da Lógica Atual

### Fluxo de Sumarização (Edge Function)
1. Recebe todas as evoluções ordenadas por data (mais recentes primeiro)
2. Se < 3 evoluções: retorna null (sem resumo)
3. Se >= 3: pula as 2 primeiras (mais recentes) e resume o restante
4. Limite de saída: max_tokens: 200, "NO MÁXIMO 3 linhas"

### Cenários de Teste Propostos

| Cenário | Evoluções | IA Resume | Mostra Inteiro |
|---------|-----------|-----------|----------------|
| Atual (Leito 8) | 6 | 4 evoluções | 2 mais recentes |
| Teste 5 | 5 | 3 evoluções | 2 mais recentes |
| Teste 10 | 10 | 8 evoluções | 2 mais recentes |
| Teste 20 | 20 | 18 evoluções | 2 mais recentes |

### Pacientes Selecionados para Teste

Para não perder dados existentes, vou adicionar evoluções aos pacientes que já têm poucas:

| Leito | Paciente | Evoluções Atuais | Adicionar | Total Final |
|-------|----------|------------------|-----------|-------------|
| **1** | M.S.O. | 0 | **20** | 20 (teste extremo) |
| **2** | J.A.L. | 1 | **9** | 10 (teste médio) |
| **6** | L.P.C. | 1 | **4** | 5 (teste mínimo) |

## Dados a Inserir

### Leito 1 - M.S.O. (20 evoluções)

Paciente com sepse grave + IOT. Evoluções simulando internação longa de 15 dias:

- **D1-D3**: Admissão, instabilidade inicial, início de DVA
- **D4-D7**: Pico da gravidade, ajustes de sedação e DVA
- **D8-D10**: Início de estabilização, tentativa de desmame
- **D11-D14**: Melhora progressiva, redução de suporte
- **D15+**: Evoluções recentes mostrando tendência de alta

Cada evolução terá ~100-150 palavras de conteúdo clínico realista.

### Leito 2 - J.A.L. (9 evoluções adicionais = 10 total)

Paciente com DPOC exacerbado em VNI. Evoluções de 10 dias:

- Evoluções detalhando tentativas de desmame de VNI
- Intercorrências (broncoespasmo, retenção de CO2)
- Fisioterapia respiratória

### Leito 6 - L.P.C. (4 evoluções adicionais = 5 total)

Paciente com IAM. Evoluções de 5 dias:

- Evolução cardiológica pós-infarto
- Monitorização de arritmias
- Início de reabilitação

## Inserções no Banco

As evoluções serão inseridas com timestamps retroativos simulando plantões a cada 12h, começando de 15 dias atrás até o presente.

### Estrutura de cada inserção:
```sql
INSERT INTO evolutions (patient_id, content, created_by, created_at)
VALUES (
  'uuid_paciente',
  'Conteúdo clínico detalhado...',
  'uuid_autor',
  'timestamp_retroativo'
);
```

## Testes a Realizar Após Inserção

1. **Testar Preview Individual**: Abrir paciente do Leito 1 → Imprimir → Verificar preview
2. **Testar Impressão da UTI**: Clicar em "Imprimir UTI" → Verificar todos os pacientes
3. **Verificar Logs da Edge Function**: Confirmar que está resumindo corretamente 18 evoluções

## Potenciais Problemas a Identificar

1. **Timeout da IA**: Com 18 evoluções longas, o prompt pode ficar grande demais
2. **Qualidade do Resumo**: Verificar se 3 linhas conseguem capturar 15 dias de evolução
3. **Overflow Visual**: Verificar se a seção de evoluções no print não ultrapassa o espaço
4. **Performance**: Tempo de resposta ao gerar previews com muitos pacientes

## Resultado Esperado

Após os testes, você poderá:
- Definir um limite máximo recomendado de evoluções para sumarização
- Ajustar o prompt da IA se necessário (ex: resumo mais longo para internações longas)
- Identificar se precisa truncar evoluções antigas antes de enviar para IA

## Detalhes Técnicos

### Autor das evoluções
Usarei o profile ID `674b8704-c5bb-4d1e-b37d-6be9f3ca63c4` para todas as inserções.

### IDs dos pacientes
- Leito 1: `a1b2c3d4-1111-1111-1111-111111111111`
- Leito 2: `a1b2c3d4-2222-2222-2222-222222222222`
- Leito 6: `a1b2c3d4-6666-6666-6666-666666666666`

### Timestamps
Evoluções distribuídas a cada ~12h, começando de `now() - interval '15 days'` até o presente.
