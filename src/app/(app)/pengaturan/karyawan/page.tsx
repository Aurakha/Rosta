'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { Perusahaan, Karyawan } from '@/types/database';
import { formatTanggal, formatTanggalPendek } from '@/lib/utils';
import {
  UserPlus,
  Users,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  Phone,
  MapPin,
  Briefcase,
} from 'lucide-react';

export default function KelolaKaryawanPage() {
  const { selectedCompany } = useCompany();
  const [karyawanList, setKaryawanList] = useState<Karyawan[]>([]);
  const [perusahaanList, setPerusahaanList] = useState<Perusahaan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [nik, setNik] = useState('');
  const [perusahaanId, setPerusahaanId] = useState('');
  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [departemen, setDepartemen] = useState('');
  const [grade, setGrade] = useState('Grade 4');
  const [tanggalMulaiKerja, setTanggalMulaiKerja] = useState('');
  const [tanggalMasukSite, setTanggalMasukSite] = useState('');
  const [poh, setPoh] = useState('');
  const [noHp, setNoHp] = useState('');
  const [atasan, setAtasan] = useState('');
  const [hakCutiTahunan, setHakCutiTahunan] = useState(12);

  const gradeOptions = [
    'Grade 6 Up',
    'Grade 5',
    'Grade 4',
    'Grade 3',
    'Grade 1-2',
  ];

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Ambil daftar perusahaan
      const { data: pData } = await supabase
        .from('perusahaan')
        .select('*')
        .eq('aktif', true)
        .order('kode');

      if (pData && pData.length > 0) {
        setPerusahaanList(pData as Perusahaan[]);
        if (!perusahaanId) {
          setPerusahaanId(pData[0].id);
        }
      }

      // Ambil daftar karyawan
      const { data: kData, error: kError } = await supabase
        .from('karyawan')
        .select('*')
        .order('nama');

      if (kData) {
        setKaryawanList(kData as Karyawan[]);
      }
    } catch (err) {
      console.warn('Error loading karyawan data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSimpanKaryawan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const supabase = createClient();

      // Validasi NIK dan No HP format
      if (!nik.trim()) throw new Error('NIK wajib diisi.');
      if (!tanggalMulaiKerja) throw new Error('Tanggal mulai kerja wajib diisi untuk penentuan hak cuti.');
      if (!tanggalMasukSite) throw new Error('Tanggal terakhir masuk site wajib diisi untuk membentuk siklus awal.');

      let formattedPhone = noHp.trim();
      if (formattedPhone && !formattedPhone.startsWith('0')) {
        formattedPhone = '0' + formattedPhone;
      }

      // 1. Simpan Karyawan
      const { error: insertKaryawanError } = await supabase.from('karyawan').insert({
        nik: nik.trim(),
        perusahaan_id: perusahaanId,
        nama: nama.trim(),
        jabatan: jabatan.trim() || null,
        departemen: departemen.trim() || null,
        grade,
        tanggal_mulai_kerja: tanggalMulaiKerja,
        poh: poh.trim() || null,
        no_hp: formattedPhone || null,
        atasan: atasan.trim() || null,
        hak_cuti_tahunan: hakCutiTahunan,
        status_karyawan: 'AKTIF',
      });

      if (insertKaryawanError) {
        throw new Error(insertKaryawanError.message || 'Gagal menyimpan data karyawan.');
      }

      // 2. Ambil aturan hari kerja & libur dari master_roster
      const { data: rosterRule } = await supabase
        .from('master_roster')
        .select('hari_kerja, hari_libur')
        .eq('perusahaan_id', perusahaanId)
        .eq('grade', grade)
        .maybeSingle();

      const hariKerja = rosterRule?.hari_kerja || 56;
      const hariLibur = rosterRule?.hari_libur || 14;

      // 3. Buat siklus roster pertama berstatus BERJALAN
      const { error: siklusError } = await supabase.from('siklus_roster').insert({
        nik: nik.trim(),
        tanggal_masuk_site: tanggalMasukSite,
        hari_kerja_snapshot: hariKerja,
        hari_libur_snapshot: hariLibur,
        status: 'BERJALAN',
      });

      if (siklusError) {
        console.warn('Peringatan pembuatan siklus awal:', siklusError);
      }

      setMessage({
        type: 'success',
        text: `Karyawan ${nama} berhasil didaftarkan dan siklus roster berjalan pertama telah diaktifkan.`,
      });

      // Reset form
      setNik('');
      setNama('');
      setJabatan('');
      setDepartemen('');
      setTanggalMasukSite('');
      setPoh('');
      setNoHp('');
      setAtasan('');
      setShowForm(false);

      loadInitialData();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: (err as Error)?.message || 'Terjadi kesalahan saat menyimpan.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter list
  const filteredKaryawan = karyawanList.filter((k) => {
    const matchSearch =
      k.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      k.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (k.departemen && k.departemen.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedCompany === 'SEMUA') return matchSearch;
    const perusahaan = perusahaanList.find((p) => p.id === k.perusahaan_id);
    return matchSearch && perusahaan?.kode === selectedCompany;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Navigasi Kembali */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/pengaturan"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">
              Kelola Data Karyawan
            </h1>
            <p className="text-xs text-slate-500">
              Pendaftaran karyawan dan inisiasi siklus roster site
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs md:text-sm font-semibold shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>{showForm ? 'Tutup Form' : 'Tambah Karyawan Baru'}</span>
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

      {/* FORM INPUT KARYAWAN BARU */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-sky-600" />
              <span>Formulir Pendaftaran Karyawan Baru</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap karyawan wajib disertai tanggal mulai kerja dan tanggal masuk site terakhir untuk otomatis membuat siklus aktif.
            </p>
          </div>

          <form onSubmit={handleSimpanKaryawan} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* NIK */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Induk Karyawan (NIK) *
                </label>
                <input
                  type="text"
                  required
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  placeholder="Contoh: KTA-2024-001"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                />
              </div>

              {/* Perusahaan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Perusahaan *
                </label>
                <select
                  required
                  value={perusahaanId}
                  onChange={(e) => setPerusahaanId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                >
                  {perusahaanList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.kode} — {p.nama_lengkap}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama karyawan"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                />
              </div>

              {/* Jabatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jabatan
                </label>
                <input
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Contoh: Supervisor Produksi"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                />
              </div>

              {/* Departemen */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Departemen
                </label>
                <input
                  type="text"
                  value={departemen}
                  onChange={(e) => setDepartemen(e.target.value)}
                  placeholder="Contoh: Produksi, HRGA, Eng"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                />
              </div>

              {/* Grade Roster */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Grade Roster *
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                >
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal Mulai Kerja */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Mulai Kerja (DOA) *
                </label>
                <input
                  type="date"
                  required
                  value={tanggalMulaiKerja}
                  onChange={(e) => setTanggalMulaiKerja(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                />
                <span className="text-[10px] text-slate-500">
                  Untuk reset saldo cuti tahunan per ulang tahun masuk
                </span>
              </div>

              {/* Tanggal Terakhir Masuk Site */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tanggal Masuk Site Terakhir *
                </label>
                <input
                  type="date"
                  required
                  value={tanggalMasukSite}
                  onChange={(e) => setTanggalMasukSite(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                />
                <span className="text-[10px] text-slate-500">
                  Memicu pembentukan siklus aktif pertama
                </span>
              </div>

              {/* Point of Hire (POH) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Point of Hire (POH)
                </label>
                <input
                  type="text"
                  value={poh}
                  onChange={(e) => setPoh(e.target.value)}
                  placeholder="Contoh: Palembang, Yogyakarta"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                />
              </div>

              {/* No HP */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor HP (WhatsApp)
                </label>
                <input
                  type="text"
                  value={noHp}
                  onChange={(e) => setNoHp(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                />
              </div>

              {/* Atasan Langsung */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Atasan
                </label>
                <input
                  type="text"
                  value={atasan}
                  onChange={(e) => setAtasan(e.target.value)}
                  placeholder="Nama atasan (untuk notifikasi)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                />
              </div>

              {/* Hak Cuti Tahunan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hak Cuti Tahunan (Hari)
                </label>
                <input
                  type="number"
                  value={hakCutiTahunan}
                  onChange={(e) => setHakCutiTahunan(Number(e.target.value))}
                  min={0}
                  max={24}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs md:text-sm font-semibold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs md:text-sm font-bold shadow-sm transition disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan & Aktifkan Siklus'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABEL MASTER KARYAWAN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIK, departemen..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Total Terdata: <strong>{filteredKaryawan.length}</strong> Karyawan
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">NIK</th>
                <th className="px-4 py-3">Nama Karyawan</th>
                <th className="px-4 py-3">Entitas</th>
                <th className="px-4 py-3">Jabatan & Dept</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">POH</th>
                <th className="px-4 py-3">No. HP</th>
                <th className="px-4 py-3">Tgl Mulai Kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredKaryawan.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    {loading ? 'Memuat data karyawan...' : 'Belum ada data karyawan terdaftar.'}
                  </td>
                </tr>
              ) : (
                filteredKaryawan.map((k) => {
                  const perush = perusahaanList.find((p) => p.id === k.perusahaan_id);
                  return (
                    <tr key={k.nik} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{k.nik}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <Link href={`/roster/${k.nik}`} className="hover:text-sky-600 hover:underline">
                          {k.nama}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {perush?.kode || ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{k.jabatan || ''}</div>
                        <div className="text-[11px] text-slate-400">{k.departemen || ''}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{k.grade}</td>
                      <td className="px-4 py-3 text-slate-600">{k.poh || ''}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{k.no_hp || ''}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatTanggalPendek(k.tanggal_mulai_kerja)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
