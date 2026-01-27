import sinapseLogoSrc from '@/assets/sinapse-logo.png';
import { cn } from '@/lib/utils';

interface SinapseLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12'
};

export function SinapseLogo({ size = 'md', className }: SinapseLogoProps) {
  return (
    <img 
      src={sinapseLogoSrc} 
      alt="Sinapse Logo" 
      className={cn(sizes[size], 'object-contain', className)}
    />
  );
}
