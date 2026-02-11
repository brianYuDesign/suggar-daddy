import { cn } from './utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  fallback: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
};

export function Avatar({ src, fallback, size = 'md', className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={fallback} className="aspect-square h-full w-full object-cover" />
      ) : (
        <span className="font-medium text-muted-foreground">
          {fallback.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
