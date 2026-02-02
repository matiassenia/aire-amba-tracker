// GlassCard - Glassmorphism reusable card component
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({ children, className, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'glass-card rounded-2xl p-4',
        'backdrop-blur-xl bg-black/40',
        'border border-white/10',
        'shadow-lg shadow-black/20',
        'transition-all duration-300 ease-out',
        onClick && 'cursor-pointer hover:bg-black/50 hover:border-white/20',
        className
      )}
    >
      {children}
    </div>
  );
}
