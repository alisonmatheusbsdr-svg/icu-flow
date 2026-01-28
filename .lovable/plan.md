
# Plano: Adicionar Confirmação para Cancelar Regulação

## Problema

Ao clicar no botão X para remover uma regulação, a ação é executada imediatamente sem confirmação. Isso pode causar remoções acidentais de regulações importantes.

## Solução

Adicionar um AlertDialog de confirmação antes de executar a remoção da regulação.

## Alterações

### Arquivo: `src/components/patient/PatientRegulation.tsx`

**1. Novo estado para controlar a regulação pendente de remoção:**
```tsx
const [removeRegulation, setRemoveRegulation] = useState<PatientRegulationType | null>(null);
```

**2. Alterar o botão X (linhas 320-327):**

Antes:
```tsx
<Button 
  variant="ghost" 
  size="sm"
  className="text-destructive hover:text-destructive hover:bg-destructive/10"
  onClick={() => handleRemove(reg.id)}
>
  <X className="h-4 w-4" />
</Button>
```

Depois:
```tsx
<Button 
  variant="ghost" 
  size="sm"
  className="text-destructive hover:text-destructive hover:bg-destructive/10"
  onClick={() => setRemoveRegulation(reg)}
>
  <X className="h-4 w-4" />
</Button>
```

**3. Adicionar AlertDialog no final do componente:**

```tsx
{/* Dialog de confirmação para remover regulação */}
<AlertDialog open={!!removeRegulation} onOpenChange={(open) => !open && setRemoveRegulation(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remover Regulação</AlertDialogTitle>
      <AlertDialogDescription>
        Tem certeza que deseja remover a solicitação de regulação para{' '}
        <strong>{removeRegulation && getSupportLabel(removeRegulation.support_type)}</strong>?
        Esta ação não pode ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={() => {
          if (removeRegulation) {
            handleRemove(removeRegulation.id);
            setRemoveRegulation(null);
          }
        }}
      >
        Remover
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**4. Adicionar imports necessários:**
```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

## Fluxo do Usuário

1. Usuário clica no botão X
2. Dialog de confirmação aparece com nome da especialidade
3. Usuário pode cancelar ou confirmar a remoção
4. Só após confirmação a regulação é removida

## Resultado Esperado

- Botão X abre dialog de confirmação
- Dialog mostra qual regulação será removida
- Botão vermelho "Remover" confirma a ação
- Botão "Cancelar" fecha o dialog sem fazer nada
