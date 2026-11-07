import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Truck, 
  Plus, 
  Trash2,
  FileSpreadsheet,
  Building2,
  GitCommit
} from 'lucide-react';
import { PurchaseOrder, POStatus, UserRole } from '../types/po';
import { formatCurrency, formatDate, STATUS_LABELS } from '../utils/formatters';
import { githubService } from '../services/githubService';

interface POListViewProps {
  orders: PurchaseOrder[];
  currentRole: UserRole;
  onOpenCreatePO: () => void;
  onViewPO: (po: PurchaseOrder) => void;
  onPrintPO: (po: PurchaseOrder) => void;
  onApprovePO: (po: PurchaseOrder) => void;
  onReceivePO: (po: PurchaseOrder) => void;
  onDeletePO: (poId: string) => void;
}

export const POListView: React.FC<POListViewProps> = ({
  orders,
  currentRole,
  onOpenCreatePO,
  onViewPO,
  onPrintPO,
  onApprovePO,
  onReceivePO,
  onDeletePO,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Filtered list
  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      // Search matches
      const term = searchTerm.toLowerCase();
      const matchSearch =
        po.poNumber.toLowerCase().includes(term) ||
        po.vendorName.toLowerCase().includes(term) ||
        po.createdBy.toLowerCase().includes(term) ||
        po.items.some((item) =>
          item.description.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term)
        );

      // Status matches
      const matchStatus = statusFilter === 'ALL' || po.status === statusFilter;

      // Dept matches
      const matchDept = deptFilter === 'ALL' || po.department === deptFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [orders, searchTerm, statusFilter, deptFilter]);

  const handleExportCSV = () => {
    githubService.downloadCSVExport(filteredOrders);
  };

  return (
    <div className="space-y-6 py-6">
      {/* Top Header & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Daftar Dokumen Purchase Order
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola seluruh siklus pesanan pembelian dari penerbitan hingga barang diterima di gudang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
            title="Download CSV Laporan PO"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={onOpenCreatePO}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Buat PO Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
        {/* Row 1: Search & Dropdown Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor PO (misal: PO-2026-0038), nama vendor, pemohon, atau SKU item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">Departemen:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Departemen</option>
              <option value="IT & Hardware">IT & Hardware</option>
              <option value="Operasional">Operasional</option>
              <option value="Logistik & Gudang">Logistik & Gudang</option>
              <option value="Marketing">Marketing</option>
              <option value="HR & General Affairs">HR & General Affairs</option>
              <option value="Produksi">Produksi</option>
            </select>
          </div>
        </div>

        {/* Row 2: Status Filter Tabs (Button-based segmented control) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Semua ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING_APPROVAL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'PENDING_APPROVAL'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Menunggu Approval ({orders.filter((o) => o.status === 'PENDING_APPROVAL').length})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Disetujui ({orders.filter((o) => o.status === 'APPROVED').length})
          </button>
          <button
            onClick={() => setStatusFilter('SENT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'SENT'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Terkirim ke Vendor ({orders.filter((o) => o.status === 'SENT').length})
          </button>
          <button
            onClick={() => setStatusFilter('PARTIALLY_RECEIVED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'PARTIALLY_RECEIVED'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Diterima Sebagian ({orders.filter((o) => o.status === 'PARTIALLY_RECEIVED').length})
          </button>
          <button
            onClick={() => setStatusFilter('FULFILLED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'FULFILLED'
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Selesai ({orders.filter((o) => o.status === 'FULFILLED').length})
          </button>
          <button
            onClick={() => setStatusFilter('DRAFT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 ${
              statusFilter === 'DRAFT'
                ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Draft ({orders.filter((o) => o.status === 'DRAFT').length})
          </button>
        </div>
      </div>

      {/* High-Density Data Grid / Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-850 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">No. PO & Tanggal</th>
                <th className="py-3 px-4">Vendor / Pemasok</th>
                <th className="py-3 px-4">Departemen</th>
                <th className="py-3 px-4">Status & Progres</th>
                <th className="py-3 px-4 text-right">Nilai Total (IDR)</th>
                <th className="py-3 px-4 text-center">Git Audit</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-750 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada purchase order yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  const statusMeta = STATUS_LABELS[po.status] || STATUS_LABELS.DRAFT;
                  const totalItemsQty = po.items.reduce((sum, item) => sum + item.quantity, 0);
                  const totalReceivedQty = po.items.reduce((sum, item) => sum + item.receivedQty, 0);
                  const progressPct = totalItemsQty > 0 ? Math.round((totalReceivedQty / totalItemsQty) * 100) : 0;

                  return (
                    <tr
                      key={po.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-750/50 transition-colors"
                    >
                      {/* No PO & Tanggal */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {po.poNumber}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Tgl: {formatDate(po.createdAt)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Target: {formatDate(po.deliveryDate)}
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {po.vendorName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          PIC: {po.vendorPic}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          NPWP: {po.vendorTaxId || '-'}
                        </div>
                      </td>

                      {/* Departemen */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {po.department}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Oleh: {po.createdBy.split('(')[0]}
                        </div>
                      </td>

                      {/* Status & Receipt Progress */}
                      <td className="py-3.5 px-4 align-top">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}
                        >
                          {statusMeta.label}
                        </span>

                        {po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'FULFILLED' ? (
                          <div className="mt-1.5 space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Penerimaan Barang</span>
                              <span className="font-mono font-medium">{progressPct}%</span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  progressPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </td>

                      {/* Nilai Total */}
                      <td className="py-3.5 px-4 align-top text-right font-mono tabular-nums">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                          {formatCurrency(po.totalAmount, po.currency)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {po.items.length} item barang
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Term: {po.paymentTerms}
                        </div>
                      </td>

                      {/* Git Commit Hash / Audit status */}
                      <td className="py-3.5 px-4 align-top text-center">
                        {po.gitCommitSha ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            <GitCommit className="w-3 h-3" />
                            {po.gitCommitSha}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">
                            Belum sync
                          </span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewPO(po)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            title="Lihat Detail & Riwayat PO"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onPrintPO(po)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                            title="Cetak Surat Pesanan / PO Resmi PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {currentRole === 'MANAGER' && po.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => onApprovePO(po)}
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors shadow-2xs"
                              title="Setujui Purchase Order Ini"
                            >
                              Setujui
                            </button>
                          )}

                          {(currentRole === 'FINANCE_WAREHOUSE' || currentRole === 'PURCHASING') &&
                            (po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && (
                              <button
                                onClick={() => onReceivePO(po)}
                                className="px-2 py-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded border border-indigo-200 dark:border-indigo-800 transition-colors"
                                title="Catat Penerimaan Barang Gudang (Goods Receipt)"
                              >
                                Terima Barang
                              </button>
                            )}

                          {po.status === 'DRAFT' && (
                            <button
                              onClick={() => onDeletePO(po.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                              title="Hapus Draft PO"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
