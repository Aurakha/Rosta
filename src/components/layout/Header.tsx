'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCompany, KodePerusahaan } from '@/context/CompanyContext';
import { formatTanggal } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Settings, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

export function Header() {
  const router = useRouter();
  const { selectedCompany, setSelectedCompany } = useCompany();
  const [user, setUser] = useState<User | null>(null);
  const todayWib = new Date();

  useEffect(() => {
    const supabase = createClient();

    // Dapatkan user saat ini
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Dengarkan perubahan state auth (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const companyButtons: { code: KodePerusahaan; label: string }[] = [
    { code: 'SEMUA', label: 'Semua' },
    { code: 'KTA', label: 'KTA' },
    { code: 'KAI', label: 'KAI' },
    { code: 'KMB', label: 'KMB' },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Sisi Kiri: Brand & Tanggal WIB */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-sky-500 flex items-center justify-center font-black text-slate-950 text-xl tracking-tight shadow-md">
                  R
                </div>
                <div>
                  <div className="text-lg font-black tracking-wider text-slate-100 flex items-center gap-1.5">
                    ROSTA
                    <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Site Muratara
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 capitalize" suppressHydrationWarning>
                    {formatTanggal(todayWib)}
                  </p>
                </div>
              </Link>
            </div>

            {/* Tombol Aksi Mobile (User / Login / Pengaturan) */}
            <div className="flex items-center gap-2 md:hidden">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:text-white hover:bg-red-500/30 transition border border-red-500/20"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <Link
                  href="/login"
                  className="p-2 rounded-lg bg-sky-500/20 text-sky-300 hover:text-white hover:bg-sky-500/40 transition border border-sky-500/30"
                  title="Masuk"
                >
                  <LogIn className="w-4 h-4" />
                </Link>
              )}
              <Link
                href="/pengaturan"
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                title="Pengaturan"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Sisi Kanan: Pemilih Entitas Perusahaan Global & Aksi Desktop */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner overflow-x-auto w-full md:w-auto">
              {companyButtons.map((btn) => {
                const isActive = selectedCompany === btn.code;
                return (
                  <button
                    key={btn.code}
                    onClick={() => setSelectedCompany(btn.code)}
                    className={`flex-1 md:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/pengaturan"
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700/60"
                title="Pengaturan Sistem"
              >
                <Settings className="w-5 h-5" />
              </Link>

              {user ? (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/40 text-xs text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium max-w-[140px] truncate" title={user.email || ''}>
                      {user.email?.split('@')[0]}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:text-white hover:bg-red-600 transition border border-red-500/30 cursor-pointer"
                    title="Keluar (Logout)"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600/20 text-sky-300 hover:bg-sky-600 hover:text-white transition border border-sky-500/40 text-xs font-semibold"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
