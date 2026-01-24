

## Plano: Dados Fictícios para UTI 1 - HMA

### Objetivo

Popular todos os 10 leitos da UTI 1 - HMA com casos clínicos variados, garantindo diversidade de evoluções para testar o resumo por IA e o layout de impressão.

---

### Distribuição de Evoluções (Crítico para Testes)

| Leito | Paciente | Qtd. Evoluções | Comportamento Esperado |
|-------|----------|----------------|------------------------|
| 1 | M.S.O. 72a | 0 | "Sem evoluções registradas" |
| 2 | J.A.L. 45a | 1 | Mostra evolução única na íntegra |
| 3 | A.R.S. 68a | 2 | Mostra ambas na íntegra |
| 4 | C.M.B. 55a | 3 | Resumo IA + 2 últimas |
| 5 | R.T.F. 38a | 4 | Resumo IA + 2 últimas |
| 6 | L.P.C. 82a | 1 | Mostra evolução única na íntegra |
| 7 | F.G.N. 29a | 2 | Mostra ambas na íntegra |
| 8 | S.M.A. 61a | 6 | Resumo IA robusto + 2 últimas |
| 9 | P.H.D. 50a | 5 | Resumo IA + 2 últimas |
| 10 | E.C.R. 77a | 0 | "Sem evoluções registradas" |

---

### Cenários Clínicos dos 10 Leitos

| Leito | Iniciais | Idade | Perfil Clínico | Prob. Alta | Dados |
|-------|----------|-------|----------------|------------|-------|
| 1 | M.S.O. | 72a | TOT + DVA + Sepse | 0% (bloqueado) | Máximo: 5 dispositivos, 3 ATB, 2 DVA, CVC+PICC |
| 2 | J.A.L. | 45a | VNI - DPOC | ~40% | Moderado: 2 dispositivos, 2 ATB, 1 acesso |
| 3 | A.R.S. | 68a | CN - Pós-op | ~80% | Mínimo: 1 dispositivo, 1 ATB |
| 4 | C.M.B. | 55a | Paliativo (CCPP) | N/A (cinza) | Conforto: dieta oral, sem ATB |
| 5 | R.T.F. | 38a | TQT - Desmame difícil | 0% (bloqueado) | Alto: 4 dispositivos, 2 ATB, 1 DVA |
| 6 | L.P.C. | 82a | Máscara - IAM | ~50% | Moderado: 3 dispositivos, 1 ATB, precauções LPP |
| 7 | F.G.N. | 29a | Ar ambiente - Trauma | ~90% | Baixo: 1 dispositivo, sem ATB |
| 8 | S.M.A. | 61a | TOT - SDRA grave | 0% (bloqueado) | Máximo: 6 dispositivos, 4 ATB, 2 DVA |
| 9 | P.H.D. | 50a | CNAF - Pneumonia | ~35% | Alto: 3 dispositivos, 4 ATB |
| 10 | E.C.R. | 77a | Ar ambiente - Alta hoje | ~95% | Mínimo absoluto: apenas dieta oral |

---

### Dados a Inserir

#### Pacientes (10 registros)
- Idades: 29-82 anos
- Pesos: 45-95 kg
- Internação: 1-21 dias
- Dietas: zero (TOT), oral (ar ambiente), sne (moderados), npt (grave)

#### Suporte Respiratório (10 registros)
- ar_ambiente (Leitos 7, 10)
- cn (Leito 3)
- cnaf (Leito 9)
- mascara (Leito 6)
- vni (Leito 2)
- tot (Leitos 1, 8)
- tqt (Leito 5)
- Sem suporte (Leito 4 - paliativo)

#### Dispositivos Invasivos (~25 registros)
- SVD, SNE, SNG, PAI, DVE, Drenos
- Datas variadas (D1 a D15)

#### Acessos Venosos (~15 registros)
- CVC (jugular, subclávia, femoral)
- PICC, AVP, Hemodiálise
- Lumens: mono, duplo, triplo

#### Drogas Vasoativas (~6 registros)
- Noradrenalina (Leitos 1, 5, 8)
- Dobutamina (Leitos 1, 8)
- Vasopressina (Leito 8)

#### Antibióticos (~18 registros)
- Meropenem, Vancomicina, Piperacilina, Ceftriaxona, Polimixina B
- Dias: D1 a D14

#### Profilaxias (~20 registros)
- TEV, LPP, Cabeceira elevada, Higiene oral

#### Precauções (~15 registros)
- Riscos: LPP (baixo/médio/alto), Queda, Broncoaspiração
- Condições: Sepse, Choque, Delirium
- Isolamentos: Contato, Gotículas, Aerossóis

#### Planos Terapêuticos (10 registros)
- Cada paciente com plano específico

#### Evoluções (~24 registros)
Distribuição conforme tabela acima:
- 0 evoluções: Leitos 1, 10
- 1 evolução: Leitos 2, 6
- 2 evoluções: Leitos 3, 7
- 3+ evoluções: Leitos 4, 5, 8, 9

#### Tarefas (~15 registros)
- Mix de completas e pendentes
- Leito 1: muitas pendências
- Leito 10: nenhuma pendência

#### Exames (~25 registros)
- Imagem: TC crânio, RX tórax, USG abdome
- Laboratorial: Gasometria, Hemograma, Função renal
- Cultura: Hemocultura, Urocultura, Aspirado traqueal
- Alguns marcados como críticos

---

### IDs do Banco de Dados

**Unit ID**: `eba57f64-858e-48bc-9ea1-9f401654b1b8`

**Bed IDs**:
| Leito | Bed ID |
|-------|--------|
| 1 | `79ae2fc7-4b98-4ad0-956c-42e90d9a94be` |
| 2 | `4a395b8c-1a73-4391-82a7-7903940fae52` |
| 3 | `afce766f-8120-4295-9df8-2d845f1bc5eb` |
| 4 | `fd15022f-e03e-4031-a98d-081c5bc74a97` |
| 5 | `829bc3f6-44f9-4e71-a9a4-f91ceab8145c` |
| 6 | `d7b1729a-f7cc-4b2d-8682-45c436e0d925` |
| 7 | `6c58264c-6e38-421a-9a3a-bc3a29f44c1c` |
| 8 | `0dc5caf2-a5b7-4f86-9be1-d9c232f72fb1` |
| 9 | `1c787f84-549a-4d4b-9480-d38b27cbd165` |
| 10 | `74f07518-aa43-4d0f-a875-db8f5b407c83` |

**Profile ID (created_by)**: `674b8704-c5bb-4d1e-b37d-6be9f3ca63c4`

---

### Resultado Esperado

Após inserção dos dados:
1. Dashboard mostrará 10 leitos ocupados com badges variados
2. Probabilidades de alta: 0% (3), ~35-50% (3), ~80-95% (3), N/A paliativo (1)
3. Impressão individual testará todos os cenários de layout
4. Impressão da UTI testará o resumo IA em pacientes com 3+ evoluções
5. Exames aparecerão no modal de cada paciente

