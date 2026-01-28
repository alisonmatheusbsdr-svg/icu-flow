

# Plano: Limpar Todos os Dados de Pacientes

Vamos remover todos os dados fictícios de pacientes do sistema, deixando a estrutura pronta para receber dados reais.

## O que será apagado

- **26 pacientes** e todos os seus dados clínicos associados
- Evoluções, exames, dispositivos, medicamentos, acessos venosos, etc.
- Os **8 leitos ocupados** serão liberados automaticamente

## O que será mantido

- Estrutura de unidades e leitos
- Usuários e perfis cadastrados
- Configurações do sistema

## Como será feito

A limpeza será executada na ordem correta para respeitar as dependências entre tabelas:

1. Primeiro, apagar dados que dependem de pacientes (evoluções, exames, medicamentos, etc.)
2. Depois, apagar os pacientes
3. Por fim, liberar os leitos (marcar como desocupados)

---

## Detalhes Técnicos

A execução seguirá esta ordem para evitar erros de integridade referencial:

```text
┌─────────────────────────────────────┐
│  1. Tabelas dependentes de patients │
├─────────────────────────────────────┤
│  • evolutions                       │
│  • patient_tasks                    │
│  • patient_precautions              │
│  • patient_exams                    │
│  • patient_regulation               │
│  • therapeutic_plans                │
│  • invasive_devices                 │
│  • vasoactive_drugs                 │
│  • antibiotics                      │
│  • prophylaxis                      │
│  • venous_access                    │
│  • respiratory_support              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  2. Tabela patients                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  3. Atualizar beds                  │
│     is_occupied = false             │
└─────────────────────────────────────┘
```

Comandos SQL que serão executados:

```sql
-- Limpar tabelas dependentes
DELETE FROM evolutions;
DELETE FROM patient_tasks;
DELETE FROM patient_precautions;
DELETE FROM patient_exams;
DELETE FROM patient_regulation;
DELETE FROM therapeutic_plans;
DELETE FROM invasive_devices;
DELETE FROM vasoactive_drugs;
DELETE FROM antibiotics;
DELETE FROM prophylaxis;
DELETE FROM venous_access;
DELETE FROM respiratory_support;

-- Limpar pacientes
DELETE FROM patients;

-- Liberar leitos
UPDATE beds SET is_occupied = false;
```

