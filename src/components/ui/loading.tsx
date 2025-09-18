import { cn } from "@/lib/utils-simple"

// Simple loading component
export function Loading() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  );
}

// Loading card component for skeleton loading states
export function LoadingCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm p-6 animate-pulse",
        className
      )}
      {...props}
    >
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  )
}

export default LoadingCard;