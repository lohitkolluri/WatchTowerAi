"use client";

import { ReactNode } from 'react';
import { Sidebar } from '@/components/layouts/Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8 ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}
