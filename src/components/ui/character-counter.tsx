import { cn } from '@/lib/utils';

interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  const percentage = (current / max) * 100;
  const isWarning = percentage >= 80 && percentage < 100;
  const isExceeded = percentage >= 100;

  return (
    <div className={cn("text-xs text-right", className)}>
      <span
        className={cn(
          "transition-colors",
          isExceeded && "text-destructive font-medium",
          isWarning && !isExceeded && "text-warning font-medium",
          !isWarning && !isExceeded && "text-muted-foreground"
        )}
      >
        {current}/{max}
      </span>
      {isExceeded && (
        <span className="text-destructive ml-2">
          Excede limite para impressão
        </span>
      )}
    </div>
  );
}
