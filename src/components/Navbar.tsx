import React from 'react';
import { 
  FileText, 
  Plus, 
  GitBranch, 
  PackageCheck, 
  Building2, 
  LayoutDashboard,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types/po';

interface NavbarProps {
  currentTab: 'dashboard' | 'orders' | 'vendors' | 'receipts' | 'github';
  onSelectTab: (tab: 'dashboard' | 'orders' | 'vendors' | 'receipts' | 'github') => void;
  onOpenCreatePO: () => void;
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  pendingApprovalsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCreatePO,
  currentRole,
  onChangeRole,
  pendingApprovalsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 !bg-blue-900 !border-blue-800 border-b text-white backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2 text-left focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
                  NusaProcure
                </span>
                <span className="text-[10px] text-blue-200 -mt-1 font-mono">
                  PO Management System
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-blue-100">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-2 ${
                currentTab === 'dashboard' 
                  ? 'text-white font-semibold border-b-2 border-white' 
                  : ''
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onSelectTab('orders')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-2 relative ${
                currentTab === 'orders' 
                  ? 'text-white font-semibold border-b-2 border-white' 
                  : ''
              }`}
            >
              Daftar PO
              {pendingApprovalsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 text-[11px] font-mono font-semibold bg-amber-500 text-blue-900 rounded">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onSelectTab('receipts')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-2 ${
                currentTab === 'receipts' 
                  ? 'text-white font-semibold border-b-2 border-white' 
                  : ''
              }`}
            >
              Penerimaan Barang
            </button>
            <button
              onClick={() => onSelectTab('vendors')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-2 ${
                currentTab === 'vendors' 
                  ? 'text-white font-semibold border-b-2 border-white' 
                  : ''
              }`}
            >
              Vendor & Pemasok
            </button>
            <button
              onClick={() => onSelectTab('github')}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-2 flex items-center gap-1.5 ${
                currentTab === 'github' 
                  ? 'text-white font-semibold border-b-2 border-white' 
                  : ''
              }`}
            >
              <GitBranch className="w-4 h-4 text-blue-200" />
              <span>Arsitektur GitHub</span>
            </button>
          </nav>

          {/* Zone 3: Role Switcher & 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Interactive Role Switcher */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-blue-800 rounded-lg text-xs border border-blue-700">
              <UserCheck className="w-3.5 h-3.5 text-blue-300" />
              <span className="text-blue-200 text-[11px]">Peran:</span>
              <select
                value={currentRole}
                onChange={(e) => onChangeRole(e.target.value as UserRole)}
                className="bg-transparent font-medium text-white focus:outline-none cursor-pointer"
                title="Pilih Peran Akun"
              >
                <option value="PURCHASING">Staff Pengadaan (Buat PO)</option>
                <option value="MANAGER">Manager / Approver (Setujui PO)</option>
                <option value="FINANCE_WAREHOUSE">Gudang & Finance (Penerimaan)</option>
              </select>
            </div>

            <button
              onClick={onOpenCreatePO}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-900 bg-white rounded-lg hover:bg-blue-50 transition-colors shadow-sm whitespace-nowrap shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Buat PO Baru</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden flex items-center gap-4 py-2 overflow-x-auto text-xs border-t border-blue-800">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`whitespace-nowrap py-1 ${currentTab === 'dashboard' ? 'text-white font-semibold' : 'text-blue-200'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('orders')}
            className={`whitespace-nowrap py-1 ${currentTab === 'orders' ? 'text-white font-semibold' : 'text-blue-200'}`}
          >
            Daftar PO ({pendingApprovalsCount})
          </button>
          <button
            onClick={() => onSelectTab('receipts')}
            className={`whitespace-nowrap py-1 ${currentTab === 'receipts' ? 'text-white font-semibold' : 'text-blue-200'}`}
          >
            Penerimaan Barang
          </button>
          <button
            onClick={() => onSelectTab('vendors')}
            className={`whitespace-nowrap py-1 ${currentTab === 'vendors' ? 'text-white font-semibold' : 'text-blue-200'}`}
          >
            Vendor
          </button>
          <button
            onClick={() => onSelectTab('github')}
            className={`whitespace-nowrap py-1 ${currentTab === 'github' ? 'text-white font-semibold' : 'text-blue-200'}`}
          >
            Arsitektur GitHub
          </button>
        </div>
      </div>
    </header>
  );
};
