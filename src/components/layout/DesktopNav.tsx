'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Users,
  PlaneTakeoff,
  FileText,
  BarChart3,
  Sliders,
} from 'lucide-react';

export function DesktopNav() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Papan Hari Ini', icon: CalendarDays },
    { href: '/roster', label: 'Daftar Roster', icon: Users },
    { href: '/perjalanan', label: 'Catat Perjalanan', icon: PlaneTakeoff },
    { href: '/dokumen', label: 'Manifest & Surat Jalan', icon: FileText },
    { href: '/rekap', label: 'Rekap & Biaya', icon: BarChart3 },
    { href: '/pengaturan', label: 'Pengaturan', icon: Sliders },
  ];

  return (
    <nav className="hidden md:flex items-center space-x-1 border-b border-slate-200 bg-white px-6 py-2 sticky top-[61px] z-30 shadow-xs">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {links.map((link) => {
            const isActive =
              link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
