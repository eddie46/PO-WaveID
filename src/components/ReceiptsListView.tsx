import React, { useState } from 'react';
import { Truck, PackageCheck, Search, Eye, Calendar, Building2, CheckCircle2 } from 'lucide-react';
import { PurchaseOrder, GoodsReceipt } from '../types/po';
import { formatDate } from '../utils/formatters';

interface ReceiptsListViewProps {
  orders: PurchaseOrder[];
  onViewPO: (po: PurchaseOrder) => void;
  onOpenReceiveGoods: (po: PurchaseOrder) => void;
}

export const ReceiptsListView: React.FC<ReceiptsListViewProps> = ({
  orders,
  onViewPO,
  onOpenReceiveGoods,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Extract all goods receipts across all POs
  const allReceipts = orders.flatMap((po) =>
    po.goodsReceipts.map((gr) => ({
      ...gr,
      po,
    }))
  );

  const eligibleOrdersForReceipt = orders.filter(
    (o) => o.status === 'SENT' || o.status === 'PARTIALLY_RECEIVED'
  );

  const filteredReceipts = allReceipts.filter(
    (r) =>
      r.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.po.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.receivedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Penerimaan Barang Gudang (Goods Receipt)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Rekap seluruh Surat Tanda Terima Barang (STTB / GRN) dan pencocokan dengan Surat Jalan Vendor.
          </p>
        </div>

        {eligibleOrdersForReceipt.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {eligibleOrdersForReceipt.length} PO sedang dalam proses pengiriman vendor
            </span>
          </div>
        )}
      </div>

      {/* POs currently awaiting arrival / delivery in transit */}
      {eligibleOrdersForReceipt.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
            <Truck className="w-4 h-4 text-amber-600" />
            <span>Purchase Order Menunggu Kedatangan Barang di Gudang:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {eligibleOrdersForReceipt.map((po) => {
              const totalItems = po.items.reduce((s, i) => s + i.quantity, 0);
              const receivedItems = po.items.reduce((s, i) => s + i.receivedQty, 0);

              return (
                <div
                  key={po.id}
                  className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-2 shadow-2xs"
                >
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {po.poNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Target: {formatDate(po.deliveryDate)}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 mt-1 truncate">
                      {po.vendorName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Progress: {receivedItems} / {totalItems} unit diterima
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenReceiveGoods(po)}
                    className="w-full py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded border border-emerald-200 dark:border-emerald-800 transition-colors"
                  >
                    Catat Barang Tiba Sekarang
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari No. Penerimaan, No. Surat Jalan, atau No. PO..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Receipts Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">No. Penerimaan (GR)</th>
                <th className="py-3 px-4">Referensi PO</th>
                <th className="py-3 px-4">Surat Jalan Vendor</th>
                <th className="py-3 px-4">Vendor & Petugas</th>
                <th className="py-3 px-4">Barang Diterima</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Tidak ada rekaman penerimaan barang yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((gr) => (
                  <tr key={gr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/50">
                    <td className="py-3 px-4 align-top">
                      <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {gr.receiptNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(gr.receivedDate)}
                      </div>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {gr.poNumber}
                      </div>
                      <div className="text-[11px] text-slate-500">{gr.po.department}</div>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <div className="font-mono font-medium text-slate-800 dark:text-slate-200">
                        {gr.deliveryNoteNumber}
                      </div>
                      {gr.notes && (
                        <div className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">
                          Note: {gr.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 align-top">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {gr.po.vendorName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Penerima: {gr.receivedBy}
                      </div>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <div className="space-y-1">
                        {gr.items.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[11px]">
                            <span className="font-mono font-bold text-emerald-600">
                              +{it.qtyReceived}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 truncate max-w-xs">
                              {it.description}
                            </span>
                            <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1 rounded">
                              {it.condition}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4 align-top text-right">
                      <button
                        onClick={() => onViewPO(gr.po)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat PO</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
