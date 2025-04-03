"use client";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";

export function ClientRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Set the API key and Auth token in localStorage for development if not already set
    if (typeof window !== 'undefined') {
      // Clear potentially stale auth values
      localStorage.removeItem('auth_token');
      localStorage.removeItem('NEXT_PUBLIC_API_KEY');
      localStorage.removeItem('api_key');

      // Set the correct auth values
      localStorage.setItem('auth_token', 'demo_token_test');
      console.log('Auth token set in localStorage');

      // Set API key - ensure it's set with BOTH potential key names for compatibility
      const apiKey = 'test_api_key';
      localStorage.setItem('NEXT_PUBLIC_API_KEY', apiKey);
      localStorage.setItem('api_key', apiKey); // Also set with alternative name used in backend

      console.log('Auth credentials configured for API requests', {
        auth_token: localStorage.getItem('auth_token') ? '**present**' : '**missing**',
        NEXT_PUBLIC_API_KEY: localStorage.getItem('NEXT_PUBLIC_API_KEY') ? '**present**' : '**missing**',
        api_key: localStorage.getItem('api_key') ? '**present**' : '**missing**',
      });
    }
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
