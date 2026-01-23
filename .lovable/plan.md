

## Plano: Formatação Automática de Iniciais com Pontos

### Objetivo
Criar uma formatação automática no campo "Iniciais" que:
1. **Insere pontos entre cada letra** conforme o usuário digita (ex: `ASDAS` → `A.S.D.A.S`)
2. **Aceita apenas letras** (ignora números, símbolos e outros caracteres)
3. **Converte automaticamente para maiúsculas**

---

### Comportamento Esperado

```
Usuário digita: "a"      → Campo mostra: "A"
Usuário digita: "as"     → Campo mostra: "A.S"
Usuário digita: "asd"    → Campo mostra: "A.S.D"
Usuário digita: "asda"   → Campo mostra: "A.S.D.A"
Usuário digita: "asdas"  → Campo mostra: "A.S.D.A.S"
Usuário digita: "asd1"   → Campo mostra: "A.S.D" (ignora o número)
Usuário digita: "asd@"   → Campo mostra: "A.S.D" (ignora o símbolo)
```

---

### Solução Técnica

Criar uma função helper `formatInitials` que será reutilizada em ambos os formulários:

```typescript
function formatInitials(value: string): string {
  // 1. Remove tudo que não é letra
  const lettersOnly = value.replace(/[^a-zA-Z]/g, '');
  
  // 2. Converte para maiúsculas
  const upperCase = lettersOnly.toUpperCase();
  
  // 3. Limita a 5 letras (para não ultrapassar o limite visual)
  const limited = upperCase.slice(0, 5);
  
  // 4. Insere ponto entre cada letra
  return limited.split('').join('.');
}

// Exemplos:
// formatInitials("asdas")  → "A.S.D.A.S"
// formatInitials("ABC123") → "A.B.C"
// formatInitials("J@#M$S") → "J.M.S"
```

---

### Mudanças Necessárias

#### 1. Criar utilitário reutilizável (Opção A - inline)

A função pode ser incluída diretamente nos componentes, mas como será usada em 2 lugares, podemos:
- Criar em `src/lib/utils.ts` ou
- Duplicar nos dois componentes (mais simples para alteração pontual)

#### 2. Atualizar `src/components/dashboard/AdmitPatientForm.tsx`

**Linha 61** - Modificar o Input de iniciais:

```typescript
// Antes
<Input 
  id="initials" 
  placeholder="JMS" 
  value={initials} 
  onChange={(e) => setInitials(e.target.value)} 
  maxLength={5} 
/>

// Depois
<Input 
  id="initials" 
  placeholder="J.M.S" 
  value={initials} 
  onChange={(e) => setInitials(formatInitials(e.target.value))} 
  maxLength={9}  // 5 letras + 4 pontos = 9 caracteres
/>
```

**Linha 35** - Ajustar o envio ao banco (remover pontos):

```typescript
// Antes
initials: initials.toUpperCase(),

// Depois
initials: initials.replace(/\./g, '').toUpperCase(),
```

#### 3. Atualizar `src/components/patient/EditPatientDialog.tsx`

**Linhas 85-92** - Modificar o Input de iniciais:

```typescript
// Antes
<Input
  id="initials"
  value={initials}
  onChange={(e) => setInitials(e.target.value.toUpperCase())}
  placeholder="Ex: JPS"
  maxLength={5}
  required
/>

// Depois
<Input
  id="initials"
  value={initials}
  onChange={(e) => setInitials(formatInitials(e.target.value))}
  placeholder="Ex: J.P.S"
  maxLength={9}
  required
/>
```

**Linha 52** - Ajustar o envio ao banco:

```typescript
// Antes
initials: initials.trim().toUpperCase(),

// Depois  
initials: initials.replace(/\./g, '').trim().toUpperCase(),
```

**Linha 31** - Inicializar com pontos (paciente existente):

```typescript
// Antes
const [initials, setInitials] = useState(patient.initials);

// Depois
const [initials, setInitials] = useState(formatInitials(patient.initials));
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/AdmitPatientForm.tsx` | Adicionar função `formatInitials`, aplicar no onChange, ajustar maxLength e placeholder |
| `src/components/patient/EditPatientDialog.tsx` | Adicionar função `formatInitials`, aplicar no onChange e inicialização, ajustar maxLength e placeholder |

---

### Resultado Esperado

1. **Ao digitar letras**: Pontos são inseridos automaticamente entre cada letra
2. **Ao digitar números/símbolos**: São ignorados silenciosamente
3. **Visualização**: `A.S.D.A.S` (formatado com pontos)
4. **Armazenamento**: `ASDAS` (sem pontos, apenas letras)
5. **Ao editar paciente**: Iniciais existentes já aparecem formatadas com pontos

