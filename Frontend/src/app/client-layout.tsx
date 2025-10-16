"use client";

import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";

export function ClientRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Seed auth in localStorage for development only when missing; never overwrite existing values
    if (typeof window !== 'undefined') {
      // Auth token
      if (!localStorage.getItem('auth_token')) {
        const token = process.env.NEXT_PUBLIC_AUTH_TOKEN || 'watchtower_auth_token_2024_secure';
        localStorage.setItem('auth_token', token);
        console.log('Auth token set in localStorage');
      }

      // API key – prefer env, do not overwrite if already present
      const existingKey = localStorage.getItem('NEXT_PUBLIC_API_KEY') || localStorage.getItem('api_key');
      if (!existingKey) {
        const envKey = (process.env.NEXT_PUBLIC_API_KEY || '').trim();
        const apiKey = envKey || 'watchtower_api_key_2024_secure';
        localStorage.setItem('NEXT_PUBLIC_API_KEY', apiKey);
        localStorage.setItem('api_key', apiKey);
      }

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
