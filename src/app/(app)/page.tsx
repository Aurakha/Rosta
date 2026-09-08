'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useCompany } from '@/context/CompanyContext';
import { createClient } from '@/lib/supabase/client';
import { VHariIni, VStatusRoster } from '@/types/database';
import {
  formatTanggal,
  formatJam,
  formatWhatsAppUrl,
  WARNA_STATUS,
  LABEL_STATUS,
} from '@/lib/utils';
import { addDays, subDays, format, isToday } from 'date-fns';
import {
  PlaneTakeoff,
  PlaneLanding,
  Navigation,
  Building2,
  AlertTriangle,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  RefreshCw,
  Clock,
  Car,
  MapPin,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function PapanHariIniPage() {
  const { selectedCompany } = useCompany();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [trips, setTrips] = useState<VHariIni[]>([]);
  const [rosters, setRosters] = useState<VStatusRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const formattedDateString = format(selectedDate, 'yyyy-MM-dd');

  // Muat data dari view v_hari_ini dan v_status_roster
  const loadData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Ambil perjalanan hari terpilih dari view v_hari_ini
      let queryPerjalanan = supabase
        .from('v_hari_ini')
        .select('*')
        .eq('tanggal_travel', formattedDateString);

      if (selectedCompany !== 'SEMUA') {
        queryPerjalanan = queryPerjalanan.eq('perusahaan_kode', selectedCompany);
      }

      const { data: perjalananData, error: perjalananError } = await queryPerjalanan;

      if (perjalananError) {
        console.warn('Gagal memuat v_hari_ini (mungkin skema belum siap):', perjalananError);
      } else {
        setTrips((perjalananData as VHariIni[]) || []);
      }

      // Ambil status roster aktif dari v_status_roster
      let queryRoster = supabase.from('v_status_roster').select('*');

      if (selectedCompany !== 'SEMUA') {
        queryRoster = queryRoster.eq('perusahaan_kode', selectedCompany);
      }

      const { data: rosterData, error: rosterError } = await queryRoster;

      if (rosterError) {
        console.warn('Gagal memuat v_status_roster:', rosterError);
      } else {
        setRosters((rosterData as VStatusRoster[]) || []);
      }
    } catch (err) {
      console.warn('Error saat fetch data Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCompany, formattedDateString]);

  // Filter perjalanan berdasarkan arah
  const tripsKeluar = trips.filter((t) => t.arah === 'KELUAR');
  const tripsMasuk = trips.filter((t) => t.arah === 'MASUK');

  // Filter karyawan yang butuh perhatian: OVERDUE dan BELUM_KEMBALI
  const perluTindakan = rosters.filter(
    (r) => r.status_roster === 'OVERDUE' || r.status_roster === 'BELUM_KEMBALI'
  );

  // Ringkasan status roster
  const countAktif = rosters.filter((r) => r.status_roster !== 'NON_AKTIF').length;
  const countNormal = rosters.filter((r) => r.status_roster === 'NORMAL').length;
  const countSegera = rosters.filter((r) => r.status_roster === 'SEGERA_CUTI').length;
  const countOverdue = rosters.filter((r) => r.status_roster === 'OVERDUE').length;
  const countSedangCuti = rosters.filter((r) => r.status_roster === 'SEDANG_CUTI').length;
  const countBelumKembali = rosters.filter((r) => r.status_roster === 'BELUM_KEMBALI').length;

  return (
    <div className="space-y-6">
      {/* Bar Kontrol Tanggal & Tombol Aksi Cepat */}
      <div className="bg-white rounded-2xl p-3 md:p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Tombol Geser Tanggal */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            title="Kemarin"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date())}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isToday(selectedDate)
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Hari Ini
          </button>

          <button
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            Besok
          </button>

          <button
            onClick={() => setSelectedDate((d) => addDays(d, 7))}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            +7 Hari
          </button>

          <button
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            title="Besok"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Tanggal Terpilih & Tombol Refresh */}
        <div className="flex items-center justify-between md:justify-end gap-3">
          <div className="text-right">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block">
              Jadwal Papan Pantau
            </span>
            <span className="text-sm font-extrabold text-slate-900">
              {formatTanggal(selectedDate)}
            </span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tampilan Jika Database Masih Kosong (Empty State Onboarding) */}
      {rosters.length === 0 && !loading && (
        <div className="bg-gradient-to-br from-sky-50 via-white to-amber-50 rounded-2xl p-8 border border-sky-100 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-sky-600 text-white flex items-center justify-center mx-auto mb-4 shadow-md">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">
            Selamat Datang di ROSTA
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
            Basis data karyawan masih kosong. Untuk memulai siklus monitoring roster, daftarkan karyawan pertama Anda beserta tanggal masuk site terakhir.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/pengaturan/karyawan"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold shadow-md transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Karyawan Baru</span>
            </Link>
            <Link
              href="/pengaturan/kebijakan"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-300 shadow-xs transition"
            >
              <span>Atur Kebijakan Cuti</span>
            </Link>
          </div>
        </div>
      )}

      {/* Tiga Kartu Besar Harian */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KARTU 1: BERANGKAT HARI INI (ANTAR KE BANDARA / STASIUN) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-gradient-to-r from-sky-600 to-blue-600 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
                <PlaneTakeoff className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">DEPARTURES (BERANGKAT)</h3>
                <p className="text-[11px] text-sky-100">Antar Menuju Bandara / Stasiun</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-black">
              {tripsKeluar.length}
            </span>
          </div>

          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[520px]">
            {tripsKeluar.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Tidak ada jadwal keberangkatan pada tanggal ini.
              </div>
            ) : (
              tripsKeluar.map((trip) => {
                const waUrl = formatWhatsAppUrl(
                  trip.no_hp,
                  `Halo Bapak/Ibu ${trip.nama}, mengonfirmasi jadwal keberangkatan cuti Anda pada ${formatTanggal(trip.tanggal_travel)} jam ${formatJam(trip.jam_jemput)} dari ${trip.pool_shelter || 'Pool Shelter'}.`
                );
                return (
                  <div
                    key={trip.perjalanan_id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-sky-300 hover:shadow-sm transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{trip.nama}</div>
                        <div className="text-xs text-slate-500">
                          {trip.jabatan} {trip.departemen ? `· ${trip.departemen}` : ''}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 text-slate-800">
                        {trip.perusahaan_kode}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>Jemput: <strong className="text-slate-900">{formatJam(trip.jam_jemput)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{trip.pool_shelter || 'Pool Shelter'}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 text-slate-700">
                        <Navigation className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Tujuan: <strong className="text-slate-900">{trip.titik_tujuan}</strong> {trip.poh ? `(POH ${trip.poh})` : ''}</span>
                      </div>
                    </div>

                    {/* Driver & Aksi Komunikasi */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-slate-400" />
                        <span>Driver: <strong className="text-slate-700">{trip.driver_nama || 'Belum diplot'}</strong> {trip.no_polisi ? `(${trip.no_polisi})` : ''}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {trip.no_hp && (
                          <>
                            <a
                              href={`tel:${trip.no_hp}`}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              title="Telepon"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition"
                                title="Chat WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              href="/perjalanan/berangkat"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700"
            >
              <span>+ Catat Keberangkatan Baru</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KARTU 2: DATANG HARI INI (JEMPUT DARI BANDARA / STASIUN) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
                <PlaneLanding className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">ARRIVALS (KEDATANGAN)</h3>
                <p className="text-[11px] text-emerald-100">Jemput Kembali Menuju Site</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-black">
              {tripsMasuk.length}
            </span>
          </div>

          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[520px]">
            {tripsMasuk.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Tidak ada jadwal kedatangan pada tanggal ini.
              </div>
            ) : (
              tripsMasuk.map((trip) => {
                const waUrl = formatWhatsAppUrl(
                  trip.no_hp,
                  `Halo Bapak/Ibu ${trip.nama}, mengonfirmasi penjemputan kedatangan cuti Anda pada ${formatTanggal(trip.tanggal_travel)} jam ${formatJam(trip.jam_tiba)} di ${trip.titik_tujuan || 'Titik Jemput'}.`
                );
                return (
                  <div
                    key={trip.perjalanan_id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{trip.nama}</div>
                        <div className="text-xs text-slate-500">
                          {trip.jabatan} {trip.departemen ? `· ${trip.departemen}` : ''}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-200 text-slate-800">
                        {trip.perusahaan_kode}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Jam Tiba: <strong className="text-slate-900">{formatJam(trip.jam_tiba)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{trip.titik_tujuan || 'Titik Jemput'}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 text-slate-700">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Antar ke: <strong className="text-slate-900">{trip.pool_shelter || 'Pool Shelter Site'}</strong></span>
                      </div>
                    </div>

                    {/* Driver & Aksi Komunikasi */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Car className="w-3.5 h-3.5 text-slate-400" />
                        <span>Driver: <strong className="text-slate-700">{trip.driver_nama || 'Belum diplot'}</strong> {trip.no_polisi ? `(${trip.no_polisi})` : ''}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {trip.no_hp && (
                          <>
                            <a
                              href={`tel:${trip.no_hp}`}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              title="Telepon"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition"
                                title="Chat WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              href="/perjalanan/kembali"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              <span>+ Catat Kedatangan Masuk Site</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* KARTU 3: PERLU TINDAKAN (OVERDUE & BELUM KEMBALI) */}
        <div className="bg-white rounded-2xl border border-red-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide">PERLU TINDAKAN</h3>
                <p className="text-[11px] text-rose-100">Overdue & Belum Kembali</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-xs font-black">
              {perluTindakan.length}
            </span>
          </div>

          <div className="p-4 flex-1 space-y-3 overflow-y-auto max-h-[520px]">
            {perluTindakan.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Semua rotasi berjalan normal. Tidak ada karyawan overdue atau telat kembali.
              </div>
            ) : (
              perluTindakan.map((person) => {
                const isOverdue = person.status_roster === 'OVERDUE';
                const hariTelat = isOverdue
                  ? person.hari_terlambat_keluar
                  : person.hari_terlambat_kembali;

                return (
                  <div
                    key={person.nik}
                    className="p-3.5 rounded-xl border border-red-200 bg-red-50/40 hover:bg-red-50/80 transition space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{person.nama}</div>
                        <div className="text-xs text-slate-500">
                          {person.jabatan} · {person.perusahaan_kode}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${WARNA_STATUS[person.status_roster]}`}
                      >
                        {LABEL_STATUS[person.status_roster]}
                      </span>
                    </div>

                    <div className="text-xs text-red-800 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>
                        {isOverdue
                          ? `Melebihi jadwal keluar: ${hariTelat} hari`
                          : `Telat kembali ke site: ${hariTelat} hari`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-red-200/60 text-xs">
                      <span className="text-slate-500 text-[11px]">
                        Target: {formatTanggal(isOverdue ? person.target_keluar : person.target_kembali)}
                      </span>

                      <Link
                        href={`/roster/${person.nik}`}
                        className="text-xs font-bold text-red-700 hover:text-red-900 underline"
                      >
                        Detail Roster
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <Link
              href="/roster"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
            >
              <span>Lihat Seluruh Daftar Roster ({countAktif} Karyawan)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Baris Ringkasan Angka Status Roster (Dapat Diklik) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Ringkasan Status Roster Lapangan
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/roster"
            className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition text-center"
          >
            <div className="text-xs text-slate-500 font-medium">Total Aktif</div>
            <div className="text-xl font-black text-slate-800 mt-1">{countAktif}</div>
          </Link>

          <Link
            href="/roster?status=NORMAL"
            className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition text-center"
          >
            <div className="text-xs text-slate-600 font-medium">Normal</div>
            <div className="text-xl font-black text-slate-700 mt-1">{countNormal}</div>
          </Link>

          <Link
            href="/roster?status=SEGERA_CUTI"
            className="p-3 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition text-center"
          >
            <div className="text-xs text-amber-700 font-medium">Segera Cuti</div>
            <div className="text-xl font-black text-amber-800 mt-1">{countSegera}</div>
          </Link>

          <Link
            href="/roster?status=OVERDUE"
            className="p-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition text-center"
          >
            <div className="text-xs text-red-600 font-medium">Overdue</div>
            <div className="text-xl font-black text-red-700 mt-1">{countOverdue}</div>
          </Link>

          <Link
            href="/roster?status=SEDANG_CUTI"
            className="p-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition text-center"
          >
            <div className="text-xs text-blue-600 font-medium">Sedang Cuti</div>
            <div className="text-xl font-black text-blue-700 mt-1">{countSedangCuti}</div>
          </Link>

          <Link
            href="/roster?status=BELUM_KEMBALI"
            className="p-3 rounded-xl bg-rose-50 border border-rose-300 hover:bg-rose-100 transition text-center"
          >
            <div className="text-xs text-rose-800 font-medium">Belum Kembali</div>
            <div className="text-xl font-black text-rose-900 mt-1">{countBelumKembali}</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
