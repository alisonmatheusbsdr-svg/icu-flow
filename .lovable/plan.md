

## Plano: Botões Clicáveis para Comorbidades Comuns

### Objetivo
Adicionar botões toggle para as comorbidades mais frequentes em UTI, mantendo o campo de texto livre para outras comorbidades.

---

### Lista de Comorbidades Clicáveis

```typescript
const COMMON_COMORBIDITIES = ['HAS', 'DM', 'DAC', 'DPOC', 'ASMA', 'IRC', 'IRC-HD'];
```

---

### Interface Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│ Comorbidades                                                    │
│                                                                 │
│  ┌─────┐ ┌────┐ ┌─────┐ ┌──────┐ ┌──────┐ ┌─────┐ ┌────────┐  │
│  │ HAS │ │ DM │ │ DAC │ │ DPOC │ │ ASMA │ │ IRC │ │ IRC-HD │  │
│  └─────┘ └────┘ └─────┘ └──────┘ └──────┘ └─────┘ └────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Outras: Obesidade, Hipotireoidismo...                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Clicar em um botão alterna seu estado (selecionado/não selecionado)
- Botão selecionado: cor de fundo destacada (primary)
- Botão não selecionado: contorno simples (outline)
- Campo de texto livre para outras comorbidades além das padrão

---

### Mudanças Técnicas

#### 1. Arquivo: `src/components/dashboard/AdmitPatientForm.tsx`

**Novos estados:**
```typescript
const COMMON_COMORBIDITIES = ['HAS', 'DM', 'DAC', 'DPOC', 'ASMA', 'IRC', 'IRC-HD'];

const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);
const [otherComorbidities, setOtherComorbidities] = useState('');

const toggleComorbidity = (comorbidity: string) => {
  setSelectedComorbidities(prev => 
    prev.includes(comorbidity)
      ? prev.filter(c => c !== comorbidity)
      : [...prev, comorbidity]
  );
};
```

**Ao salvar - combinar comorbidades:**
```typescript
comorbidities: [...selectedComorbidities, otherComorbidities.trim()]
  .filter(Boolean).join(', ') || null
```

**Nova UI (substituir Textarea):**
```tsx
<div className="space-y-2">
  <Label>Comorbidades</Label>
  <div className="flex flex-wrap gap-2 mb-2">
    {COMMON_COMORBIDITIES.map((comorbidity) => (
      <Button
        key={comorbidity}
        type="button"
        variant={selectedComorbidities.includes(comorbidity) ? "default" : "outline"}
        size="sm"
        onClick={() => toggleComorbidity(comorbidity)}
      >
        {comorbidity}
      </Button>
    ))}
  </div>
  <Input
    placeholder="Outras: Obesidade, Hipotireoidismo..."
    value={otherComorbidities}
    onChange={(e) => setOtherComorbidities(e.target.value)}
  />
</div>
```

---

#### 2. Arquivo: `src/components/patient/EditPatientDialog.tsx`

**Mesmas mudanças acima, mais:**

**Inicialização ao editar paciente existente:**
```typescript
// Parsear comorbidades existentes
const parseExistingComorbidities = (comorbidities: string | null) => {
  if (!comorbidities) return { selected: [], others: '' };
  
  const parts = comorbidities.split(/[,;]/).map(c => c.trim());
  const selected = parts.filter(c => 
    COMMON_COMORBIDITIES.includes(c.toUpperCase())
  ).map(c => c.toUpperCase());
  const others = parts.filter(c => 
    !COMMON_COMORBIDITIES.includes(c.toUpperCase())
  ).join(', ');
  
  return { selected, others };
};

const { selected, others } = parseExistingComorbidities(patient.comorbidities);
const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>(selected);
const [otherComorbidities, setOtherComorbidities] = useState(others);
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/AdmitPatientForm.tsx` | Adicionar 7 botões toggle (HAS, DM, DAC, DPOC, ASMA, IRC, IRC-HD) + campo texto |
| `src/components/patient/EditPatientDialog.tsx` | Mesma mudança + parse de comorbidades existentes ao editar |

---

### Resultado Esperado

1. **7 botões clicáveis**: HAS, DM, DAC, DPOC, ASMA, IRC, IRC-HD
2. **Toggle visual**: botão muda de cor ao clicar (outline ↔ primary)
3. **Campo texto livre**: para outras comorbidades não listadas
4. **Edição preserva dados**: comorbidades conhecidas viram botões selecionados, outras ficam no campo texto
5. **Armazenamento unificado**: tudo salvo junto no campo `comorbidities` (ex: "HAS, DM, IRC-HD, Obesidade")

