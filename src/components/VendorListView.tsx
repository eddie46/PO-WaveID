import React, { useState } from 'react';
import { Building2, Plus, Search, Phone, Mail, MapPin, Star, X } from 'lucide-react';
import { Vendor, PurchaseOrder } from '../types/po';
import { formatCurrency } from '../utils/formatters';

interface VendorListViewProps {
  vendors: Vendor[];
  orders: PurchaseOrder[];
  onAddVendor: (vendor: Vendor) => void;
  onOpenCreatePOWithVendor: (vendorId: string) => void;
}

export const VendorListView: React.FC<VendorListViewProps> = ({
  vendors,
  orders,
  onAddVendor,
  onOpenCreatePOWithVendor,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [picName, setPicName] = useState('');
  const [picPhone, setPicPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [category, setCategory] = useState('IT & Komputer');
  const [bankInfo, setBankInfo] = useState('');

  const filteredVendors = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.picName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newVendor: Vendor = {
      id: `VND-${String(vendors.length + 1).padStart(3, '0')}`,
      name,
      picName,
      picPhone,
      email,
      address,
      taxId: taxId || '00.000.000.0-000.000',
      category,
      rating: 4.8,
      bankInfo: bankInfo || 'BCA a/n ' + name,
    };

    onAddVendor(newVendor);
    setIsModalOpen(false);
    // Reset form
    setName('');
    setPicName('');
    setPicPhone('');
    setEmail('');
    setAddress('');
    setTaxId('');
  };

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Direktori Vendor & Pemasok
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Data rekanan penyedia barang dan jasa resmi yang terdaftar untuk penerbitan Purchase Order.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Rekanan Baru</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari nama vendor, bidang usaha, atau PIC..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVendors.map((vendor) => {
          const vendorOrders = orders.filter((o) => o.vendorId === vendor.id);
          const totalSpend = vendorOrders
            .filter((o) => o.status !== 'CANCELLED')
            .reduce((sum, o) => sum + o.totalAmount, 0);

          return (
            <div
              key={vendor.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      {vendor.id}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                      {vendor.name}
                    </h3>
                    <div className="text-xs text-slate-500 font-medium">{vendor.category}</div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-amber-500 font-bold shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{vendor.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-750">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{vendor.picName} ({vendor.picPhone})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-[11px] text-slate-500">{vendor.address}</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-750 text-[11px] font-mono space-y-1">
                  <div className="text-slate-500">NPWP: {vendor.taxId}</div>
                  <div className="text-slate-700 dark:text-slate-300 truncate">
                    Rekening: {vendor.bankInfo}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Riwayat Belanja</div>
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(totalSpend)} ({vendorOrders.length} PO)
                  </div>
                </div>

                <button
                  onClick={() => onOpenCreatePOWithVendor(vendor.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800"
                >
                  Buat PO ke Vendor Ini
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Vendor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Daftarkan Vendor / Supplier Baru
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Nama Perusahaan / Supplier *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Sumber Perkasa Mandiri"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Nama PIC *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama Kontak Sales"
                      value={picName}
                      onChange={(e) => setPicName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      No. WhatsApp / HP *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0812-xxxx-xxxx"
                      value={picPhone}
                      onChange={(e) => setPicPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Email Bisnis *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="sales@vendor.co.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Kategori Industri
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    >
                      <option value="IT & Komputer">IT & Komputer</option>
                      <option value="Kemasan & Gudang">Kemasan & Gudang</option>
                      <option value="ATK & Kantor">ATK & Kantor</option>
                      <option value="Pabrik & Industri">Pabrik & Industri</option>
                      <option value="MRO & Sparepart">MRO & Sparepart</option>
                      <option value="Logistik & Transport">Logistik & Transport</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Alamat Lengkap Perusahaan
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Alamat kantor atau gudang vendor..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      NPWP Perusahaan
                    </label>
                    <input
                      type="text"
                      placeholder="01.234.567.8-012.000"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Rekening Bank Pembayaran
                    </label>
                    <input
                      type="text"
                      placeholder="BCA - 12345678 a/n PT ..."
                      value={bankInfo}
                      onChange={(e) => setBankInfo(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Simpan Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
