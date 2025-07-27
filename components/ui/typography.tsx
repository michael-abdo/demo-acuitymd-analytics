import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: ReactNode;
  className?: string;
}

/**
 * Typography utilities to eliminate repeated heading patterns
 * Consolidates common text styling patterns like "text-2xl font-bold"
 */

export function SectionTitle({ children, className }: TypographyProps) {
  return (
    <h2 className={cn("text-2xl font-bold", className)}>
      {children}
    </h2>
  );
}

export function StatNumber({ children, className }: TypographyProps) {
  return (
    <div className={cn("text-2xl font-bold", className)}>
      {children}
    </div>
  );
}

export function ErrorTitle({ children, className }: TypographyProps) {
  return (
    <h1 className={cn("text-2xl font-bold text-red-600", className)}>
      {children}
    </h1>
  );
}

export function CenteredTitle({ children, className }: TypographyProps) {
  return (
    <h1 className={cn("text-2xl font-bold text-center", className)}>
      {children}
    </h1>
  );
}