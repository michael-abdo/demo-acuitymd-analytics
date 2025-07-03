"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function PendoScript() {
  const { data: session } = useSession();
  
  useEffect(() => {
    // Initialize Pendo
    (function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track'];for(w=0,x=v.length;w<x;++w)(function(m){
        o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
        y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
        z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');

        // Initialize Pendo with visitor and account info when available
        pendo.initialize({
          visitor: {
            id: session?.user?.id || session?.user?.sub || 'ANONYMOUS_USER', // Azure AD user ID 
            email: session?.user?.email || undefined, // User's email
            full_name: session?.user?.name || undefined, // User's full name
            // You can add other user properties as needed
          },
          account: {
            id: 'ACCOUNT_ID' // Replace with actual account ID or logic
            // You can add other account properties as needed
          }
        });
})('f18f48c5-575b-4d19-6112-7ab62b40b73d');
  }, [session]); // Re-run when session changes

  return null; // This component doesn't render anything
} 