import { useDroppable } from '@dnd-kit/core';
import { NIREmptyBedCard } from './NIREmptyBedCard';
import { cn } from '@/lib/utils';
import type { Bed } from '@/types/database';

interface NIRDroppableEmptyBedProps {
  bed: Bed;
  unitId: string;
}

export function NIRDroppableEmptyBed({ bed, unitId }: NIRDroppableEmptyBedProps) {
  const isValidDropTarget = !bed.is_blocked && !bed.is_occupied;
  
  const { setNodeRef, isOver, active } = useDroppable({
    id: `bed-${bed.id}`,
    disabled: !isValidDropTarget,
    data: {
      type: 'empty-bed',
      bedId: bed.id,
      bedNumber: bed.bed_number,
      unitId,
      isBlocked: bed.is_blocked
    }
  });

  // Check if the dragged item is from the same unit
  const isDraggedFromSameUnit = active?.data?.current?.unitId === unitId;
  const showDropIndicator = isValidDropTarget && active && isDraggedFromSameUnit;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200 rounded-lg",
        showDropIndicator && "ring-2 ring-primary ring-offset-2",
        isOver && isDraggedFromSameUnit && "ring-2 ring-green-500 ring-offset-2 bg-green-50 dark:bg-green-950/30 scale-105",
        !isValidDropTarget && active && "opacity-50 cursor-not-allowed"
      )}
    >
      <NIREmptyBedCard bed={bed} />
    </div>
  );
}
