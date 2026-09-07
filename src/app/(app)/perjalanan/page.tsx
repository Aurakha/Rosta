'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { Perjalanan, Perusahaan } from '@/types/database';
import {
  formatTanggalPendek,
  formatJam,
  formatRupiah,
} from '@/lib/utils';
import {
  PlaneTakeoff,
  Home,
  Plus,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';

export default function PerjalananHubPage() {
  const { selectedCompany } = useCompany();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArah, setFilterArah] = useState<string>('SEMUA');

  const loadTrips = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('perjalanan')
        .select(`
          *,
          karyawan:nik (nama, jabatan, departemen, poh, perusahaan:perusahaan_id (kode)),
          pool_shelter:pool_shelter_id (nama),
          penanggung:penanggung_biaya (kode)
        `)
        .order('tanggal_travel', { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.warn('Gagal memuat perjalanan:', error);
      } else {
        setTrips(data || []);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [selectedCompany]);

  const filteredTrips = trips.filter((t) => {
    const nama = t.karyawan?.nama || '';
    const nik = t.nik || '';
    const tujuan = t.titik_tujuan || '';
    const matchSearch =
      nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tujuan.toLowerCase().includes(searchQuery.toLowerCase());

    const matchArah = filterArah === 'SEMUA' || t.arah === filterArah;

    if (selectedCompany === 'SEMUA') return matchSearch && matchArah;
    const kodePerush = t.karyawan?.perusahaan?.kode;
    return matchSearch && matchArah && kodePerush === selectedCompany;
  });

  return (
    <div className="space-y-6">
      {/* Header & Tombol Aksi Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <PlaneTakeoff className="w-6 h-6 text-sky-600" />
            <span>Manajemen Perjalanan (Trip)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan keberangkatan cuti dan kedatangan kembali ke site
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/perjalanan/berangkat"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs md:text-sm font-bold shadow-xs transition"
          >
            <PlaneTakeoff className="w-4 h-4" />
            <span>Catat Keberangkatan</span>
          </Link>
          <Link
            href="/perjalanan/kembali"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold shadow-xs transition"
          >
            <Home className="w-4 h-4" />
            <span>Catat Kedatangan</span>
          </Link>
        </div>
      </div>

      {/* FILTER & PENCARIAN */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama karyawan, NIK, tujuan..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterArah}
            onChange={(e) => setFilterArah(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white font-medium"
          >
            <option value="SEMUA">Semua Arah</option>
            <option value="KELUAR">Berangkat Cuti (KELUAR)</option>
            <option value="MASUK">Kembali ke Site (MASUK)</option>
          </select>

          <button
            onClick={loadTrips}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TABEL LOG PERJALANAN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Arah</th>
                <th className="px-4 py-3">Nama Karyawan</th>
                <th className="px-4 py-3">Rute / Titik Tujuan</th>
                <th className="px-4 py-3">Pool Shelter</th>
                <th className="px-4 py-3">Jam Jemput</th>
                <th className="px-4 py-3">Moda & Booking</th>
                <th className="px-4 py-3 text-right">Harga Tiket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    {loading ? 'Memuat log perjalanan...' : 'Belum ada data perjalanan tersimpan.'}
                  </td>
                </tr>
              ) : (
                filteredTrips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {formatTanggalPendek(t.tanggal_travel)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${
                          t.arah === 'KELUAR'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {t.arah === 'KELUAR' ? '✈ KELUAR' : '🏠 MASUK'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {t.karyawan?.nama || t.nik}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {t.karyawan?.perusahaan?.kode || ''} {t.karyawan?.jabatan ? `· ${t.karyawan?.jabatan}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {t.titik_tujuan || ''}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.pool_shelter?.nama || ''}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {formatJam(t.jam_jemput)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{t.moda || ''}</div>
                      {t.kode_booking && (
                        <div className="font-mono text-[10px] text-slate-400">
                          {t.kode_booking}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {formatRupiah(t.harga_tiket)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
