

# Ajuste: Placeholder do CRM para CRM-PE

## Alteração

Modificar o placeholder do campo CRM no formulário de cadastro para refletir o padrão local.

**Arquivo:** `src/pages/Auth.tsx`

**Linha 170:**

| Antes | Depois |
|-------|--------|
| `placeholder="CRM/SP 123456"` | `placeholder="CRM-PE 123456"` |

## Código

```tsx
<Input
  id="signup-crm"
  type="text"
  placeholder="CRM-PE 123456"  // ← alteração
  value={signupCrm}
  onChange={(e) => setSignupCrm(e.target.value)}
  disabled={isLoading}
/>
```

