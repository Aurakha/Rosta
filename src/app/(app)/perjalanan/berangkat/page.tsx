'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useCompany } from '@/context/CompanyContext';
import {
  VStatusRoster,
  VSaldoCuti,
  PoolShelter,
  Perusahaan,
  PengaturanKebijakan,
  ModaTransportasi,
} from '@/types/database';
import { formatTanggal, formatTanggalPendek } from '@/lib/utils';
import { addDays, parseISO, isValid, format } from 'date-fns';
import {
  ArrowLeft,
  PlaneTakeoff,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Info,
  Search,
  ChevronDown,
  X,
  AlertTriangle,
} from 'lucide-react';

function getDeparturePriority(status: string): number {
  if (status === 'OVERDUE') return 1;
  if (status === 'SEGERA_CUTI') return 2;
  if (status === 'NORMAL') return 3;
  return 4;
}

function CatatKeberangkatanContent() {
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

  // Selected Employee State
  const [selectedNik, setSelectedNik] = useState(preSelectedNik || '');
  const [saldoCuti, setSaldoCuti] = useState<VSaldoCuti | null>(null);
  const [kebijakan, setKebijakan] = useState<PengaturanKebijakan | null>(null);

  // Search & Filter Dropdown State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'SEGERA_CUTI' | 'NORMAL'>('ALL');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [tanggalKeluar, setTanggalKeluar] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [poolShelterId, setPoolShelterId] = useState('');
  const [jamJemput, setJamJemput] = useState('10:00');
  const [titikTujuan, setTitikTujuan] = useState('Bandara Silampari');
  const [moda, setModa] = useState<ModaTransportasi>('PESAWAT');
  const [jamBerangkat, setJamBerangkat] = useState('13:30');
  const [penanggungBiaya, setPenanggungBiaya] = useState('');
  const [kodeBooking, setKodeBooking] = useState('');
  const [hargaTiket, setHargaTiket] = useState<number | ''>('');
  const [maskapaiKa, setMaskapaiKa] = useState('');

  // Variable Leave Components
  const [tambahanCutiTahunan, setTambahanCutiTahunan] = useState(0);
  const [kompensasiRemote, setKompensasiRemote] = useState(1);

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

  // Load initial candidates
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        // Karyawan yang ada di site (NORMAL, SEGERA_CUTI, OVERDUE)
        const { data: cData } = await supabase
          .from('v_status_roster')
          .select('*')
          .in('status_roster', ['NORMAL', 'SEGERA_CUTI', 'OVERDUE']);

        if (cData) {
          // SORTING PINTAR PRIORITAS OPERASIONAL KEBERANGKATAN:
          // 1. OVERDUE (Paling mendesak harus pulang)
          // 2. SEGERA_CUTI (Sisa hari kerja <= 7 hari)
          // 3. NORMAL (Masih aktif bekerja)
          // Di dalam status yang sama: sisa_hari_kerja ascending (yang paling sedikit/minus di atas), lalu nama alfabetis
          const sorted = [...(cData as VStatusRoster[])].sort((a, b) => {
            const pA = getDeparturePriority(a.status_roster);
            const pB = getDeparturePriority(b.status_roster);
            if (pA !== pB) return pA - pB;

            const sisaA = typeof a.sisa_hari_kerja === 'number' ? a.sisa_hari_kerja : 999;
            const sisaB = typeof b.sisa_hari_kerja === 'number' ? b.sisa_hari_kerja : 999;
            if (sisaA !== sisaB) return sisaA - sisaB;

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

  const currentCandidate = useMemo(
    () => candidates.find((c) => c.nik === selectedNik),
    [candidates, selectedNik]
  );

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
        const matchDept = (c.departemen || '').toLowerCase().includes(q);
        const matchComp = (c.perusahaan_kode || '').toLowerCase().includes(q);
        const matchPoh = (c.poh || '').toLowerCase().includes(q);
        return matchNama || matchNik || matchJabatan || matchDept || matchComp || matchPoh;
      }
      return true;
    });
  }, [candidates, selectedCompany, statusFilter, searchQuery]);

  const overdueCandidates = useMemo(
    () => filteredCandidates.filter((c) => c.status_roster === 'OVERDUE'),
    [filteredCandidates]
  );

  const segeraCutiCandidates = useMemo(
    () => filteredCandidates.filter((c) => c.status_roster === 'SEGERA_CUTI'),
    [filteredCandidates]
  );

  const normalCandidates = useMemo(
    () => filteredCandidates.filter((c) => c.status_roster === 'NORMAL'),
    [filteredCandidates]
  );

  useEffect(() => {
    if (!currentCandidate) return;

    const fetchExtra = async () => {
      try {
        const supabase = createClient();

        // 1. Ambil saldo cuti
        const { data: sData } = await supabase
          .from('v_saldo_cuti')
          .select('*')
          .eq('nik', currentCandidate.nik)
          .maybeSingle();

        if (sData) setSaldoCuti(sData as VSaldoCuti);

        // 2. Ambil kebijakan perusahaan
        const { data: kData } = await supabase
          .from('pengaturan_kebijakan')
          .select('*')
          .eq('perusahaan_id', currentCandidate.perusahaan_id)
          .maybeSingle();

        if (kData) {
          setKebijakan(kData as PengaturanKebijakan);
          setKompensasiRemote(kData.kompensasi_remote_default);
        }

        // Set default penanggung biaya sama dengan perusahaan karyawan
        setPenanggungBiaya(currentCandidate.perusahaan_id);

        // Set titik tujuan default berdasarkan POH
        if (currentCandidate.poh) {
          if (currentCandidate.poh.toLowerCase().includes('palembang')) {
            setTitikTujuan('Stasiun Lubuklinggau');
            setModa('KERETA');
          } else {
            setTitikTujuan('Bandara Silampari');
            setModa('PESAWAT');
          }
        }
      } catch (err) {
        console.warn(err);
      }
    };

    fetchExtra();
  }, [currentCandidate]);

  // Kalkulasi Live Durasi Cuti
  const cutiDasar = currentCandidate?.hari_libur_snapshot || 14;
  const hariPerjalanan = kebijakan?.hari_perjalanan || 0;
  const totalHariLibur = cutiDasar + tambahanCutiTahunan + kompensasiRemote + hariPerjalanan;

  const targetKembaliEstimasi = useMemo(() => {
    try {
      const keluarDate = parseISO(tanggalKeluar);
      if (!isValid(keluarDate)) return null;
      return addDays(keluarDate, totalHariLibur);
    } catch {
      return null;
    }
  }, [tanggalKeluar, totalHariLibur]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCandidate || !currentCandidate.siklus_id) {
      setErrorMsg('Karyawan belum memiliki siklus aktif.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const supabase = createClient();

      // 1. Eksekusi RPC catat_keberangkatan
      const { error: rpcError } = await supabase.rpc('catat_keberangkatan', {
        p_siklus_id: currentCandidate.siklus_id,
        p_tanggal_keluar: tanggalKeluar,
        p_tambahan_cuti_tahunan: tambahanCutiTahunan,
        p_kompensasi_remote: kompensasiRemote,
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Gagal memproses keberangkatan cuti.');
      }

      // 2. Simpan record log ke tabel perjalanan
      const { error: tripError } = await supabase.from('perjalanan').insert({
        siklus_id: currentCandidate.siklus_id,
        nik: currentCandidate.nik,
        arah: 'KELUAR',
        tanggal_travel: tanggalKeluar,
        pool_shelter_id: poolShelterId || null,
        jam_jemput: jamJemput || null,
        titik_tujuan: titikTujuan || null,
        moda,
        jam_berangkat: jamBerangkat || null,
        kode_booking: kodeBooking.trim() || null,
        maskapai_ka: maskapaiKa.trim() || null,
        harga_tiket: hargaTiket ? Number(hargaTiket) : null,
        penanggung_biaya: penanggungBiaya || currentCandidate.perusahaan_id,
      });

      if (tripError) {
        console.warn('Perhatian simpan perjalanan:', tripError);
      }

      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/perjalanan"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <PlaneTakeoff className="w-6 h-6 text-sky-600" />
            <span>Catat Keberangkatan Cuti (Antar)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Formulir pencatatan karyawan keluar site menuju bandara/stasiun
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl text-xs md:text-sm bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BLOK 1: PILIH KARYAWAN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            1. Data Karyawan yang Berangkat
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SEARCHABLE EMPLOYEE SELECTOR (COMBOBOX) */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Pilih Karyawan di Site *
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {filteredCandidates.length} dari {candidates.length} karyawan
                </span>
              </div>

              {/* Trigger Button */}
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
                        {currentCandidate.status_roster === 'OVERDUE' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Overdue
                          </span>
                        ) : currentCandidate.status_roster === 'SEGERA_CUTI' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Segera Cuti
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            Normal
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {currentCandidate.jabatan || currentCandidate.grade} · Sisa:{' '}
                        <strong className="text-slate-700 font-semibold">
                          {currentCandidate.sisa_hari_kerja} hari kerja
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
                <div className="absolute left-0 right-0 md:w-[150%] top-full mt-2 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2.5">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama, NIK, jabatan, atau departemen..."
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
                      onClick={() => setStatusFilter('OVERDUE')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                        statusFilter === 'OVERDUE'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <span>Overdue</span>
                      <span className="opacity-80">
                        ({candidates.filter((c) => c.status_roster === 'OVERDUE').length})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('SEGERA_CUTI')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                        statusFilter === 'SEGERA_CUTI'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      <span>Segera Cuti</span>
                      <span className="opacity-80">
                        ({candidates.filter((c) => c.status_roster === 'SEGERA_CUTI').length})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('NORMAL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition shrink-0 cursor-pointer ${
                        statusFilter === 'NORMAL'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>Normal</span>
                      <span className="opacity-80">
                        ({candidates.filter((c) => c.status_roster === 'NORMAL').length})
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
                        {/* KELOMPOK 1: OVERDUE */}
                        {overdueCandidates.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] font-black uppercase tracking-wider text-rose-600 flex items-center gap-1 px-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>
                                Perlu Tindakan · Overdue ({overdueCandidates.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {overdueCandidates.map((c) => {
                                const isSelected = c.nik === selectedNik;
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
                                          {c.jabatan || c.grade} · {c.departemen || ''}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <div className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                                        Overdue {Math.abs(c.sisa_hari_kerja || 0)} hari
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        Target: {formatTanggalPendek(c.target_keluar)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* KELOMPOK 2: SEGERA CUTI */}
                        {segeraCutiCandidates.length > 0 && (
                          <div className="space-y-1.5 pt-2">
                            <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1 px-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Siap Berangkat · Segera Cuti ({segeraCutiCandidates.length})</span>
                            </div>
                            <div className="space-y-1">
                              {segeraCutiCandidates.map((c) => {
                                const isSelected = c.nik === selectedNik;
                                return (
                                  <div
                                    key={c.nik}
                                    onClick={() => {
                                      setSelectedNik(c.nik);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                                      isSelected
                                        ? 'bg-amber-50/90 border-amber-300 text-slate-900 font-medium shadow-xs'
                                        : 'bg-white hover:bg-amber-50/40 border-slate-100 hover:border-amber-200 text-slate-700'
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
                                          {c.jabatan || c.grade} · {c.departemen || ''}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <div className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                        Sisa {c.sisa_hari_kerja} hari
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        Target: {formatTanggalPendek(c.target_keluar)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* KELOMPOK 3: NORMAL */}
                        {normalCandidates.length > 0 && (
                          <div className="space-y-1.5 pt-2">
                            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1 px-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Jadwal Normal ({normalCandidates.length})</span>
                            </div>
                            <div className="space-y-1">
                              {normalCandidates.map((c) => {
                                const isSelected = c.nik === selectedNik;
                                return (
                                  <div
                                    key={c.nik}
                                    onClick={() => {
                                      setSelectedNik(c.nik);
                                      setIsDropdownOpen(false);
                                    }}
                                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                                      isSelected
                                        ? 'bg-slate-100 border-slate-300 text-slate-900 font-medium shadow-xs'
                                        : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-700'
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
                                          {c.jabatan || c.grade} · {c.departemen || ''}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <div className="text-[10px] font-semibold text-slate-600">
                                        Sisa {c.sisa_hari_kerja} hari
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">
                                        Target: {formatTanggalPendek(c.target_keluar)}
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
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900">
                  {currentCandidate.nama} ({currentCandidate.perusahaan_kode})
                </div>
                <div className="text-slate-600">
                  {currentCandidate.jabatan} · {currentCandidate.departemen || ''}
                </div>
                <div className="text-slate-500 flex items-center gap-3 pt-1">
                  <span>POH: <strong>{currentCandidate.poh || '-'}</strong></span>
                  <span>HP: <strong>{currentCandidate.no_hp || '-'}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BLOK 2: KALKULASI DURASI CUTI VARIABEL (BAGIAN KRUSIAL) */}
        <div className="bg-gradient-to-br from-sky-50 via-white to-amber-50 rounded-2xl border border-sky-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-sky-100 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-sky-700" />
              <h2 className="text-sm font-bold text-slate-900">
                2. Kalkulasi Durasi Cuti Variabel
              </h2>
            </div>
            <span className="text-[11px] text-sky-800 font-medium">
              Sisa Hak Cuti: <strong>{saldoCuti?.sisa_cuti ?? 12} hari</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {/* Cuti Lapangan Dasar */}
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Cuti Lapangan Dasar</span>
              <div className="text-lg font-black text-slate-900 mt-1">{cutiDasar} Hari</div>
              <span className="text-[10px] text-slate-400">Aturan {currentCandidate?.grade}</span>
            </div>

            {/* Tambah Cuti Tahunan */}
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <label className="text-slate-700 block text-[10px] uppercase font-bold mb-1">
                Tambah Cuti Tahunan
              </label>
              <select
                value={tambahanCutiTahunan}
                onChange={(e) => setTambahanCutiTahunan(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              >
                {Array.from({ length: (kebijakan?.maks_tambahan_cuti_tahunan ?? 2) + 1 }, (_, i) => i).map((num) => (
                  <option key={num} value={num}>
                    {num} Hari {num === 0 ? '(Tanpa Cuti)' : ''}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Maks: {kebijakan?.maks_tambahan_cuti_tahunan ?? 2} hari
              </span>
            </div>

            {/* Kompensasi Remote Area */}
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <label className="text-slate-700 block text-[10px] uppercase font-bold mb-1">
                Kompensasi Remote Area
              </label>
              <select
                value={kompensasiRemote}
                onChange={(e) => setKompensasiRemote(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
              >
                <option value={0}>0 Hari</option>
                <option value={1}>1 Hari (Default)</option>
                <option value={2}>2 Hari</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Sesuai kebijakan site
              </span>
            </div>

            {/* Hari Perjalanan */}
            <div className="p-3 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Hari Perjalanan</span>
              <div className="text-lg font-black text-slate-900 mt-1">{hariPerjalanan} Hari</div>
              <span className="text-[10px] text-slate-400">Dari pengaturan kebijakan</span>
            </div>
          </div>

          {/* Rangkuman Target Tanggal Kembali */}
          <div className="p-4 bg-sky-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <div>
              <span className="text-xs text-sky-200 uppercase font-bold tracking-wider">
                Hasil Hitung Target Kembali Site (Otomatis):
              </span>
              <div className="text-lg font-black text-white mt-0.5">
                {targetKembaliEstimasi ? formatTanggal(targetKembaliEstimasi) : '-'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-sky-200">Total Durasi Libur:</span>
              <div className="text-xl font-black text-amber-300">{totalHariLibur} Hari</div>
            </div>
          </div>
        </div>

        {/* BLOK 3: DETAIL LOGISTIK TRAVEL & TIKET */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            3. Jadwal Travel Darat & Tiket Transportasi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal Keluar Site *
              </label>
              <input
                type="date"
                required
                value={tanggalKeluar}
                onChange={(e) => setTanggalKeluar(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pool Shelter Jemput *
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jam Jemput Pool Shelter
              </label>
              <input
                type="time"
                value={jamJemput}
                onChange={(e) => setJamJemput(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Titik Tujuan *
              </label>
              <input
                type="text"
                required
                value={titikTujuan}
                onChange={(e) => setTitikTujuan(e.target.value)}
                placeholder="Bandara Silampari / Stasiun Lubuklinggau"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Moda Transportasi</label>
              <select
                value={moda}
                onChange={(e) => setModa(e.target.value as ModaTransportasi)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
              >
                <option value="PESAWAT">Pesawat Udara</option>
                <option value="KERETA">Kereta Api</option>
                <option value="TRAVEL_DARAT">Travel Darat</option>
                <option value="KENDARAAN_PERUSAHAAN">Kendaraan Perusahaan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jam Berangkat (Terbang/KA)
              </label>
              <input
                type="time"
                value={jamBerangkat}
                onChange={(e) => setJamBerangkat(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Maskapai / Kereta
              </label>
              <input
                type="text"
                value={maskapaiKa}
                onChange={(e) => setMaskapaiKa(e.target.value)}
                placeholder="Contoh: Wings Air, Batik, Sindang Marga"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kode Booking Tiket</label>
              <input
                type="text"
                value={kodeBooking}
                onChange={(e) => setKodeBooking(e.target.value)}
                placeholder="6 Karakter Booking Code"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Harga Tiket (Rp)</label>
              <input
                type="number"
                value={hargaTiket}
                onChange={(e) => setHargaTiket(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Rp..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Penanggung Biaya</label>
              <select
                value={penanggungBiaya}
                onChange={(e) => setPenanggungBiaya(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 font-semibold"
              >
                {companies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kode} — {p.nama_lengkap}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TOMBOL SIMPAN */}
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
            className="px-7 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs md:text-sm font-bold shadow-md transition disabled:opacity-50"
          >
            {submitting ? 'Menyimpan & Memperbarui Status...' : 'Simpan Keberangkatan Cuti'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CatatKeberangkatanPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-slate-400">
          Memuat formulir keberangkatan cuti...
        </div>
      }
    >
      <RequireAuth actionTitle="Mencatat Keberangkatan Cuti Baru">
        <CatatKeberangkatanContent />
      </RequireAuth>
    </Suspense>
  );
}
