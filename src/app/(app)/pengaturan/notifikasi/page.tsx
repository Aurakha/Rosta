'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { NotifikasiLog, VStatusRoster, VHariIni } from '@/types/database';
import { formatTanggal, formatTanggalPendek, formatJam, formatWhatsAppUrl } from '@/lib/utils';
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export default function AntreanNotifikasiPage() {
  const [logs, setLogs] = useState<NotifikasiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notifikasi_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setLogs(data as NotifikasiLog[]);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Generator Evaluasi Notifikasi Hari Ini N1..N9 (Bisa dipicu manual oleh PIC)
  const handleGenerateTodayNotifications = async () => {
    setGenerating(true);
    setMessage(null);

    try {
      const supabase = createClient();

      // 1. Ambil roster status
      const { data: rosterData } = await supabase.from('v_status_roster').select('*');
      const rosters = (rosterData as VStatusRoster[]) || [];

      // 2. Ambil perjalanan hari ini
      const { data: tripData } = await supabase.from('v_hari_ini').select('*');
      const trips = (tripData as VHariIni[]) || [];

      const newNotifs: Partial<NotifikasiLog>[] = [];

      // N5: Hari-H Pagi pukul 06:00
      if (trips.length > 0) {
        const berangkat = trips.filter((t) => t.arah === 'KELUAR').length;
        const datang = trips.filter((t) => t.arah === 'MASUK').length;
        newNotifs.push({
          kode_jenis: 'N5',
          penerima: 'Admin PIC Travel',
          kanal: 'WHATSAPP',
          isi_pesan: `[ROSTA Hari Ini] Ringkasan jadwal operasional travel site:\n- Berangkat ke bandara/stasiun: ${berangkat} orang\n- Jemput kembali ke site: ${datang} orang.\nSilakan pantau kesiapan driver armada di papan aplikasi.`,
          status: 'MENUNGGU',
        });
      }

      // N7: Setiap hari saat status OVERDUE
      const overdueList = rosters.filter((r) => r.status_roster === 'OVERDUE');
      overdueList.forEach((o) => {
        newNotifs.push({
          kode_jenis: 'N7',
          penerima: `Atasan ${o.nama}`,
          kanal: 'WHATSAPP',
          isi_pesan: `[Pemberitahuan ROSTA] Karyawan ${o.nama} (${o.perusahaan_kode} - ${o.jabatan}) saat ini berstatus OVERDUE di site (+${o.hari_terlambat_keluar} hari). Mohon segera koordinasikan rotasi cuti dengan HRGA.`,
          status: 'MENUNGGU',
        });
      });

      // N8: Setiap hari saat status BELUM_KEMBALI
      const belumKembaliList = rosters.filter((r) => r.status_roster === 'BELUM_KEMBALI');
      belumKembaliList.forEach((b) => {
        newNotifs.push({
          kode_jenis: 'N8',
          penerima: `Spt HRGA & PIC Travel`,
          kanal: 'WHATSAPP',
          isi_pesan: `[Peringatan ROSTA] Karyawan ${b.nama} (${b.perusahaan_kode}) BELUM KEMBALI ke site (+${b.hari_terlambat_kembali} hari dari target kembali ${formatTanggalPendek(b.target_kembali)}). Mohon konfirmasi kepulangan.`,
          status: 'MENUNGGU',
        });
      });

      if (newNotifs.length > 0) {
        await supabase.from('notifikasi_log').insert(newNotifs);
        setMessage({
          type: 'success',
          text: `Berhasil mengevaluasi dan menambahkan ${newNotifs.length} antrean notifikasi baru hari ini.`,
        });
        loadLogs();
      } else {
        setMessage({
          type: 'success',
          text: 'Tidak ada pemicu notifikasi baru yang perlu diterbitkan saat ini.',
        });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error)?.message || 'Gagal mengevaluasi notifikasi.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkDone = async (id: string) => {
    try {
      const supabase = createClient();
      await supabase
        .from('notifikasi_log')
        .update({ status: 'TERKIRIM', waktu_kirim: new Date().toISOString() })
        .eq('id', id);
      loadLogs();
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/pengaturan"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
              <Bell className="w-6 h-6 text-sky-600" />
              <span>Antrean Notifikasi (N1–N9)</span>
            </h1>
            <p className="text-xs text-slate-500">
              Antrean pengiriman pesan WhatsApp & log peringatan roster terjadwal
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerateTodayNotifications}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{generating ? 'Mengevaluasi...' : 'Evaluasi Notifikasi Hari Ini'}</span>
        </button>
      </div>

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

      {/* DAFTAR ANTREAN NOTIFIKASI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              {loading ? 'Memuat log notifikasi...' : 'Belum ada antrean notifikasi tersimpan.'}
            </div>
          ) : (
            logs.map((item) => {
              const waUrl = formatWhatsAppUrl('082177450720', item.isi_pesan);
              const isMenunggu = item.status === 'MENUNGGU';

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-sky-100 text-sky-800 font-mono">
                        {item.kode_jenis}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Kepada: {item.penerima}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isMenunggu
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-200/80 font-mono">
                      {item.isi_pesan}
                    </p>

                    <div className="text-[11px] text-slate-400">
                      Waktu dibuat: {formatTanggalPendek(item.created_at)}
                    </div>
                  </div>

                  {isMenunggu && (
                    <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Kirim via WA</span>
                        </a>
                      )}
                      <button
                        onClick={() => handleMarkDone(item.id)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                      >
                        Tandai Selesai
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
