'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Left Sidebar (Desktop fixed, Mobile off-canvas drawer) */}
      <Sidebar
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      {/* Main Page Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64 transition-all">
        <Header onOpenSidebarMobile={() => setIsSidebarOpenMobile(true)} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 md:py-6 sm:px-6 pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Thumb-friendly mobile dock) */}
      <BottomNav />
    </div>
  );
}
