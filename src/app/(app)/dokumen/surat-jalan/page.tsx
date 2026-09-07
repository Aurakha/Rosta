'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useCompany } from '@/context/CompanyContext';
import {
  Perusahaan,
  Driver,
  VendorTravel,
} from '@/types/database';
import { formatTanggal, formatTanggalPendek } from '@/lib/utils';
import { format } from 'date-fns';
import { pdf } from '@react-pdf/renderer';
import { SuratJalanPdfDocument, SuratJalanPdfProps } from '@/components/pdf/SuratJalanPdf';
import {
  ArrowLeft,
  Car,
  Download,
  Users,
  FileText,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export default function SusunSuratJalanPage() {
  const { selectedCompany } = useCompany();
  const [companies, setCompanies] = useState<Perusahaan[]>([]);
  const [vendors, setVendors] = useState<VendorTravel[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [selectedPassengerIds, setSelectedPassengerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Form Fields
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [perusahaanId, setPerusahaanId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [noPolisi, setNoPolisi] = useState('BG 1234 XY');
  const [ruteDari, setRuteDari] = useState('Pool Shelter Bintel Site Muratara');
  const [ruteTujuan, setRuteTujuan] = useState('Lubuklinggau (Bandara / Stasiun)');
  const [hargaCarter, setHargaCarter] = useState<number | ''>(850000);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: pData } = await supabase.from('perusahaan').select('*').order('kode');
        if (pData && pData.length > 0) {
          setCompanies(pData as Perusahaan[]);
          setPerusahaanId(pData[0].id);
        }

        const { data: vData } = await supabase.from('vendor_travel').select('*').order('nama');
        if (vData) setVendors(vData as VendorTravel[]);

        const { data: dData } = await supabase.from('driver').select('*').order('nama');
        if (dData && dData.length > 0) {
          setDrivers(dData as Driver[]);
          setDriverId(dData[0].id);
          if (dData[0].no_polisi_default) setNoPolisi(dData[0].no_polisi_default);
        }

        // Ambil kandidat perjalanan pada tanggal ini
        const { data: trips } = await supabase
          .from('perjalanan')
          .select(`
            *,
            karyawan:nik (nama, jabatan, no_hp, perusahaan:perusahaan_id (kode))
          `)
          .eq('tanggal_travel', tanggal);

        if (trips) {
          setPassengers(trips);
          setSelectedPassengerIds(trips.map((t) => t.id));
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tanggal]);

  const handleTogglePassenger = (id: string) => {
    setSelectedPassengerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const supabase = createClient();
      const penerbit = companies.find((c) => c.id === perusahaanId) || companies[0];
      const selectedDriver = drivers.find((d) => d.id === driverId);
      const selectedVendor = vendors[0];

      // Ambil nomor surat jalan unik otomatis
      let nomorSurat = `001/${penerbit.kode}/HRGA-TRA/PL/IX/2026`;
      const { data: generatedNo } = await supabase.rpc('generate_nomor_dokumen', {
        p_perusahaan_id: penerbit.id,
        p_jenis: 'SURAT_JALAN',
      });
      if (generatedNo) nomorSurat = generatedNo;

      const includedPassengers = passengers
        .filter((p) => selectedPassengerIds.includes(p.id))
        .map((p, idx) => ({
          no: idx + 1,
          nama: p.karyawan?.nama || p.nik,
          jabatan: p.karyawan?.jabatan || '',
          noHp: p.karyawan?.no_hp || '',
          perusahaan: p.karyawan?.perusahaan?.kode || '',
        }));

      const sjData: SuratJalanPdfProps = {
        nomorSurat,
        perusahaanPenerbit: penerbit.nama_lengkap,
        tanggal: formatTanggal(tanggal),
        vendorNama: selectedVendor?.nama || 'Latif Travel',
        driverNama: selectedDriver?.nama || 'Abdul Latif',
        driverHp: selectedDriver?.no_hp || '',
        noPolisi: noPolisi || 'BG 1234 XY',
        ruteDari,
        ruteTujuan,
        hargaCarter: hargaCarter ? Number(hargaCarter) : null,
        penumpang: includedPassengers,
      };

      const blob = await pdf(<SuratJalanPdfDocument data={sjData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SuratJalan_${nomorSurat.replace(/[\/\\]/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal menghasilkan Surat Jalan PDF.');
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
            <Car className="w-6 h-6 text-sky-600" />
            <span>Penerbitan Surat Jalan Driver</span>
          </h1>
          <p className="text-xs text-slate-500">
            Dokumen resmi penugasan carter driver travel antar-jemput
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          1. Data Armada & Rute Surat Jalan
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tanggal Keberangkatan *
            </label>
            <input
              type="date"
              required
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Perusahaan Penerbit *
            </label>
            <select
              value={perusahaanId}
              onChange={(e) => setPerusahaanId(e.target.value)}
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
              onChange={(e) => {
                setDriverId(e.target.value);
                const d = drivers.find((item) => item.id === e.target.value);
                if (d?.no_polisi_default) setNoPolisi(d.no_polisi_default);
              }}
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
              No. Polisi Armada
            </label>
            <input
              type="text"
              value={noPolisi}
              onChange={(e) => setNoPolisi(e.target.value)}
              placeholder="Contoh: BG 1234 XY"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Rute Asal
            </label>
            <input
              type="text"
              value={ruteDari}
              onChange={(e) => setRuteDari(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Rute Tujuan
            </label>
            <input
              type="text"
              value={ruteTujuan}
              onChange={(e) => setRuteTujuan(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tarif Carter Kendaraan (Rp)
            </label>
            <input
              type="number"
              value={hargaCarter}
              onChange={(e) => setHargaCarter(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Rp 850.000"
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs md:text-sm text-slate-900 font-mono font-bold"
            />
          </div>
        </div>
      </div>

      {/* PILIH PENUMPANG DALAM SURAT JALAN */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              <span>Pilih Penumpang untuk Surat Jalan Ini</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Centang nama karyawan yang ikut di dalam kendaraan ini.
            </p>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf || selectedPassengerIds.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs md:text-sm font-bold shadow-md transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{generatingPdf ? 'Membuat PDF...' : 'Cetak / Unduh Surat Jalan'}</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {passengers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Tidak ada data perjalanan pada tanggal {formatTanggalPendek(tanggal)}.
            </div>
          ) : (
            passengers.map((p) => {
              const isChecked = selectedPassengerIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => handleTogglePassenger(p.id)}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePassenger(p.id)}
                      className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-slate-900">
                        {p.karyawan?.nama || p.nik}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {p.karyawan?.jabatan || ''} · {p.karyawan?.no_hp || ''}
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border">
                    {p.karyawan?.perusahaan?.kode}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
