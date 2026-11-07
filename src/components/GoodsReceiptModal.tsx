import React, { useState } from 'react';
import { X, Truck, CheckCircle2, AlertTriangle, PackageCheck } from 'lucide-react';
import { PurchaseOrder, GoodsReceipt, GoodsReceiptItem } from '../types/po';

interface GoodsReceiptModalProps {
  po: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReceipt: (poId: string, receipt: GoodsReceipt) => void;
}

export const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  po,
  isOpen,
  onClose,
  onSubmitReceipt,
}) => {
  if (!isOpen || !po) return null;

  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedBy, setReceivedBy] = useState('Petugas Gudang (Anda)');
  const [notes, setNotes] = useState('');

  // Per-item receipt input
  const [receivedItems, setReceivedItems] = useState<
    Array<{
      itemId: string;
      sku: string;
      description: string;
      orderedQty: number;
      previouslyReceived: number;
      qtyNow: number;
      condition: 'Baik' | 'Rusak/Cacat' | 'Kurang';
    }>
  >(
    po.items.map((it) => {
      const remaining = Math.max(0, it.quantity - it.receivedQty);
      return {
        itemId: it.id,
        sku: it.sku,
        description: it.description,
        orderedQty: it.quantity,
        previouslyReceived: it.receivedQty,
        qtyNow: remaining, // default to remaining
        condition: 'Baik',
      };
    })
  );

  const handleQtyChange = (index: number, val: number) => {
    setReceivedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], qtyNow: Math.max(0, val) };
      return copy;
    });
  };

  const handleConditionChange = (index: number, cond: 'Baik' | 'Rusak/Cacat' | 'Kurang') => {
    setReceivedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], condition: cond };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!deliveryNoteNumber.trim()) {
      alert('Mohon masukkan Nomor Surat Jalan dari vendor.');
      return;
    }

    const itemsPayload: GoodsReceiptItem[] = receivedItems.map((it) => ({
      itemId: it.itemId,
      sku: it.sku,
      description: it.description,
      qtyReceived: it.qtyNow,
      condition: it.condition,
    }));

    const receipt: GoodsReceipt = {
      id: `gr-${Date.now()}`,
      receiptNumber: `GR-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      poNumber: po.poNumber,
      receivedDate,
      deliveryNoteNumber,
      receivedBy,
      notes,
      items: itemsPayload,
    };

    onSubmitReceipt(po.id, receipt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in duration-150">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Catat Penerimaan Barang Gudang (Goods Receipt)
                </h2>
                <div className="text-xs text-slate-500 font-mono">
                  Referensi PO: <span className="font-bold text-indigo-600 dark:text-indigo-400">{po.poNumber}</span> · {po.vendorName}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
            {/* Meta Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  No. Surat Jalan Vendor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SJ-2026/X/0991"
                  value={deliveryNoteNumber}
                  onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Tanggal Kedatangan *
                </label>
                <input
                  type="date"
                  required
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Diterima Oleh (Petugas) *
                </label>
                <input
                  type="text"
                  required
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            {/* Items to Receive */}
            <div className="space-y-2">
              <div className="font-semibold text-slate-900 dark:text-white text-xs">
                Verifikasi Jumlah & Kondisi Fisik Barang Tiba:
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2 px-3">Uraian Item</th>
                      <th className="py-2 px-3 text-center w-24">Total Pesan</th>
                      <th className="py-2 px-3 text-center w-28">Sudah Terima</th>
                      <th className="py-2 px-3 text-center w-28">Diterima Sekarang</th>
                      <th className="py-2 px-3 w-32">Kondisi Fisik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {receivedItems.map((item, idx) => (
                      <tr key={item.itemId}>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {item.description}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {item.sku}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {item.orderedQty}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                          {item.previouslyReceived}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={item.orderedQty - item.previouslyReceived}
                            value={item.qtyNow}
                            onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                            className="w-20 px-2 py-1 text-center font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.condition}
                            onChange={(e) => handleConditionChange(idx, e.target.value as any)}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                          >
                            <option value="Baik">Baik (Sesuai)</option>
                            <option value="Rusak/Cacat">Rusak / Cacat</option>
                            <option value="Kurang">Kurang Qty</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Catatan Penerimaan / Hasil Quality Check Gudang
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Dus dalam keadaan baik, seluruh nomor seri telah dicocokkan dengan surat jalan."
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-500">
              Status PO akan diperbarui otomatis ke <strong>Diterima Sebagian</strong> atau <strong>Selesai</strong>.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Batal
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Simpan Penerimaan Barang</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
