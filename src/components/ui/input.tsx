import { cn } from "@/lib/utils-simple"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error'
}

export function Input({ className, type = 'text', variant = 'default', ...props }: InputProps) {
  const baseStyles = "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  
  const variants = {
    default: "border-input",
    error: "border-destructive focus-visible:ring-destructive",
  }

  return (
    <input
      type={type}
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    />
  )
}