'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { PageContainer } from '@/components/page-container';
import { ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  title?: string;
  message?: string;
  showContainer?: boolean;
}

/**
 * Authentication guard component that wraps content requiring authentication.
 * Displays a consistent sign-in message when user is not authenticated.
 * 
 * @param children - Content to render when authenticated
 * @param title - Card title for unauthenticated state (optional)
 * @param message - Message to show when not authenticated (optional)
 * @param showContainer - Whether to wrap in PageContainer (default: true)
 */
export function AuthGuard({ 
  children, 
  title, 
  message = 'Please sign in to access this content.',
  showContainer = true 
}: AuthGuardProps) {
  const { data: session } = useSession();

  if (!session) {
    const unauthenticatedContent = (
      <Card>
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
        </CardHeader>
        <CardContent>
          <p>{message}</p>
        </CardContent>
      </Card>
    );

    return showContainer ? (
      <PageContainer>{unauthenticatedContent}</PageContainer>
    ) : (
      unauthenticatedContent
    );
  }

  return <>{children}</>;
}

/**
 * Higher-order component that wraps a page component with authentication.
 * Useful for protecting entire pages.
 */
export function withAuth<T extends object>(
  Component: React.ComponentType<T>,
  options?: {
    title?: string;
    message?: string;
    showContainer?: boolean;
  }
) {
  return function AuthenticatedComponent(props: T) {
    return (
      <AuthGuard 
        title={options?.title}
        message={options?.message}
        showContainer={options?.showContainer}
      >
        <Component {...props} />
      </AuthGuard>
    );
  };
}

/**
 * Hook that returns session and authentication status.
 * Consolidates common session handling patterns.
 */
export function useAuth() {
  const { data: session, status } = useSession();
  
  return {
    session,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    user: session?.user
  };
}