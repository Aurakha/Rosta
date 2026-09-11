'use client';

import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface PwaInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'compact';
  className?: string;
}

export function PwaInstallButton({ variant = 'header', className = '' }: PwaInstallButtonProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if running in standalone mode (already installed on phone)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Hide button if already installed in standalone mode
  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (typeof window === 'undefined') return;

    // Detect iOS Safari
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      setShowHelpModal(true);
    }
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-sky-600/20 to-blue-600/20 hover:from-sky-600/30 hover:to-blue-600/30 border border-sky-500/30 text-sky-200 transition-all cursor-pointer group ${className}`}
          title="Unduh & Pasang Aplikasi ROSTA ke Layar HP"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Smartphone className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-100">Instal Aplikasi</p>
              <p className="text-[10px] text-slate-400">Pasang di Layar HP</p>
            </div>
          </div>
          <div className="p-1 rounded-md bg-sky-500/20 text-sky-300">
            <Download className="w-3.5 h-3.5" />
          </div>
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`p-2 rounded-xl bg-sky-500/10 text-sky-400 hover:text-white hover:bg-sky-600 transition border border-sky-500/30 cursor-pointer ${className}`}
          title="Unduh & Pasang Aplikasi ROSTA ke HP"
        >
          <Download className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold shadow-xs hover:shadow-sky-500/25 transition-all cursor-pointer ${className}`}
          title="Unduh & Pasang Aplikasi ROSTA ke Layar Utama HP / PC"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instal App</span>
        </button>
      )}

      {/* Modal Panduan Pengguna iOS Safari */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/70 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-slate-100 relative">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Pasang di iPhone / iPad</h3>
                <p className="text-[11px] text-slate-400">Safari iOS Home Screen</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 mb-5 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Tekan ikon <span className="font-semibold text-white inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 inline" /> Bagikan (Share)</span> pada bilah bawah browser Safari.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Gulir ke bawah dan pilih opsi <span className="font-semibold text-sky-400 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> &quot;Tambahkan ke Layar Utama&quot;</span> (Add to Home Screen).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Tekan <span className="font-semibold text-white">Tambah (Add)</span> di pojok kanan atas layar. Ikon ROSTA akan langsung muncul di HP Anda!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-sm"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Modal Bantuan Android / Browser Manual */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/70 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-slate-100 relative">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Pasang Aplikasi ROSTA</h3>
                <p className="text-[11px] text-slate-400">Instal ke Layar Utama Smartphone</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Untuk memasang ROSTA sebagai aplikasi mandiri di ponsel atau komputer Anda:
            </p>

            <div className="space-y-2.5 text-xs text-slate-300 mb-5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Di Browser Chrome Android:</strong> Ketuk menu titik tiga (⋮) di pojok kanan atas, lalu pilih <strong>&quot;Pasang Aplikasi&quot;</strong> atau <strong>&quot;Tambahkan ke Layar Utama&quot;</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Di Laptop / Desktop:</strong> Klik ikon install (<Download className="w-3 h-3 inline" />) di bilah alamat browser (URL bar) sebelah kanan.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-sm"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
