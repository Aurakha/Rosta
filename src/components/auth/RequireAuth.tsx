'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Lock, ArrowRight, ArrowLeft, ShieldAlert } from 'lucide-react';

interface RequireAuthProps {
  children: React.ReactNode;
  actionTitle?: string;
  actionDesc?: string;
}

export function RequireAuth({
  children,
  actionTitle = 'Menambah / Mengubah Data',
  actionDesc = 'Untuk keamanan operasional dan audit log, Anda harus masuk (login) ke sistem sebelum membuat atau mengubah data.',
}: RequireAuthProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-medium">Memverifikasi hak akses akun...</p>
      </div>
    );
  }

  if (!user) {
    const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;

    return (
      <div className="max-w-lg mx-auto py-10 px-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1 mb-2">
              <ShieldAlert className="w-3 h-3" />
              Login Diperlukan
            </span>
            <h2 className="text-lg md:text-xl font-black text-slate-900">
              Masuk untuk {actionTitle}
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-2 leading-relaxed">
              {actionDesc}
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-center gap-2.5">
            <Link
              href="/"
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Link>
            <Link
              href={loginUrl}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
            >
              <span>Masuk Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
