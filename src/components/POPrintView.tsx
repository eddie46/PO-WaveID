import React from 'react';
import { Printer, ArrowLeft, Download, CheckCircle, ShieldCheck } from 'lucide-react';
import { PurchaseOrder } from '../types/po';
import { formatCurrency, formatDate, numberToWordsID } from '../utils/formatters';

interface POPrintViewProps {
  po: PurchaseOrder;
  onBack: () => void;
}

export const POPrintView: React.FC<POPrintViewProps> = ({ po, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="py-6 space-y-6">
      {/* Non-printable Action Toolbar */}
      <div className="no-print max-w-4xl mx-auto flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Sistem</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Siap cetak standar kertas A4 / simpan sebagai PDF
          </span>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen PO / Simpan PDF</span>
          </button>
        </div>
      </div>

      {/* Official Printable PO Invoice Sheet */}
      <div className="max-w-4xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 print:border-none print:shadow-none print:p-0 print:max-w-none">
        {/* Letterhead (KOP Surat Perusahaan) */}
        <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-widest">
                NT
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                PT NUSA TEKNOLOGI SOLUSINDO
              </h1>
            </div>
            <p className="text-xs text-slate-600">
              Menara Prima Lt. 14, Kawasan Mega Kuningan, Jl. DR. Ide Anak Agung Gde Agung No. 2, Jakarta Selatan 12950
            </p>
            <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4">
              <span>Telp: (021) 5798-2000</span>
              <span>Email: procurement@nusatech.co.id</span>
              <span>NPWP: 01.998.776.5-014.000</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-2xl font-black tracking-tight text-slate-900 font-mono">
              PURCHASE ORDER
            </div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
              SURAT PESANAN RESMI
            </div>
            <div className="text-sm font-mono font-bold text-indigo-700 mt-2">
              No: {po.poNumber}
            </div>
          </div>
        </div>

        {/* PO Meta & Parties (Vendor vs Shipping) */}
        <div className="grid grid-cols-2 gap-8 py-6 border-b border-slate-200 text-xs">
          {/* Left: Vendor Information */}
          <div className="space-y-1">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              DITUJUKAN KEPADA (VENDOR):
            </span>
            <div className="font-bold text-sm text-slate-900">{po.vendorName}</div>
            <div className="text-slate-600 leading-relaxed">{po.vendorAddress}</div>
            <div className="pt-1 text-slate-500 space-y-0.5">
              <div>Attn / PIC: <span className="font-medium text-slate-800">{po.vendorPic}</span></div>
              <div>Email: {po.vendorEmail}</div>
              <div>NPWP: <span className="font-mono">{po.vendorTaxId || '-'}</span></div>
            </div>
          </div>

          {/* Right: PO Specifications & Destination */}
          <div className="space-y-1 bg-slate-50 p-4 rounded border border-slate-200">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              INFORMASI PENGIRIMAN & PEMBAYARAN:
            </span>
            <div className="space-y-1 pt-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal PO:</span>
                <span className="font-medium text-slate-900">{formatDate(po.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Target Kirim:</span>
                <span className="font-bold text-slate-900">{formatDate(po.deliveryDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Termin Pembayaran:</span>
                <span className="font-medium text-slate-900">{po.paymentTerms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Departemen Pemesan:</span>
                <span className="font-medium text-slate-900">{po.department}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 text-slate-600">
                <div className="font-semibold text-slate-800 text-[11px]">Tujuan Pengiriman:</div>
                <div className="text-[11px] leading-tight mt-0.5">{po.shippingAddress}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Table of Line Items */}
        <div className="py-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-y-2 border-slate-800 bg-slate-100 font-bold uppercase text-[10px] tracking-wider text-slate-800">
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3 w-28">Kode / SKU</th>
                <th className="py-2.5 px-3">Uraian Barang & Spesifikasi Teknis</th>
                <th className="py-2.5 px-3 w-24 text-center">Jumlah</th>
                <th className="py-2.5 px-3 w-32 text-right">Harga Satuan</th>
                <th className="py-2.5 px-3 w-36 text-right">Total (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {po.items.map((item, index) => (
                <tr key={item.id} className="align-top">
                  <td className="py-3 px-3 text-center font-mono text-slate-500">{index + 1}</td>
                  <td className="py-3 px-3 font-mono font-medium text-slate-600">{item.sku}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{item.description}</div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-medium">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                    {formatCurrency(item.unitPrice, po.currency)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                    {formatCurrency(item.total, po.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation & Terbilang */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 pb-6 border-b border-slate-200 text-xs">
          {/* Terbilang & Catatan */}
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <div className="font-bold text-[10px] uppercase tracking-wider text-slate-500">
                TERBILANG (SPELLED IN WORDS):
              </div>
              <div className="font-semibold text-slate-900 italic text-[11px] leading-relaxed">
                "{numberToWordsID(po.totalAmount)}"
              </div>
            </div>

            {po.notes && (
              <div className="space-y-1">
                <div className="font-bold text-slate-700 text-[11px]">Syarat & Catatan Khusus:</div>
                <div className="text-slate-600 text-[11px] leading-relaxed">{po.notes}</div>
              </div>
            )}
          </div>

          {/* Subtotal, Pajak, Grand Total */}
          <div className="space-y-2 font-mono text-xs">
            <div className="flex justify-between py-1 text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatCurrency(po.subtotal, po.currency)}
              </span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>Pajak Pertambahan Nilai (PPN {po.taxRate}%):</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                + {formatCurrency(po.taxAmount, po.currency)}
              </span>
            </div>
            {po.discountAmount > 0 && (
              <div className="flex justify-between py-1 text-emerald-700">
                <span>Potongan / Diskon:</span>
                <span className="font-semibold tabular-nums">
                  - {formatCurrency(po.discountAmount, po.currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-bold text-slate-900">
              <span>TOTAL PEMBELIAN:</span>
              <span className="text-indigo-800 tabular-nums">
                {formatCurrency(po.totalAmount, po.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* General Terms & Conditions */}
        <div className="py-4 text-[10px] text-slate-500 leading-normal border-b border-slate-200 space-y-1">
          <div className="font-bold uppercase tracking-wider text-slate-600">Ketentuan Penting:</div>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Surat Pesanan ini sah apabila telah ditandatangani oleh pejabat berwenang dan disetujui pihak vendor.</li>
            <li>Pengiriman barang wajib melampirkan Surat Jalan asli dan salinan PO resmi ini.</li>
            <li>Faktur Penagihan (Invoice) dan Faktur Pajak wajib mencantumkan Nomor PO di atas.</li>
            <li>Barang yang tidak sesuai dengan spesifikasi teknis berhak ditolak dan dikembalikan tanpa biaya.</li>
          </ol>
        </div>

        {/* 3 Signature Blocks */}
        <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs">
          <div className="space-y-14">
            <div className="font-semibold text-slate-700">Dibuat Oleh,</div>
            <div className="space-y-1">
              <div className="font-bold text-slate-900 underline">{po.createdBy}</div>
              <div className="text-[11px] text-slate-500">Procurement / Purchasing</div>
            </div>
          </div>

          <div className="space-y-14">
            <div className="font-semibold text-slate-700">Disetujui Oleh,</div>
            <div className="space-y-1">
              <div className="font-bold text-slate-900 underline">Budi Santoso, S.T., M.M.</div>
              <div className="text-[11px] text-slate-500">Head of Operations / Director</div>
            </div>
          </div>

          <div className="space-y-14">
            <div className="font-semibold text-slate-700">Konfirmasi Vendor,</div>
            <div className="space-y-1">
              <div className="font-bold text-slate-900 underline">({po.vendorPic})</div>
              <div className="text-[11px] text-slate-500">Tanda Tangan & Cap Perusahaan</div>
            </div>
          </div>
        </div>

        {/* Digital Verification & Commit Stamp */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <div>
            Dokumen sah diterbitkan sistem NusaProcure · SHA: {po.gitCommitSha || 'PENDING-SYNC'}
          </div>
          <div>
            Dicetak pada: {new Date().toLocaleString('id-ID')}
          </div>
        </div>
      </div>
    </div>
  );
};
