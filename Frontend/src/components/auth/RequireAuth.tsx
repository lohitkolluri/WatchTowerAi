"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/authService';

interface RequireAuthProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RequireAuth({
  children,
  redirectTo = '/auth/login'
}: RequireAuthProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // Check if the user is authenticated using the auth service
      if (!authService.isAuthenticated()) {
        console.log('Not authenticated, redirecting to', redirectTo);
        router.push(redirectTo);
        return;
      }

      try {
        // Verify that the token is valid by getting the current user
        const user = await authService.getCurrentUser();

        if (user) {
          console.log('User authenticated:', user.email);
          setIsAuthenticated(true);
        } else {
          console.log('Invalid token, logging out');
          // Token is invalid or expired - clear it and redirect
          authService.logout();
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, redirectTo]);

  // Display a loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
      </div>
    );
  }

  // Render children only if authenticated
  return isAuthenticated ? <>{children}</> : null;
}
