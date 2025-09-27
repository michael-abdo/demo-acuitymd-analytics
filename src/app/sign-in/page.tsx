/**
 * Sign In Page (Azure AD Only)
 * Fail fast authentication
 */

'use client';

import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleSignIn = async () => {
    setIsLoading(true);
    
    try {
      const result = await signIn('azure-ad', {
        callbackUrl: '/dashboard',
        redirect: false
      });
      
      if (result?.error) {
        console.error('❌ Sign in failed:', result.error);
        alert(`Sign in failed: ${result.error}`);
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      alert('Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <Button 
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Signing In...' : 'Sign In with Azure AD'}
          </Button>
          
          <p className="text-xs text-gray-500 text-center mt-4">
            Azure AD authentication required. No guest access available.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}