'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCompany, KodePerusahaan } from '@/context/CompanyContext';
import { useAuth } from '@/context/AuthContext';
import { formatTanggal } from '@/lib/utils';
import {
  CalendarDays,
  Users,
  PlaneTakeoff,
  FileText,
  BarChart3,
  Sliders,
  LogIn,
  LogOut,
  User as UserIcon,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { selectedCompany, setSelectedCompany } = useCompany();
  const { user, signOut } = useAuth();
  const todayWib = new Date();

  const handleLogout = async () => {
    await signOut();
  };

  const navLinks = [
    { href: '/', label: 'Papan Hari Ini', icon: CalendarDays },
    { href: '/roster', label: 'Daftar Roster', icon: Users },
    { href: '/perjalanan', label: 'Catat Perjalanan', icon: PlaneTakeoff },
    { href: '/dokumen', label: 'Manifest & Surat Jalan', icon: FileText },
    { href: '/rekap', label: 'Rekap & Biaya', icon: BarChart3 },
    { href: '/pengaturan', label: 'Pengaturan & Master', icon: Sliders },
  ];

  const companyButtons: { code: KodePerusahaan; label: string }[] = [
    { code: 'SEMUA', label: 'Semua' },
    { code: 'KTA', label: 'KTA' },
    { code: 'KAI', label: 'KAI' },
    { code: 'KMB', label: 'KMB' },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800/80 shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand & Logo */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center space-x-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-sky-500 flex items-center justify-center font-black text-slate-950 text-xl tracking-tight shadow-md group-hover:scale-105 transition">
              R
            </div>
            <div>
              <div className="text-lg font-black tracking-wider text-white flex items-center gap-1.5">
                ROSTA
                <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Muratara
                </span>
              </div>
              <p className="text-[11px] text-slate-400 capitalize" suppressHydrationWarning>
                {formatTanggal(todayWib)}
              </p>
            </div>
          </Link>

          {/* Close button on mobile drawer */}
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Company Switcher */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
            Entitas Perusahaan
          </div>
          <div className="grid grid-cols-4 gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner">
            {companyButtons.map((btn) => {
              const isActive = selectedCompany === btn.code;
              return (
                <button
                  key={btn.code}
                  onClick={() => setSelectedCompany(btn.code)}
                  className={`py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-3">
            Menu Utama
          </div>

          {navLinks.map((link) => {
            const isActive =
              link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Account / Auth Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50">
          {user ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate" title={user.email || ''}>
                    {user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:text-white hover:bg-red-600 transition border border-red-500/20 shrink-0 cursor-pointer"
                title="Keluar (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={onCloseMobile}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold shadow-xs transition"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk Akun</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
