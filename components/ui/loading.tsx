/**
 * Loading Components
 * 
 * Consolidates loading UI patterns across the application.
 * Eliminates ~20 lines of duplicated loading code per component.
 */

import { cn } from "@/lib/utils-simple";
import { Loader2, LucideIcon } from "lucide-react";
import { Skeleton } from "./skeleton";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
}

interface LoadingCardProps {
  title?: string;
  showValue?: boolean;
  showDescription?: boolean;
  className?: string;
}

interface LoadingStateProps {
  loading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Centralized loading spinner component
 * Consolidates Loader2 + animate-spin pattern from dashboard and upload components
 */
export function LoadingSpinner({ 
  className, 
  size = "md", 
  icon: Icon = Loader2 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-6 w-6"
  };

  return (
    <Icon 
      className={cn(
        "animate-spin text-muted-foreground",
        sizeClasses[size],
        className
      )} 
    />
  );
}

/**
 * Loading card component for dashboard-style loading states
 * Consolidates the pattern from dashboard-client.tsx
 */
export function LoadingCard({ 
  title, 
  showValue = true, 
  showDescription = true,
  className 
}: LoadingCardProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <Skeleton className="h-4 w-24" />
      )}
      <div className="flex items-center space-x-2">
        <LoadingSpinner size="sm" />
        {showValue && <Skeleton className="h-4 w-16" />}
      </div>
      {showDescription && (
        <Skeleton className="h-3 w-20" />
      )}
    </div>
  );
}

/**
 * Conditional loading wrapper
 * Provides consistent loading state handling
 */
export function LoadingState({ 
  loading, 
  children, 
  fallback,
  className 
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className={className}>
        {fallback || <LoadingSpinner />}
      </div>
    );
  }
  
  return <>{children}</>;
}

/**
 * Full page loading spinner (for pages like sign-in)
 * Consolidates the pattern from sign-in and signout pages
 */
export function LoadingPage({ 
  message = "Loading...",
  className 
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[200px] space-y-4",
      className
    )}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

/**
 * Loading button component
 * Consolidates the pattern from upload component and compare page
 */
export function LoadingButton({ 
  loading, 
  children, 
  className,
  disabled,
  loadingText,
  ...props 
}: {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  loadingText?: string;
  [key: string]: any;
}) {
  const { Button } = require('./button');
  
  return (
    <Button 
      className={className}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner size="sm" className="mr-2" />}
      {loading ? (loadingText || children) : children}
    </Button>
  );
}