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
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  userCrm: string;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  userName,
  userCrm,
  onConfirm,
  isDeleting,
}: DeleteUserDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Usuário
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>Tem certeza que deseja excluir permanentemente o usuário:</p>
            <p className="font-semibold text-foreground">
              {userName} (CRM: {userCrm})
            </p>
            <p className="text-destructive font-medium">
              Esta ação não pode ser desfeita.
            </p>
            <p>
              O usuário perderá acesso ao sistema e precisará se cadastrar
              novamente.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              'Excluir permanentemente'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
