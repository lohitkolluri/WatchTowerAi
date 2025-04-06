"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';
import authService from '@/services/authService';
import { ThemeProvider } from '@/components/theme-provider';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if the user is already authenticated
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const user = await authService.getCurrentUser();
          if (user) {
            router.push('/');
          } else {
            authService.logout();
            setIsChecking(false);
          }
        } catch (error) {
          console.error('Error checking authentication:', error);
          setIsChecking(false);
        }
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className={`${inter.variable} font-sans flex min-h-screen items-center justify-center bg-background`}>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary"></div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className={`${inter.variable} font-sans`}>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background relative">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/90 z-0"></div>

          {/* Subtle decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 rounded-full filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2"></div>

          <Toaster position="top-right" />
          <div className="w-full max-w-md px-6 relative z-10">
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">WatchTower<span className="text-primary/90">AI</span></h1>
            </div>

            {/* Card container with subtle border and shadow */}
            <div className="bg-card/30 backdrop-blur-sm border border-border/20 rounded-xl p-6 shadow-sm">
              {children}
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
