
# Plano: Validação de Senha Forte no Cadastro

## Objetivo

Exigir que a senha contenha: caractere especial, letra maiúscula, letra minúscula e número.

## Alterações

### Arquivo: `src/pages/Auth.tsx`

Substituir a validação atual de apenas 6 caracteres por uma validação completa:

```typescript
// Validação atual (remover):
if (signupPassword.length < 6) {
  toast.error('A senha deve ter pelo menos 6 caracteres');
  return;
}

// Nova validação:
if (signupPassword.length < 8) {
  toast.error('A senha deve ter pelo menos 8 caracteres');
  return;
}
if (!/[A-Z]/.test(signupPassword)) {
  toast.error('A senha deve conter pelo menos uma letra maiúscula');
  return;
}
if (!/[a-z]/.test(signupPassword)) {
  toast.error('A senha deve conter pelo menos uma letra minúscula');
  return;
}
if (!/[0-9]/.test(signupPassword)) {
  toast.error('A senha deve conter pelo menos um número');
  return;
}
if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(signupPassword)) {
  toast.error('A senha deve conter pelo menos um caractere especial');
  return;
}
```

Atualizar também o placeholder do campo senha de "Mínimo 6 caracteres" para "Mín. 8 caracteres, maiúscula, número e especial".

### Arquivo: `src/components/profile/ProfileDialog.tsx`

Aplicar a mesma validação na funcionalidade de alteração de senha para manter consistência.

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Auth.tsx` | Validação forte no cadastro + placeholder atualizado |
| `src/components/profile/ProfileDialog.tsx` | Mesma validação na troca de senha |
