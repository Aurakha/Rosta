import React from 'react';
import { Header } from '@/components/layout/Header';
import { DesktopNav } from '@/components/layout/DesktopNav';
import { BottomNav } from '@/components/layout/BottomNav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <DesktopNav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 md:py-6 sm:px-6 pb-20 md:pb-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
