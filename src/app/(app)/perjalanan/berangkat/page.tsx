'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
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
} from 'lucide-react';

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
          .in('status_roster', ['NORMAL', 'SEGERA_CUTI', 'OVERDUE'])
          .order('nama');

        if (cData) {
          setCandidates(cData as VStatusRoster[]);
          if (!selectedNik && cData.length > 0) {
            setSelectedNik(cData[0].nik);
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

  // When selected employee changes, fetch their leave balance & policy
  const currentCandidate = useMemo(
    () => candidates.find((c) => c.nik === selectedNik),
    [candidates, selectedNik]
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Karyawan di Site *
              </label>
              <select
                required
                value={selectedNik}
                onChange={(e) => setSelectedNik(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 font-semibold"
              >
                {candidates.map((c) => (
                  <option key={c.nik} value={c.nik}>
                    [{c.perusahaan_kode}] {c.nama} — {c.grade} ({c.status_roster})
                  </option>
                ))}
              </select>
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
