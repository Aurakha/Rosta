import React from 'react';
import Link from 'next/link';
import {
  Users,
  Sliders,
  CalendarRange,
  Car,
  CreditCard,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function PengaturanMenuPage() {
  const menuSections = [
    {
      title: 'Karyawan & Kebijakan Roster',
      items: [
        {
          title: 'Kelola Karyawan',
          desc: 'Daftarkan karyawan baru, atur grade, POH, tanggal mulai kerja, dan siklus masuk site.',
          href: '/pengaturan/karyawan',
          icon: Users,
          color: 'text-sky-600 bg-sky-50 border-sky-100',
        },
        {
          title: 'Kebijakan Cuti Per Perusahaan',
          desc: 'Atur hari perjalanan, batas tambahan cuti tahunan, dan kompensasi remote untuk KTA, KAI, KMB.',
          href: '/pengaturan/kebijakan',
          icon: Sliders,
          color: 'text-amber-600 bg-amber-50 border-amber-100',
        },
        {
          title: 'Master Roster per Grade',
          desc: 'Pengaturan siklus hari kerja dan hari libur untuk Grade 1-2 hingga Grade 6 Up.',
          href: '/pengaturan/roster',
          icon: CalendarRange,
          color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        },
      ],
    },
    {
      title: 'Transportasi & Logistik',
      items: [
        {
          title: 'Pool Shelter, Vendor Travel & Driver',
          desc: 'Kelola titik jemput (Bintel), kontak vendor travel, data driver, dan nomor polisi armada.',
          href: '/pengaturan/travel',
          icon: Car,
          color: 'text-purple-600 bg-purple-50 border-purple-100',
        },
        {
          title: 'Plafon Tiket Pesawat & Kereta',
          desc: 'Daftar plafon biaya tiket per POH (Palembang, Yogyakarta, Jakarta, dll.) per moda.',
          href: '/pengaturan/plafon',
          icon: CreditCard,
          color: 'text-blue-600 bg-blue-50 border-blue-100',
        },
      ],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900">
          Pengaturan & Data Master
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Konfigurasi data master karyawan, aturan rotasi roster, kebijakan cuti, dan logistik travel lapangan.
        </p>
      </div>

      <div className="space-y-6">
        {menuSections.map((sec, idx) => (
          <div key={idx} className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
              {sec.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition flex items-start gap-3.5 group"
                  >
                    <div className={`p-2.5 rounded-xl border shrink-0 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-sky-600 transition">
                          {item.title}
                        </h3>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
