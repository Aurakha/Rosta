'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { VStatusRoster, Perusahaan } from '@/types/database';
import { formatRupiah, WARNA_STATUS, LABEL_STATUS } from '@/lib/utils';
import { BarChart3, TrendingUp, DollarSign, Users, Award, Clock } from 'lucide-react';

export default function RekapBiayaPage() {
  const { selectedCompany } = useCompany();
  const [rosters, setRosters] = useState<VStatusRoster[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        let rQuery = supabase.from('v_status_roster').select('*');
        if (selectedCompany !== 'SEMUA') {
          rQuery = rQuery.eq('perusahaan_kode', selectedCompany);
        }
        const { data: rData } = await rQuery;
        if (rData) setRosters(rData as VStatusRoster[]);

        let tQuery = supabase.from('perjalanan').select('*, penanggung:penanggung_biaya(kode)');
        const { data: tData } = await tQuery;
        if (tData) setTrips(tData);
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [selectedCompany]);

  // Rekap per Grade
  const statsPerGrade = useMemo(() => {
    const map: Record<string, { total: number; normal: number; overdue: number; cuti: number }> = {};
    rosters.forEach((r) => {
      if (!map[r.grade]) {
        map[r.grade] = { total: 0, normal: 0, overdue: 0, cuti: 0 };
      }
      map[r.grade].total++;
      if (r.status_roster === 'NORMAL' || r.status_roster === 'SEGERA_CUTI') map[r.grade].normal++;
      if (r.status_roster === 'OVERDUE') map[r.grade].overdue++;
      if (r.status_roster === 'SEDANG_CUTI' || r.status_roster === 'BELUM_KEMBALI') map[r.grade].cuti++;
    });
    return Object.entries(map).map(([grade, counts]) => ({ grade, ...counts }));
  }, [rosters]);

  // Rekap Biaya per Penanggung
  const biayaPerPerusahaan = useMemo(() => {
    const map: Record<string, { totalTiket: number; tripCount: number }> = {};
    trips.forEach((t) => {
      const kode = t.penanggung?.kode || 'KTA';
      if (!map[kode]) map[kode] = { totalTiket: 0, tripCount: 0 };
      map[kode].totalTiket += Number(t.harga_tiket || 0);
      map[kode].tripCount++;
    });
    return Object.entries(map).map(([kode, data]) => ({ kode, ...data }));
  }, [trips]);

  const totalBiayaTiket = useMemo(() => {
    return trips.reduce((acc, curr) => acc + Number(curr.harga_tiket || 0), 0);
  }, [trips]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-sky-600" />
          <span>Rekap Operasional & Biaya Perjalanan</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Statistik perputaran roster dan laporan pengeluaran tiket perjalanan
        </p>
      </div>

      {/* METRIK UTAMA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-sky-50 text-sky-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Karyawan Aktif</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{rosters.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Biaya Tiket Tercatat</span>
            <div className="text-xl font-black text-emerald-700 mt-0.5">
              {formatRupiah(totalBiayaTiket)}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-indigo-50 text-indigo-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Perjalanan Terdata</span>
            <div className="text-2xl font-black text-indigo-900 mt-0.5">{trips.length} Trip</div>
          </div>
        </div>
      </div>

      {/* DUA TABEL: REKAP GRADE & REKAP BIAYA PERUSAHAAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* REKAP STATUS PER GRADE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-sm text-slate-900">Distribusi Karyawan per Grade</h2>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {statsPerGrade.length === 0 ? (
              <div className="py-6 text-center text-slate-400">Belum ada data roster terdata.</div>
            ) : (
              statsPerGrade.map((s) => (
                <div key={s.grade} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{s.grade}</span>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Normal: {s.normal} · Cuti: {s.cuti} · Overdue: {s.overdue}
                    </div>
                  </div>
                  <span className="font-black text-slate-800 text-sm">{s.total} Orang</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* REKAP PENGELUARAN PER ENTITAS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-sm text-slate-900">Rekap Biaya per Entitas Penanggung</h2>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {biayaPerPerusahaan.length === 0 ? (
              <div className="py-6 text-center text-slate-400">Belum ada data biaya tersimpan.</div>
            ) : (
              biayaPerPerusahaan.map((b) => (
                <div key={b.kode} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-900 text-white mr-2">
                      {b.kode}
                    </span>
                    <span className="text-slate-600">{b.tripCount} Perjalanan</span>
                  </div>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {formatRupiah(b.totalTiket)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
