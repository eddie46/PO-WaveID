import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  X,
  ArrowRight,
  QrCode,
  User,
  Phone,
  Package,
} from 'lucide-react';
import { SimplePOOrder } from '../types/po';

interface POCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: SimplePOOrder | null;
  onProceedToPayment?: () => void;
  danaPhone?: string;
}

export const POCopyModal: React.FC<POCopyModalProps> = ({
  isOpen,
  onClose,
  order,
  onProceedToPayment,
  danaPhone = '',
}) => {
  if (!isOpen || !order) return null;

  const [copied, setCopied] = useState(false);

  // Auto copy on modal open if supported
  useEffect(() => {
    if (order?.poNumber) {
      try {
        navigator.clipboard.writeText(order.poNumber);
      } catch {
        // ignore
      }
    }
  }, [order?.poNumber]);

  const handleCopy = () => {
    if (!order?.poNumber) return;
    navigator.clipboard.writeText(order.poNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const totalAmount =
    order.totalPrice ??
    order.items.reduce((acc, it) => acc + (it.subtotal || 100 * it.quantity), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md font-mono">
                Pesanan Berhasil Disimpan
              </span>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
                Salin Nomor PO Anda
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-center sm:text-left">
            Silakan salin atau simpan <strong>Nomor PO</strong> di bawah ini. Anda dapat menggunakannya kapan saja di halaman <strong>Status</strong> untuk melacak status pesanan, pembayaran, dan resi kurir.
          </p>

          {/* Big Highlight Box for PO Number */}
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 text-center space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
              NOMOR PURCHASE ORDER (PO)
            </span>
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 tracking-wider py-1 select-all">
              {order.poNumber}
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 ${
                copied
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>✓ Nomor PO Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin Nomor PO ({order.poNumber})</span>
                </>
              )}
            </button>
          </div>

          {/* Order Brief Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Nama Pemesan:</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {order.customerName}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>No. WhatsApp:</span>
              </span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {order.customerPhone}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-slate-400" />
                <span>Barang:</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                {order.items.map((it) => `${it.name} (${it.quantity})`).join(', ')}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Total Tagihan:
              </span>
              <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                Rp {totalAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Direct Proceed Button */}
          <div className="pt-1 space-y-2">
            {onProceedToPayment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToPayment();
                }}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
              >
                <QrCode className="w-4 h-4 shrink-0" />
                <span>Buka Info Pembayaran QRIS DANA</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              Lihat di Halaman Status Pesanan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
