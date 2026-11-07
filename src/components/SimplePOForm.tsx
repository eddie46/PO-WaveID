import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, 
  User, 
  Phone, 
  MapPin, 
  CheckSquare, 
  Square, 
  Settings, 
  AlertCircle,
  Plus,
  Minus,
  CheckCircle2,
  QrCode,
  Sliders,
  Copy,
  Check
} from 'lucide-react';
import { formatSimpleOrderForWA } from '../utils/waHelper';
import { checkDuplicateOrder, normalizePhone, normalizeName, normalizeAddress } from '../utils/antiDuplicate';
import logoSvg from '../../public/assets/aistudio/icon_3eb33ab9.svg';
import { SimplePOOrder, SimplePOItem, WAConfig, AdminStoreConfig, ProductSetting } from '../types/po';

interface SimplePOFormProps {
  nextPoNumber: string;
  waConfig: WAConfig;
  adminConfig: AdminStoreConfig;
  existingOrders?: SimplePOOrder[];
  onOpenWASettings: () => void;
  onOpenAdminSettings: () => void;
  onSubmitOrder: (order: SimplePOOrder) => void;
}

export const SimplePOForm: React.FC<SimplePOFormProps> = ({
  nextPoNumber,
  waConfig,
  adminConfig,
  existingOrders = [],
  onOpenWASettings,
  onOpenAdminSettings,
  onSubmitOrder,
}) => {
  // Map product ID -> { selected: boolean, quantity: number }
  const [selections, setSelections] = useState<Record<string, { selected: boolean; quantity: number }>>({});

  // Sync selection state dynamically whenever adminConfig.products updates
  useEffect(() => {
    setSelections((prev) => {
      const next = { ...prev };
      adminConfig.products.forEach((prod) => {
        const isAvailable = prod.isActive && prod.stock > 0;
        const maxQty = isAvailable ? Math.max(1, Math.min(prod.maxPerOrder, prod.stock)) : 0;

        if (!(prod.id in next)) {
          // Default: 0 quantity when opening web
          next[prod.id] = {
            selected: false,
            quantity: 0,
          };
        } else {
          // Adjust existing selections for changed stock/maxPerOrder limits
          const cur = next[prod.id];
          const newQty = Math.min(Math.max(0, cur.quantity), maxQty);
          next[prod.id] = { selected: isAvailable && newQty > 0, quantity: newQty };
        }
      });
      return next;
    });
  }, [adminConfig.products]);

  // Data Pemesan
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedNextPo, setCopiedNextPo] = useState(false);

  // DETEKSI DUPLIKASI BERDASARKAN NAMA, NOMOR HP, DAN ALAMAT
  const duplicateCheck = useMemo(() => {
    return checkDuplicateOrder('', customerPhone, '', existingOrders);
  }, [customerPhone, existingOrders]);

  // Change quantity for a product
  const handleQtyChange = (prod: ProductSetting, newVal: number) => {
    const isAvailable = prod.isActive && prod.stock > 0;
    if (!isAvailable) return;
    const maxQty = Math.max(1, Math.min(prod.maxPerOrder, prod.stock));
    setValidationError(null);

    if (newVal > maxQty) {
      setValidationError(`Maksimal pemesanan ${prod.name} adalah ${maxQty} unit (sesuai batas/stok).`);
      newVal = maxQty;
    }
    const validQty = Math.max(0, newVal);

    setSelections((prev) => ({
      ...prev,
      [prod.id]: {
        selected: validQty > 0,
        quantity: validQty,
      },
    }));
  };

  // Kalkulasi Barang Aktif & Total Harga
  const activeItems: SimplePOItem[] = useMemo(() => {
    const list: SimplePOItem[] = [];
    adminConfig.products.forEach((prod) => {
      const isAvailable = prod.isActive && prod.stock > 0;
      const sel = selections[prod.id];
      if (isAvailable && sel && sel.quantity > 0) {
        list.push({
          id: `item-${prod.id}`,
          name: prod.name,
          quantity: sel.quantity,
          unitPrice: prod.price,
          subtotal: sel.quantity * prod.price,
          notes: prod.description,
        });
      }
    });
    return list;
  }, [adminConfig.products, selections]);

  const totalPrice = useMemo(() => {
    return activeItems.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  }, [activeItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Validasi Anti-Duplikasi
    if (duplicateCheck.isDuplicate) {
      setValidationError('Pemesanan tidak dapat dilanjutkan. Data pemesanan Anda sudah pernah tercatat dalam sistem.');
      return;
    }

    // 2. Validasi Pemilihan Barang
    if (activeItems.length === 0) {
      setValidationError('Pilih minimal salah satu barang yang tersedia.');
      return;
    }

    // 3. Validasi Batas Maksimal
    for (const prod of adminConfig.products) {
      const sel = selections[prod.id];
      if (prod.isActive && prod.stock > 0 && sel && sel.selected) {
        const maxQty = Math.max(1, Math.min(prod.maxPerOrder, prod.stock));
        if (sel.quantity > maxQty) {
          setValidationError(`Maksimal pemesanan ${prod.name} adalah ${maxQty} unit.`);
          return;
        }
      }
    }

    // 4. Data Pemesan
    if (!customerName.trim()) {
      setValidationError('Silakan isi Nama Pemesan.');
      return;
    }

    if (!customerPhone.trim()) {
      setValidationError('Silakan isi Nomor Telepon / WhatsApp Pemesan.');
      return;
    }

    if (!customerAddress.trim()) {
      setValidationError('Silakan isi Alamat Lengkap Pengiriman.');
      return;
    }

    if (!confirmed) {
      setValidationError('Harap beri tanda centang pada kotak konfirmasi bahwa data sudah benar.');
      return;
    }

    const newOrder: SimplePOOrder = {
      id: `ord-${Date.now()}`,
      poNumber: nextPoNumber,
      createdAt: new Date().toISOString(),
      items: activeItems,
      totalPrice: totalPrice,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      confirmed: true,
      notes: notes.trim(),
      sentToWA: true,
    };

    onSubmitOrder(newOrder);

    // Reset input fields setelah pesanan tersimpan
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setNotes('');
    setConfirmed(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-2 sm:py-4 px-1 sm:px-0">
      {/* Brand Header: Responsif Otomatis untuk Android (HP) & PC (Desktop) */}
      <div className="flex flex-col items-center justify-center mb-4 sm:mb-6 gap-2 bg-transparent text-center">
        <img 
          src={logoSvg} 
          alt="WaveID Logo" 
          className="h-24 xs:h-32 sm:h-48 md:h-60 lg:h-64 w-auto max-w-full object-contain drop-shadow-sm transition-all duration-300"
        />
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 tracking-wide text-center">
          WaveID Official
        </h2>
      </div>

      {/* Main Order Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-md overflow-hidden">
        {/* Form Title & PO Number */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 font-mono uppercase tracking-wider">
              Purchase Order
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 leading-tight">
              Formulir Pemesanan
            </h1>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-mono block">No. PO</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(nextPoNumber);
                setCopiedNextPo(true);
                setTimeout(() => setCopiedNextPo(false), 2000);
              }}
              className="font-mono font-bold text-xs sm:text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 whitespace-nowrap inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Klik untuk salin Nomor PO"
            >
              <span>{nextPoNumber}</span>
              {copiedNextPo ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3 text-indigo-500" />
              )}
            </button>
          </div>
        </div>

        {/* Form Elements */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6 text-xs">
          {/* Validation Warning Alert */}
          {validationError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="leading-tight">{validationError}</span>
            </div>
          )}

          {/* SECTION 1: Pilihan Barang & Stok */}
          <div className="space-y-3">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1.5">
              <label className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>1. Pilihan Barang *</span>
              </label>

              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 self-start xs:self-auto">
                Katalog Produk ({adminConfig.products.filter((p) => p.isActive && p.stock > 0).length} Tersedia)
              </span>
            </div>

            <div className="space-y-3">
              {adminConfig.products.length === 0 ? (
                <div className="p-4 text-center text-slate-500 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  Belum ada produk di katalog. Silakan tambahkan produk baru di Panel Admin.
                </div>
              ) : (
                adminConfig.products.map((prod, idx) => {
                  const isAvailable = prod.isActive && prod.stock > 0;
                  const maxQty = isAvailable ? Math.max(1, Math.min(prod.maxPerOrder, prod.stock)) : 0;
                  const sel = selections[prod.id] || { selected: false, quantity: 0 };
                  const qty = isAvailable ? (sel.quantity || 0) : 0;
                  const isSelected = qty > 0;
                  const price = prod.price;
                  const subtotal = qty * price;

                  const themeColors = [
                    { borderSelected: 'border-indigo-400 dark:border-indigo-500/80', bgSelected: 'bg-indigo-50/70 dark:bg-indigo-950/40', badgeBg: 'bg-indigo-600', subtotalColor: 'text-indigo-700 dark:text-indigo-300' },
                    { borderSelected: 'border-amber-400 dark:border-amber-500/80', bgSelected: 'bg-amber-50/70 dark:bg-amber-950/40', badgeBg: 'bg-amber-600', subtotalColor: 'text-amber-700 dark:text-amber-300' },
                    { borderSelected: 'border-emerald-400 dark:border-emerald-500/80', bgSelected: 'bg-emerald-50/70 dark:bg-emerald-950/40', badgeBg: 'bg-emerald-600', subtotalColor: 'text-emerald-700 dark:text-emerald-300' },
                    { borderSelected: 'border-blue-400 dark:border-blue-500/80', bgSelected: 'bg-blue-50/70 dark:bg-blue-950/40', badgeBg: 'bg-blue-600', subtotalColor: 'text-blue-700 dark:text-blue-300' },
                  ];
                  const theme = themeColors[idx % themeColors.length];

                  return (
                    <div
                      key={prod.id}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                        !isAvailable
                          ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? `${theme.bgSelected} ${theme.borderSelected} shadow-sm ring-1 ring-inset ${theme.borderSelected}`
                          : 'bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3 select-none">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white tracking-wide">
                              {prod.name}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold ${theme.badgeBg} text-white rounded-md shadow-2xs whitespace-nowrap`}>
                              Rp {price.toLocaleString('id-ID')}
                            </span>
                            
                            {/* Stok Badge */}
                            {prod.stock === 0 ? (
                              <span className="px-1 py-0.2 text-[9px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800 whitespace-nowrap">
                                Habis
                              </span>
                            ) : (
                              <span className="px-1 py-0.2 text-[9px] font-mono font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                Stok: {prod.stock}
                              </span>
                            )}
                          </div>
                          {prod.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight line-clamp-2">
                              {prod.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Stepper Jumlah & Subtotal */}
                      <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/80">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">Jumlah:</span>
                          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              disabled={!isAvailable || qty <= 0}
                              onClick={(e) => { e.stopPropagation(); handleQtyChange(prod, qty - 1); }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-200 cursor-pointer disabled:cursor-not-allowed"
                              title="Kurangi Jumlah"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className={`w-8 text-center font-mono font-bold text-xs ${qty > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
                              {qty}
                            </span>
                            <button
                              type="button"
                              disabled={!isAvailable || qty >= maxQty}
                              onClick={(e) => { e.stopPropagation(); handleQtyChange(prod, qty + 1); }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-700 dark:text-slate-200 cursor-pointer disabled:cursor-not-allowed"
                              title="Tambah Jumlah"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase block leading-none mb-0.5">Subtotal</span>
                          <span className={`font-mono font-bold text-xs ${qty > 0 ? theme.subtotalColor : 'text-slate-400 dark:text-slate-500'}`}>
                            Rp {subtotal.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Pembayaran Banner */}
            <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col gap-2">
              <div className="flex items-start gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="font-bold shrink-0">Rincian:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {activeItems.length > 0
                    ? activeItems.map((it) => `${it.name} (${it.quantity}x)`).join(' + ')
                    : 'Belum ada barang dipilih'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Total Pembayaran</span>
                <span className="font-mono font-bold text-sm sm:text-base text-emerald-700 dark:text-emerald-400">
                  {(() => {
                    const poDigits = parseInt(nextPoNumber.replace(/\D/g, '').slice(-3) || '1', 10);
                    const finalSum = totalPrice + poDigits;
                    return `Rp ${finalSum.toLocaleString('id-ID')}`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Data Pemesan */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700/80">
            <label className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>2. Data Pemesan *</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* Nama Pemesan */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Nama Lengkap Pemesan
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-[11px] sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Nomor Telepon / WA */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Nomor HP / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder="Contoh: 081234567890"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-[11px] sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Alamat Lengkap Pengiriman */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Alamat Lengkap Pengiriman
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <textarea
                  rows={3}
                  required
                  value={customerAddress}
                  onChange={(e) => {
                    setCustomerAddress(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="Masukkan jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota/kabupaten..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none text-[11px] sm:text-xs leading-relaxed text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Catatan Tambahan (Opsional) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Kirim saat jam kerja..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-[11px] sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* SECTION 3: Konfirmasi Kebenaran Data */}
          <div className="pt-1">
            <div
              onClick={() => setConfirmed(!confirmed)}
              className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer select-none transition-all ${
                confirmed
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                  : 'bg-slate-50 dark:bg-slate-900/80 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              <div className="mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                {confirmed ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-bold text-slate-900 dark:text-white text-[11px] sm:text-xs block">
                  Konfirmasi Kebenaran Data
                </span>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">
                  Saya menyatakan data di atas sudah <strong>BENAR</strong> dan sesuai.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!confirmed || activeItems.length === 0 || duplicateCheck.isDuplicate}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-95 btn-gradient ${
                confirmed && activeItems.length > 0 && !duplicateCheck.isDuplicate
                  ? 'cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <QrCode className="w-5 h-5 shrink-0" />
              <span className="truncate">
                <span className="hidden xs:inline">PESAN SEKARANG • </span>
                <span className="xs:hidden">PESAN • </span>
                {(() => {
                  const poDigits = parseInt(nextPoNumber.replace(/\D/g, '').slice(-3) || '1', 10);
                  const finalSum = totalPrice + poDigits;
                  return `RP ${finalSum.toLocaleString('id-ID')}`;
                })()}
              </span>
            </button>

            {/* Helper status text under button */}
            <div className="text-center text-[10px] mt-2.5 px-2">
              {duplicateCheck.isDuplicate ? (
                <span className="text-rose-600 font-bold">
                  ⛔ Data pemesanan ini sudah tercatat sebelumnya.
                </span>
              ) : activeItems.length === 0 ? (
                <span className="text-amber-600 font-medium">
                  * Harap pilih minimal 1 barang.
                </span>
              ) : !confirmed ? (
                <span className="text-amber-600 font-medium">
                  * Centang konfirmasi untuk mengaktifkan tombol.
                </span>
              ) : (
                <span className="text-emerald-600 font-medium opacity-80">
                  ✓ Klik untuk proses &amp; tampilkan QRIS DANA ({adminConfig.danaPhone})
                </span>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
