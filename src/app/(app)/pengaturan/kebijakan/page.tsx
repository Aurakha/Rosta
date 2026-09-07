'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Perusahaan, PengaturanKebijakan } from '@/types/database';
import { ArrowLeft, Sliders, CheckCircle2, AlertCircle, Save, Info } from 'lucide-react';

interface KebijakanWithPerusahaan {
  perusahaan_id: string;
  kode: string;
  nama_lengkap: string;
  hari_perjalanan: number;
  maks_tambahan_cuti_tahunan: number;
  kompensasi_remote_default: number;
}

export default function PengaturanKebijakanPage() {
  const [kebijakanList, setKebijakanList] = useState<KebijakanWithPerusahaan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadKebijakan = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: pData } = await supabase
        .from('perusahaan')
        .select('*')
        .order('kode');

      const { data: kData } = await supabase
        .from('pengaturan_kebijakan')
        .select('*');

      if (pData) {
        const combined: KebijakanWithPerusahaan[] = pData.map((p: Perusahaan) => {
          const k = kData?.find((item: PengaturanKebijakan) => item.perusahaan_id === p.id);
          return {
            perusahaan_id: p.id,
            kode: p.kode,
            nama_lengkap: p.nama_lengkap,
            hari_perjalanan: k?.hari_perjalanan ?? 0,
            maks_tambahan_cuti_tahunan: k?.maks_tambahan_cuti_tahunan ?? 2,
            kompensasi_remote_default: k?.kompensasi_remote_default ?? 1,
          };
        });
        setKebijakanList(combined);
      }
    } catch (err) {
      console.warn('Error load kebijakan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKebijakan();
  }, []);

  const handleChange = (
    perusahaanId: string,
    field: 'hari_perjalanan' | 'maks_tambahan_cuti_tahunan' | 'kompensasi_remote_default',
    val: number
  ) => {
    setKebijakanList((prev) =>
      prev.map((item) =>
        item.perusahaan_id === perusahaanId ? { ...item, [field]: val } : item
      )
    );
  };

  const handleSimpan = async (item: KebijakanWithPerusahaan) => {
    setSavingId(item.perusahaan_id);
    setMessage(null);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('pengaturan_kebijakan')
        .upsert({
          perusahaan_id: item.perusahaan_id,
          hari_perjalanan: item.hari_perjalanan,
          maks_tambahan_cuti_tahunan: item.maks_tambahan_cuti_tahunan,
          kompensasi_remote_default: item.kompensasi_remote_default,
          updated_at: new Date().toISOString(),
        });

      if (error) throw new Error(error.message || 'Gagal menyimpan perubahan.');

      setMessage({
        type: 'success',
        text: `Kebijakan cuti untuk ${item.kode} (${item.nama_lengkap}) berhasil diperbarui.`,
      });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: (err as Error)?.message || 'Terjadi kesalahan.',
      });
    } finally {
      setSavingId(null);
    }
  };

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
            Kebijakan Cuti Variabel
          </h1>
          <p className="text-xs text-slate-500">
            Konfigurasi komponen durasi cuti per entitas perusahaan
          </p>
        </div>
      </div>

      {/* Info Banner Penting */}
      <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Ketentuan Durasi Cuti Variabel:</p>
          <p className="leading-relaxed">
            Total Hari Cuti = Cuti Lapangan Dasar (Grade) + Tambahan Cuti Tahunan (Maksimal di bawah) + Kompensasi Remote + Hari Perjalanan.
            Perubahan kebijakan hanya berlaku untuk keberangkatan baru; siklus yang sedang berjalan tidak akan tergeser jadwalnya.
          </p>
        </div>
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

      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Memuat data kebijakan perusahaan...
          </div>
        ) : (
          kebijakanList.map((item) => (
            <div
              key={item.perusahaan_id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="px-2.5 py-0.5 rounded text-xs font-black bg-slate-900 text-white">
                    {item.kode}
                  </span>
                  <h2 className="text-base font-bold text-slate-900 mt-1">
                    {item.nama_lengkap}
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hari Perjalanan */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hari Perjalanan
                  </label>
                  <select
                    value={item.hari_perjalanan}
                    onChange={(e) =>
                      handleChange(item.perusahaan_id, 'hari_perjalanan', Number(e.target.value))
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs md:text-sm text-slate-900 focus:outline-hidden focus:border-sky-500"
                  >
                    <option value={0}>0 Hari (Langsung)</option>
                    <option value={1}>1 Hari Perjalanan</option>
                    <option value={2}>2 Hari Perjalanan</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Ditambahkan ke tanggal libur untuk rute tempuh jauh
                  </p>
                </div>

                {/* Maks Tambahan Cuti Tahunan */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Maks. Tambahan Cuti Tahunan
                  </label>
                  <select
                    value={item.maks_tambahan_cuti_tahunan}
                    onChange={(e) =>
                      handleChange(
                        item.perusahaan_id,
                        'maks_tambahan_cuti_tahunan',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs md:text-sm text-slate-900 focus:outline-hidden focus:border-sky-500"
                  >
                    <option value={0}>0 Hari (Tidak boleh tambah)</option>
                    <option value={1}>Maksimal 1 Hari</option>
                    <option value={2}>Maksimal 2 Hari (Default)</option>
                    <option value={3}>Maksimal 3 Hari</option>
                    <option value={4}>Maksimal 4 Hari</option>
                    <option value={5}>Maksimal 5 Hari</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Batas atas yang dapat dipilih karyawan saat berangkat
                  </p>
                </div>

                {/* Kompensasi Remote Default */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kompensasi Remote Area
                  </label>
                  <select
                    value={item.kompensasi_remote_default}
                    onChange={(e) =>
                      handleChange(
                        item.perusahaan_id,
                        'kompensasi_remote_default',
                        Number(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs md:text-sm text-slate-900 focus:outline-hidden focus:border-sky-500"
                  >
                    <option value={0}>0 Hari</option>
                    <option value={1}>1 Hari (Default Site Muratara)</option>
                    <option value={2}>2 Hari</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Kompensasi lokasi terpencil sesuai aturan perusahaan
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleSimpan(item)}
                  disabled={savingId === item.perusahaan_id}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-semibold shadow-xs transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {savingId === item.perusahaan_id ? 'Menyimpan...' : `Simpan Kebijakan ${item.kode}`}
                  </span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
