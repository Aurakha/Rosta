'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { VStatusRoster, VSaldoCuti, SiklusRoster, Perjalanan } from '@/types/database';
import {
  formatTanggal,
  formatTanggalPendek,
  formatJam,
  formatWhatsAppUrl,
  WARNA_STATUS,
  LABEL_STATUS,
} from '@/lib/utils';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Briefcase,
  Building2,
  PlaneTakeoff,
  Home,
  CreditCard,
  History,
  CheckCircle2,
} from 'lucide-react';

export default function DetailKaryawanPage() {
  const params = useParams();
  const rawNik = params?.nik as string;
  const nik = decodeURIComponent(rawNik || '');

  const [roster, setRoster] = useState<VStatusRoster | null>(null);
  const [saldo, setSaldo] = useState<VSaldoCuti | null>(null);
  const [siklusList, setSiklusList] = useState<SiklusRoster[]>([]);
  const [perjalananList, setPerjalananList] = useState<Perjalanan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nik) return;

    const loadDetail = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        // 1. Ambil data status roster
        const { data: rData } = await supabase
          .from('v_status_roster')
          .select('*')
          .eq('nik', nik)
          .maybeSingle();

        if (rData) setRoster(rData as VStatusRoster);

        // 2. Ambil saldo cuti tahunan
        const { data: sData } = await supabase
          .from('v_saldo_cuti')
          .select('*')
          .eq('nik', nik)
          .maybeSingle();

        if (sData) setSaldo(sData as VSaldoCuti);

        // 3. Ambil riwayat siklus roster
        const { data: siklusData } = await supabase
          .from('siklus_roster')
          .select('*')
          .eq('nik', nik)
          .order('tanggal_masuk_site', { ascending: false });

        if (siklusData) setSiklusList(siklusData as SiklusRoster[]);

        // 4. Ambil riwayat perjalanan
        const { data: pData } = await supabase
          .from('perjalanan')
          .select('*')
          .eq('nik', nik)
          .order('tanggal_travel', { ascending: false });

        if (pData) setPerjalananList(pData as Perjalanan[]);
      } catch (err) {
        console.warn('Error load detail:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [nik]);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        Memuat data detail karyawan...
      </div>
    );
  }

  if (!roster) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Karyawan Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">
          Tidak ada data dengan NIK {nik} di sistem monitoring roster.
        </p>
        <Link
          href="/roster"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Roster</span>
        </Link>
      </div>
    );
  }

  const isSedangCuti = roster.status_roster === 'SEDANG_CUTI' || roster.status_roster === 'BELUM_KEMBALI';
  const waUrl = formatWhatsAppUrl(roster.no_hp);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Tombol Kembali & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/roster"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-900 text-white">
                {roster.perusahaan_kode}
              </span>
              <h1 className="text-xl md:text-2xl font-black text-slate-900">
                {roster.nama}
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              NIK: {roster.nik} · {roster.jabatan || ''} {roster.departemen ? `(${roster.departemen})` : ''}
            </p>
          </div>
        </div>

        {/* Tombol Aksi Transaksi Cepat */}
        <div className="flex items-center gap-2">
          {isSedangCuti ? (
            <Link
              href={`/perjalanan/kembali?nik=${encodeURIComponent(roster.nik)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
            >
              <Home className="w-4 h-4" />
              <span>Catat Kedatangan Site</span>
            </Link>
          ) : (
            <Link
              href={`/perjalanan/berangkat?nik=${encodeURIComponent(roster.nik)}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition"
            >
              <PlaneTakeoff className="w-4 h-4" />
              <span>Catat Keberangkatan Cuti</span>
            </Link>
          )}
        </div>
      </div>

      {/* TIGA KARTU UTAMA: STATUS ROSTER, SALDO CUTI, DATA KEPEGAWAIAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. KARTU STATUS ROSTER AKTIF */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Status Roster Aktif
            </h2>
            <span
              className={`px-2.5 py-1 rounded-md text-[10px] font-black border ${WARNA_STATUS[roster.status_roster]}`}
            >
              {LABEL_STATUS[roster.status_roster]}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Grade Aturan:</span>
              <strong className="text-slate-900">{roster.grade}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Masuk Site:</span>
              <strong className="text-slate-900 font-mono">
                {formatTanggal(roster.tanggal_masuk_site)}
              </strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Hari Kerja Berjalan:</span>
              <strong className="text-slate-900">{roster.hari_kerja_berjalan} hari</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Target Keluar Site:</span>
              <strong className="text-slate-900 font-mono">
                {formatTanggal(roster.target_keluar)}
              </strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Sisa Hari Kerja:</span>
              <strong
                className={`font-black ${
                  roster.sisa_hari_kerja <= 7 ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {roster.sisa_hari_kerja} hari
              </strong>
            </div>
            {roster.tanggal_aktual_keluar && (
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Target Kembali Site:</span>
                <strong className="text-sky-700 font-mono">
                  {formatTanggal(roster.target_kembali)}
                </strong>
              </div>
            )}
          </div>
        </div>

        {/* 2. KARTU SALDO CUTI TAHUNAN BERJALAN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Saldo Cuti Tahunan
            </h2>
            <CreditCard className="w-4 h-4 text-sky-600" />
          </div>

          <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 text-center">
            <div className="text-[11px] text-sky-800 font-medium">Sisa Hak Cuti Berjalan</div>
            <div className="text-3xl font-black text-sky-700 mt-1">
              {saldo?.sisa_cuti ?? 12} <span className="text-sm font-normal">hari</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Hak Tahunan Dasar:</span>
              <strong className="text-slate-800">{saldo?.hak_cuti_tahunan ?? 12} hari</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Cuti Terpakai:</span>
              <strong className="text-slate-800">{saldo?.cuti_terpakai ?? 0} hari</strong>
            </div>
            <div className="pt-1">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                Periode Berjalan (Ulang Tahun Masuk):
              </span>
              <span className="text-[11px] font-mono text-slate-700 font-medium">
                {formatTanggalPendek(saldo?.periode_mulai)} s/d {formatTanggalPendek(saldo?.periode_selesai)}
              </span>
            </div>
          </div>
        </div>

        {/* 3. KARTU PROFIL & POH */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Data Kepegawaian & Kontak
            </h2>
            <User className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Point of Hire (POH)</span>
              <span className="font-bold text-slate-900 text-sm">{roster.poh || 'Belum diisi'}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Nomor HP / WhatsApp</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-semibold text-slate-800">{roster.no_hp || 'Belum diisi'}</span>
                {roster.no_hp && (
                  <div className="flex items-center gap-1">
                    <a
                      href={`tel:${roster.no_hp}`}
                      className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Telepon"
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Atasan Langsung</span>
              <span className="font-medium text-slate-800">{roster.atasan || 'Belum diisi'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIWAYAT PERJALANAN & SIKLUS SEBELUMNYA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Riwayat Siklus Roster */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Riwayat Siklus Roster</h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {siklusList.length === 0 ? (
              <div className="py-6 text-center text-slate-400">Belum ada riwayat siklus.</div>
            ) : (
              siklusList.map((s) => (
                <div key={s.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800">
                      Masuk: {formatTanggalPendek(s.tanggal_masuk_site)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'BERJALAN'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Target Keluar: {formatTanggalPendek(s.target_keluar)} · Snapshot: {s.hari_kerja_snapshot} hari kerja
                  </div>
                  {s.tanggal_aktual_keluar && (
                    <div className="text-[11px] text-slate-600">
                      Aktual Keluar: {formatTanggalPendek(s.tanggal_aktual_keluar)} (Libur: {s.total_hari_libur} hari)
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Riwayat Log Perjalanan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PlaneTakeoff className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Riwayat Perjalanan (Trip)</h3>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {perjalananList.length === 0 ? (
              <div className="py-6 text-center text-slate-400">Belum ada data perjalanan.</div>
            ) : (
              perjalananList.map((p) => (
                <div key={p.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {p.arah === 'KELUAR' ? '✈ Berangkat Cuti' : '🏠 Masuk Site'}
                    </span>
                    <span className="font-mono text-slate-500">
                      {formatTanggalPendek(p.tanggal_travel)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Tujuan: <strong>{p.titik_tujuan || '-'}</strong> {p.jam_jemput ? `· Jam: ${formatJam(p.jam_jemput)}` : ''}
                  </div>
                  {p.kode_booking && (
                    <div className="text-[11px] text-slate-500 font-mono">
                      Booking: {p.kode_booking} ({p.maskapai_ka || ''})
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
