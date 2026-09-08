'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
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
} from 'lucide-react';

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

  // Form Fields
  const [tanggalTiba, setTanggalTiba] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [titikJemput, setTitikJemput] = useState('Bandara Silampari');
  const [jamTiba, setJamTiba] = useState('16:00');
  const [poolShelterId, setPoolShelterId] = useState('');
  const [moda, setModa] = useState<ModaTransportasi>('TRAVEL_DARAT');
  const [catatan, setCatatan] = useState('');

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        // Karyawan yang sedang cuti atau belum kembali
        const { data: cData } = await supabase
          .from('v_status_roster')
          .select('*')
          .in('status_roster', ['SEDANG_CUTI', 'BELUM_KEMBALI'])
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Karyawan Sedang Cuti *
              </label>
              <select
                required
                value={selectedNik}
                onChange={(e) => setSelectedNik(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden font-semibold"
              >
                {candidates.map((c) => (
                  <option key={c.nik} value={c.nik}>
                    [{c.perusahaan_kode}] {c.nama} — Target Kembali: {formatTanggalPendek(c.target_kembali)} ({c.status_roster})
                  </option>
                ))}
              </select>
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
