import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { StatusRoster } from '@/types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format tanggal ke Bahasa Indonesia (contoh: "Kamis, 3 September 2026")
 * Aturan: Sel kosong/null dikembalikan string kosong, tanpa "-", "N/A", dll.
 */
export function formatTanggal(dateStr?: string | Date | null): string {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return '';
    return format(date, 'EEEE, d MMMM yyyy', { locale: localeId });
  } catch {
    return '';
  }
}

/**
 * Format tanggal pendek (contoh: "3 Sep 2026")
 */
export function formatTanggalPendek(dateStr?: string | Date | null): string {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return '';
    return format(date, 'd MMM yyyy', { locale: localeId });
  } catch {
    return '';
  }
}

/**
 * Format jam 24 jam dengan titik (contoh: "10.00 WIB")
 * Mendukung format string "10:00:00" atau "10:00"
 */
export function formatJam(timeStr?: string | null): string {
  if (!timeStr) return '';
  const cleanTime = timeStr.trim();
  const match = cleanTime.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hour = match[1].padStart(2, '0');
    const minute = match[2];
    return `${hour}.${minute} WIB`;
  }
  return cleanTime;
}

/**
 * Format mata uang Rupiah (contoh: "Rp 1.250.000" tanpa desimal)
 */
export function formatRupiah(amount?: number | null): string {
  if (amount === null || amount === undefined) return '';
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/**
 * Buat tautan langsung ke WhatsApp Web / Aplikasi
 * Mengubah awalan "08..." menjadi "628..."
 */
export function formatWhatsAppUrl(noHp?: string | null, pesan?: string): string | null {
  if (!noHp) return null;
  const cleaned = noHp.replace(/[^0-9]/g, '');
  let phoneWithCountry = cleaned;
  if (cleaned.startsWith('0')) {
    phoneWithCountry = '62' + cleaned.slice(1);
  }
  if (!phoneWithCountry.startsWith('62')) {
    phoneWithCountry = '62' + phoneWithCountry;
  }
  const baseUrl = `https://wa.me/${phoneWithCountry}`;
  if (pesan) {
    return `${baseUrl}?text=${encodeURIComponent(pesan)}`;
  }
  return baseUrl;
}

/**
 * Pemetaan warna status roster sesuai spesifikasi resmi
 */
export const WARNA_STATUS: Record<StatusRoster, string> = {
  NORMAL: 'bg-slate-100 text-slate-700 border-slate-200',
  SEGERA_CUTI: 'bg-amber-100 text-amber-800 border-amber-300',
  OVERDUE: 'bg-red-100 text-red-700 border-red-300',
  SEDANG_CUTI: 'bg-blue-100 text-blue-700 border-blue-300',
  BELUM_KEMBALI: 'bg-red-200 text-red-950 border-red-400 font-medium',
  NON_AKTIF: 'bg-slate-50 text-slate-400 border-slate-200',
};

/**
 * Label status yang ramah pengguna
 */
export const LABEL_STATUS: Record<StatusRoster, string> = {
  NORMAL: 'Normal',
  SEGERA_CUTI: 'Segera Cuti',
  OVERDUE: 'Overdue',
  SEDANG_CUTI: 'Sedang Cuti',
  BELUM_KEMBALI: 'Belum Kembali',
  NON_AKTIF: 'Non-Aktif',
};
