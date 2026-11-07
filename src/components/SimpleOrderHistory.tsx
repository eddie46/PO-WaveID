import React, { useState, useEffect } from 'react';
import {
  Package,
  MessageSquare,
  Copy,
  Check,
  Trash2,
  Calendar,
  MapPin,
  User,
  Phone,
  QrCode,
  CheckCircle2,
  Clock,
  Search,
  X,
  SearchCheck,
  Truck,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import { SimplePOOrder, WAConfig, ShippingStatus } from '../types/po';
import { formatSimpleOrderForWA, openWhatsAppWithOrder } from '../utils/waHelper';

interface SimpleOrderHistoryProps {
  orders: SimplePOOrder[];
  config: WAConfig;
  danaPhone?: string;
  initialFilter?: {
    poNumber?: string;
    customerName?: string;
    customerPhone?: string;
  };
  onDeleteOrder: (id: string) => void;
  onClearAll?: () => void;
  onResetSamples?: () => void;
  onViewQRIS?: (order: SimplePOOrder) => void;
  onUpdateOrderShipping?: (
    orderId: string,
    courier: string,
    trackingNumber: string,
    shippingStatus: ShippingStatus
  ) => void;
}

export const SimpleOrderHistory: React.FC<SimpleOrderHistoryProps> = ({
  orders,
  config,
  danaPhone,
  initialFilter,
  onDeleteOrder,
  onClearAll,
  onResetSamples,
  onViewQRIS,
  onUpdateOrderShipping,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPOId, setCopiedPOId] = useState<string | null>(null);

  // Search states for Cek Status
  const [searchPO, setSearchPO] = useState(initialFilter?.poNumber || '');
  const [searchName, setSearchName] = useState(initialFilter?.customerName || '');
  const [searchPhone, setSearchPhone] = useState(initialFilter?.customerPhone || '');

  useEffect(() => {
    if (initialFilter) {
      if (initialFilter.poNumber !== undefined) setSearchPO(initialFilter.poNumber);
      if (initialFilter.customerName !== undefined) setSearchName(initialFilter.customerName);
      if (initialFilter.customerPhone !== undefined) setSearchPhone(initialFilter.customerPhone);
    }
  }, [initialFilter]);

  // Confirmation modal state for "Selesai"
  const [confirmOrderComplete, setConfirmOrderComplete] = useState<SimplePOOrder | null>(null);

  const handleCopy = (order: SimplePOOrder) => {
    const text = formatSimpleOrderForWA(order, danaPhone);
    navigator.clipboard.writeText(text);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendWA = (order: SimplePOOrder) => {
    const text = formatSimpleOrderForWA(order, danaPhone);
    navigator.clipboard.writeText(text);
    const route = openWhatsAppWithOrder(order, config, danaPhone);
    window.open(route.url, '_blank');
  };

  const handleConfirmComplete = () => {
    if (!confirmOrderComplete || !onUpdateOrderShipping) return;
    onUpdateOrderShipping(
      confirmOrderComplete.id,
      confirmOrderComplete.courier || 'J&T Express',
      confirmOrderComplete.trackingNumber || '',
      'DELIVERED'
    );
    setConfirmOrderComplete(null);
  };

  // Dual-Column Verification Rules: requires BOTH No. PO AND Nomor HP to unlock and display order status
  const rawPOSearch = searchPO.trim().toUpperCase();
  const cleanPOSearch = rawPOSearch.replace(/^PO-?/, '');
  const cleanPhoneSearch = searchPhone.trim().replace(/\D/g, '');
  const trimmedNameSearch = searchName.trim().toLowerCase();

  const isPOFilled = cleanPOSearch.length >= 2 || rawPOSearch.length >= 6;
  const isPhoneFilled = cleanPhoneSearch.length >= 4;
  const isNameFilled = trimmedNameSearch.length >= 3;

  const hasAnyInput = Boolean(searchPO.trim() || searchName.trim() || searchPhone.trim());
  
  // Requires at least 2 matching verification factors (e.g. PO + Phone, or PO + Name)
  const isDualVerified = (isPOFilled && isPhoneFilled) || (isPOFilled && isNameFilled) || (isPhoneFilled && isNameFilled);
  const searchFilterActive = isDualVerified;

  const filteredOrders = orders.filter((order) => {
    if (!order) return false;
    const poNum = (order.poNumber || '').toUpperCase().trim();
    const custName = (order.customerName || '').toLowerCase().trim();
    const custPhone = (order.customerPhone || '').replace(/\D/g, '');

    // Match PO
    let matchPO = true;
    if (isPOFilled) {
      if (rawPOSearch.startsWith('PO-')) {
        matchPO = poNum === rawPOSearch || poNum.endsWith(cleanPOSearch);
      } else {
        matchPO = poNum === `PO-${rawPOSearch}` || poNum.endsWith(`-${cleanPOSearch}`) || poNum === cleanPOSearch;
      }
    }

    // Match Phone
    let matchPhone = true;
    if (isPhoneFilled) {
      const normalizedSearchPhone = cleanPhoneSearch.startsWith('0') ? '62' + cleanPhoneSearch.slice(1) : cleanPhoneSearch;
      const normalizedCustPhone = custPhone.startsWith('0') ? '62' + custPhone.slice(1) : custPhone;
      matchPhone = normalizedCustPhone.includes(normalizedSearchPhone) || custPhone.endsWith(cleanPhoneSearch);
    }

    // Match Name
    let matchName = true;
    if (isNameFilled) {
      matchName = custName.includes(trimmedNameSearch);
    }

    return matchPO && matchPhone && matchName;
  });

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-4">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              <SearchCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cek Status Pemesanan PO ({orders.length})
              </h2>
              <p className="text-xs text-slate-500">
                Masukkan No PO, Nama, atau Nomor HP Anda untuk memeriksa status pembayaran, resi pengiriman &amp; konfirmasi penerimaan barang.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Protection Notice */}
        <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-2 font-medium">
          <span className="text-sm">🔒</span>
          <span><strong>Mode Verifikasi 2 Kolom:</strong> Masukkan minimal <strong>2 Kolom Input</strong> (misal: <strong>No. PO + No. HP Pemesan</strong>) untuk membuka status pesanan Anda secara aman.</span>
        </div>

        {/* 3 Search Input Fields: No PO, Nama Pemesan, Nomor HP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              🔍 Cek No. PO
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchPO}
                onChange={(e) => setSearchPO(e.target.value)}
                placeholder="Contoh: PO-202611-001 atau 001"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchPO && (
                <button
                  type="button"
                  onClick={() => setSearchPO('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              👤 Cek Nama Pemesan
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Contoh: Edi Purnomo"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchName && (
                <button
                  type="button"
                  onClick={() => setSearchName('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              📱 Cek Nomor HP
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="Masukkan No HP Lengkap"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchPhone && (
                <button
                  type="button"
                  onClick={() => setSearchPhone('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Results Summary & Reset */}
        {searchFilterActive && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Hasil pencarian: <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">{filteredOrders.length}</strong> pesanan
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchPO('');
                setSearchName('');
                setSearchPhone('');
              }}
              className="font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer underline"
            >
              Reset Pencarian
            </button>
          </div>
        )}
      </div>

      {/* Orders List / Cards */}
      <div className="space-y-3">
        {!searchFilterActive ? (
          <div className="py-12 text-center text-slate-500 text-xs bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            {hasAnyInput ? (
              <div className="space-y-1.5 max-w-sm mx-auto">
                <p className="font-bold text-sm text-amber-600 dark:text-amber-400">
                  🔒 Harap Isi Minimal 2 Kolom Verifikasi
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Demi perlindungan privasi data, mohon lengkapi <strong>2 Kolom Input</strong> (misal: isi <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono text-indigo-600 dark:text-indigo-300">No. PO</code> DAN <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono text-indigo-600 dark:text-indigo-300">Nomor HP Pemesan</code>) untuk memverifikasi kepemilikan pesanan.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Cek Status Pesanan Anda
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Ketikkan kombinasi 2 data Anda (misal: <strong>No. PO</strong> + <strong>Nomor HP Pemesan</strong>) pada kolom di atas untuk menampilkan status pesanan.
                </p>
              </div>
            )}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6">
            <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada pesanan yang sesuai</p>
            <p className="text-[11px] text-slate-400 mt-1">Coba periksa kembali No. PO, Nama Pemesan, atau Nomor HP yang Anda masukkan.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            let dateStr = '-';
            try {
              if (order.createdAt) {
                const d = new Date(order.createdAt);
                if (!isNaN(d.getTime())) {
                  dateStr = new Intl.DateTimeFormat('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(d);
                }
              }
            } catch {
              dateStr = '-';
            }

            const isShipped = order.shippingStatus === 'SHIPPED';
            const isDelivered = order.shippingStatus === 'DELIVERED';

            return (
              <div
                key={order.id}
                className="gradient-border-box bg-white dark:bg-slate-800 p-4 shadow-xs space-y-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {order.poNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (order.poNumber) {
                          navigator.clipboard.writeText(order.poNumber);
                          setCopiedPOId(order.id);
                          setTimeout(() => setCopiedPOId(null), 2000);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 font-sans cursor-pointer transition-colors"
                      title="Salin Nomor PO"
                    >
                      {copiedPOId === order.id ? (
                        <>
                          <Check className="w-2.5 h-2.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span>Salin No. PO</span>
                        </>
                      )}
                    </button>
                    {order.paymentStatus === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        LUNAS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        MENUNGGU PEMBAYARAN
                      </span>
                    )}


                    <span className="text-slate-400">·</span>
                    <span className="text-[11px] text-slate-500 font-mono">{dateStr} WIB</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(order)}
                      className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Salin Rincian Chat WA"
                    >
                      {copiedId === order.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {onViewQRIS && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onViewQRIS(order);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white rounded-lg transition-all cursor-pointer btn-gradient"
                        title="Lihat QRIS & Pembayaran DANA"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QRIS DANA</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSendWA(order)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white rounded-lg transition-all cursor-pointer btn-gradient"
                      title="Kirim Ulang ke WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Kirim ke WA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteOrder(order.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Hapus Catatan PO"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Shipping & Tracking Status Box */}
                <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span>Jasa Kirim: {order.courier || 'J&T Express'}</span>
                        {isDelivered ? (
                          <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                            ✅ Selesai / Terkirim
                          </span>
                        ) : isShipped ? (
                          <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2 py-0.5 rounded-full">
                            🚚 Dalam Pengiriman
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                            ⏳ Belum Dikirim
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono mt-0.5">
                        Nomor Resi: <strong className="text-blue-700 dark:text-blue-400 select-all">{order.trackingNumber || 'Belum di-input admin'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {order.trackingNumber && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(order.trackingNumber || '');
                          alert(`Nomor resi ${order.trackingNumber} berhasil disalin!`);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-white rounded-md cursor-pointer btn-gradient"
                      >
                        Salin Resi
                      </button>
                    )}

                    {/* Button "Selesai" for customer ONLY if tracking number has been issued by admin or status is SHIPPED */}
                    {!isDelivered && (isShipped || Boolean(order.trackingNumber && order.trackingNumber.trim())) && onUpdateOrderShipping && (
                      <button
                        onClick={() => setConfirmOrderComplete(order)}
                        className="px-3 py-1.5 text-xs font-extrabold text-white rounded-xl transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer btn-gradient"
                        title="Konfirmasi bahwa barang sudah diterima"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Selesai (Barang Diterima)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Items summary & Total */}
                <div className="bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {(order.items && order.items.length > 0)
                        ? order.items.map((i) => {
                            const price = i.unitPrice ?? 100;
                            const sub = i.subtotal ?? (price * (i.quantity || 1));
                            return `${i.name || 'Barang'} (${i.quantity || 1}x @ Rp ${price.toLocaleString('id-ID')} = Rp ${sub.toLocaleString('id-ID')})`;
                          }).join(', ')
                        : 'Pesanan PO'}
                    </div>
                    {order.notes && (
                      <div className="text-[11px] text-slate-500 mt-1 italic">
                        Catatan: {order.notes}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-left sm:text-right pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">Total</span>
                    <span className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                      {(() => {
                        const items = order.items || [];
                        const basePrice = order.totalPrice ?? items.reduce((acc, it) => acc + (it.subtotal || (100 * (it.quantity || 1))), 0);
                        const poDigits = parseInt((order.poNumber || '001').replace(/\D/g, '').slice(-3) || '1', 10);
                        const finalSum = basePrice + poDigits;
                        return `${basePrice.toLocaleString('id-ID')} + ${poDigits.toString().padStart(3, '0')} = ${finalSum.toLocaleString('id-ID')}`;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Customer details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{order.customerName || 'Pembeli'} ({order.customerPhone || '-'})</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{order.customerAddress || '-'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* WARNING / CONFIRMATION DIALOG MODAL: BUTTON Selesai */}
      {confirmOrderComplete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Konfirmasi Barang Diterima (Selesai)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Apakah Anda yakin barang pesanan dengan nomor PO{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {confirmOrderComplete.poNumber}
                  </strong>{' '}
                  sudah diterima dengan baik dan lengkap?
                </p>
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 mt-2">
                  📌 Status pengiriman akan otomatis diperbarui menjadi <strong>SELESAI / TERKIRIM</strong> di sistem cloud real-time.
                </div>
              </div>
            </div>

            {/* Modal Buttons: Oke and Kembali */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmOrderComplete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                className="px-5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Oke, Barang Sudah Diterima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
