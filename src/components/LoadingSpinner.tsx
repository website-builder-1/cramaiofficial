import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export function LoadingSpinner({ size = 'md', message, className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('text-primary animate-spin', sizeClasses[size])} />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export function LoadingOverlay({ isLoading, message, children }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
          <LoadingSpinner size="lg" message={message} />
        </div>
      )}
    </div>
  );
}

export function LoadingCard({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center gap-4 animate-pulse-slow">
      <div className="relative">
        <div className="w-16 h-16 rounded-full gradient-bg animate-spin" />
        <div className="absolute inset-2 bg-background rounded-full" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full gradient-bg" />
        </div>
      </div>
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="shimmer h-6 w-3/4 rounded-md" />
      <div className="shimmer h-4 w-full rounded-md" />
      <div className="shimmer h-4 w-2/3 rounded-md" />
    </div>
  );
}
