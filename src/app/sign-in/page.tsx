/**
 * Sign In Page (Azure AD Only)
 * Fail fast authentication
 */

'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Check if manual mode is enabled via query parameter
  const isManualMode = searchParams?.get('manual') === 'true';

  // Extract callbackUrl from searchParams or default to dashboard
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard';

  // Simple manual sign-in function (only used in manual mode)
  const handleManualSignIn = async () => {
    try {
      setIsRedirecting(true);
      await signIn('azure-ad', { callbackUrl });
    } catch (error) {
      console.error('Manual sign-in error:', error);
      setIsRedirecting(false);
    }
  };

  useEffect(() => {
    // Check if already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  // Auto-redirect effect - simple pattern like vvg_invoice
  useEffect(() => {
    if (!isManualMode) {
      const handleSignIn = async () => {
        try {
          setIsRedirecting(true);
          console.log('[AUTO-REDIRECT] Starting auto sign-in...');
          
          // Direct call to signIn like vvg_invoice
          await signIn('azure-ad', { callbackUrl });
        } catch (error) {
          console.error('Auto sign-in error:', error);
          setIsRedirecting(false);
        }
      };

      // Add a small delay to prevent immediate execution during compilation (like vvg_invoice)
      const timer = setTimeout(handleSignIn, 100);
      return () => clearTimeout(timer);
    }
    // Return undefined when not setting up timer
    return undefined;
  }, [isManualMode, callbackUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Access your VVG Template dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show redirect message during auto-redirect */}
          {isRedirecting && !isManualMode && (
            <div className="text-center mb-4">
              <p className="text-sm text-blue-600 font-medium">Redirecting to Azure AD...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
              </div>
            </div>
          )}
          
          {/* Only show button in manual mode */}
          {isManualMode && (
            <Button 
              onClick={handleManualSignIn}
              disabled={isRedirecting}
              className="w-full"
              size="lg"
            >
              {isRedirecting ? 'Signing In...' : 'Sign In with Azure AD'}
            </Button>
          )}
          
          <p className="text-xs text-gray-500 text-center mt-4">
            {isManualMode ? 
              'Manual sign-in mode. Azure AD authentication required.' :
              'Redirecting to Azure AD authentication...'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Loading authentication...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '50%'}}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignInContent />
    </Suspense>
  );
}
