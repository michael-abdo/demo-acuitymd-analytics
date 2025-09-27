/**
 * Sign In Page (Azure AD Only)
 * Fail fast authentication
 */

'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRedirecting, setIsAutoRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState('');
  
  // Check if manual mode is enabled via query parameter
  const isManualMode = searchParams.get('manual') === 'true';

  const handleSignIn = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const result = await signIn('azure-ad', {
        callbackUrl: '/dashboard',
        redirect: false
      });
      
      if (result?.error) {
        console.error('❌ Sign in failed:', result.error);
        alert(`Sign in failed: ${result.error}`);
        
        // Reset auto-redirect state on error to allow manual retry
        if (isAutoRedirecting) {
          setIsAutoRedirecting(false);
          setRedirectMessage('Auto-redirect failed. Please try manually.');
        }
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      alert('Sign in failed. Please try again.');
      
      // Reset auto-redirect state on error to allow manual retry
      if (isAutoRedirecting) {
        setIsAutoRedirecting(false);
        setRedirectMessage('Auto-redirect failed. Please try manually.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAutoRedirecting]);

  useEffect(() => {
    // Check if already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  // Auto-redirect effect
  useEffect(() => {
    // Only auto-redirect if not in manual mode and not already loading
    if (!isManualMode && !isLoading && !isAutoRedirecting) {
      setIsAutoRedirecting(true);
      setRedirectMessage('Redirecting to sign-in...');
      
      // Add 500ms delay before triggering
      const timer = setTimeout(() => {
        handleSignIn();
      }, 500);

      return () => clearTimeout(timer);
    }
    // Return undefined when not setting up timer (satisfies TS requirement)
    return undefined;
  }, [isManualMode, isLoading, isAutoRedirecting, handleSignIn]);

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
          {isAutoRedirecting && (
            <div className="text-center mb-4">
              <p className="text-sm text-blue-600 font-medium">{redirectMessage}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
              </div>
            </div>
          )}
          
          <Button 
            onClick={handleSignIn}
            disabled={isLoading || isAutoRedirecting}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Signing In...' : 
             isAutoRedirecting ? 'Auto-redirecting...' :
             isManualMode ? 'Sign In with Azure AD' : 'Sign In with Azure AD'}
          </Button>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            {isManualMode ? 
              'Manual sign-in mode. Azure AD authentication required.' :
              'Azure AD authentication required. Auto-redirecting in a moment...'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}