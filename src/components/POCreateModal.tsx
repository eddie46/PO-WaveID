import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Calculator, 
  Building2, 
  Calendar, 
  CreditCard, 
  MapPin, 
  Check,
  GitCommit
} from 'lucide-react';
import { PurchaseOrder, Vendor, POLineItem } from '../types/po';
import { formatCurrency } from '../utils/formatters';

interface POCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: Vendor[];
  existingOrdersCount: number;
  onCreatePO: (newPO: PurchaseOrder) => void;
}

export const POCreateModal: React.FC<POCreateModalProps> = ({
  isOpen,
  onClose,
  vendors,
  existingOrdersCount,
  onCreatePO,
}) => {
  if (!isOpen) return null;

  // Auto-generate PO number
  const generatedPoNumber = `PO-2026-${String(existingOrdersCount + 39).padStart(4, '0')}`;

  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id || '');
  const [department, setDepartment] = useState<PurchaseOrder['department']>('IT & Hardware');
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState<PurchaseOrder['paymentTerms']>('Net 30');
  const [shippingAddress, setShippingAddress] = useState<string>(
    'Head Office PT Nusa Teknologi Solusindo, Lt. 14, Sudirman Central Business District (SCBD), Jakarta Selatan'
  );
  const [notes, setNotes] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(11); // PPN 11%
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [creatorName, setCreatorName] = useState<string>('Staff Pengadaan (Anda)');

  // Initial line items
  const [items, setItems] = useState<Array<Omit<POLineItem, 'id' | 'total' | 'receivedQty'>>>([
    {
      sku: 'PRC-001',
      description: '',
      quantity: 1,
      unit: 'Unit',
      unitPrice: 0,
    },
  ]);

  const activeVendor = vendors.find((v) => v.id === selectedVendorId) || vendors[0];

  // Item management
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        sku: `PRC-${String(prev.length + 1).padStart(3, '0')}`,
        description: '',
        quantity: 1,
        unit: 'Pcs',
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Calculations
  const calculatedItems: POLineItem[] = items.map((it, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    sku: it.sku || `SKU-${idx + 1}`,
    description: it.description,
    quantity: Math.max(1, Number(it.quantity) || 1),
    unit: it.unit || 'Unit',
    unitPrice: Math.max(0, Number(it.unitPrice) || 0),
    total: Math.max(1, Number(it.quantity) || 1) * Math.max(0, Number(it.unitPrice) || 0),
    receivedQty: 0,
  }));

  const subtotal = calculatedItems.reduce((acc, curr) => acc + curr.total, 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

  const handleSubmit = (status: 'DRAFT' | 'PENDING_APPROVAL') => {
    if (!activeVendor) return;

    // Check that at least one item has description
    const hasValidItem = calculatedItems.some((it) => it.description.trim().length > 0);
    if (!hasValidItem) {
      alert('Silakan masukkan deskripsi minimal untuk 1 item barang pesanan.');
      return;
    }

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: generatedPoNumber,
      vendorId: activeVendor.id,
      vendorName: activeVendor.name,
      vendorPic: activeVendor.picName,
      vendorEmail: activeVendor.email,
      vendorAddress: activeVendor.address,
      vendorTaxId: activeVendor.taxId,
      createdAt: new Date().toISOString(),
      deliveryDate,
      department,
      status,
      items: calculatedItems,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      totalAmount,
      currency: 'IDR',
      paymentTerms,
      shippingAddress,
      notes,
      createdBy: creatorName,
      approvals: [
        {
          id: `appr-${Date.now()}`,
          action: status === 'DRAFT' ? 'CREATED' : 'SUBMITTED',
          performedBy: creatorName,
          role: 'Procurement Staff',
          timestamp: new Date().toISOString(),
          notes: status === 'DRAFT' ? 'Draft PO disimpan' : 'Diajukan untuk persetujuan Manager',
          commitHash: Math.random().toString(36).substring(2, 9),
        },
      ],
      goodsReceipts: [],
      gitSyncStatus: 'local',
    };

    onCreatePO(newPO);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {generatedPoNumber}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Penerbitan Surat Pesanan Baru
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Formulir Buat Purchase Order
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Section 1: Vendor & General Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor Selector */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pilih Vendor / Pemasok *</span>
              </label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full px-3 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.category})
                  </option>
                ))}
              </select>
              {activeVendor && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-750 text-[11px] text-slate-500 space-y-0.5">
                  <div>PIC: <span className="text-slate-800 dark:text-slate-200 font-medium">{activeVendor.picName} ({activeVendor.picPhone})</span></div>
                  <div>Email: {activeVendor.email}</div>
                  <div>Alamat: {activeVendor.address}</div>
                  <div>NPWP: <span className="font-mono">{activeVendor.taxId}</span></div>
                </div>
              )}
            </div>

            {/* Department, Target Date, Payment Terms */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Departemen Pemesan *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    <option value="IT & Hardware">IT & Hardware</option>
                    <option value="Operasional">Operasional</option>
                    <option value="Logistik & Gudang">Logistik & Gudang</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR & General Affairs">HR & General Affairs</option>
                    <option value="Produksi">Produksi</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Target Kirim (Delivery) *
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Termin Pembayaran *
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    <option value="Net 30">Net 30 (30 Hari)</option>
                    <option value="Net 14">Net 14 (14 Hari)</option>
                    <option value="Net 60">Net 60 (60 Hari)</option>
                    <option value="Cash on Delivery (COD)">COD (Bayar Saat Tiba)</option>
                    <option value="50% DP, 50% Pelunasan">50% DP, 50% Pelunasan</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Dibuat Oleh
                  </label>
                  <input
                    type="text"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Alamat Pengiriman (Delivery Destination) *
                </label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Line Items Dynamic Table */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Daftar Barang & Jasa (Line Items)
                </h3>
                <p className="text-slate-500 text-[11px]">
                  Masukkan spesifikasi barang, kuantitas, satuan, dan harga satuan dalam IDR.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Item</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 w-28">Kode / SKU</th>
                    <th className="py-2.5 px-3">Deskripsi Barang / Jasa</th>
                    <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                    <th className="py-2.5 px-3 w-24">Satuan</th>
                    <th className="py-2.5 px-3 w-36 text-right">Harga Satuan (IDR)</th>
                    <th className="py-2.5 px-3 w-36 text-right">Total (IDR)</th>
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item, idx) => {
                    const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="SKU-001"
                            value={item.sku}
                            onChange={(e) => handleItemChange(idx, 'sku', e.target.value)}
                            className="w-full px-2 py-1 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Nama atau spesifikasi detail barang..."
                            value={item.description}
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 text-xs text-center font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                          >
                            <option value="Unit">Unit</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Box">Box</option>
                            <option value="Rim">Rim</option>
                            <option value="Kg">Kg</option>
                            <option value="Set">Set</option>
                            <option value="Roll">Roll</option>
                            <option value="Paket">Paket</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            placeholder="0"
                            value={item.unitPrice || ''}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            className="w-full px-2 py-1 text-xs text-right font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                          {formatCurrency(rowTotal)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            className={`p-1 rounded text-slate-400 hover:text-rose-600 transition-colors ${
                              items.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Notes & Financial Calculation Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            {/* Notes */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Catatan / Syarat & Ketentuan Khusus PO
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Barang harus dilengkapi kartu garansi resmi 2 tahun. Pengiriman H-1 sebelum jam 15.00 WIB."
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Calculations Box */}
            <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 font-mono">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Subtotal Barang:</span>
                <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Pajak PPN:</span>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="px-1.5 py-0.5 text-[11px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                  >
                    <option value={11}>PPN 11%</option>
                    <option value={12}>PPN 12%</option>
                    <option value={0}>Non-PPN (0%)</option>
                  </select>
                </div>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                  + {formatCurrency(taxAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Diskon Pembelian:</span>
                <div className="w-32">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2 py-0.5 text-xs text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between text-sm">
                <span className="font-bold text-slate-900 dark:text-white">Grand Total PO:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-indigo-500" />
            <span>PO akan langsung dicatat ke dalam audit trail Git lokal & siap di-push ke GitHub.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('DRAFT')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              Simpan Draft
            </button>

            <button
              type="button"
              onClick={() => handleSubmit('PENDING_APPROVAL')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Ajukan Persetujuan (Submit PO)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
