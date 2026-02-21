
# Incluir Balanço Hídrico na Impressão do Paciente

## Abordagem

Adicionar o balanço hídrico como uma **4a coluna** na segunda linha do grid de impressão (que hoje tem Antibióticos, Profilaxias e Dieta). Isso mantém o layout compacto sem adicionar novas linhas.

## Mudancas

### 1. `src/components/print/PrintPatientSheet.tsx`

Adicionar uma nova coluna "Balanço Hídrico" dentro do `print-secondary-grid`, após a seção de Dieta:

```tsx
{/* Balanço Hídrico */}
<div className="print-clinical-section">
  <div className="print-section-title">Balanço Hídrico</div>
  <div className="print-section-content">
    {patient.fluid_balance ? (
      <div>
        <div>E: {patient.fluid_balance.intake_ml} mL | S: {patient.fluid_balance.output_ml} mL</div>
        <div style={{ fontWeight: 'bold', color: net >= 0 ? '#16a34a' : '#dc2626' }}>
          Saldo: {net > 0 ? '+' : ''}{net} mL
        </div>
      </div>
    ) : (
      <span className="print-no-data">Sem registro</span>
    )}
  </div>
</div>
```

### 2. `src/components/print/print-styles.css`

Alterar o grid da segunda linha de 3 para 4 colunas em **dois lugares** (impressao e preview):

```css
/* De: grid-template-columns: 2fr 1fr 1fr; */
/* Para: */
grid-template-columns: 2fr 1fr 1fr 1fr;
```

### Arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `src/components/print/PrintPatientSheet.tsx` | Adicionar coluna de balanco hidrico |
| `src/components/print/print-styles.css` | Ajustar grid de 3 para 4 colunas (2 locais) |
