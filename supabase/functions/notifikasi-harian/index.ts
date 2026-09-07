// Supabase Edge Function: notifikasi-harian
// Dipanggil otomatis oleh pg_cron setiap pukul 23:00 UTC (06:00 WIB)
// Menguji pemicu N1..N9 dan menulis antrean ke tabel notifikasi_log

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Ambil v_status_roster
    const { data: rosters, error: rError } = await supabase.from('v_status_roster').select('*');
    if (rError) throw rError;

    // 2. Ambil v_hari_ini
    const { data: trips, error: tError } = await supabase.from('v_hari_ini').select('*');
    if (tError) throw tError;

    const notifs = [];

    // N5: Ringkasan Hari-H
    if (trips && trips.length > 0) {
      const keluar = trips.filter((t) => t.arah === 'KELUAR').length;
      const masuk = trips.filter((t) => t.arah === 'MASUK').length;
      notifs.push({
        kode_jenis: 'N5',
        penerima: 'Admin PIC Travel',
        kanal: 'WHATSAPP',
        isi_pesan: `[ROSTA Hari Ini] Ringkasan jadwal operasional travel site:\n- Berangkat: ${keluar} orang\n- Jemput: ${masuk} orang.\nSilakan pantau kesiapan armada di aplikasi.`,
        status: 'MENUNGGU',
      });
    }

    // N7: Overdue
    const overdue = (rosters || []).filter((r) => r.status_roster === 'OVERDUE');
    for (const o of overdue) {
      notifs.push({
        kode_jenis: 'N7',
        penerima: `Atasan ${o.nama}`,
        kanal: 'WHATSAPP',
        isi_pesan: `[Peringatan ROSTA] Karyawan ${o.nama} (${o.perusahaan_kode}) OVERDUE di site (+${o.hari_terlambat_keluar} hari). Mohon koordinasikan rotasi cuti.`,
        status: 'MENUNGGU',
      });
    }

    // N8: Belum Kembali
    const belumKembali = (rosters || []).filter((r) => r.status_roster === 'BELUM_KEMBALI');
    for (const b of belumKembali) {
      notifs.push({
        kode_jenis: 'N8',
        penerima: 'Spt HRGA & PIC Travel',
        kanal: 'WHATSAPP',
        isi_pesan: `[Peringatan ROSTA] Karyawan ${b.nama} (${b.perusahaan_kode}) BELUM KEMBALI ke site (+${b.hari_terlambat_kembali} hari). Mohon follow up kepulangan.`,
        status: 'MENUNGGU',
      });
    }

    if (notifs.length > 0) {
      await supabase.from('notifikasi_log').insert(notifs);
    }

    return new Response(JSON.stringify({ success: true, count: notifs.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
