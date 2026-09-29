import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: 'light' | 'medium' | 'strong';
  glow?: boolean;
  glowColor?: string;
  children: React.ReactNode;
}

/**
 * Proprietary Glass Card — Enterprise Design System
 * Glassmorphism depth using backdrop-blur + zinc/slate tokens.
 * Animates focus ring color when `glow` is enabled.
 */
export function GlassCard({
  intensity = 'medium',
  glow = false,
  glowColor = 'rgba(99,102,241,0.12)',
  className,
  children,
  ...props
}: GlassCardProps) {
  const intensityMap = {
    light:  'bg-white/30 dark:bg-zinc-900/30 backdrop-blur-sm border border-white/20 dark:border-zinc-800/40',
    medium: 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-800/60',
    strong: 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200/80 dark:border-zinc-800/80',
  };

  return (
    <div
      className={cn(
        'rounded-2xl transition-all duration-300',
        intensityMap[intensity],
        glow && 'shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)]',
        className
      )}
      style={glow ? { boxShadow: `0 0 0 1px ${glowColor}, 0 8px 40px -12px rgba(0,0,0,0.2)` } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
