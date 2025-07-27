import { cn } from "@/lib/utils";

interface CenteredFormLayoutProps {
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
}

/**
 * CenteredFormLayout - Eliminates duplication of full-screen centered container pattern
 * Used across auth pages, error pages, and other centered content
 */
export function CenteredFormLayout({ 
  children, 
  className,
  centered = true 
}: CenteredFormLayoutProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className={cn(
        "p-8 bg-white rounded-lg shadow-md w-full max-w-md",
        centered && "text-center",
        className
      )}>
        {children}
      </div>
    </div>
  );
}