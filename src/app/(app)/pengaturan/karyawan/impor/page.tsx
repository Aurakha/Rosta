'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Perusahaan } from '@/types/database';
import {
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';

interface ParsedRow {
  nik: string;
  nama: string;
  perusahaan_kode: string;
  jabatan?: string;
  departemen?: string;
  grade: string;
  tanggal_mulai_kerja: string;
  tanggal_masuk_site: string;
  poh?: string;
  no_hp?: string;
  atasan?: string;
  hak_cuti_tahunan?: number;
  isValid: boolean;
  errors: string[];
}

export default function ImporKaryawanPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Perusahaan[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      const supabase = createClient();
      const { data } = await supabase.from('perusahaan').select('*');
      if (data) setCompanies(data as Perusahaan[]);
    };
    fetchCompanies();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setLoading(false);
        return;
      }

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        setMessage({ type: 'error', text: 'File CSV kosong atau tidak memiliki baris data.' });
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowData[h] = values[idx] || '';
        });

        const errors: string[] = [];
        const nik = rowData['nik'] || '';
        const nama = rowData['nama'] || '';
        const kode = (rowData['perusahaan'] || rowData['perusahaan_kode'] || '').toUpperCase();
        const grade = rowData['grade'] || 'Grade 4';
        const tglMulai = rowData['tanggal_mulai_kerja'] || rowData['doa'] || '';
        const tglMasukSite = rowData['tanggal_masuk_site'] || rowData['terakhir_masuk_site'] || '';

        if (!nik) errors.push('NIK wajib');
        if (!nama) errors.push('Nama wajib');
        if (!kode) errors.push('Kode perusahaan wajib');
        if (!tglMulai) errors.push('Tgl Mulai Kerja wajib');
        if (!tglMasukSite) errors.push('Tgl Masuk Site wajib');

        rows.push({
          nik,
          nama,
          perusahaan_kode: kode,
          jabatan: rowData['jabatan'] || '',
          departemen: rowData['departemen'] || '',
          grade,
          tanggal_mulai_kerja: tglMulai,
          tanggal_masuk_site: tglMasukSite,
          poh: rowData['poh'] || '',
          no_hp: rowData['no_hp'] || '',
          atasan: rowData['atasan'] || '',
          hak_cuti_tahunan: Number(rowData['hak_cuti_tahunan'] || 12),
          isValid: errors.length === 0,
          errors,
        });
      }

      setParsedRows(rows);
      setLoading(false);
    };

    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setImporting(true);
    setMessage(null);

    try {
      const supabase = createClient();
      let successCount = 0;

      for (const row of validRows) {
        const comp = companies.find((c) => c.kode === row.perusahaan_kode) || companies[0];
        if (!comp) continue;

        // 1. Insert karyawan
        const { error: kError } = await supabase.from('karyawan').upsert({
          nik: row.nik,
          perusahaan_id: comp.id,
          nama: row.nama,
          jabatan: row.jabatan || null,
          departemen: row.departemen || null,
          grade: row.grade,
          tanggal_mulai_kerja: row.tanggal_mulai_kerja,
          poh: row.poh || null,
          no_hp: row.no_hp || null,
          atasan: row.atasan || null,
          hak_cuti_tahunan: row.hak_cuti_tahunan || 12,
          status_karyawan: 'AKTIF',
        });

        if (!kError) {
          // 2. Fetch master roster rule
          const { data: rule } = await supabase
            .from('master_roster')
            .select('hari_kerja, hari_libur')
            .eq('perusahaan_id', comp.id)
            .eq('grade', row.grade)
            .maybeSingle();

          // 3. Upsert siklus pertama
          await supabase.from('siklus_roster').insert({
            nik: row.nik,
            tanggal_masuk_site: row.tanggal_masuk_site,
            hari_kerja_snapshot: rule?.hari_kerja || 56,
            hari_libur_snapshot: rule?.hari_libur || 14,
            status: 'BERJALAN',
          });

          successCount++;
        }
      }

      setMessage({
        type: 'success',
        text: `Berhasil mengimpor ${successCount} data karyawan beserta siklus roster aktifnya.`,
      });
      setParsedRows([]);
      setTimeout(() => router.push('/roster'), 1500);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error)?.message || 'Gagal memproses impor.' });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      'nik,nama,perusahaan_kode,jabatan,departemen,grade,tanggal_mulai_kerja,tanggal_masuk_site,poh,no_hp,atasan,hak_cuti_tahunan\n' +
      'KTA-001,Budi Santoso,KTA,Supervisor Produksi,Produksi,Grade 4,2024-01-15,2026-08-01,Palembang,081234567890,Immanuel,12\n' +
      'KAI-002,Dedi Pratama,KAI,Foreman Tambang,Mining,Grade 3,2023-11-01,2026-07-20,Yogyakarta,082198765432,Kausa,12\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Impor_Karyawan_ROSTA.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/pengaturan/karyawan"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-sky-600" />
            <span>Impor Data Karyawan Massal (CSV)</span>
          </h1>
          <p className="text-xs text-slate-500">
            Unggah file CSV dengan validasi baris per baris sebelum disimpan ke basis data
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

      {/* DROPZONE / FILE INPUT */}
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <label className="text-sm font-bold text-slate-900 cursor-pointer hover:text-sky-600">
            <span>Pilih File CSV Karyawan</span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <p className="text-xs text-slate-500 mt-1">
            Format file harus berekstensi .csv dengan header yang sesuai
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-600 font-semibold"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Contoh Template CSV</span>
        </button>
      </div>

      {/* PRATINJAU DATA */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Pratinjau Data ({parsedRows.filter((r) => r.isValid).length} Valid dari {parsedRows.length} Baris)
            </h2>
            <button
              onClick={handleExecuteImport}
              disabled={importing || parsedRows.filter((r) => r.isValid).length === 0}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
            >
              {importing ? 'Mengimpor...' : 'Mulai Simpan ke Database'}
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">NIK</th>
                  <th className="px-3 py-2">Nama</th>
                  <th className="px-3 py-2">Perusahaan</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2">Tgl Mulai</th>
                  <th className="px-3 py-2">Masuk Site</th>
                  <th className="px-3 py-2">Catatan Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.map((r, i) => (
                  <tr key={i} className={r.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                    <td className="px-3 py-2">
                      {r.isValid ? (
                        <span className="text-emerald-600 font-bold">Siap</span>
                      ) : (
                        <span className="text-red-600 font-bold">Gagal</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono">{r.nik}</td>
                    <td className="px-3 py-2 font-semibold">{r.nama}</td>
                    <td className="px-3 py-2">{r.perusahaan_kode}</td>
                    <td className="px-3 py-2">{r.grade}</td>
                    <td className="px-3 py-2 font-mono">{r.tanggal_mulai_kerja}</td>
                    <td className="px-3 py-2 font-mono">{r.tanggal_masuk_site}</td>
                    <td className="px-3 py-2 text-red-600 text-[11px]">
                      {r.errors.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
