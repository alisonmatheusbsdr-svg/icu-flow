
# Plano: Ajustar Placeholders e Adicionar Seletor de UF no CRM

## Mudancas

### 1. Remover "Dr." do placeholder de nome
- `src/pages/Auth.tsx`: placeholder de "Dr. Joao Silva" para "Joao Silva"
- `src/components/profile/ProfileDialog.tsx`: mesmo ajuste

### 2. Adicionar seletor de UF para o CRM
Em vez de apenas um campo de texto com "CRM-PE 123456", vamos colocar um Select de UF ao lado do campo numerico do CRM. O valor salvo no banco sera no formato "CRM-UF 123456".

**Nos dois arquivos** (Auth.tsx e ProfileDialog.tsx):
- Adicionar um `Select` com as 27 UFs brasileiras (AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO)
- Default: "PE" (ja que por enquanto todos sao PE)
- Layout: Select de UF (compacto) + Input numerico lado a lado
- O valor salvo sera composto: `CRM-${uf} ${numero}`
- Placeholder do campo numerico: "123456"

### 3. ProfileDialog - Parse do CRM existente
Quando o dialog de perfil abrir, fazer parse do CRM salvo (ex: "CRM-PE 123456") para separar a UF e o numero nos campos corretos.

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/Auth.tsx` | Placeholder nome, seletor UF + campo CRM |
| `src/components/profile/ProfileDialog.tsx` | Placeholder nome, seletor UF + campo CRM com parse |
