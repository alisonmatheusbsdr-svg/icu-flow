import { Card, CardContent } from '@/components/ui/card';
import { Lock, Plus } from 'lucide-react';
import type { Bed } from '@/types/database';

interface NIREmptyBedCardProps {
  bed: Bed;
}

export function NIREmptyBedCard({ bed }: NIREmptyBedCardProps) {
  // Leito bloqueado
  if (bed.is_blocked) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px]">
          <div className="text-lg font-semibold text-muted-foreground mb-2">
            Leito {bed.bed_number}
          </div>
          <Lock className="h-5 w-5 text-destructive" />
          <span className="text-sm font-medium text-destructive mt-2">BLOQUEADO</span>
          {bed.blocked_reason && (
            <span className="text-xs text-muted-foreground mt-1 text-center line-clamp-2">
              {bed.blocked_reason}
            </span>
          )}
        </CardContent>
      </Card>
    );
  }

  // Leito vago
  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="p-4 flex flex-col items-center justify-center min-h-[140px]">
        <div className="text-lg font-semibold text-muted-foreground mb-2">
          Leito {bed.bed_number}
        </div>
        <div className="p-2 rounded-full bg-success/10">
          <Plus className="h-5 w-5 text-success" />
        </div>
        <span className="text-sm text-muted-foreground mt-2">Vago</span>
      </CardContent>
    </Card>
  );
}
