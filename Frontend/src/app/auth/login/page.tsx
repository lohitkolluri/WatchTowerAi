"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import authService from '@/services/authService';

// Define the form schema using Zod
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

// Infer the type from the schema
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the form with react-hook-form and zod validation
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const success = await authService.login(data);
      if (success) {
        toast.success('Logged in successfully');
        router.push('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-medium text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2.5">
          <Input
            id="email"
            type="email"
            placeholder="Email address"
            {...register('email')}
            className={`h-10 transition-colors bg-card/50 ${errors.email ? 'border-destructive focus-visible:ring-destructive/30' : 'border-border/60 focus-visible:border-primary/50 focus-visible:ring-primary/20'}`}
          />
          {errors.email && (
            <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-end">
            <Link href="/auth/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            {...register('password')}
            className={`h-10 transition-colors bg-card/50 ${errors.password ? 'border-destructive focus-visible:ring-destructive/30' : 'border-border/60 focus-visible:border-primary/50 focus-visible:ring-primary/20'}`}
          />
          {errors.password && (
            <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-10 mt-2 transition-all duration-200 hover:opacity-90 hover:scale-[1.01]"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
              <span>Signing in...</span>
            </span>
          ) : "Sign in"}
        </Button>

        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/30"></div>
          </div>
          <div className="relative z-10 inline-block px-3 bg-card text-xs text-muted-foreground">
            or
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/auth/register" className="text-primary hover:text-primary/80 transition-colors font-medium">
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
