import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from "sonner";

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'WatchTowerAI - Log Monitoring & Alerting System',
  description: 'Advanced log monitoring and alerting system with AI-powered analysis',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.png', type: 'image/png' }
    ],
    apple: [
      { url: '/logo.png' }
    ],
  },
  manifest: '/manifest.json',
  applicationName: 'WatchTowerAI',
  keywords: ['monitoring', 'logs', 'alerts', 'observability', 'AI'],
  authors: [{ name: 'WatchTowerAI Team' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-right"
            closeButton
            theme="system"
            className="toaster-container"
            toastOptions={{
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
              className: "toast-root",
              classNames: {
                success: "toast-success",
                error: "toast-error",
                warning: "toast-warning",
                info: "toast-info"
              }
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
