'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import {
  formatTanggal,
  formatTanggalPendek,
  formatJam,
  formatRupiah,
  formatWhatsAppUrl,
} from '@/lib/utils';
import {
  PlaneTakeoff,
  PlaneLanding,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  X,
  MapPin,
  Clock,
  Car,
  CreditCard,
  Phone,
  MessageSquare,
  Building2,
  Eye,
  Info,
} from 'lucide-react';

export default function PerjalananHubPage() {
  const { selectedCompany } = useCompany();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArah, setFilterArah] = useState<string>('SEMUA');
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedTrip(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const query = supabase
        .from('perjalanan')
        .select(`
          *,
          karyawan:nik (nama, jabatan, departemen, poh, no_hp, grade, perusahaan:perusahaan_id (kode, nama_lengkap)),
          pool_shelter:pool_shelter_id (nama),
          penanggung:penanggung_biaya (kode, nama_lengkap)
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
            <span>+ Catat Keberangkatan</span>
          </Link>
          <Link
            href="/perjalanan/kembali"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold shadow-xs transition"
          >
            <span>+ Catat Kedatangan</span>
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
            placeholder="Cari nama, NIK, tujuan..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterArah}
            onChange={(e) => setFilterArah(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
          >
            <option value="SEMUA">Semua Arah</option>
            <option value="KELUAR">Berangkat Cuti (KELUAR)</option>
            <option value="MASUK">Masuk Site (MASUK)</option>
          </select>
          <button
            onClick={loadTrips}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 cursor-pointer"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* DAFTAR PERJALANAN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-600" />
            <span>Klik baris tabel mana saja untuk melihat <strong>pop-up detail data lengkap</strong>.</span>
          </span>
          <span>{filteredTrips.length} data ditemukan</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Memuat data log perjalanan...
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Tidak ada riwayat perjalanan yang cocok dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Arah</th>
                  <th className="px-4 py-3">Nama Karyawan</th>
                  <th className="px-4 py-3">Tujuan</th>
                  <th className="px-4 py-3">Jam Jemput</th>
                  <th className="px-4 py-3">Pool Shelter</th>
                  <th className="px-4 py-3">Moda</th>
                  <th className="px-4 py-3">Cost Bearer</th>
                  <th className="px-4 py-3 text-right">Tiket (Rp)</th>
                  <th className="px-3 py-3 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrips.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTrip(t)}
                    className="hover:bg-sky-50/70 transition cursor-pointer group"
                    title="Klik untuk membuka detail lengkap"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                      {formatTanggalPendek(t.tanggal_travel)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider ${
                          t.arah === 'KELUAR'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {t.arah === 'KELUAR' ? 'KELUAR' : 'MASUK'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 group-hover:text-sky-700 transition">
                        {t.karyawan?.nama || t.nik}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {t.karyawan?.perusahaan?.kode || ''} {t.karyawan?.jabatan ? `· ${t.karyawan?.jabatan}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {t.titik_tujuan || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {formatJam(t.jam_jemput) || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.pool_shelter?.nama || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{t.moda || '-'}</div>
                      {t.kode_booking && (
                        <div className="font-mono text-[10px] text-slate-400">
                          {t.kode_booking}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {t.penanggung?.kode || t.karyawan?.perusahaan?.kode || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                      {formatRupiah(t.harga_tiket) || '-'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex p-1.5 rounded-lg text-slate-400 group-hover:text-sky-600 group-hover:bg-sky-100 transition">
                        <Eye className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POP-UP MODAL DETAIL DATA PERJALANAN */}
      {selectedTrip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50 duration-150"
          onClick={() => setSelectedTrip(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5 p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider ${
                      selectedTrip.arah === 'KELUAR'
                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {selectedTrip.arah === 'KELUAR' ? (
                      <>
                        <PlaneTakeoff className="w-3 h-3" />
                        <span>BERANGKAT CUTI (KELUAR)</span>
                      </>
                    ) : (
                      <>
                        <PlaneLanding className="w-3 h-3" />
                        <span>KEDATANGAN SITE (MASUK)</span>
                      </>
                    )}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ID #{selectedTrip.id?.slice(0, 8)}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  Detail Log Perjalanan
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {formatTanggal(selectedTrip.tanggal_travel)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profil Karyawan */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                    selectedTrip.karyawan?.perusahaan?.kode === 'KTA'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300/60'
                      : selectedTrip.karyawan?.perusahaan?.kode === 'KAI'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300/60'
                      : 'bg-sky-100 text-sky-900 border border-sky-300/60'
                  }`}
                >
                  {selectedTrip.karyawan?.perusahaan?.kode || 'ROSTA'}
                </div>
                <div className="min-w-0">
                  <div className="text-base font-black text-slate-900 truncate">
                    {selectedTrip.karyawan?.nama || selectedTrip.nik}
                  </div>
                  <div className="text-xs text-slate-600 font-medium truncate">
                    {selectedTrip.karyawan?.jabatan || 'Karyawan'} {selectedTrip.karyawan?.departemen ? `· ${selectedTrip.karyawan?.departemen}` : ''}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>NIK: <strong className="text-slate-600 font-mono">{selectedTrip.nik}</strong></span>
                    {selectedTrip.karyawan?.grade && (
                      <>
                        <span>·</span>
                        <span>Grade: <strong className="text-slate-600">{selectedTrip.karyawan?.grade}</strong></span>
                      </>
                    )}
                    <span>·</span>
                    <span>POH: <strong className="text-slate-600">{selectedTrip.karyawan?.poh || '-'}</strong></span>
                  </div>
                </div>
              </div>

              {selectedTrip.karyawan?.no_hp && (
                <a
                  href={formatWhatsAppUrl(selectedTrip.karyawan.no_hp) || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition shrink-0 self-start sm:self-auto cursor-pointer"
                  title="Hubungi via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="font-mono">{selectedTrip.karyawan.no_hp}</span>
                </a>
              )}
            </div>

            {/* Rute & Jadwal Penjemputan */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Jadwal & Titik Penjemputan
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                    <span>Titik Jemput / Tujuan</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {selectedTrip.titik_tujuan || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pool Shelter Site</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {selectedTrip.pool_shelter?.nama || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Jam Jemput Shelter</span>
                  </div>
                  <div className="text-xs font-bold font-mono text-slate-900 mt-1">
                    {formatJam(selectedTrip.jam_jemput) || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>
                      {selectedTrip.arah === 'KELUAR' ? 'Jam Terbang / Berangkat' : 'Jam Tiba di Site'}
                    </span>
                  </div>
                  <div className="text-xs font-bold font-mono text-slate-900 mt-1">
                    {formatJam(selectedTrip.jam_berangkat || selectedTrip.jam_tiba) || '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Transportasi, Tiket & Biaya */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Transportasi, Tiket & Biaya
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Moda Transportasi</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {selectedTrip.moda || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Maskapai / Kereta</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {selectedTrip.maskapai_ka || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Kode Booking (PNR)</div>
                  <div className="text-xs font-mono font-bold text-slate-900 mt-1">
                    {selectedTrip.kode_booking || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Harga Tiket</div>
                  <div className="text-xs font-mono font-black text-slate-900 mt-1">
                    {formatRupiah(selectedTrip.harga_tiket) || 'Rp 0'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Cost Bearer</div>
                  <div className="text-xs font-bold text-slate-900 mt-1">
                    {selectedTrip.penanggung?.kode || selectedTrip.karyawan?.perusahaan?.kode || '-'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium">Over Plafon</div>
                  <div
                    className={`text-xs font-bold mt-1 ${
                      selectedTrip.over_plafon > 0 ? 'text-rose-600 font-black' : 'text-slate-700'
                    }`}
                  >
                    {selectedTrip.over_plafon > 0
                      ? formatRupiah(selectedTrip.over_plafon)
                      : 'Rp 0 (Aman)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan Perjalanan (jika ada) */}
            {selectedTrip.catatan && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">Catatan Perjalanan:</span>
                <p className="text-amber-800">{selectedTrip.catatan}</p>
              </div>
            )}

            {/* Footer Modal Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <Link
                href={`/roster/${selectedTrip.nik}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 transition"
              >
                <span>Lihat Profil & Roster Karyawan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
