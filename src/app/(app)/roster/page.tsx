'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import { VStatusRoster, StatusRoster } from '@/types/database';
import {
  formatTanggalPendek,
  WARNA_STATUS,
  LABEL_STATUS,
} from '@/lib/utils';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Clock,
  UserPlus,
} from 'lucide-react';

function DaftarRosterContent() {
  const { selectedCompany } = useCompany();
  const searchParams = useSearchParams();
  const initialStatusParam = searchParams.get('status') as StatusRoster | null;

  const [rosters, setRosters] = useState<VStatusRoster[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(initialStatusParam || 'SEMUA');
  const [filterGrade, setFilterGrade] = useState('SEMUA');
  const [filterDept, setFilterDept] = useState('SEMUA');
  const [sortBy, setSortBy] = useState<'sisa_hari_kerja' | 'nama' | 'target_keluar'>('sisa_hari_kerja');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadRosters = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase.from('v_status_roster').select('*');

      if (selectedCompany !== 'SEMUA') {
        query = query.eq('perusahaan_kode', selectedCompany);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Gagal memuat v_status_roster:', error);
      } else {
        setRosters((data as VStatusRoster[]) || []);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRosters();
  }, [selectedCompany]);

  // Ekstrak daftar grade dan dept unik untuk dropdown filter
  const allGrades = useMemo(() => {
    const set = new Set<string>();
    rosters.forEach((r) => r.grade && set.add(r.grade));
    return Array.from(set).sort();
  }, [rosters]);

  const allDepts = useMemo(() => {
    const set = new Set<string>();
    rosters.forEach((r) => r.departemen && set.add(r.departemen));
    return Array.from(set).sort();
  }, [rosters]);

  // Filter & Urutkan
  const filteredAndSorted = useMemo(() => {
    return rosters
      .filter((r) => {
        const matchSearch =
          r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (r.poh && r.poh.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchStatus = filterStatus === 'SEMUA' || r.status_roster === filterStatus;
        const matchGrade = filterGrade === 'SEMUA' || r.grade === filterGrade;
        const matchDept = filterDept === 'SEMUA' || r.departemen === filterDept;

        return matchSearch && matchStatus && matchGrade && matchDept;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'sisa_hari_kerja') {
          comp = (a.sisa_hari_kerja ?? 999) - (b.sisa_hari_kerja ?? 999);
        } else if (sortBy === 'nama') {
          comp = a.nama.localeCompare(b.nama);
        } else if (sortBy === 'target_keluar') {
          comp = (a.target_keluar || '').localeCompare(b.target_keluar || '');
        }
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [rosters, searchQuery, filterStatus, filterGrade, filterDept, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-600" />
            <span>Daftar Monitoring Roster</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Status rotasi kerja lapangan terhitung otomatis real-time
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pengaturan/karyawan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Karyawan</span>
          </Link>
          <button
            onClick={loadRosters}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* FILTER & PENCARIAN BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Cari */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, NIK, kota POH..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
            />
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition font-medium"
            >
              <option value="SEMUA">Semua Status Roster</option>
              <option value="NORMAL">Normal</option>
              <option value="SEGERA_CUTI">Segera Cuti (≤ 7 hari)</option>
              <option value="OVERDUE">Overdue</option>
              <option value="SEDANG_CUTI">Sedang Cuti</option>
              <option value="BELUM_KEMBALI">Belum Kembali</option>
              <option value="NON_AKTIF">Non-Aktif</option>
            </select>
          </div>

          {/* Filter Grade */}
          <div>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
            >
              <option value="SEMUA">Semua Grade</option>
              {allGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Departemen */}
          <div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:border-sky-500 transition"
            >
              <option value="SEMUA">Semua Departemen</option>
              {allDepts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Baris Sortir & Total */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Urutkan:</span>
            <button
              onClick={() => {
                if (sortBy === 'sisa_hari_kerja') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('sisa_hari_kerja');
                  setSortOrder('asc');
                }
              }}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition ${
                sortBy === 'sisa_hari_kerja'
                  ? 'bg-sky-50 border-sky-200 text-sky-700'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              Sisa Hari {sortBy === 'sisa_hari_kerja' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>

            <button
              onClick={() => {
                if (sortBy === 'nama') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('nama');
                  setSortOrder('asc');
                }
              }}
              className={`px-2.5 py-1 rounded-lg border font-semibold transition ${
                sortBy === 'nama'
                  ? 'bg-sky-50 border-sky-200 text-sky-700'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              Nama {sortBy === 'nama' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          <div>
            Menampilkan <strong>{filteredAndSorted.length}</strong> dari {rosters.length} karyawan
          </div>
        </div>
      </div>

      {/* TABEL DAFTAR ROSTER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Karyawan</th>
                <th className="px-4 py-3">Perusahaan</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Masuk Site</th>
                <th className="px-4 py-3">Target Keluar</th>
                <th className="px-4 py-3 text-center">Sisa Hari</th>
                <th className="px-4 py-3">Status Roster</th>
                <th className="px-4 py-3">POH</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    {loading ? 'Memuat data roster...' : 'Tidak ada karyawan yang sesuai filter.'}
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((person) => {
                  const isOverdue = person.status_roster === 'OVERDUE';
                  const isCuti = person.status_roster === 'SEDANG_CUTI';
                  const isBelumKembali = person.status_roster === 'BELUM_KEMBALI';

                  return (
                    <tr
                      key={person.nik}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Nama & NIK */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/roster/${person.nik}`}
                          className="font-bold text-slate-900 group-hover:text-sky-600 transition block"
                        >
                          {person.nama}
                        </Link>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">{person.nik}</span>
                          {person.jabatan && <span>· {person.jabatan}</span>}
                        </div>
                      </td>

                      {/* Entitas */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                          {person.perusahaan_kode}
                        </span>
                      </td>

                      {/* Grade */}
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {person.grade}
                      </td>

                      {/* Masuk Site */}
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {formatTanggalPendek(person.tanggal_masuk_site)}
                      </td>

                      {/* Target Keluar */}
                      <td className="px-4 py-3 font-mono">
                        <span className={isOverdue ? 'text-red-700 font-bold' : 'text-slate-700'}>
                          {formatTanggalPendek(person.target_keluar)}
                        </span>
                      </td>

                      {/* Sisa Hari Kerja */}
                      <td className="px-4 py-3 text-center font-mono">
                        {isCuti || isBelumKembali ? (
                          <span className="text-slate-400 text-[11px]">Sedang libur</span>
                        ) : isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[11px]">
                            + {person.hari_terlambat_keluar} hr
                          </span>
                        ) : (
                          <span
                            className={`font-black ${
                              person.sisa_hari_kerja <= 7
                                ? 'text-amber-600 font-bold'
                                : 'text-slate-800'
                            }`}
                          >
                            {person.sisa_hari_kerja} hari
                          </span>
                        )}
                      </td>

                      {/* Badge Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${WARNA_STATUS[person.status_roster]}`}
                        >
                          {LABEL_STATUS[person.status_roster]}
                        </span>
                      </td>

                      {/* POH */}
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {person.poh || ''}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/roster/${person.nik}`}
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 font-semibold"
                        >
                          <span>Detail</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
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

export default function DaftarRosterPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-slate-400">
          Memuat data daftar roster...
        </div>
      }
    >
      <DaftarRosterContent />
    </Suspense>
  );
}
