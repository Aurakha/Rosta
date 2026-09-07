'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-600 text-white text-xs md:text-sm py-1.5 px-4 flex items-center justify-center gap-2 shadow-sm animate-pulse sticky top-0 z-50">
      <WifiOff className="w-4 h-4" />
      <span>Mode Luring (Offline): Menampilkan salinan data lokal. Penginputan data baru dinonaktifkan.</span>
    </div>
  );
}
