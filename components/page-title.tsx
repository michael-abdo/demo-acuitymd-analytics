import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageTitleProps {
  children: ReactNode
  className?: string
  description?: string
}

export function PageTitle({ children, description, className }: PageTitleProps) {
  return (
    <div className={cn("mb-6", className)}>
      <h1 className="text-3xl font-bold">{children}</h1>
      {description && (
        <p className="text-gray-600 mt-1">{description}</p>
      )}
    </div>
  )
}