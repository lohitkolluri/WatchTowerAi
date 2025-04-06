"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import authService from '@/services/authService';

export default function TestAuthPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication and redirect if not authenticated
    const checkAuth = async () => {
      if (!authService.isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        router.push('/auth/login');
        return;
      }

      // Verify token validity
      try {
        const userData = await authService.getCurrentUser();
        if (!userData) {
          console.log('Invalid token in test page, logging out');
          authService.logout();
        } else {
          setUser(userData);
        }
      } catch (error) {
        console.error('Error verifying token in test page:', error);
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Authentication Test Page</h1>

      {user ? (
        <div className="p-6 bg-card rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">User Details</h2>
          <p className="mb-2"><strong>Name:</strong> {user.name}</p>
          <p className="mb-2"><strong>Email:</strong> {user.email}</p>
          <p className="mb-2"><strong>ID:</strong> {user.id}</p>
          <p className="mb-2"><strong>Verified:</strong> {user.is_verified ? 'Yes' : 'No'}</p>
          <p className="mb-4"><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>

          <button
            onClick={() => authService.logout()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Logout
          </button>
        </div>
      ) : (
        <p className="text-xl">Not authenticated. Redirecting...</p>
      )}
    </main>
  );
}
