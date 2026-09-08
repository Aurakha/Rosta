'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { MasterRoster, Perusahaan } from '@/types/database';
import { ArrowLeft, CalendarRange, Save, CheckCircle2, AlertCircle, Lock } from 'lucide-react';

export default function MasterRosterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [rosterList, setRosterList] = useState<MasterRoster[]>([]);
  const [perusahaanList, setPerusahaanList] = useState<Perusahaan[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: pData } = await supabase.from('perusahaan').select('*').order('kode');
      if (pData) setPerusahaanList(pData as Perusahaan[]);

      const { data: rData } = await supabase.from('master_roster').select('*');
      if (rData) setRosterList(rData as MasterRoster[]);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdate = (id: string, field: 'hari_kerja' | 'hari_libur', val: number) => {
    setRosterList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleSave = async (item: MasterRoster) => {
    if (!user) {
      setMessage({ type: 'error', text: 'Silakan login terlebih dahulu untuk mengubah aturan roster.' });
      router.push(`/login?redirect=${encodeURIComponent('/pengaturan/roster')}`);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('master_roster')
        .update({
          hari_kerja: item.hari_kerja,
          hari_libur: item.hari_libur,
        })
        .eq('id', item.id);

      if (error) throw new Error(error.message);
      setMessage({ type: 'success', text: `Aturan ${item.grade} berhasil diperbarui.` });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error)?.message || 'Gagal menyimpan.' });
    }
  };

  const filteredList = rosterList.filter((r) => {
    if (selectedCompany === 'SEMUA') return true;
    const perush = perusahaanList.find((p) => p.id === r.perusahaan_id);
    return perush?.kode === selectedCompany;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/pengaturan"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900">
            Master Roster per Grade
          </h1>
          <p className="text-xs text-slate-500">
            Standar rasio hari kerja dan libur lapangan per grade karyawan
          </p>
        </div>
      </div>

      {!user && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <p>
              <span className="font-bold">Mode Pratinjau:</span> Anda perlu login terlebih dahulu untuk mengubah rasio master roster.
            </p>
          </div>
          <Link
            href={`/login?redirect=${encodeURIComponent('/pengaturan/roster')}`}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition"
          >
            Masuk Akun
          </Link>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-xl text-xs md:text-sm flex items-start gap-2.5 border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-600">
            Perubahan aturan di sini akan diterapkan pada pembentukan siklus baru. Snapshot pada siklus yang sedang berjalan tetap terjaga integritasnya.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredList.map((item) => {
            const perush = perusahaanList.find((p) => p.id === item.perusahaan_id);
            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                      {perush?.kode || 'Perusahaan'}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900">{item.grade}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Siklus total: <strong>{item.hari_kerja + item.hari_libur} hari</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">Kerja:</label>
                    <input
                      type="number"
                      value={item.hari_kerja}
                      onChange={(e) => handleUpdate(item.id, 'hari_kerja', Number(e.target.value))}
                      className="w-16 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center"
                    />
                    <span className="text-xs text-slate-400">hari</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600">Libur:</label>
                    <input
                      type="number"
                      value={item.hari_libur}
                      onChange={(e) => handleUpdate(item.id, 'hari_libur', Number(e.target.value))}
                      className="w-16 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center"
                    />
                    <span className="text-xs text-slate-400">hari</span>
                  </div>

                  <button
                    onClick={() => handleSave(item)}
                    className="p-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition ml-2"
                    title="Simpan Perubahan"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
