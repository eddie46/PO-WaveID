import React from 'react';
import { X, GitBranch, Globe, CheckCircle2, Rocket, Share2 } from 'lucide-react';

interface GitHubGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubGuideModal: React.FC<GitHubGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Cara Pasang Web PO Ini di GitHub Pages
              </h3>
              <p className="text-[11px] text-slate-500">
                Hosting gratis, online 24 jam, dan link bisa dishare ke pelanggan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Dengan GitHub, web formulir pemesanan PO ini bisa di-online-kan secara <strong>100% gratis tanpa sewa hosting bulanan</strong>.
          </p>

          <div className="space-y-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white">
                  Buat Repository di GitHub
                </div>
                <div className="text-slate-500 text-[11px]">
                  Buka akun GitHub Anda, klik <strong>New Repository</strong>, beri nama misalnya <code className="font-mono text-indigo-600">po-order-pcb</code>.
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white">
                  Push / Upload Kode Web
                </div>
                <div className="text-slate-500 text-[11px]">
                  Upload kode web ini ke repository Anda.
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 dark:text-white">
                  Aktifkan GitHub Pages (Selesai!)
                </div>
                <div className="text-slate-500 text-[11px]">
                  Di repository GitHub, buka <strong>Settings &gt; Pages</strong>, pilih Branch <code className="font-mono text-indigo-600">main</code> atau <code className="font-mono text-indigo-600">gh-pages</code>, lalu klik <strong>Save</strong>.
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-[11px] leading-relaxed">
              Website Anda langsung memiliki link resmi (contoh: <code className="font-mono font-bold">https://username.github.io/po-order-pcb</code>) yang siap Anda kirimkan ke pembeli di WhatsApp!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50"
          >
            Mengerti, Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
