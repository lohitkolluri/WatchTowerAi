"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "@/components/ui/toaster";
import authService from "@/services/authService";

export function ClientRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const token = authService.getToken();

      // Log authentication status for debugging
      console.log('Authentication status check in client layout:', {
        hasToken: !!token
      });

      // If no token is found, redirect to login
      if (!token) {
        console.log('No token found, redirecting to login');
        router.push('/auth/login');
        return;
      }

      // Verify token validity
      try {
        const user = await authService.getCurrentUser();
        if (!user) {
          console.log('Invalid token, logging out');
          authService.logout();
        } else {
          console.log('User authenticated in client layout:', user.email);
        }
      } catch (error) {
        console.error('Error verifying token:', error);
      }
    };

    checkAuth();
  }, [router]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
