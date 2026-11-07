import React from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Building2, 
  GitCommit, 
  ArrowUpRight, 
  AlertCircle,
  Plus,
  ShieldCheck,
  TrendingUp,
  FileCheck2
} from 'lucide-react';
import { PurchaseOrder, UserRole } from '../types/po';
import { formatCurrency, formatDate, STATUS_LABELS } from '../utils/formatters';

interface DashboardViewProps {
  orders: PurchaseOrder[];
  currentRole: UserRole;
  onOpenCreatePO: () => void;
  onViewPO: (po: PurchaseOrder) => void;
  onApprovePO: (po: PurchaseOrder) => void;
  onSelectTab: (tab: 'dashboard' | 'orders' | 'vendors' | 'receipts' | 'github') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  currentRole,
  onOpenCreatePO,
  onViewPO,
  onApprovePO,
  onSelectTab,
}) => {
  // Financial computations
  const totalSpend = orders
    .filter((o) => o.status !== 'CANCELLED' && o.status !== 'DRAFT')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const pendingOrders = orders.filter((o) => o.status === 'PENDING_APPROVAL');
  const approvedOrders = orders.filter((o) => o.status === 'APPROVED');
  const sentOrders = orders.filter((o) => o.status === 'SENT' || o.status === 'PARTIALLY_RECEIVED');
  const fulfilledOrders = orders.filter((o) => o.status === 'FULFILLED');

  // Department expenditure breakdown
  const departmentExpenditure = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((acc, curr) => {
      acc[curr.department] = (acc[curr.department] || 0) + curr.totalAmount;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="space-y-8 py-6">
      {/* Top Banner / Welcome context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Sistem Pengadaan & Logistik</span>
            <span aria-hidden="true">·</span>
            <span>Versi Web Terintegrasi</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">Git Commit Audit Ready</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard Pengadaan (Purchase Order)
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
            Pantau pergerakan pengadaan barang, otorisasi persetujuan anggaran perusahaan, penerimaan logistik gudang, dan sinkronisasi arsip ke repositori GitHub.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('github')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
          >
            <GitCommit className="w-3.5 h-3.5 text-indigo-500" />
            <span>Lihat Solusi GitHub</span>
          </button>
          <button
            onClick={onOpenCreatePO}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Buat PO Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Belanja */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Komitmen Belanja PO</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(totalSpend)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Dari <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{orders.filter(o => o.status !== 'CANCELLED').length}</span> dokumen PO aktif
          </div>
        </div>

        {/* Menunggu Persetujuan */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Menunggu Persetujuan</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {pendingOrders.length}
            </span>
            <span className="text-xs text-slate-500">dokumen</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {pendingOrders.length > 0 
              ? 'Membutuhkan tanda tangan Manager'
              : 'Semua dokumen telah diproses'}
          </div>
        </div>

        {/* Disetujui & Siap Kirim */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Disetujui / Siap Dikirim</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-blue-600 dark:text-blue-400">
              {approvedOrders.length}
            </span>
            <span className="text-xs text-slate-500">dokumen</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Siap diterbitkan & dicetak ke vendor
          </div>
        </div>

        {/* Selesai / Diterima Gudang */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Diterima Lengkap di Gudang</span>
            <Truck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {fulfilledOrders.length}
            </span>
            <span className="text-xs text-slate-500">PO selesai</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Barang telah lolos Quality Check
          </div>
        </div>
      </div>

      {/* Main Content Split: Pending Approvals Queue + Department Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Action Queue (PO Menunggu Approval / Tindakan) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Antrean Persetujuan & Tindakan Cepat
              </h2>
            </div>
            <button
              onClick={() => onSelectTab('orders')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Lihat Semua PO</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-750">
            {pendingOrders.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                <FileCheck2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p>Tidak ada dokumen PO yang menunggu persetujuan saat ini.</p>
                <p className="text-xs text-slate-400 mt-1">Seluruh pengajuan sudah diproses.</p>
              </div>
            ) : (
              pendingOrders.map((po) => (
                <div key={po.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {po.poNumber}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {po.department}
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">
                        {formatDate(po.createdAt)}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {po.vendorName}
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {po.items.length} item barang · Dibuat oleh <span className="font-medium">{po.createdBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(po.totalAmount)}
                      </div>
                      <div className="text-[11px] text-slate-400">Term: {po.paymentTerms}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onViewPO(po)}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors"
                      >
                        Detail
                      </button>

                      {currentRole === 'MANAGER' && (
                        <button
                          onClick={() => onApprovePO(po)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-xs"
                        >
                          Setujui
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Department Budget Allocation & Git Audit Status */}
        <div className="space-y-6">
          {/* Department Breakdown */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Alokasi Pengeluaran per Departemen
            </h3>
            <div className="space-y-3">
              {Object.entries(departmentExpenditure).map(([dept, amount]) => {
                const percentage = totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0;
                return (
                  <div key={dept} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{dept}</span>
                      <span className="font-mono text-slate-900 dark:text-white tabular-nums font-semibold">
                        {formatCurrency(amount)} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full" 
                        style={{ width: `${Math.min(100, percentage)}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* GitHub Architecture Highlight */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <GitCommit className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                GitHub Powered System
              </span>
            </div>
            <h4 className="text-base font-bold mb-1">
              Audit Trail Berbasis Git Commit
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Setiap pembuatan PO dan persetujuan manager dapat dicatat sebagai commit file JSON terenkripsi ke repositori GitHub perusahaan Anda.
            </p>
            <button
              onClick={() => onSelectTab('github')}
              className="w-full py-2 px-3 text-xs font-semibold bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Pelajari Arsitektur & Cara Kerja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
