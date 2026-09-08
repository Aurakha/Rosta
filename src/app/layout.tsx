import type { Metadata, Viewport } from 'next';
import './globals.css';
import { CompanyProvider } from '@/context/CompanyContext';
import { AuthProvider } from '@/context/AuthContext';
import { OfflineBanner } from '@/components/layout/OfflineBanner';

export const metadata: Metadata = {
  title: 'ROSTA — Monitoring Roster & Travel',
  description: 'Sistem Monitoring Roster Cuti & Travel Lapangan PT KTA, PT KAI, PT KMB',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ROSTA',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full bg-slate-50 antialiased" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-full flex flex-col text-slate-900 bg-slate-50" suppressHydrationWarning>
        <AuthProvider>
          <CompanyProvider>
            <OfflineBanner />
            {children}
          </CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
