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
    // Only initialize Pendo if we have a session and API key
    try {
      const apiKey = process.env.NEXT_PUBLIC_PENDO_API_KEY;
      
      if (!apiKey) {
        return; // Skip initialization if no API key is configured
      }
      
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
      if (process.env.NODE_ENV === 'development') {
        console.warn('Pendo initialization failed:', error);
      }
    }
  }, [session]);

  return null;
}