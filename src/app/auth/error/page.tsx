'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useBasePath } from '@/lib/hooks';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const router = useRouter();
  const { pagePath } = useBasePath();

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'You do not have permission to sign in.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  };

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p className="text-gray-600 mb-6">{getErrorMessage(error)}</p>
      <div className="flex gap-4 justify-center">
        <Button
          onClick={() => router.push(pagePath('/sign-in?manual=true'))}
          variant="default"
        >
          Try Again
        </Button>
        <Button
          onClick={() => router.push(pagePath('/dashboard'))}
          variant="outline"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <Suspense fallback={<div>Loading...</div>}>
          <AuthErrorContent />
        </Suspense>
      </div>
    </div>
  );
}