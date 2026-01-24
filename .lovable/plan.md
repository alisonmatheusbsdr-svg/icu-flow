
# Plano: Unificar Layout do Preview de Impressão

## Resumo

O preview de impressão atualmente mostra o conteúdo em formato de texto simples porque os estilos CSS das classes `print-*` só são aplicados durante a impressão (`@media print`). A solução é duplicar esses estilos para o contexto de tela (`@media screen`) dentro do container de preview.

## Diagnóstico Detalhado

O componente `PrintPatientSheet` utiliza classes CSS como:
- `print-header` - cabeçalho azul escuro
- `print-clinical-grid` - grid de 4 colunas
- `print-therapeutic-plan` - caixa amarela do plano
- `print-section-title`, `print-day-badge`, etc.

Essas classes são estilizadas de duas formas:
1. **Na impressão**: os estilos são injetados inline na nova janela (funciona perfeitamente)
2. **No preview**: dependem do arquivo `print-styles.css` que define estilos **apenas** em `@media print`

## Solução Proposta

Adicionar estilos para `@media screen` no arquivo `print-styles.css`, aplicados quando o conteúdo está dentro de um container de preview específico.

## Alterações Necessárias

### 1. Atualizar `print-styles.css`

Adicionar uma nova seção para preview em tela com os mesmos estilos do print, usando um seletor específico para identificar quando está em modo preview:

```css
/* Preview styles for screen display */
@media screen {
  .print-preview-container .print-patient-sheet { ... }
  .print-preview-container .print-header { ... }
  /* todos os outros estilos */
}
```

### 2. Atualizar `UnitPrintPreviewModal.tsx`

- Adicionar a classe `print-preview-container` no container que envolve o `PrintPatientSheet`
- Importar o arquivo CSS `print-styles.css` no componente

### 3. Atualizar `PrintPreviewModal.tsx`

- Aplicar as mesmas alterações para manter consistência no preview individual de paciente

## Detalhes Técnicos

### Estrutura de Estilos a Adicionar (print-styles.css)

Os estilos de preview precisam replicar exatamente os estilos de print, incluindo:

| Classe | Função |
|--------|--------|
| `.print-patient-sheet` | Container principal com fundo branco |
| `.print-header` | Cabeçalho azul (#1e3a5f) com flex layout |
| `.print-therapeutic-plan` | Box amarelo (#fff3cd) com borda |
| `.print-clinical-grid` | Grid 4 colunas para dispositivos/acessos/DVA/resp |
| `.print-secondary-grid` | Grid 3 colunas para antibióticos/profilaxias/dieta |
| `.print-clinical-section` | Seções com borda e fundo cinza claro |
| `.print-section-title` | Títulos uppercase em cinza |
| `.print-day-badge` | Badges de dias em cinza |
| `.print-precautions` | Container de precauções |
| `.print-precaution-*` | Badges coloridos (sepse/choque em vermelho, LPP em amarelo) |
| `.print-tasks` | Container de pendências |
| `.print-evolutions` | Seção de evoluções com resumo IA |

### Arquivos Modificados

1. **`src/components/print/print-styles.css`**
   - Adicionar ~100 linhas de estilos para `.print-preview-container` em `@media screen`

2. **`src/components/print/UnitPrintPreviewModal.tsx`**
   - Importar `./print-styles.css`
   - Adicionar classe `print-preview-container` ao container do preview (linha ~494)

3. **`src/components/print/PrintPreviewModal.tsx`**
   - Importar `./print-styles.css`
   - Adicionar classe `print-preview-container` ao container do preview (linha ~295)

## Resultado Esperado

Após a implementação, o modal de preview mostrará exatamente o mesmo layout estruturado que aparece na impressão final:
- Header azul escuro com informações do paciente
- Box amarelo do plano terapêutico
- Grid de 4 colunas com dispositivos, acessos, DVA e suporte respiratório
- Grid de 3 colunas com antibióticos, profilaxias e dieta
- Badges coloridos de precauções
- Checklist de pendências
- Seção de evoluções com resumo IA

O usuário terá uma representação fiel do documento final antes de imprimir.
