import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  X,
  QrCode,
  Download,
  Wallet,
} from 'lucide-react';
import QRCode from 'qrcode';
import { SimplePOOrder, WAConfig } from '../types/po';
import { formatSimpleOrderForWA, openWhatsAppWithOrder } from '../utils/waHelper';

interface OrderSuccessModalProps {
  order: SimplePOOrder | null;
  isOpen: boolean;
  onClose: () => void;
  config: WAConfig;
  onNewOrder: () => void;
  danaPhone?: string;
  danaAccountName?: string;
  qrisImageUrl?: string;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  isOpen,
  onClose,
  config,
  onNewOrder,
  danaPhone,
  danaAccountName,
  qrisImageUrl,
}) => {
  if (!isOpen || !order) return null;

  const [copiedText, setCopiedText] = useState(false);
  const [copiedDana, setCopiedDana] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedPO, setCopiedPO] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeView, setActiveView] = useState<'qris' | 'message'>('qris');

  const DANA_PHONE = danaPhone || '-';
  const DANA_ACCOUNT_NAME = danaAccountName || '-';
  const totalAmount =
    order.totalPrice ??
    order.items.reduce((acc, it) => acc + (it.subtotal || (100 * it.quantity)), 0);

  // Generate QR Code on mount or order change
  useEffect(() => {
    const qrPayload = `https://link.dana.id/qr/${DANA_PHONE}?amount=${totalAmount}&po=${encodeURIComponent(order.poNumber)}`;

    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR code:', err));
  }, [order.poNumber, totalAmount, DANA_PHONE]);

  const waText = formatSimpleOrderForWA(order, DANA_PHONE);
  const waRoute = openWhatsAppWithOrder(order, config, DANA_PHONE);

  const handleCopyWA = () => {
    navigator.clipboard.writeText(waText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleCopyDana = () => {
    navigator.clipboard.writeText(DANA_PHONE);
    setCopiedDana(true);
    setTimeout(() => setCopiedDana(false), 2500);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(totalAmount.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2500);
  };

  const handleCopyPO = () => {
    if (!order?.poNumber) return;
    navigator.clipboard.writeText(order.poNumber);
    setCopiedPO(true);
    setTimeout(() => setCopiedPO(false), 2500);
  };

  const [copiedWAToast, setCopiedWAToast] = useState(false);

  const handleOpenWhatsApp = () => {
    try {
      navigator.clipboard.writeText(waText);
      setCopiedWAToast(true);
      setTimeout(() => setCopiedWAToast(false), 4500);
    } catch (err) {
      console.error('Clipboard copy error:', err);
    }
    window.open(waRoute.url, '_blank');
  };

  const handleDownloadQR = () => {
    const targetUrl = qrisImageUrl || qrDataUrl;
    if (!targetUrl) return;
    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = `Barcode-QRIS-${DANA_PHONE}-PO-${order.poNumber}.png`;
    link.click();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-blue-50/80 via-indigo-50/50 to-emerald-50/60 dark:from-slate-900 dark:to-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#118EEA] text-white flex items-center justify-center shadow-xs shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Pembayaran &amp; Konfirmasi
                  </h3>
                  <span className="text-[10px] bg-blue-100 text-[#118EEA] dark:bg-blue-950 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded font-mono">
                    DANA
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    No. PO: <span className="font-semibold text-slate-700 dark:text-slate-300">{order.poNumber}</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyPO}
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-sans font-medium transition-colors cursor-pointer"
                    title="Salin Nomor PO"
                  >
                    {copiedPO ? (
                      <>
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-2.5 h-2.5" />
                        <span>Salin PO</span>
                      </>
                    )}
                  </button>
                </div>
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

          {/* Navigation Tabs (QRIS & Transfer vs Format Pesan) */}
          <div className="px-4 sm:px-5 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800 flex gap-1.5 sm:gap-2 text-[11px] sm:text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveView('qris')}
              className={`pb-2 px-1 font-semibold flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeView === 'qris'
                  ? 'border-[#118EEA] text-[#118EEA] dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>QRIS &amp; Transfer</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('message')}
              className={`pb-2 px-1 font-semibold flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                activeView === 'message'
                  ? 'border-[#118EEA] text-[#118EEA] dark:text-blue-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Teks WhatsApp</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
            {activeView === 'qris' ? (
              <>
                {/* QRIS Card Presentation */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center text-center space-y-3">
                  
                  {/* Direct DANA App Launcher Button */}
                  <a
                    href={`https://link.dana.id/send?phone=${DANA_PHONE.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 bg-[#118EEA] hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>📱 Buka Aplikasi DANA (Transfer Langsung)</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>

                  {/* Official Style QRIS Banner */}
                  <div className="w-full max-w-[260px] bg-white text-slate-900 rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col items-center">
                    <div className="w-full flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-sm tracking-tighter text-rose-600 font-sans">QRIS</span>
                        <span className="text-[8px] text-slate-400 uppercase font-semibold">GPN</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#118EEA] bg-blue-50 px-1.5 py-0.5 rounded">
                        DANA
                      </span>
                    </div>

                    {/* QR Image */}
                    <div className="my-2 p-1 bg-white rounded-lg border border-slate-200/80 flex flex-col items-center">
                      {qrisImageUrl ? (
                        <div className="space-y-1 text-center">
                          <img
                            src={qrisImageUrl}
                            alt={`Barcode QRIS Asli Toko - ${DANA_PHONE}`}
                            className="w-48 sm:w-56 h-auto max-h-64 object-contain rounded shadow-xs"
                          />
                          <span className="text-[9px] font-bold text-emerald-600 block">
                            ✓ Barcode QRIS Resmi Toko (All-Bank / E-Wallet)
                          </span>
                        </div>
                      ) : qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`QRIS DANA ${DANA_PHONE}`}
                          className="w-36 sm:w-44 h-36 sm:h-44 object-contain rounded"
                        />
                      ) : (
                        <div className="w-36 h-36 flex items-center justify-center bg-slate-100 text-slate-400">
                          Memuat Barcode...
                        </div>
                      )}
                    </div>

                    {/* QRIS Footer Info */}
                    <div className="w-full text-center pt-1 border-t border-slate-100 space-y-0.5">
                      <div className="text-[11px] sm:text-xs font-extrabold text-slate-900">
                        a.n <span className="text-blue-700">{DANA_ACCOUNT_NAME}</span>
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-bold text-slate-800">
                        Nomor DANA: <span className="font-mono text-blue-600 font-extrabold">{DANA_PHONE}</span>
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-slate-500 leading-tight">
                        Transfer via DANA, GoPay, OVO, atau m-Banking
                      </div>
                    </div>
                  </div>

                  {/* Quick Save QR Button */}
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download Barcode DANA (.PNG)</span>
                  </button>
                </div>

                {/* Two Column Summary: Account DANA & Total Amount */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Account DANA */}
                  <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[9px] uppercase font-semibold">
                        <span>Pemilik &amp; No. DANA</span>
                      </div>
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white mt-0.5 truncate">
                        a.n {DANA_ACCOUNT_NAME}
                      </div>
                      <div className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300 mt-0.5 select-all">
                        {DANA_PHONE}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyDana}
                      className="mt-2 inline-flex items-center justify-center gap-1 text-[10px] font-bold text-[#118EEA] dark:text-blue-300 bg-white dark:bg-slate-800 hover:bg-blue-50 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors shadow-2xs cursor-pointer"
                    >
                      {copiedDana ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="uppercase">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>SALIN NO. DANA</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Total Transfer */}
                  <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[9px] uppercase font-semibold">
                        <span>Total Bayar</span>
                      </div>
                      <div className="font-mono font-bold text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 mt-1">
                        {(() => {
                          const basePrice = order.totalPrice ?? order.items.reduce((acc, it) => acc + (it.subtotal || (100 * it.quantity)), 0);
                          const poDigits = parseInt(order.poNumber.replace(/\D/g, '').slice(-3) || '1', 10);
                          const finalSum = basePrice + poDigits;
                          return `Rp ${finalSum.toLocaleString('id-ID')}`;
                        })()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyAmount}
                      className="mt-2 inline-flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 hover:bg-emerald-50 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs cursor-pointer"
                    >
                      {copiedAmount ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="uppercase">Salin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>SALIN RP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Order Items Summary */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pemesan:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{order.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Barang:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {order.items.map((i) => `${i.name} (${i.quantity}x)`).join(' + ')}
                    </span>
                  </div>
                </div>

                {/* Step-by-step instructions */}
                <div className="p-3 bg-slate-100/70 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    Petunjuk Pembayaran &amp; Konfirmasi:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                    <li>Scan QRIS di atas atau transfer via DANA ke <strong>{DANA_PHONE}</strong>.</li>
                    <li>Masukkan nominal tagihan: <strong>Rp {totalAmount.toLocaleString('id-ID')}</strong>.</li>
                    <li>Klik <strong>"Kirim Konfirmasi ke WhatsApp"</strong> di bawah untuk mengirim data pesanan ke admin toko.</li>
                  </ol>
                </div>
              </>
            ) : (
              /* WhatsApp Text Message Preview Tab */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Format Teks Otomatis:</span>
                  <button
                    type="button"
                    onClick={handleCopyWA}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersalin ke Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Semua Teks</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] max-h-64 overflow-y-auto whitespace-pre-wrap border border-slate-800 shadow-inner">
                  {waText}
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                  💡 <strong>Tips:</strong> Teks format pesanan dan info pembayaran DANA sudah otomatis disiapkan. Anda dapat menyalin teks ini atau langsung mengklik tombol WhatsApp di bawah.
                </p>
              </div>
            )}
          </div>

          {/* Toast Notification when WA is clicked */}
          {copiedWAToast && (
            <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-200" />
                <span>Teks PO disalin! Jika ke Grup WA, tekan <strong>Tempel / Paste (Ctrl+V)</strong> di chat.</span>
              </div>
              <button onClick={() => setCopiedWAToast(false)} className="text-emerald-200 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="px-4 sm:px-5 py-3.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNewOrder();
              }}
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-center order-2 sm:order-1 cursor-pointer"
            >
              Selesai / PO Baru
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer order-1 sm:order-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Kirim Konfirmasi ke WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
