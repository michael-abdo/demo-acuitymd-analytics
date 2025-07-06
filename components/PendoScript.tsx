"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Extend Window interface for Pendo
declare global {
  interface Window {
    pendo?: any;
  }
}

export default function PendoScript() {
  const { data: session } = useSession();
  
  useEffect(() => {
    // Skip Pendo in development to avoid TypeScript issues
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    // Only initialize in production
    try {
      const apiKey = 'f18f48c5-575b-4d19-6112-7ab62b40b73d';
      
      // Type-safe Pendo script injection
      if (typeof window !== 'undefined' && !window.pendo) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://cdn.pendo.io/agent/static/${apiKey}/pendo.js`;
        
        script.onload = () => {
          if (window.pendo && session) {
            window.pendo.initialize({
              visitor: {
                id: (session.user as any)?.id || (session.user as any)?.sub || 'ANONYMOUS_USER',
                email: session.user?.email || undefined,
                full_name: session.user?.name || undefined
              },
              account: {
                id: 'ACCOUNT_ID'
              }
            });
          }
        };
        
        document.head.appendChild(script);
      }
    } catch (error) {
      console.warn('Pendo initialization failed:', error);
    }
  }, [session]);

  return null;
}