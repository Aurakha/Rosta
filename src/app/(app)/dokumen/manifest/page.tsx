'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import {
  Perusahaan,
  PoolShelter,
  VendorTravel,
  Driver,
  VHariIni,
} from '@/types/database';
import { formatTanggal, formatTanggalPendek, formatJam } from '@/lib/utils';
import { format } from 'date-fns';
import { pdf } from '@react-pdf/renderer';
import { ManifestPdfDocument, ManifestPdfProps } from '@/components/pdf/ManifestPdf';
import {
  ArrowLeft,
  ClipboardList,
  Download,
  Users,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export default function SusunManifestPage() {
  const { selectedCompany } = useCompany();
  const [companies, setCompanies] = useState<Perusahaan[]>([]);
  const [shelters, setShelters] = useState<PoolShelter[]>([]);
  const [vendors, setVendors] = useState<VendorTravel[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Grouping Criteria
  const [tanggalTravel, setTanggalTravel] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [arah, setArah] = useState<'KELUAR' | 'MASUK'>('KELUAR');
  const [poolShelterId, setPoolShelterId] = useState('');

  // SPK & Driver Setup
  const [penerbitPerusahaanId, setPenerbitPerusahaanId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [noPolisi, setNoPolisi] = useState('BG 1234 XY');

  // Matched Passengers
  const [passengers, setPassengers] = useState<any[]>([]);

  useEffect(() => {
    const loadMaster = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: pData } = await supabase.from('perusahaan').select('*').order('kode');
        if (pData && pData.length > 0) {
          setCompanies(pData as Perusahaan[]);
          setPenerbitPerusahaanId(pData[0].id);
        }

        const { data: sData } = await supabase.from('pool_shelter').select('*').order('nama');
        if (sData && sData.length > 0) {
          setShelters(sData as PoolShelter[]);
          setPoolShelterId(sData[0].id);
        }

        const { data: vData } = await supabase.from('vendor_travel').select('*').order('nama');
        if (vData) setVendors(vData as VendorTravel[]);

        const { data: dData } = await supabase.from('driver').select('*').order('nama');
        if (dData && dData.length > 0) {
          setDrivers(dData as Driver[]);
          setDriverId(dData[0].id);
          if (dData[0].no_polisi_default) {
            setNoPolisi(dData[0].no_polisi_default);
          }
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };

    loadMaster();
  }, []);

  // Fetch passengers matching the 3 grouping criteria: Tanggal, Arah, Pool Shelter
  useEffect(() => {
    if (!tanggalTravel) return;

    const fetchPassengers = async () => {
      try {
        const supabase = createClient();
        let query = supabase
          .from('perjalanan')
          .select(`
            *,
            karyawan:nik (nama, jabatan, departemen, no_hp, poh, perusahaan:perusahaan_id (kode, nama_lengkap)),
            pool_shelter:pool_shelter_id (nama),
            penanggung:penanggung_biaya (kode)
          `)
          .eq('tanggal_travel', tanggalTravel)
          .eq('arah', arah);

        if (poolShelterId) {
          query = query.eq('pool_shelter_id', poolShelterId);
        }

        const { data, error } = await query;
        if (!error && data) {
          setPassengers(data);
        }
      } catch (err) {
        console.warn('Error fetching passengers for manifest:', err);
      }
    };

    fetchPassengers();
  }, [tanggalTravel, arah, poolShelterId]);

  const handleDriverChange = (dId: string) => {
    setDriverId(dId);
    const d = drivers.find((item) => item.id === dId);
    if (d?.no_polisi_default) {
      setNoPolisi(d.no_polisi_default);
    }
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const supabase = createClient();
      const penerbit = companies.find((c) => c.id === penerbitPerusahaanId) || companies[0];
      const selectedDriver = drivers.find((d) => d.id === driverId);
      const selectedShelter = shelters.find((s) => s.id === poolShelterId);
      const selectedVendor = vendors[0];

      // Ambil nomor dokumen otomatis dari Supabase RPC
      let nomorSpk = `001/${penerbit.kode}/SPK/IX/2026`;
      const { data: generatedNo } = await supabase.rpc('generate_nomor_dokumen', {
        p_perusahaan_id: penerbit.id,
        p_jenis: 'SPK',
      });
      if (generatedNo) nomorSpk = generatedNo;

      // Data manifest props
      const manifestData: ManifestPdfProps = {
        nomorSpk,
        perusahaanNama: penerbit.nama_lengkap,
        perusahaanKode: penerbit.kode,
        tanggalTravel: formatTanggal(tanggalTravel),
        arah,
        poolShelter: selectedShelter?.nama || 'Pool Shelter Bintel',
        vendorNama: selectedVendor?.nama || 'Latif Travel',
        driverNama: selectedDriver?.nama || 'Abdul Latif',
        driverHp: selectedDriver?.no_hp || '082177450720',
        noPolisi: noPolisi || 'BG 1234 XY',
        penumpang: passengers.map((p, idx) => ({
          no: idx + 1,
          nama: p.karyawan?.nama || p.nik,
          perusahaan: p.karyawan?.perusahaan?.kode || '',
          noHp: p.karyawan?.no_hp || '',
          titikTujuan: p.titik_tujuan || p.karyawan?.poh || '',
          jam: formatJam(p.jam_jemput || p.jam_berangkat || p.jam_tiba),
          costBy: p.penanggung?.kode || p.karyawan?.perusahaan?.kode || 'KTA',
        })),
      };

      // Render PDF ke Blob
      const blob = await pdf(<ManifestPdfDocument data={manifestData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Manifest_${nomorSpk.replace(/[\/\\]/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Gagal generate PDF:', err);
      alert('Terjadi kendala saat menghasilkan PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dokumen"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-sky-600" />
            <span>Susun Manifest Penumpang & SPK Travel</span>
          </h1>
          <p className="text-xs text-slate-500">
            Pengelompokan otomatis berdasarkan tanggal, arah, dan pool shelter
          </p>
        </div>
      </div>

      {/* FILTER PENGELOMPOKAN MANIFEST */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          1. Kriteria Pengelompokan Manifest
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tanggal Perjalanan *
            </label>
            <input
              type="date"
              required
              value={tanggalTravel}
              onChange={(e) => setTanggalTravel(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Arah Perjalanan *
            </label>
            <select
              value={arah}
              onChange={(e) => setArah(e.target.value as 'KELUAR' | 'MASUK')}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 font-semibold"
            >
              <option value="KELUAR">✈ KELUAR (Berangkat Cuti Lapangan)</option>
              <option value="MASUK">🏠 MASUK (Kembali Masuk Site)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pool Shelter Titik Kumpul *
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
        </div>
      </div>

      {/* INFORMASI DRIVER & PENOMORAN SPK */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          2. Armada & Entitas Penerbit SPK
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Perusahaan Penerbit SPK
            </label>
            <select
              value={penerbitPerusahaanId}
              onChange={(e) => setPenerbitPerusahaanId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 font-bold"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kode} — {c.nama_lengkap}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Driver Travel
            </label>
            <select
              value={driverId}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama} {d.no_hp ? `(${d.no_hp})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nomor Polisi Armada
            </label>
            <input
              type="text"
              value={noPolisi}
              onChange={(e) => setNoPolisi(e.target.value)}
              placeholder="Contoh: BG 1234 XY"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 font-mono"
            />
          </div>
        </div>
      </div>

      {/* HASIL PENGELOMPOKAN PENUMPANG */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              <span>Daftar Penumpang Terkelompok ({passengers.length} Orang)</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Penumpang lintas perusahaan otomatis digabung dalam satu carter jika tanggal, arah, dan shelter sama.
            </p>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf || passengers.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs md:text-sm font-bold shadow-md transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{generatingPdf ? 'Membuat PDF...' : 'Cetak / Unduh PDF SPK'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-center">No</th>
                <th className="px-4 py-3">Nama Penumpang</th>
                <th className="px-4 py-3">Entitas</th>
                <th className="px-4 py-3">No. HP</th>
                <th className="px-4 py-3">Titik Antar / Jemput</th>
                <th className="px-4 py-3">Jam</th>
                <th className="px-4 py-3 text-center">Cost By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {passengers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    Tidak ada jadwal perjalanan terdaftar untuk tanggal dan arah ini.
                  </td>
                </tr>
              ) : (
                passengers.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{p.karyawan?.nama || p.nik}</div>
                      <div className="text-[11px] text-slate-500">{p.karyawan?.jabatan || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border">
                        {p.karyawan?.perusahaan?.kode || ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {p.karyawan?.no_hp || ''}
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {p.titik_tujuan || p.karyawan?.poh || ''}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {formatJam(p.jam_jemput || p.jam_berangkat || p.jam_tiba)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                        {p.penanggung?.kode || p.karyawan?.perusahaan?.kode || 'KTA'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
