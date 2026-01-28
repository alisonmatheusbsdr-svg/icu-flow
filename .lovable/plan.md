

# Plano: CRM Condicional e Confirmação de Senha

## Alterações Solicitadas

1. **CRM opcional para NIR**: O campo CRM deve ser ocultado quando o usuário selecionar o papel "NIR (Regulação)"
2. **Confirmação de senha**: Adicionar um campo "Confirmar Senha" para todos os cadastros

## Comportamento do Formulário

### Equipe Assistencial (Plantonista/Diarista)
```text
┌──────────────────────────────┐
│ Nome Completo                │
│ [____________________]       │
│                              │
│ CRM                          │
│ [____________________]       │  ← Visível
│                              │
│ Papel                        │
│ [Plantonista ▼]              │
│                              │
│ Email                        │
│ [____________________]       │
│                              │
│ Senha                        │
│ [____________________]       │
│                              │
│ Confirmar Senha              │  ← NOVO
│ [____________________]       │
│                              │
│ [     Criar conta      ]     │
└──────────────────────────────┘
```

### NIR (Regulação)
```text
┌──────────────────────────────┐
│ Nome Completo                │
│ [____________________]       │
│                              │
│ Papel                        │
│ [NIR (Regulação) ▼]          │
│                              │
│ Email                        │  ← CRM OCULTO
│ [____________________]       │
│                              │
│ Senha                        │
│ [____________________]       │
│                              │
│ Confirmar Senha              │  ← NOVO
│ [____________________]       │
│                              │
│ [     Criar conta      ]     │
└──────────────────────────────┘
```

## Validações

| Validação | Mensagem de Erro |
|-----------|------------------|
| Senhas não coincidem | "As senhas não coincidem" |
| CRM vazio (se não for NIR) | "Preencha todos os campos" |
| CRM vazio (se for NIR) | Permitido (campo oculto) |

---

## Seção Técnica

### Arquivo a Modificar

**`src/pages/Auth.tsx`**

### Mudanças

1. **Adicionar estado para confirmação de senha** (linha 28):
   ```typescript
   const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
   ```

2. **Mover seleção de "Papel" para logo após "Nome"** - Isso permite que o campo CRM seja condicionalmente exibido baseado na seleção

3. **Condicionar exibição do campo CRM**:
   ```tsx
   {signupRole !== 'nir' && (
     <div className="space-y-2">
       <Label htmlFor="signup-crm">CRM</Label>
       <Input
         id="signup-crm"
         type="text"
         placeholder="CRM-PE 123456"
         value={signupCrm}
         onChange={(e) => setSignupCrm(e.target.value)}
         disabled={isLoading}
       />
     </div>
   )}
   ```

4. **Adicionar campo de confirmação de senha** (após o campo de senha):
   ```tsx
   <div className="space-y-2">
     <Label htmlFor="signup-password-confirm">Confirmar Senha</Label>
     <Input
       id="signup-password-confirm"
       type="password"
       placeholder="Repita a senha"
       value={signupPasswordConfirm}
       onChange={(e) => setSignupPasswordConfirm(e.target.value)}
       disabled={isLoading}
     />
   </div>
   ```

5. **Atualizar validação do handleSignup**:
   ```typescript
   const handleSignup = async (e: React.FormEvent) => {
     e.preventDefault();
     
     // CRM obrigatório apenas para não-NIR
     const requiresCrm = signupRole !== 'nir';
     
     if (!signupEmail || !signupPassword || !signupNome) {
       toast.error('Preencha todos os campos');
       return;
     }
     
     if (requiresCrm && !signupCrm) {
       toast.error('CRM é obrigatório para equipe assistencial');
       return;
     }

     if (signupPassword !== signupPasswordConfirm) {
       toast.error('As senhas não coincidem');
       return;
     }

     if (signupPassword.length < 6) {
       toast.error('A senha deve ter pelo menos 6 caracteres');
       return;
     }
     
     // Para NIR, usar string vazia ou "N/A" como CRM
     const crmValue = requiresCrm ? signupCrm : 'N/A';
     
     // ... resto do código usando crmValue
   };
   ```

6. **Limpar campo de confirmação ao trocar de papel**:
   ```typescript
   // Ao mudar o papel, limpar CRM se for NIR
   const handleRoleChange = (role: AppRole) => {
     setSignupRole(role);
     if (role === 'nir') {
       setSignupCrm('');
     }
   };
   ```

### Ordem Final dos Campos no Formulário

1. Nome Completo
2. **Papel** (movido para cima)
3. CRM (condicional - oculto para NIR)
4. Email
5. Senha
6. **Confirmar Senha** (novo)
7. Botão "Criar conta"

