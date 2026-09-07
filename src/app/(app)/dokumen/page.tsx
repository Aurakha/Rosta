import React from 'react';
import Link from 'next/link';
import { FileText, ClipboardList, Car, ArrowRight, ShieldCheck } from 'lucide-react';

export default function DokumenHubPage() {
  const docOptions = [
    {
      title: 'Generator Manifest & SPK Travel',
      desc: 'Susun manifest penumpang berdasarkan tanggal, arah, dan pool shelter. Penomoran SPK otomatis per entitas perusahaan.',
      href: '/dokumen/manifest',
      icon: ClipboardList,
      tag: 'SPK & Manifest',
      color: 'bg-sky-600 text-white',
    },
    {
      title: 'Surat Jalan Driver Operasional',
      desc: 'Terbitkan surat jalan driver lengkap dengan rute antar-jemput, daftar penumpang, tarif carter, dan nomor surat unik.',
      href: '/dokumen/surat-jalan',
      icon: Car,
      tag: 'Surat Jalan',
      color: 'bg-indigo-600 text-white',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-sky-600" />
          <span>Penerbitan Dokumen Lapangan</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Generator otomatis dokumen SPK, manifest penumpang, dan surat jalan driver tanpa ketik ulang nama atau nomor HP.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {docOptions.map((doc, idx) => {
          const Icon = doc.icon;
          return (
            <Link
              key={idx}
              href={doc.href}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-sky-300 hover:shadow-md transition flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl ${doc.color} shadow-sm`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {doc.tag}
                  </span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition">
                    {doc.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {doc.desc}
                  </p>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600">
                <span>Susun Dokumen</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
