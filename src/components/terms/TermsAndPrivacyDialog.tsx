import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TermsContent } from './TermsContent';
import { ReactNode } from 'react';

interface TermsAndPrivacyDialogProps {
  trigger: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TermsAndPrivacyDialog({ trigger, open, onOpenChange }: TermsAndPrivacyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Termos de Uso e Política de Privacidade</DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6 max-h-[70vh]">
          <TermsContent />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
