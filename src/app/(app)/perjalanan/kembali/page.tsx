'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useCompany } from '@/context/CompanyContext';
import {
  VStatusRoster,
  PoolShelter,
  Perusahaan,
  ModaTransportasi,
} from '@/types/database';
import { formatTanggal, formatTanggalPendek } from '@/lib/utils';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Home,
  Clock,
  MapPin,
  AlertCircle,
  Car,
  CheckCircle2,
  Search,
  ChevronDown,
  X,
  User,
  AlertTriangle,
  Calendar,
} from 'lucide-react';

function hitungSelisihHari(targetDateStr?: string | null): number | null {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function CatatKedatanganContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedNik = searchParams.get('nik');

  const { selectedCompany } = useCompany();
  const [candidates, setCandidates] = useState<VStatusRoster[]>([]);
  const [shelters, setShelters] = useState<PoolShelter[]>([]);
  const [companies, setCompanies] = useState<Perusahaan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected Employee
  const [selectedNik, setSelectedNik] = useState(preSelectedNik || '');

  // Search & Filter Dropdown State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELUM_KEMBALI' | 'SEDANG_CUTI'>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [tanggalTiba, setTanggalTiba] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [titikJemput, setTitikJemput] = useState('Bandara Silampari');
  const [jamTiba, setJamTiba] = useState('16:00');
  const [poolShelterId, setPoolShelterId] = useState('');
  const [moda, setModa] = useState<ModaTransportasi>('TRAVEL_DARAT');
  const [catatan, setCatatan] = useState('');

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        // Karyawan yang sedang cuti atau belum kembali
        const { data: cData } = await supabase
          .from('v_status_roster')
          .select('*')
          .in('status_roster', ['SEDANG_CUTI', 'BELUM_KEMBALI']);

        if (cData) {
          // SORTING PINTAR PRIORITAS OPERASIONAL:
          // 1. BELUM_KEMBALI (Overdue/Overstay) paling atas
          // 2. Target kembali terdekat (ascending)
          // 3. Nama alfabetis
          const sorted = [...(cData as VStatusRoster[])].sort((a, b) => {
            if (a.status_roster === 'BELUM_KEMBALI' && b.status_roster !== 'BELUM_KEMBALI') return -1;
            if (a.status_roster !== 'BELUM_KEMBALI' && b.status_roster === 'BELUM_KEMBALI') return 1;

            const dateA = a.target_kembali ? new Date(a.target_kembali).getTime() : 0;
            const dateB = b.target_kembali ? new Date(b.target_kembali).getTime() : 0;
            if (dateA !== dateB) return dateA - dateB;

            return (a.nama || '').localeCompare(b.nama || '');
          });

          setCandidates(sorted);
          if (!selectedNik && sorted.length > 0) {
            setSelectedNik(sorted[0].nik);
          }
        }

        const { data: sData } = await supabase.from('pool_shelter').select('*').order('nama');
        if (sData && sData.length > 0) {
          setShelters(sData as PoolShelter[]);
          setPoolShelterId(sData[0].id);
        }

        const { data: compData } = await supabase.from('perusahaan').select('*').order('kode');
        if (compData && compData.length > 0) {
          setCompanies(compData as Perusahaan[]);
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, []);

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (selectedCompany !== 'SEMUA' && c.perusahaan_kode !== selectedCompany) {
        return false;
      }
      if (statusFilter !== 'ALL' && c.status_roster !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = (c.nama || '').toLowerCase().includes(q);
        const matchNik = (c.nik || '').toLowerCase().includes(q);
        const matchJabatan = (c.jabatan || '').toLowerCase().includes(q);
        const matchComp = (c.perusahaan_kode || '').toLowerCase().includes(q);
        const matchPoh = (c.poh || '').toLowerCase().includes(q);
        return matchNama || matchNik || matchJabatan || matchComp || matchPoh;
      }
      return true;
    });
  }, [candidates, selectedCompany, statusFilter, searchQuery]);

  const overdueCandidates = useMemo(
    () => filteredCandidates.filter((c) => c.status_roster === 'BELUM_KEMBALI'),
    [filteredCandidates]
  );

  const sedangCutiCandidates = useMemo(
    () => filteredCandidates.filter((c) => c.status_roster === 'SEDANG_CUTI'),
    [filteredCandidates]
  );

  const currentCandidate = useMemo(
    () => candidates.find((c) => c.nik === selectedNik),
    [candidates, selectedNik]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCandidate || !currentCandidate.siklus_id) {
      setErrorMsg('Karyawan belum memiliki siklus berjalan yang valid.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const supabase = createClient();

      // 1. Panggil RPC catat_kedatangan (menutup siklus lama, otomatis buka siklus baru!)
      const { data: newSiklusId, error: rpcError } = await supabase.rpc('catat_kedatangan', {
        p_siklus_id: currentCandidate.siklus_id,
        p_tanggal_tiba: tanggalTiba,
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Gagal memproses kedatangan.');
      }

      // 2. Simpan record log perjalanan MASUK
      const { error: tripError } = await supabase.from('perjalanan').insert({
        siklus_id: newSiklusId || currentCandidate.siklus_id,
        nik: currentCandidate.nik,
        arah: 'MASUK',
        tanggal_travel: tanggalTiba,
        pool_shelter_id: poolShelterId || null,
        jam_tiba: jamTiba || null,
        titik_tujuan: titikJemput || null,
        moda,
        penanggung_biaya: currentCandidate.perusahaan_id,
        catatan: catatan.trim() || null,
      });

      if (tripError) {
        console.warn('Perhatian simpan log perjalanan masuk:', tripError);
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Terjadi kesalahan saat menyimpan kedatangan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/perjalanan"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Home className="w-6 h-6 text-emerald-600" />
            <span>Catat Kedatangan (Jemput ke Site)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Penutupan siklus cuti dan inisiasi otomatis siklus kerja baru
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl text-xs md:text-sm bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {candidates.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900">
            Tidak Ada Karyawan Sedang Cuti
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Semua karyawan saat ini tercatat berada di site atau belum ada riwayat keberangkatan cuti aktif.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
          >
            Kembali ke Papan Hari Ini
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Karyawan yang Kembali ke Site
            </h2>

            {/* SEARCHABLE EMPLOYEE SELECTOR (COMBOBOX) */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Pilih Karyawan Sedang Cuti *
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {filteredCandidates.length} dari {candidates.length} karyawan
                </span>
              </div>

              {/* Trigger Button: Menampilkan Karyawan Terpilih */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                  isDropdownOpen
                    ? 'border-sky-500 bg-sky-50/20 ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/60'
                }`}
              >
                {currentCandidate ? (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        currentCandidate.perusahaan_kode === 'KTA'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : currentCandidate.perusahaan_kode === 'KAI'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}
                    >
                      {currentCandidate.perusahaan_kode}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {currentCandidate.nama}
                        </span>
                        {currentCandidate.status_roster === 'BELUM_KEMBALI' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {(() => {
                              const s = hitungSelisihHari(currentCandidate.target_kembali);
                              return s !== null && s < 0 ? `Lewat ${Math.abs(s)} hari` : 'Belum Kembali';
                            })()}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                            {(() => {
                              const s = hitungSelisihHari(currentCandidate.target_kembali);
                              if (s === 0) return 'Hari Ini!';
                              if (s !== null && s > 0) return `${s} hari lagi`;
                              return 'Sedang Cuti';
                            })()}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {currentCandidate.jabatan} · Target:{' '}
                        <strong className="text-slate-700 font-semibold">
                          {formatTanggalPendek(currentCandidate.target_kembali)}
                        </strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs sm:text-sm text-slate-400 font-normal">
                    -- Klik untuk Memilih Karyawan --
                  </span>
                )}

                <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                  <span className="text-xs font-semibold text-sky-600 hidden sm:inline">
                    {isDropdownOpen ? 'Tutup' : 'Cari / Ganti'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180 text-sky-600' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Floating Dropdown Panel */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2.5">
                  {/* Kotak Input Pencarian */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama, NIK, jabatan, atau perusahaan..."
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-sky-500 transition"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Status Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                        statusFilter === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Semua ({candidates.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('BELUM_KEMBALI')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                        statusFilter === 'BELUM_KEMBALI'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <span>Belum Kembali</span>
                      <span className="opacity-80">
                        ({candidates.filter((c) => c.status_roster === 'BELUM_KEMBALI').length})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('SEDANG_CUTI')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                        statusFilter === 'SEDANG_CUTI'
                          ? 'bg-sky-600 text-white'
                          : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                      }`}
                    >
                      <span>Sedang Cuti</span>
                      <span className="opacity-80">
                        ({candidates.filter((c) => c.status_roster === 'SEDANG_CUTI').length})
                      </span>
                    </button>
                  </div>

                  {/* List Hasil Pencarian & Pengelompokan */}
                  <div className="max-h-64 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100">
                    {filteredCandidates.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Tidak ada karyawan yang cocok dengan pencarian{' '}
                        {searchQuery ? `"${searchQuery}"` : ''}
                      </div>
                    ) : (
                      <>
                        {/* KELOMPOK 1: BELUM KEMBALI (OVERDUE) */}
                        {overdueCandidates.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center gap-1 px-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>
                                Perlu Tindakan · Belum Kembali ({overdueCandidates.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {overdueCandidates.map((c) => {
                                const isSelected = c.nik === selectedNik;
                                const selisih = hitungSelisihHari(c.target_kembali);
                                return (
                                  <div
                                    key={c.nik}
                                    onClick={() => {
                                      setSelectedNik(c.nik);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                                      isSelected
                                        ? 'bg-rose-50/90 border-rose-300 text-slate-900 font-medium shadow-xs'
                                        : 'bg-white hover:bg-rose-50/40 border-slate-100 hover:border-rose-200 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                                          c.perusahaan_kode === 'KTA'
                                            ? 'bg-amber-100 text-amber-800'
                                            : c.perusahaan_kode === 'KAI'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-sky-100 text-sky-800'
                                        }`}
                                      >
                                        {c.perusahaan_kode}
                                      </span>
                                      <div className="min-w-0">
                                        <div className="font-bold text-slate-900 truncate">
                                          {c.nama}
                                        </div>
                                        <div className="text-[11px] text-slate-500 truncate">
                                          {c.jabatan || c.nik} · POH {c.poh || '-'}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <div className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                        {selisih !== null && selisih < 0
                                          ? `Lewat ${Math.abs(selisih)} hari`
                                          : 'Lewat Jadwal'}
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        Target: {formatTanggalPendek(c.target_kembali)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* KELOMPOK 2: SEDANG CUTI (SESUAI JADWAL) */}
                        {sedangCutiCandidates.length > 0 && (
                          <div className="space-y-1.5 pt-2">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1 px-1">
                              <Calendar className="w-3 h-3 text-sky-600" />
                              <span>Sedang Cuti · Jadwal Terdekat ({sedangCutiCandidates.length})</span>
                            </div>
                            <div className="space-y-1">
                              {sedangCutiCandidates.map((c) => {
                                const isSelected = c.nik === selectedNik;
                                const selisih = hitungSelisihHari(c.target_kembali);
                                return (
                                  <div
                                    key={c.nik}
                                    onClick={() => {
                                      setSelectedNik(c.nik);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                                      isSelected
                                        ? 'bg-sky-50/90 border-sky-300 text-slate-900 font-medium shadow-xs'
                                        : 'bg-white hover:bg-sky-50/40 border-slate-100 hover:border-sky-200 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                                          c.perusahaan_kode === 'KTA'
                                            ? 'bg-amber-100 text-amber-800'
                                            : c.perusahaan_kode === 'KAI'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-sky-100 text-sky-800'
                                        }`}
                                      >
                                        {c.perusahaan_kode}
                                      </span>
                                      <div className="min-w-0">
                                        <div className="font-bold text-slate-900 truncate">
                                          {c.nama}
                                        </div>
                                        <div className="text-[11px] text-slate-500 truncate">
                                          {c.jabatan || c.nik} · POH {c.poh || '-'}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <div className="text-[10px] font-semibold text-slate-700">
                                        {formatTanggalPendek(c.target_kembali)}
                                      </div>
                                      <div className="text-[10px] text-sky-600 font-bold">
                                        {selisih === 0
                                          ? 'Hari Ini!'
                                          : selisih !== null && selisih > 0
                                          ? `${selisih} hari lagi`
                                          : ''}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {currentCandidate && (
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs space-y-1">
                <div className="font-bold text-slate-900">
                  {currentCandidate.nama} ({currentCandidate.perusahaan_kode})
                </div>
                <div className="text-slate-600">
                  {currentCandidate.jabatan} · POH {currentCandidate.poh || '-'}
                </div>
                <div className="text-emerald-800 font-medium pt-1">
                  Target Kembali: <strong>{formatTanggal(currentCandidate.target_kembali)}</strong>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. Data Penjemputan Kedatangan
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Tiba di Site *
                </label>
                <input
                  type="date"
                  required
                  value={tanggalTiba}
                  onChange={(e) => setTanggalTiba(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Titik Jemput (Bandara / Stasiun) *
                </label>
                <input
                  type="text"
                  required
                  value={titikJemput}
                  onChange={(e) => setTitikJemput(e.target.value)}
                  placeholder="Bandara Silampari"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jam Kedatangan Tiba
                </label>
                <input
                  type="time"
                  value={jamTiba}
                  onChange={(e) => setJamTiba(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pool Shelter Tujuan
                </label>
                <select
                  value={poolShelterId}
                  onChange={(e) => setPoolShelterId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
                >
                  {shelters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Misal: Barang bagasi ekstra, kondisi kesehatan, dll."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Link
              href="/perjalanan"
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs md:text-sm font-semibold transition"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Menyimpan & Membuka Siklus Baru...' : 'Simpan Kedatangan & Reset Siklus'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function CatatKedatanganPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-slate-400">
          Memuat formulir kedatangan...
        </div>
      }
    >
      <RequireAuth actionTitle="Mencatat Kedatangan Masuk Site">
        <CatatKedatanganContent />
      </RequireAuth>
    </Suspense>
  );
}
