// Version 1.0.3 - Cache Invalidation and Stability Fixes
import React, { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { SimplePOForm } from './components/SimplePOForm';
import { SimpleOrderHistory } from './components/SimpleOrderHistory';
import { AdminPanelView } from './components/AdminPanelView';
import { WASettingsModal } from './components/WASettingsModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { POCopyModal } from './components/POCopyModal';
import { GitHubGuideModal } from './components/GitHubGuideModal';
import { simpleStorage, INITIAL_SIMPLE_ORDERS } from './services/storage';
import { openWhatsAppWithOrder, formatSimpleOrderForWA } from './utils/waHelper';
import { SimplePOOrder, WAConfig, AdminStoreConfig, ShippingStatus } from './types/po';
import { Package, CheckCircle2, Sliders, Cloud, SearchCheck, Moon, Sun, FileSpreadsheet } from 'lucide-react';
import {
  subscribeToOrders,
  saveOrderCloud,
  updateOrderPaymentStatusCloud,
  updateOrderShippingCloud,
  saveAdminConfigCloud,
  saveWAConfigCloud,
  deductStockCloud,
  deleteOrderCloud,
  resequenceOrdersCloud,
  deleteAllOrdersCloud,
} from './services/googleCloudSync';
import { getGoogleSheetsUrl, saveGoogleSheetsUrl, fetchAllDataFromSheets } from './services/googleSheetsSync';

export default function App() {
  const [orders, setOrders] = useState<SimplePOOrder[]>(simpleStorage.getOrders());
  const [waConfig, setWAConfig] = useState<WAConfig>(simpleStorage.getWAConfig());
  const [adminConfig, setAdminConfig] = useState<AdminStoreConfig>(simpleStorage.getAdminConfig());
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'admin'>('form');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [latestCreatedOrder, setLatestCreatedOrder] = useState<SimplePOOrder | null>(null);
  const [isPOCopyModalOpen, setIsPOCopyModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<{
    poNumber?: string;
    customerName?: string;
    customerPhone?: string;
  } | undefined>(undefined);

  // Handle Google Sheets URL from URL parameters for easy setup
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gsUrl = params.get('gs_url');
    if (gsUrl) {
      saveGoogleSheetsUrl(gsUrl);
      window.history.replaceState({}, '', window.location.pathname);
      showNotification('Google Sheets Terhubung!');
    }
  }, []);

  // Main Cloud Sync Effect (Google Sheets) with Splash Screen handling
  useEffect(() => {
    let firstLoadReceived = false;

    const unsub = subscribeToOrders(
      (cloudOrders) => {
        setOrders(cloudOrders);
        if (!firstLoadReceived) {
          firstLoadReceived = true;
          setIsAppLoading(false);
        }
      },
      (cloudAdmin) => {
        setAdminConfig(cloudAdmin);
        if (!firstLoadReceived) {
          firstLoadReceived = true;
          setIsAppLoading(false);
        }
      },
      (cloudWA) => {
        setWAConfig(cloudWA);
      }
    );

    // Security Timeout: Stop loading after 5s even if fetch fails to keep app usable
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 5000);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, []);



  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateWAConfig = (newConfig: WAConfig) => {
    setWAConfig(newConfig);
    saveWAConfigCloud(newConfig);
    showNotification('Tujuan WhatsApp berhasil diperbarui & disinkron ke Cloud!');
  };

  const handleUpdateAdminConfig = (newConfig: AdminStoreConfig) => {
    setAdminConfig(newConfig);
    saveAdminConfigCloud(newConfig);
    showNotification('Pengaturan Harga, Stok, dan Toko berhasil disimpan ke Cloud!');
  };

  const handleSubmitOrder = async (incomingOrder: SimplePOOrder) => {
    showNotification('Menghubungkan ke server...');
    
    let currentOrders = orders;
    
    // 1. Fetch latest data from Google Sheets immediately to get the absolute latest PO count
    try {
      const cloudData = await fetchAllDataFromSheets();
      if (cloudData && cloudData.orders) {
        currentOrders = cloudData.orders;
        setOrders(cloudData.orders);
        if (cloudData.products) {
           const currentAdmin = simpleStorage.getAdminConfig();
           setAdminConfig({ ...currentAdmin, products: cloudData.products });
        }
      }
    } catch (err) {
      console.warn('Pre-submit sync failed, using local data as fallback');
    }

    // 2. Generate the final unique PO Number based on the absolute latest data
    const finalPoNumber = simpleStorage.generatePONumber(currentOrders);
    const newOrder: SimplePOOrder = { ...incomingOrder, poNumber: finalPoNumber };

    // 3. Save order to Cloud (Google Sheets)
    await saveOrderCloud(newOrder);

    // 4. Auto deduct stock if configured
    if (adminConfig.autoDeductStock) {
      const updatedConfig = await deductStockCloud(newOrder.items);
      setAdminConfig(updatedConfig);
    }

    // 5. Copy formatted text to clipboard automatically
    const text = formatSimpleOrderForWA(newOrder, adminConfig.danaPhone);
    try {
      navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard error
    }

    // Set status filter and view
    setStatusFilter({
      poNumber: newOrder.poNumber,
      customerName: '',
      customerPhone: '',
    });
    setActiveTab('history');

    // Set order data and trigger success modals
    setLatestCreatedOrder(newOrder);
    setIsPOCopyModalOpen(true);
    setIsSuccessModalOpen(false);
    showNotification(`Pesanan ${newOrder.poNumber} BERHASIL DISIMPAN!`);
  };

  const handleDeleteOrder = async (id: string, shouldResequence = true) => {
    const remaining = orders.filter((o) => o.id !== id);
    setOrders(remaining);
    await deleteOrderCloud(id);

    if (shouldResequence && remaining.length > 0) {
      const { orders: resequenced, changedCount } = await resequenceOrdersCloud(remaining);
      setOrders(resequenced);
      showNotification(
        changedCount > 0
          ? `Pesanan dihapus & ${changedCount} nomor PO otomatis diurutkan ulang (001 s/d ${String(resequenced.length).padStart(3, '0')}).`
          : 'Pesanan berhasil dihapus dari Cloud & penyimpanan.'
      );
    } else {
      showNotification('Pesanan berhasil dihapus dari Cloud & penyimpanan.');
    }
  };

  const handleClearAllOrders = async () => {
    setOrders([]);
    await deleteAllOrdersCloud();
    showNotification('Semua riwayat pemesanan telah dikosongkan.');
  };

  const handleResetSampleOrders = () => {
    setOrders(INITIAL_SIMPLE_ORDERS);
    simpleStorage.saveOrders(INITIAL_SIMPLE_ORDERS);
    showNotification('Data contoh berhasil dimuat ulang!');
  };

  const handleUpdatePaymentStatus = async (orderId: string, status: 'PENDING' | 'PAID') => {
    // Real-time Cloud update (syncs instantaneously across all admin HP & Laptops)
    const updated = await updateOrderPaymentStatusCloud(orderId, status);
    setOrders(updated);
    const order = updated.find((o) => o.id === orderId);


    if (status === 'PAID') {
      showNotification(`Pesanan ${order?.poNumber || ''} (${order?.customerName || ''}) LUNAS! Undangan WA terkirim.`);
    } else {
      showNotification(`Status pesanan ${order?.poNumber || ''} diubah menjadi Belum Lunas.`);
    }
  };

  const handleUpdateOrderShipping = async (
    orderId: string,
    courier: string,
    trackingNumber: string,
    shippingStatus: ShippingStatus
  ) => {
    const updated = await updateOrderShippingCloud(orderId, courier, trackingNumber, shippingStatus);
    setOrders(updated);
    showNotification('Status pengiriman & nomor resi berhasil diperbarui!');
  };

  const handleUpdateOrder = async (updatedOrder: SimplePOOrder) => {
    await saveOrderCloud(updatedOrder);
    const updatedList = orders.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
    setOrders(updatedList);
    simpleStorage.saveOrders(updatedList);


    showNotification(`Data pesanan ${updatedOrder.poNumber} (${updatedOrder.customerName}) berhasil diperbarui!`);
  };

  const handleFixDuplicatePONumbers = async () => {
    const { orders: resequenced, changedCount } = await resequenceOrdersCloud(orders);
    setOrders(resequenced);
    if (changedCount === 0) {
      showNotification('Seluruh nomor PO sudah berurutan rapi (001 s/d ' + String(orders.length).padStart(3, '0') + ').');
    } else {
      showNotification(
        `Berhasil mengurutkan ulang ${changedCount} nomor PO secara berurutan (001 s/d ${String(resequenced.length).padStart(3, '0')})!`
      );
    }
  };


  const nextPoNumber = simpleStorage.generatePONumber(orders);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Full Screen Splash Loader */}
      {isAppLoading && (
        <div className="fixed inset-0 z-100 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="relative">
            {/* Spinning Ring */}
            <div className="w-20 h-20 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-500 animate-spin"></div>
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          
          <div className="mt-8 text-center space-y-2">
            <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white">
              PO-WaveID
            </h1>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
                Menyinkronkan Database...
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Mohon tunggu sebentar, sedang mengambil data dari Google Sheets.
            </p>
          </div>

          {/* Bottom Branding */}
          <div className="absolute bottom-10 text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">
            Delta Center Cloud
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Clean Top Navigation Bar - Responsif Otomatis Android (HP) & PC */}
      <header className="sticky top-0 z-30 bg-blue-900 text-white backdrop-blur-sm border-b border-blue-800">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand & Realtime Indicator */}
          <div 
            onClick={() => setActiveTab('form')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none min-w-0"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight text-white block leading-tight truncate">
                  PO-WaveID
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-[9px] text-indigo-700 dark:text-indigo-400 font-medium whitespace-nowrap">
                  <FileSpreadsheet className="w-2 h-2 text-indigo-500" />
                  <span>Google Sheets Cloud</span>
                </span>
              </div>
              <span className="hidden sm:block text-[10px] text-blue-200 font-mono truncate">
                Web Form &amp; Admin Real-time
              </span>
            </div>
          </div>

          {/* Right side: Theme Toggle & Tabs */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 sm:p-2 rounded-xl bg-blue-800 text-blue-100 hover:bg-blue-700 transition-all cursor-pointer border border-blue-700"
              title={isDarkMode ? 'Ubah ke Mode Terang' : 'Ubah ke Mode Gelap'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-300" />}
            </button>

            {/* Center Tabs: Form, Cek Status, and dedicated Panel Admin */}
            <div className="flex items-center gap-0.5 sm:gap-1 p-1 bg-blue-800/50 rounded-xl text-[10px] sm:text-xs font-medium shrink-0 border border-blue-700">
              <button
                onClick={() => setActiveTab('form')}
                className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg transition-all ${
                  activeTab === 'form'
                    ? 'bg-white text-blue-900 shadow-2xs font-bold'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                Form PO
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-white text-blue-900 shadow-2xs font-bold'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                Status ({orders.length})
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-white shadow-xs font-bold'
                    : 'text-amber-400 hover:bg-white/10 font-semibold'
                }`}
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container - Renders Form, History/Cek Status, or full Admin Panel Page */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeTab === 'form' ? (
          <SimplePOForm
            nextPoNumber={nextPoNumber}
            waConfig={waConfig}
            adminConfig={adminConfig}
            existingOrders={orders}
            onOpenWASettings={() => {}}
            onOpenAdminSettings={() => setActiveTab('admin')}
            onSubmitOrder={handleSubmitOrder}
          />
        ) : activeTab === 'history' ? (
          <SimpleOrderHistory
            orders={orders}
            config={waConfig}
            danaPhone={adminConfig.danaPhone}
            initialFilter={statusFilter}
            onDeleteOrder={handleDeleteOrder}
            onClearAll={handleClearAllOrders}
            onResetSamples={handleResetSampleOrders}
            onViewQRIS={(order) => {
              setLatestCreatedOrder(order);
              setIsSuccessModalOpen(true);
            }}
            onUpdateOrderShipping={handleUpdateOrderShipping}
          />
        ) : (
          <div className="admin-panel space-y-6">
            <AdminPanelView
              config={adminConfig}
              waConfig={waConfig}
              orders={orders}
              onSaveConfig={handleUpdateAdminConfig}
              onSaveWAConfig={handleUpdateWAConfig}
              onNavigateToForm={() => setActiveTab('form')}
              onUpdatePaymentStatus={handleUpdatePaymentStatus}
              onUpdateOrderShipping={handleUpdateOrderShipping}
              onUpdateOrder={handleUpdateOrder}
              onFixDuplicatePONumbers={handleFixDuplicatePONumbers}
              onDeleteOrder={handleDeleteOrder}
              onClearAllOrders={handleClearAllOrders}
              onOrdersImported={(importedOrders) => {
                setOrders(importedOrders);
                showNotification(`Database berhasil diimpor (${importedOrders.length} pesanan aktif)!`);
              }}
              isSynced={!isAppLoading}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-5 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-center">
          <span>Created by Delta Center</span>
        </div>
      </footer>

      {/* Popup Salin Nomor PO saat Memilih Pesan */}
      <POCopyModal
        isOpen={isPOCopyModalOpen}
        onClose={() => setIsPOCopyModalOpen(false)}
        order={latestCreatedOrder}
        danaPhone={adminConfig.danaPhone}
        onProceedToPayment={() => {
          setIsPOCopyModalOpen(false);
          setIsSuccessModalOpen(true);
        }}
      />

      {/* QRIS DANA & Order Success Modal */}
      <OrderSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        order={latestCreatedOrder}
        config={waConfig}
        danaPhone={adminConfig.danaPhone}
        danaAccountName={adminConfig.danaAccountName}
        qrisImageUrl={adminConfig.qrisImageUrl}
        onNewOrder={() => {
          setIsSuccessModalOpen(false);
          setActiveTab('form');
        }}
      />
    </div>
  );
}
