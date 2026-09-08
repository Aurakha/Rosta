'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { PlafonTiket, Perusahaan } from '@/types/database';
import { formatRupiah } from '@/lib/utils';
import { ArrowLeft, CreditCard, Plus, Save, Lock } from 'lucide-react';

export default function PengaturanPlafonPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [plafonList, setPlafonList] = useState<PlafonTiket[]>([]);
  const [perusahaanList, setPerusahaanList] = useState<Perusahaan[]>([]);
  const [loading, setLoading] = useState(true);

  const [poh, setPoh] = useState('');
  const [moda, setModa] = useState<'PESAWAT' | 'KERETA'>('PESAWAT');
  const [plafonNominal, setPlafonNominal] = useState(1500000);
  const [perusahaanId, setPerusahaanId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: pData } = await supabase.from('perusahaan').select('*').order('kode');
      if (pData && pData.length > 0) {
        setPerusahaanList(pData as Perusahaan[]);
        if (!perusahaanId) setPerusahaanId(pData[0].id);
      }

      const { data: plData } = await supabase.from('plafon_tiket').select('*').order('poh');
      if (plData) setPlafonList(plData as PlafonTiket[]);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddPlafon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent('/pengaturan/plafon')}`);
      return;
    }
    if (!poh.trim() || !perusahaanId) return;

    try {
      const supabase = createClient();
      await supabase.from('plafon_tiket').insert({
        perusahaan_id: perusahaanId,
        poh: poh.trim(),
        moda,
        plafon: plafonNominal,
      });
      setPoh('');
      loadData();
    } catch (err) {
      console.warn(err);
    }
  };

  const filteredPlafon = plafonList.filter((item) => {
    if (selectedCompany === 'SEMUA') return true;
    const perush = perusahaanList.find((p) => p.id === item.perusahaan_id);
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
            Plafon Tiket Transportasi
          </h1>
          <p className="text-xs text-slate-500">
            Standar batas biaya tiket pesawat/kereta per kota Point of Hire (POH)
          </p>
        </div>
      </div>

      {!user && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <p>
              <span className="font-bold">Mode Pratinjau:</span> Anda perlu login terlebih dahulu untuk menambah atau mengedit plafon tiket.
            </p>
          </div>
          <Link
            href={`/login?redirect=${encodeURIComponent('/pengaturan/plafon')}`}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition"
          >
            Masuk Akun
          </Link>
        </div>
      )}

      {/* FORM TAMBAH PLAFON */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-sky-600" />
          <span>Tambah / Atur Plafon Kota POH</span>
        </h2>

        <form onSubmit={handleAddPlafon} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Perusahaan</label>
            <select
              value={perusahaanId}
              onChange={(e) => setPerusahaanId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            >
              {perusahaanList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.kode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kota POH</label>
            <input
              type="text"
              required
              value={poh}
              onChange={(e) => setPoh(e.target.value)}
              placeholder="Mis: Palembang, Yogyakarta"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Moda</label>
            <select
              value={moda}
              onChange={(e) => setModa(e.target.value as 'PESAWAT' | 'KERETA')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            >
              <option value="PESAWAT">Pesawat Udara</option>
              <option value="KERETA">Kereta Api</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Plafon Nominal</label>
            <input
              type="number"
              required
              value={plafonNominal}
              onChange={(e) => setPlafonNominal(Number(e.target.value))}
              step={50000}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-4 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition"
            >
              + Simpan Plafon
            </button>
          </div>
        </form>
      </div>

      {/* DAFTAR PLAFON */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredPlafon.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada plafon tiket yang dikonfigurasi.
            </div>
          ) : (
            filteredPlafon.map((item) => {
              const perush = perusahaanList.find((p) => p.id === item.perusahaan_id);
              return (
                <div
                  key={item.id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border">
                        {perush?.kode}
                      </span>
                      <span className="font-bold text-slate-900">{item.poh}</span>
                      <span className="text-[11px] text-slate-500 font-medium">({item.moda})</span>
                    </div>
                  </div>
                  <div className="font-mono font-black text-slate-900 text-sm">
                    {formatRupiah(item.plafon)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
