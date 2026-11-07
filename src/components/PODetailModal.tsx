import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  Send, 
  Truck, 
  GitCommit, 
  Clock, 
  AlertTriangle,
  Building2,
  Calendar,
  CreditCard,
  MapPin,
  FileText,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { PurchaseOrder, UserRole } from '../types/po';
import { formatCurrency, formatDate, formatDateTime, STATUS_LABELS } from '../utils/formatters';

interface PODetailModalProps {
  po: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onPrintPO: (po: PurchaseOrder) => void;
  onApprovePO: (po: PurchaseOrder, notes?: string) => void;
  onRejectPO: (po: PurchaseOrder, reason: string) => void;
  onSendToVendor: (po: PurchaseOrder) => void;
  onOpenReceiveGoods: (po: PurchaseOrder) => void;
  onSyncToGitHub: (po: PurchaseOrder) => void;
}

export const PODetailModal: React.FC<PODetailModalProps> = ({
  po,
  isOpen,
  onClose,
  currentRole,
  onPrintPO,
  onApprovePO,
  onRejectPO,
  onSendToVendor,
  onOpenReceiveGoods,
  onSyncToGitHub,
}) => {
  if (!isOpen || !po) return null;

  const [activeTab, setActiveTab] = useState<'details' | 'audit' | 'receipts'>('details');
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  const statusMeta = STATUS_LABELS[po.status] || STATUS_LABELS.DRAFT;

  const totalOrderedQty = po.items.reduce((s, i) => s + i.quantity, 0);
  const totalReceivedQty = po.items.reduce((s, i) => s + i.receivedQty, 0);
  const fulfillmentPct = totalOrderedQty > 0 ? Math.round((totalReceivedQty / totalOrderedQty) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm">
              PO
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                  {po.poNumber}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}
                >
                  {statusMeta.label}
                </span>
                {po.gitCommitSha && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    <GitCommit className="w-3 h-3" />
                    {po.gitCommitSha}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>Diterbitkan: {formatDateTime(po.createdAt)}</span>
                <span aria-hidden="true">·</span>
                <span>Oleh: {po.createdBy}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintPO(po)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
              title="Cetak Surat Pesanan Resmi PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Cetak PO</span>
            </button>

            <button
              onClick={() => onSyncToGitHub(po)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors"
              title="Push status PO ke GitHub Commit"
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>Sync GitHub</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/50 text-xs">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Rincian & Barang Pesanan
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Audit Trail & Git Commits</span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[10px]">
              {po.approvals.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`pb-2.5 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'receipts'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Surat Penerimaan Barang (GR)</span>
            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-[10px]">
              {po.goodsReceipts.length}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Vendor & Shipping Meta Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                    <Building2 className="w-4 h-4" />
                    <span>Vendor / Pemasok Ditunjuk</span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {po.vendorName}
                  </div>
                  <div className="text-slate-500 space-y-1 text-[11px]">
                    <div>PIC: <span className="font-medium text-slate-700 dark:text-slate-300">{po.vendorPic}</span></div>
                    <div>Email: {po.vendorEmail}</div>
                    <div>Alamat: {po.vendorAddress}</div>
                    <div>NPWP: <span className="font-mono">{po.vendorTaxId || '-'}</span></div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                    <MapPin className="w-4 h-4" />
                    <span>Tujuan Pengiriman & Ketentuan</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-200 font-medium">
                    {po.shippingAddress}
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-500 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>Departemen:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{po.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Pengiriman:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{formatDate(po.deliveryDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Termin Bayar:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{po.paymentTerms}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Daftar Barang Dipesan ({po.items.length} Item)
                  </h3>
                  <div className="text-slate-500 text-[11px]">
                    Penerimaan: <span className="font-mono font-bold text-slate-900 dark:text-white">{totalReceivedQty}</span> / {totalOrderedQty} unit ({fulfillmentPct}%)
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-3 w-28">SKU</th>
                        <th className="py-2.5 px-3">Deskripsi Barang</th>
                        <th className="py-2.5 px-3 text-center w-20">Qty Order</th>
                        <th className="py-2.5 px-3 text-center w-24">Qty Diterima</th>
                        <th className="py-2.5 px-3 text-right w-32">Harga Satuan</th>
                        <th className="py-2.5 px-3 text-right w-36">Total (IDR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {po.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{item.sku}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                            {item.description}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                item.receivedQty >= item.quantity
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : item.receivedQty > 0
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'text-slate-400'
                              }`}
                            >
                              {item.receivedQty} {item.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                            {formatCurrency(item.unitPrice, po.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white">
                            {formatCurrency(item.total, po.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
                <div className="sm:max-w-md text-slate-500 text-xs space-y-2">
                  {po.notes && (
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-800/40 text-amber-900 dark:text-amber-200">
                      <div className="font-semibold mb-1 text-[11px]">Catatan Khusus PO:</div>
                      <div>{po.notes}</div>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-80 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Subtotal:</span>
                    <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(po.subtotal, po.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Pajak (PPN {po.taxRate}%):</span>
                    <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                      + {formatCurrency(po.taxAmount, po.currency)}
                    </span>
                  </div>
                  {po.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Diskon:</span>
                      <span className="tabular-nums font-semibold">
                        - {formatCurrency(po.discountAmount, po.currency)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm">
                    <span className="font-bold text-slate-900 dark:text-white">Grand Total:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {formatCurrency(po.totalAmount, po.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <GitCommit className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Audit Trail Berbasis Git Immutable:
                  </span>{' '}
                  Setiap pergantian status PO dicatat lengkap dengan timestamp, identitas penanggung jawab, catatan otorisasi, dan representasi Commit SHA.
                </div>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {po.approvals.map((log) => (
                  <div key={log.id} className="relative group">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white dark:ring-slate-900" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs">
                          {log.action}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-medium">
                          {log.performedBy} ({log.role})
                        </span>
                        {log.commitHash && (
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 rounded border border-slate-200 dark:border-slate-700">
                            commit {log.commitHash}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {formatDateTime(log.timestamp)}
                      </div>
                      {log.notes && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded text-slate-700 dark:text-slate-300 text-xs mt-1 border border-slate-200 dark:border-slate-700">
                          {log.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'receipts' && (
            <div className="space-y-4">
              {po.goodsReceipts.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  <Truck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p>Belum ada pencatatan penerimaan barang untuk nomor PO ini.</p>
                  {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && (
                    <button
                      onClick={() => onOpenReceiveGoods(po)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Catat Penerimaan Pertama Sekarang</span>
                    </button>
                  )}
                </div>
              ) : (
                po.goodsReceipts.map((gr) => (
                  <div
                    key={gr.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                          {gr.receiptNumber}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          Surat Jalan: <span className="font-mono font-medium">{gr.deliveryNoteNumber}</span>
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        Tgl Terima: {formatDate(gr.receivedDate)}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500">
                      Penerima di Gudang: <span className="font-medium text-slate-700 dark:text-slate-200">{gr.receivedBy}</span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-semibold uppercase">
                          <tr>
                            <th className="py-1.5 px-3">Item</th>
                            <th className="py-1.5 px-3 text-center">Qty Diterima</th>
                            <th className="py-1.5 px-3">Kondisi Fisik</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {gr.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-3">{it.description}</td>
                              <td className="py-1.5 px-3 text-center font-mono font-semibold">
                                {it.qtyReceived}
                              </td>
                              <td className="py-1.5 px-3">
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                  {it.condition}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Workflow Action Bar */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Peran Anda saat ini: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{currentRole}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Manager Approval Actions */}
            {currentRole === 'MANAGER' && po.status === 'PENDING_APPROVAL' && (
              <>
                {!showRejectBox ? (
                  <>
                    <button
                      onClick={() => setShowRejectBox(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors"
                    >
                      Tolak PO
                    </button>
                    <button
                      onClick={() => onApprovePO(po, approvalNote || 'Disetujui oleh Department Head.')}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Setujui Purchase Order (Approve)</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Alasan penolakan PO..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-rose-300 rounded-lg focus:ring-1 focus:ring-rose-500 w-60"
                    />
                    <button
                      onClick={() => {
                        onRejectPO(po, rejectReason || 'Ditolak untuk revisi anggaran');
                        setShowRejectBox(false);
                      }}
                      className="px-3 py-1 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                    >
                      Konfirmasi Tolak
                    </button>
                    <button
                      onClick={() => setShowRejectBox(false)}
                      className="px-2 py-1 text-xs text-slate-500"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Purchasing: Send to Vendor */}
            {(currentRole === 'PURCHASING' || currentRole === 'MANAGER') && po.status === 'APPROVED' && (
              <button
                onClick={() => onSendToVendor(po)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Terbitkan & Kirim ke Vendor</span>
              </button>
            )}

            {/* Warehouse: Record Goods Receipt */}
            {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && (
              <button
                onClick={() => onOpenReceiveGoods(po)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Catat Penerimaan Barang Gudang</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
