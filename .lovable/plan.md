

# Plano: Campo de Justificativa Condicional

## Problema Atual

O campo "Justificativa para Negativa" aparece sempre que existe uma opção de negativa disponível nas transições, mesmo que o NIR queira apenas marcar como "Regulado" ou "Confirmar Vaga".

**Comportamento atual:**
```text
┌─────────────────────────────────────────────────────────────────┐
│ 🧠 Neurologia                           [Aguardando Regulação]  │
│                                                                 │
│ Justificativa para Negativa *            ← APARECE SEMPRE       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [ Marcar Regulado ]  [ Negar Regulação ]                       │
└─────────────────────────────────────────────────────────────────┘
```

## Comportamento Desejado

O campo só aparece quando o NIR clica em um botão de negativa:

**Estado inicial:**
```text
┌─────────────────────────────────────────────────────────────────┐
│ 🧠 Neurologia                           [Aguardando Regulação]  │
│                                                                 │
│ [ Marcar Regulado ]  [ Negar Regulação ]    ← Sem campo extra   │
└─────────────────────────────────────────────────────────────────┘
```

**Após clicar em "Negar Regulação":**
```text
┌─────────────────────────────────────────────────────────────────┐
│ 🧠 Neurologia                           [Aguardando Regulação]  │
│                                                                 │
│ Justificativa da Negativa *              ← APARECE AGORA        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [ Cancelar ]  [ Confirmar Negativa ]                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Seção Tecnica

### Arquivo a Modificar

**`src/components/nir/NIRRegulationDialog.tsx`**

### Mudancas

1. **Adicionar estado para rastrear acao pendente de negativa:**
   ```typescript
   // Estado para controlar qual regulacao esta em modo de negativa
   const [pendingDenial, setPendingDenial] = useState<{
     regId: string;
     status: RegulationStatus;
   } | null>(null);
   ```

2. **Modificar comportamento dos botoes:**
   - Botoes de acao positiva (Regulado, Confirmar Vaga, Transferido) executam imediatamente
   - Botoes de negativa (`negado_nir`, `negado_hospital`) ativam o modo de entrada de justificativa

3. **Logica de clique no botao:**
   ```typescript
   const handleActionClick = (reg: PatientRegulation, newStatus: RegulationStatus) => {
     if (DENIAL_STATUSES.includes(newStatus)) {
       // Ativa modo de negativa - mostra campo de justificativa
       setPendingDenial({ regId: reg.id, status: newStatus });
     } else {
       // Executa transicao diretamente
       handleTransition(reg, newStatus);
     }
   };
   ```

4. **Renderizacao condicional do campo:**
   ```tsx
   {/* Campo de justificativa - so aparece quando usuario clicou em negar */}
   {pendingDenial?.regId === reg.id && (
     <div className="space-y-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
       <Label className="text-xs flex items-center gap-1">
         Justificativa da Negativa <span className="text-destructive">*</span>
       </Label>
       <Textarea
         placeholder="Informe o motivo da recusa..."
         value={denialReasons[reg.id] || ''}
         onChange={(e) => setDenialReasons(prev => ({ ...prev, [reg.id]: e.target.value }))}
         disabled={isSaving}
         className="min-h-[60px] text-sm"
         autoFocus
       />
       <div className="flex gap-2 justify-end">
         <Button
           variant="outline"
           size="sm"
           onClick={() => setPendingDenial(null)}
           disabled={isSaving}
         >
           Cancelar
         </Button>
         <Button
           variant="destructive"
           size="sm"
           onClick={() => handleTransition(reg, pendingDenial.status)}
           disabled={isSaving || !denialReasons[reg.id]?.trim()}
         >
           Confirmar Negativa
         </Button>
       </div>
     </div>
   )}
   ```

5. **Ocultar botoes normais quando em modo de negativa:**
   ```tsx
   {/* Botoes de acao - ocultos quando em modo de negativa */}
   {availableTransitions.length > 0 && pendingDenial?.regId !== reg.id && (
     <div className="flex flex-wrap gap-2 pt-2 border-t">
       {availableTransitions.map((transition) => (
         <Button
           key={transition.status}
           variant={transition.variant || 'default'}
           size="sm"
           onClick={() => handleActionClick(reg, transition.status)}
           disabled={isSaving}
         >
           {transition.label}
         </Button>
       ))}
     </div>
   )}
   ```

6. **Limpar estado ao fechar dialog ou apos sucesso:**
   ```typescript
   // No onClose do Dialog
   onOpenChange={(open) => {
     if (!open) {
       setPendingDenial(null);
     }
     onClose();
   }}
   
   // Apos transicao bem-sucedida
   toast.success(`Status alterado para ${STATUS_CONFIG[newStatus].label}`);
   setPendingDenial(null); // Limpa estado de negativa pendente
   ```

### Fluxo de Interacao

1. NIR abre o dialog de regulacao
2. Ve os botoes de acao disponiveis (sem campo de justificativa)
3. Se clicar em "Marcar Regulado" ou "Confirmar Vaga" -> executa imediatamente
4. Se clicar em "Negar Regulacao" ou "Negado pelo Hospital":
   - Botoes originais desaparecem
   - Campo de justificativa aparece com destaque
   - Botoes "Cancelar" e "Confirmar Negativa" aparecem
5. NIR pode cancelar (volta ao estado inicial) ou confirmar (executa e fecha)

