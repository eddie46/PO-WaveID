import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sliders,
  Package,
  Wallet,
  Save,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Boxes,
  MessageSquare,
  Eye,
  Smartphone,
  QrCode,
  ShieldCheck,
  Check,
  AlertTriangle,
  Settings,
  Search,
  Clock,
  Filter,
  CheckCircle,
  RefreshCw,
  X,
  Copy,
  Users,
  AlertOctagon,
  BadgeCheck,
  FileSpreadsheet,
  ExternalLink,
  LogOut,
  Cloud,
  Download,
  Plus,
  Trash2,
  Printer,
  FileText,
  Truck,
  Send,
  Camera,
  Database,
  Upload,
  Loader2,
  ArrowLeft,
  Receipt,
  TrendingDown,
  DollarSign,
  CreditCard,
  Edit2,
  Calendar,
  Tag,
  PieChart,
  Server,
} from 'lucide-react';
import { openPaidWhatsAppInvite } from '../utils/waHelper';
import { compressImage } from '../utils/imageHelper';
import QRCode from 'qrcode';
import {
  AdminStoreConfig,
  ProductSetting,
  SimplePOOrder,
  SimplePOItem,
  WAConfig,
  ShippingStatus,
  DatabaseBackup,
  OperationalExpense,
  ExpenseCategory,
} from '../types/po';
import { getGoogleSheetsUrl, saveGoogleSheetsUrl, fetchAllDataFromSheets } from '../services/googleSheetsSync';
import {
  exportToExcel,
  exportToPDF,
  exportExpensesToExcel,
  exportExpensesToPDF,
  exportCombinedReportToExcel,
  exportCombinedReportToPDF,
} from '../utils/exportUtils';
import { DEFAULT_ADMIN_CONFIG, DEFAULT_EXPENSE_CATEGORIES, simpleStorage } from '../services/storage';
import {
  exportDatabaseBackup,
  downloadDatabaseBackupFile,
  importDatabaseBackupCloud,
  saveOrderCloud,
  subscribeToExpenses,
  saveExpenseCloud,
  updateExpenseCloud,
  deleteExpenseCloud,
  saveAdminConfigCloud,
  saveWAConfigCloud,
} from '../services/googleCloudSync';

interface AdminPanelViewProps {
  config: AdminStoreConfig;
  waConfig: WAConfig;
  orders: SimplePOOrder[];
  onSaveConfig: (newConfig: AdminStoreConfig) => void;
  onSaveWAConfig: (newWAConfig: WAConfig) => void;
  onNavigateToForm: () => void;
  onUpdatePaymentStatus?: (orderId: string, status: 'PENDING' | 'PAID') => void;
  onUpdateOrderShipping?: (
    orderId: string,
    courier: string,
    trackingNumber: string,
    shippingStatus: ShippingStatus
  ) => void;
  onUpdateOrder?: (updatedOrder: SimplePOOrder) => void;
  onFixDuplicatePONumbers?: () => void;
  onDeleteOrder?: (id: string, shouldResequence?: boolean) => void;
  onClearAllOrders?: () => void;
  onOrdersImported?: (orders: SimplePOOrder[]) => void;
  isSynced: boolean;
}

const COURIER_OPTIONS = [
  'J&T Express',
  'JNE Reguler',
  'SiCepat Ekspres',
  'Pos Indonesia',
  'Anteraja',
  'GoSend Sameday/Instant',
  'GrabExpress',
  'Lainnya / Kurir Toko',
];

const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case 'Cetak PCB':
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
    case 'Bayar Bea Cukai':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    case 'Bahan Packing & Lakban':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800';
    case 'Transportasi & BBM':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-300 dark:border-orange-800';
    default: {
      const customPalettes = [
        'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-800',
        'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
        'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800',
        'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/70 dark:text-fuchsia-300 border-fuchsia-300 dark:border-fuchsia-800',
      ];
      let hash = 0;
      for (let i = 0; i < category.length; i++) {
        hash = (hash << 5) - hash + category.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % customPalettes.length;
      return customPalettes[idx];
    }
  }
};

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  config,
  waConfig,
  orders,
  onSaveConfig,
  onSaveWAConfig,
  onNavigateToForm,
  onUpdatePaymentStatus,
  onUpdateOrderShipping,
  onUpdateOrder,
  onFixDuplicatePONumbers,
  onDeleteOrder,
  onClearAllOrders,
  onOrdersImported,
  isSynced,
}) => {
  const [formData, setFormData] = useState<AdminStoreConfig>(config);
  const [formWA, setFormWA] = useState<WAConfig>(waConfig);
  const [isDirtySettings, setIsDirtySettings] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [adminTab, setAdminTab] = useState<'payment' | 'shipping' | 'products' | 'expenses' | 'database' | 'sheets'>('payment');

  // Operational Expenses & Dynamic Categories States
  const [expenses, setExpenses] = useState<OperationalExpense[]>(() => simpleStorage.getExpenses());
  const [customCategories, setCustomCategories] = useState<string[]>(() =>
    simpleStorage.getCustomExpenseCategories()
  );
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isCreatingNewCategoryInForm, setIsCreatingNewCategoryInForm] = useState(false);
  const [customCategoryInputInForm, setCustomCategoryInputInForm] = useState('');

  // All available categories = default categories + custom categories + existing expense categories
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_EXPENSE_CATEGORIES);
    customCategories.forEach((c) => set.add(c));
    expenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set);
  }, [customCategories, expenses]);

  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<'ALL' | string>('ALL');
  const [expenseMonthFilter, setExpenseMonthFilter] = useState<'ALL' | string>('ALL');
  const [expensePage, setExpensePage] = useState(1);
  const [expensePageSize, setExpensePageSize] = useState(10);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OperationalExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<OperationalExpense | null>(null);
  const [expenseForm, setExpenseForm] = useState<{
    title: string;
    category: string;
    amount: string;
    date: string;
    paymentMethod: 'Tunai (Cash)' | 'Transfer Bank' | 'DANA / E-Wallet' | 'Kartu Debit/Kredit' | 'Lainnya';
    recipientOrVendor: string;
    notes: string;
  }>({
    title: '',
    category: 'Cetak PCB',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'Tunai (Cash)',
    recipientOrVendor: '',
    notes: '',
  });

  // Search & Filter states for Payment Verification (Tandai Lunas)
  const [searchPO, setSearchPO] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'DUPLICATE_NAME_ADDRESS' | 'SEARCH_ONLY'>('SEARCH_ONLY');
  const [payPage, setPayPage] = useState(1);
  const [payPageSize, setPayPageSize] = useState(10);

  // Search & Filter states for Status Proses Kirim (Shipping Management)
  const [shipSearchPO, setShipSearchPO] = useState('');
  const [shipSearchName, setShipSearchName] = useState('');
  const [shipSearchPhone, setShipSearchPhone] = useState('');
  const [shippingFilter, setShippingFilter] = useState<'ALL' | 'PENDING_SHIPMENT' | 'SHIPPED' | 'DELIVERED' | 'SEARCH_ONLY'>('SEARCH_ONLY');
  const [shipPage, setShipPage] = useState(1);
  const [shipPageSize, setShipPageSize] = useState(10);

  // Draft local state for editing courier/tracking per order
  const [shippingDrafts, setShippingDrafts] = useState<Record<string, { courier: string; trackingNumber: string; status: ShippingStatus }>>({});

  // Invoice / Receipt Printing Modal State
  const [invoiceOrder, setInvoiceOrder] = useState<SimplePOOrder | null>(null);

  // Admin Edit Order Modal State (in Verifikasi Tab)
  const [editingOrder, setEditingOrder] = useState<SimplePOOrder | null>(null);
  const [isSavingEditedOrder, setIsSavingEditedOrder] = useState(false);
  const [editOrderForm, setEditOrderForm] = useState<{
    poNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    paymentStatus: 'PENDING' | 'PAID';
    courier: string;
    trackingNumber: string;
    shippingStatus: ShippingStatus;
    notes: string;
    items: SimplePOItem[];
  } | null>(null);

  const handleOpenEditOrder = (order: SimplePOOrder) => {
    const existingItems: SimplePOItem[] =
      Array.isArray(order.items) && order.items.length > 0
        ? order.items.map((it, idx) => ({
            id: it.id || `item-${idx}`,
            name: it.name || 'Barang',
            quantity: Math.max(1, Number(it.quantity) || 1),
            unitPrice: Number(it.unitPrice) ?? 100,
            subtotal:
              Number(it.subtotal) ||
              (Number(it.unitPrice) ?? 100) * Math.max(1, Number(it.quantity) || 1),
            notes: it.notes || '',
          }))
        : [
            {
              id: `item-${Date.now()}`,
              name: formData.products[0]?.name || 'PCB GEN 3',
              quantity: 1,
              unitPrice: formData.products[0]?.price ?? 100,
              subtotal: formData.products[0]?.price ?? 100,
            },
          ];

    setEditingOrder(order);
    setEditOrderForm({
      poNumber: order.poNumber || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      paymentStatus: order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
      courier: order.courier || 'J&T Express',
      trackingNumber: order.trackingNumber || '',
      shippingStatus: order.shippingStatus || 'PENDING_SHIPMENT',
      notes: order.notes || '',
      items: existingItems,
    });
  };

  const handleSaveEditedOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || !editOrderForm) return;
    if (!editOrderForm.customerName.trim()) {
      alert('Nama pemesan tidak boleh kosong.');
      return;
    }

    setIsSavingEditedOrder(true);
    try {
      const cleanedItems: SimplePOItem[] = editOrderForm.items.map((it, idx) => {
        const qty = Math.max(1, Number(it.quantity) || 1);
        const unitPrice = Math.max(0, Number(it.unitPrice) || 0);
        return {
          id: it.id || `item-${idx}`,
          name: (it.name || 'Barang').trim(),
          quantity: qty,
          unitPrice,
          subtotal: qty * unitPrice,
          ...(it.notes ? { notes: it.notes } : {}),
        };
      });

      const computedTotal = cleanedItems.reduce((sum, it) => sum + (it.subtotal || 0), 0);
      const isNowPaid = editOrderForm.paymentStatus === 'PAID';
      const updatedOrder: SimplePOOrder = {
        ...editingOrder,
        poNumber: editOrderForm.poNumber.trim() || editingOrder.poNumber,
        customerName: editOrderForm.customerName.trim(),
        customerPhone: editOrderForm.customerPhone.trim(),
        customerAddress: editOrderForm.customerAddress.trim(),
        paymentStatus: editOrderForm.paymentStatus,
        courier: editOrderForm.courier,
        trackingNumber: editOrderForm.trackingNumber.trim(),
        shippingStatus: editOrderForm.shippingStatus,
        notes: editOrderForm.notes.trim(),
        items: cleanedItems,
        totalPrice: computedTotal,
      };

      if (isNowPaid) {
        updatedOrder.paidAt = editingOrder.paidAt || new Date().toISOString();
      } else {
        delete updatedOrder.paidAt;
      }

      if (editOrderForm.shippingStatus === 'SHIPPED' || editOrderForm.shippingStatus === 'DELIVERED') {
        updatedOrder.shippedAt = editingOrder.shippedAt || new Date().toISOString();
      } else {
        delete updatedOrder.shippedAt;
      }

      if (onUpdateOrder) {
        await onUpdateOrder(updatedOrder);
      } else {
        await saveOrderCloud(updatedOrder);
      }

      setEditingOrder(null);
      setEditOrderForm(null);
    } catch (err: any) {
      alert('Gagal menyimpan perubahan pesanan: ' + (err.message || 'Error'));
    } finally {
      setIsSavingEditedOrder(false);
    }
  };

  // Database Backup (Export & Import) States
  const [isExportingDB, setIsExportingDB] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<{
    name: string;
    sizeKb: number;
    rawContent: any;
    orderCount: number;
    expenseCount: number;
    hasAdminConfig: boolean;
    hasWAConfig: boolean;
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImportingDB, setIsImportingDB] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const dbFileInputRef = useRef<HTMLInputElement>(null);

  // QRIS Barcode Image Upload States & Handlers
  const qrisFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingQRIS, setIsUploadingQRIS] = useState(false);
  const [qrisUploadMsg, setQrisUploadMsg] = useState<string | null>(null);

  // Google Sheets Sync & Verification Diagnostic Logic
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [sheetsSyncResult, setSheetsSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isVerifyingSync, setIsVerifyingSync] = useState(false);
  const [showRawDiagnosticJson, setShowRawDiagnosticJson] = useState(false);
  const [syncDiagReport, setSyncDiagReport] = useState<{
    checkedAt: string;
    rawResponse: any;
    hasSettingsSheet: boolean;
    allMatched: boolean;
    fields: Array<{
      key: string;
      label: string;
      localValue: string;
      remoteValue: string;
      matched: boolean;
    }>;
    error?: string;
  } | null>(null);

  const handleRunSyncVerification = async () => {
    setIsVerifyingSync(true);
    setSheetsSyncResult(null);
    try {
      const raw = await fetchAllDataFromSheets();
      if (!raw) {
        setSyncDiagReport({
          checkedAt: new Date().toLocaleTimeString('id-ID'),
          rawResponse: null,
          hasSettingsSheet: false,
          allMatched: false,
          fields: [],
          error: 'Gagal mengambil JSON dari Google Sheets API. Pastikan URL Apps Script benar dan sudah di-deploy dengan akses "Anyone".',
        });
        return;
      }

      const remoteAdmin = raw.danaConfig || raw.settings?.adminConfig || {};
      const remoteWA = raw.waConfig || raw.settings?.waConfig || {};
      const remoteProductsCount = Array.isArray(raw.products) ? raw.products.length : 0;
      const remoteOrdersCount = Array.isArray(raw.orders) ? raw.orders.length : 0;
      const remoteExpensesCount = Array.isArray(raw.expenses) ? raw.expenses.length : 0;

      const hasSettingsSheet = Boolean(
        raw.danaConfig ||
        raw.waConfig ||
        (raw.settings && (raw.settings.adminConfig || raw.settings.waConfig))
      );

      const cleanLocalDanaPhone = String(formData.danaPhone || '').replace(/^'+/, '');
      const cleanRemoteDanaPhone =
        remoteAdmin.danaPhone !== undefined
          ? String(remoteAdmin.danaPhone || '').replace(/^'+/, '')
          : undefined;

      const cleanLocalWAPhone = String(formWA.phoneNumber || '').replace(/^'+/, '');
      const cleanRemoteWAPhone =
        remoteWA.phoneNumber !== undefined
          ? String(remoteWA.phoneNumber || '').replace(/^'+/, '')
          : undefined;

      const fields = [
        {
          key: 'danaPhone',
          label: 'Tabel DanaConfig: Nomor Akun DANA',
          localValue: String(cleanLocalDanaPhone || '(Kosong)'),
          remoteValue:
            cleanRemoteDanaPhone !== undefined
              ? String(cleanRemoteDanaPhone || '(Kosong)')
              : '(Belum ada di Tabel DanaConfig)',
          matched: cleanLocalDanaPhone === String(cleanRemoteDanaPhone || ''),
        },
        {
          key: 'danaAccountName',
          label: 'Tabel DanaConfig: Nama Pemilik DANA',
          localValue: String(formData.danaAccountName || '(Kosong)'),
          remoteValue:
            remoteAdmin.danaAccountName !== undefined
              ? String(remoteAdmin.danaAccountName || '(Kosong)')
              : '(Belum ada di Tabel DanaConfig)',
          matched: String(formData.danaAccountName || '') === String(remoteAdmin.danaAccountName || ''),
        },
        {
          key: 'waMode',
          label: 'Tabel WhatsAppConfig: Mode Tujuan WA',
          localValue: String(formWA.mode || 'group_link'),
          remoteValue: String(remoteWA.mode || '(Belum ada di Tabel WhatsAppConfig)'),
          matched: String(formWA.mode || '') === String(remoteWA.mode || ''),
        },
        {
          key: 'waTarget',
          label: 'Tabel WhatsAppConfig: Nomor WA / Link Grup',
          localValue: String(
            (formWA.mode === 'phone_number' ? cleanLocalWAPhone : formWA.groupLink) || '(Kosong)'
          ),
          remoteValue:
            remoteWA.mode !== undefined
              ? String(
                  (remoteWA.mode === 'phone_number' ? cleanRemoteWAPhone : remoteWA.groupLink) ||
                    '(Kosong)'
                )
              : '(Belum ada di Tabel WhatsAppConfig)',
          matched:
            cleanLocalWAPhone === String(cleanRemoteWAPhone || '') &&
            String(formWA.groupLink || '') === String(remoteWA.groupLink || ''),
        },
        {
          key: 'paidGroupLink',
          label: 'Tabel WhatsAppConfig: Link Grup WA Lunas',
          localValue: String(formWA.paidGroupLink || '(Kosong)'),
          remoteValue:
            remoteWA.paidGroupLink !== undefined
              ? String(remoteWA.paidGroupLink || '(Kosong)')
              : '(Belum ada di Tabel WhatsAppConfig)',
          matched: String(formWA.paidGroupLink || '') === String(remoteWA.paidGroupLink || ''),
        },
        {
          key: 'productsCount',
          label: 'Tabel Products: Harga & Stok Katalog',
          localValue: `${formData.products.length} produk (${formData.products.map((p) => p.name).join(', ') || '-'})`,
          remoteValue: `${remoteProductsCount} produk (${Array.isArray(raw.products) ? raw.products.map((p: any) => p.name).join(', ') || '-' : '-'})`,
          matched:
            formData.products.length === remoteProductsCount &&
            JSON.stringify(formData.products.map((p) => ({ id: p.id, name: p.name, price: Number(p.price), stock: Number(p.stock) }))) ===
              JSON.stringify(
                (Array.isArray(raw.products) ? raw.products : []).map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  price: Number(p.price),
                  stock: Number(p.stock),
                }))
              ),
        },
        {
          key: 'ordersCount',
          label: 'Tabel Orders: Total Pesanan (PO)',
          localValue: `${orders.length} pesanan`,
          remoteValue: `${remoteOrdersCount} pesanan`,
          matched: orders.length === remoteOrdersCount,
        },
        {
          key: 'expensesCount',
          label: 'Tabel Expenses: Total Biaya Operasional',
          localValue: `${expenses.length} transaksi`,
          remoteValue: `${remoteExpensesCount} transaksi`,
          matched: expenses.length === remoteExpensesCount,
        },
      ];

      const allMatched = fields.every((f) => f.matched);

      setSyncDiagReport({
        checkedAt: new Date().toLocaleTimeString('id-ID'),
        rawResponse: raw,
        hasSettingsSheet,
        allMatched,
        fields,
      });
    } catch (err: any) {
      setSyncDiagReport({
        checkedAt: new Date().toLocaleTimeString('id-ID'),
        rawResponse: null,
        hasSettingsSheet: false,
        allMatched: false,
        fields: [],
        error: 'Terjadi kesalahan saat memverifikasi sinkronisasi: ' + (err?.message || 'Error'),
      });
    } finally {
      setIsVerifyingSync(false);
    }
  };

  const handleForcePushLocalToSheets = async () => {
    setSyncingSheets(true);
    setSheetsSyncResult(null);
    try {
      setIsDirtySettings(false);
      await saveAdminConfigCloud(formData);
      await saveWAConfigCloud(formWA);
      onSaveConfig(formData);
      onSaveWAConfig(formWA);
      setSheetsSyncResult({
        success: true,
        message: 'Berhasil mendorong (Push) data ke 3 tabel terpisah di Google Sheets: Products, DanaConfig, dan WhatsAppConfig!',
      });
      await handleRunSyncVerification();
    } catch (err: any) {
      setSheetsSyncResult({
        success: false,
        message: 'Gagal mengirim data ke Google Sheets: ' + (err?.message || 'Error'),
      });
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleManualSheetsSync = async () => {
    setSyncingSheets(true);
    setSheetsSyncResult(null);
    try {
      const data = await fetchAllDataFromSheets();
      if (data) {
        if (data.orders) {
          simpleStorage.saveOrders(data.orders);
          if (onOrdersImported) onOrdersImported(data.orders);
        }
        if (data.expenses) {
          simpleStorage.saveExpenses(data.expenses);
          setExpenses(data.expenses);
        }
        const incomingDana = data.danaConfig || data.settings?.adminConfig;
        if (incomingDana || Array.isArray(data.products)) {
          const mergedAdmin: AdminStoreConfig = {
            ...formData,
            ...(incomingDana || {}),
            danaPhone:
              incomingDana?.danaPhone !== undefined
                ? String(incomingDana.danaPhone).replace(/^'+/, '')
                : formData.danaPhone,
            products: Array.isArray(data.products) && data.products.length > 0 ? data.products : formData.products,
          };
          setIsDirtySettings(false);
          setFormData(mergedAdmin);
          simpleStorage.saveAdminConfig(mergedAdmin);
          onSaveConfig(mergedAdmin);
        }
        const incomingWA = data.waConfig || data.settings?.waConfig;
        if (incomingWA) {
          const mergedWA: WAConfig = {
            ...formWA,
            ...incomingWA,
            phoneNumber:
              incomingWA.phoneNumber !== undefined
                ? String(incomingWA.phoneNumber).replace(/^'+/, '')
                : formWA.phoneNumber,
          };
          setIsDirtySettings(false);
          setFormWA(mergedWA);
          simpleStorage.saveWAConfig(mergedWA);
          onSaveWAConfig(mergedWA);
        }
        setSheetsSyncResult({ success: true, message: 'Berhasil menarik (Pull) seluruh data dari tabel Products, DanaConfig, dan WhatsAppConfig!' });
        await handleRunSyncVerification();
      } else {
        setSheetsSyncResult({ success: false, message: 'Gagal mengambil data. Periksa URL Apps Script Anda.' });
      }
    } catch (err) {
      setSheetsSyncResult({ success: false, message: 'Error koneksi ke Google Sheets.' });
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleQRISFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        alert('Harap pilih file gambar (JPG, PNG, atau WEBP).');
        return;
      }
      setIsUploadingQRIS(true);
      setQrisUploadMsg(null);
      try {
        const compressed = await compressImage(file, 900, 0.8);
        setFormData((prev) => ({ ...prev, qrisImageUrl: compressed }));
        setIsDirtySettings(true);
        setSavedSuccess(false);
        setQrisUploadMsg('Foto Barcode QRIS berhasil dimuat! Klik "Simpan Semua Pengaturan" di bawah untuk mengaktifkan.');
      } catch (err: any) {
        alert('Gagal memproses foto QRIS: ' + (err.message || 'Error'));
      } finally {
        setIsUploadingQRIS(false);
      }
    }
  };

  const handleRemoveQRISImage = () => {
    if (confirm('Hapus foto Barcode QRIS dari toko?')) {
      setFormData((prev) => ({ ...prev, qrisImageUrl: '' }));
      setIsDirtySettings(true);
      setSavedSuccess(false);
      setQrisUploadMsg(null);
    }
  };

  // Admin Login States (User: DeltaC, Pass: 12345)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_logged_in') === 'true';
  });
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    // Format username to have first letter capital (e.g. delta -> Delta)
    const formattedUser = loginUsername.trim()
      ? loginUsername.trim().charAt(0).toUpperCase() + loginUsername.trim().slice(1)
      : '';

    if (formattedUser === 'DeltaC' && loginPassword === '12345') {
      setIsAdminLoggedIn(true);
      sessionStorage.setItem('admin_logged_in', 'true');
    } else {
      setLoginError('Username atau Password salah!');
    }
  };

  // Popup confirmation modal states for Tandai Lunas, Simpan Resi, & Simpan Pengaturan
  const [confirmPaidOrder, setConfirmPaidOrder] = useState<SimplePOOrder | null>(null);
  const [confirmPaidTargetStatus, setConfirmPaidTargetStatus] = useState<'PAID' | 'PENDING'>('PAID');
  const [confirmShippingData, setConfirmShippingData] = useState<{
    order: SimplePOOrder;
    courier: string;
    trackingNumber: string;
    status: ShippingStatus;
  } | null>(null);
  const [confirmSaveSettings, setConfirmSaveSettings] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductSetting | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<SimplePOOrder | null>(null);
  const [resequenceAfterDelete, setResequenceAfterDelete] = useState(true);
  const [confirmClearAllOrders, setConfirmClearAllOrders] = useState(false);


  // Real-time Cloud subscription for Operational Expenses
  useEffect(() => {
    const unsubExpenses = subscribeToExpenses((cloudExpenses) => {
      setExpenses(cloudExpenses);
    });
    return () => unsubExpenses();
  }, []);

  // Initialize draft shipping data from orders prop
  useEffect(() => {
    const initialDrafts: Record<string, { courier: string; trackingNumber: string; status: ShippingStatus }> = {};
    orders.forEach((o) => {
      initialDrafts[o.id] = {
        courier: o.courier || 'J&T Express',
        trackingNumber: o.trackingNumber || '',
        status: o.shippingStatus || 'PENDING_SHIPMENT',
      };
    });
    setShippingDrafts(initialDrafts);
  }, [orders]);


  // Keep form data synced if props change, ONLY when user does not have unsaved local edits
  useEffect(() => {
    if (!isDirtySettings) {
      setFormData(config);
    }
  }, [config, isDirtySettings]);

  useEffect(() => {
    if (!isDirtySettings) {
      setFormWA(waConfig);
    }
  }, [waConfig, isDirtySettings]);

  // Generate QR preview for DANA account
  useEffect(() => {
    const danaPhone = formData.danaPhone || '';
    if (!danaPhone) {
      setPreviewQrUrl('');
      return;
    }
    const samplePayload = `https://link.dana.id/qr/${danaPhone}?amount=200&desc=ADMIN_PREVIEW`;
    QRCode.toDataURL(samplePayload, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setPreviewQrUrl(url))
      .catch((err) => console.error('QR preview error:', err));
  }, [formData.danaPhone]);

  // Export orders to CSV file directly
  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert('Belum ada pesanan untuk diekspor.');
      return;
    }

    const headers = [
      'No PO',
      'Tanggal Dibuat',
      'Nama Pemesan',
      'Nomor HP',
      'Alamat Pengiriman',
      'Rincian Barang',
      'Total Harga (Rp)',
      'Status Pembayaran',
      'Waktu Pelunasan',
      'Jasa Kirim',
      'Nomor Resi',
      'Status Pengiriman',
      'Catatan',
    ];

    const rows = orders.map((o) => {
      const itemsText = o.items.map((it) => `${it.name} (${it.quantity}x)`).join('; ');
      const totalPrice =
        o.totalPrice ?? o.items.reduce((acc, it) => acc + (it.subtotal || 100 * it.quantity), 0);
      const isPaid = o.paymentStatus === 'PAID';

      return [
        `"${o.poNumber}"`,
        `"${new Date(o.createdAt).toLocaleString('id-ID')}"`,
        `"${o.customerName.replace(/"/g, '""')}"`,
        `"${o.customerPhone}"`,
        `"${o.customerAddress.replace(/"/g, '""')}"`,
        `"${itemsText}"`,
        totalPrice,
        `"${isPaid ? 'LUNAS' : 'BELUM LUNAS'}"`,
        `"${o.paidAt ? new Date(o.paidAt).toLocaleString('id-ID') : '-'}"`,
        `"${o.courier || '-'}"`,
        `"${o.trackingNumber || '-'}"`,
        `"${o.shippingStatus === 'SHIPPED' ? 'DALAM PENGIRIMAN' : o.shippingStatus === 'DELIVERED' ? 'TERKIRIM' : 'BELUM DIKIRIM'}"`,
        `"${(o.notes || '-').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Pemesanan_PO_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Database Full Backup (.json)
  const handleExportFullDatabase = () => {
    setIsExportingDB(true);
    try {
      const backup = exportDatabaseBackup(orders, formWA, formData, expenses);
      downloadDatabaseBackupFile(backup);
    } catch (err: any) {
      alert('Gagal mengekspor database: ' + (err.message || 'Error'));
    } finally {
      setIsExportingDB(false);
    }
  };

  // Operational Expenses Handlers
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setIsCreatingNewCategoryInForm(false);
    setCustomCategoryInputInForm('');
    setExpenseForm({
      title: '',
      category: DEFAULT_EXPENSE_CATEGORIES[0] || 'Cetak PCB',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: 'Tunai (Cash)',
      recipientOrVendor: '',
      notes: '',
    });
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: OperationalExpense) => {
    setEditingExpense(expense);
    setIsCreatingNewCategoryInForm(false);
    setCustomCategoryInputInForm('');
    setExpenseForm({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      recipientOrVendor: expense.recipientOrVendor || '',
      notes: expense.notes || '',
    });
    setIsExpenseModalOpen(true);
  };

  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newCategoryInput.trim();
    if (!clean) return;
    if (allCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      alert(`Kategori "${clean}" sudah ada di dalam daftar.`);
      return;
    }
    const updated = simpleStorage.addCustomExpenseCategory(clean);
    setCustomCategories(updated);
    setNewCategoryInput('');
    setIsAddCategoryModalOpen(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Math.max(0, Number(expenseForm.amount) || 0);
    if (!expenseForm.title.trim()) {
      alert('Mohon isi nama / keperluan pengeluaran.');
      return;
    }
    if (amountNum <= 0) {
      alert('Jumlah nominal pengeluaran harus lebih besar dari Rp 0.');
      return;
    }

    let finalCategory = expenseForm.category;
    if (isCreatingNewCategoryInForm) {
      const cleanCustom = customCategoryInputInForm.trim();
      if (!cleanCustom) {
        alert('Mohon ketik nama kategori baru yang diinginkan.');
        return;
      }
      finalCategory = cleanCustom;
      const updated = simpleStorage.addCustomExpenseCategory(cleanCustom);
      setCustomCategories(updated);
    }

    if (editingExpense) {
      const updated: OperationalExpense = {
        ...editingExpense,
        title: expenseForm.title.trim(),
        category: finalCategory,
        amount: amountNum,
        date: expenseForm.date,
        paymentMethod: expenseForm.paymentMethod,
        recipientOrVendor: expenseForm.recipientOrVendor.trim(),
        notes: expenseForm.notes.trim(),
      };
      await updateExpenseCloud(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      const newExp: OperationalExpense = {
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: expenseForm.title.trim(),
        category: finalCategory,
        amount: amountNum,
        date: expenseForm.date,
        paymentMethod: expenseForm.paymentMethod,
        recipientOrVendor: expenseForm.recipientOrVendor.trim(),
        notes: expenseForm.notes.trim(),
        createdAt: new Date().toISOString(),
        createdBy: 'Admin (DeltaC)',
      };
      await saveExpenseCloud(newExp);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }

    setIsExpenseModalOpen(false);
    setEditingExpense(null);
    setIsCreatingNewCategoryInForm(false);
    setCustomCategoryInputInForm('');
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    await deleteExpenseCloud(expenseToDelete.id);
    setExpenseToDelete(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportExpensesCSV = () => {
    const headers = [
      'ID',
      'Tanggal',
      'Keperluan / Judul',
      'Kategori',
      'Jumlah (Rp)',
      'Metode Bayar',
      'Penerima / Toko',
      'Catatan / No. Nota',
      'Dibuat Oleh',
    ];

    const rows = filteredExpenses.map((e) => [
      e.id,
      e.date,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      e.amount,
      `"${(e.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(e.recipientOrVendor || '').replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      `"${(e.createdBy || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Biaya_Operasional_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Orders only (.json)
  const handleExportOrdersOnlyJson = () => {
    const jsonStr = JSON.stringify(orders, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pesanan_PO_WaveID_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Select JSON file for database import
  const handleDBFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Analyze file content
        let candidateOrders: any[] = [];
        if (Array.isArray(parsed.data?.orders)) {
          candidateOrders = parsed.data.orders;
        } else if (Array.isArray(parsed.orders)) {
          candidateOrders = parsed.orders;
        } else if (Array.isArray(parsed)) {
          candidateOrders = parsed;
        }

        const candidateAdmin = parsed.data?.adminConfig || parsed.adminConfig;
        const candidateWA = parsed.data?.waConfig || parsed.waConfig;
        const candidateExpenses = Array.isArray(parsed.data?.expenses)
          ? parsed.data.expenses
          : Array.isArray(parsed.expenses)
          ? parsed.expenses
          : [];

        setImportFile({
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          rawContent: parsed,
          orderCount: candidateOrders.length,
          expenseCount: candidateExpenses.length,
          hasAdminConfig: Boolean(candidateAdmin && candidateAdmin.products),
          hasWAConfig: Boolean(candidateWA && (candidateWA.phoneNumber || candidateWA.groupLink)),
        });
        setImportMode('merge');
        setImportModalOpen(true);
      } catch (err: any) {
        setImportError('Gagal membaca file JSON: format file rusak atau bukan JSON yang valid.');
        alert('File yang dipilih bukan file JSON yang valid.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute Database Import to Cloud Firestore
  const handleExecuteImport = async () => {
    if (!importFile) return;
    setIsImportingDB(true);
    setImportError(null);
    try {
      const res = await importDatabaseBackupCloud(importFile.rawContent, importMode);
      if (onOrdersImported && res.finalOrders) {
        onOrdersImported(res.finalOrders);
      }
      if (res.finalExpenses) {
        setExpenses(res.finalExpenses);
      }
      setImportSuccessMsg(
        `Sukses! Berhasil mengimpor ${res.orderCount} pesanan${
          res.expenseCount > 0 ? `, ${res.expenseCount} biaya operasional` : ''
        }${res.hasAdminConfig ? ', pengaturan produk/stok' : ''}${
          res.hasWAConfig ? ', & pengaturan WhatsApp' : ''
        } ke Cloud Firestore & penyimpanan lokal.`
      );

      // If configs are present in imported file, update local form data as well
      const newAdmin = importFile.rawContent.data?.adminConfig || importFile.rawContent.adminConfig;
      if (newAdmin) {
        setFormData(newAdmin);
        onSaveConfig(newAdmin);
      }
      const newWA = importFile.rawContent.data?.waConfig || importFile.rawContent.waConfig;
      if (newWA) {
        setFormWA(newWA);
        onSaveWAConfig(newWA);
      }

      setTimeout(() => {
        setImportModalOpen(false);
        setImportFile(null);
        setImportSuccessMsg(null);
      }, 2500);
    } catch (err: any) {
      setImportError('Gagal mengimpor ke Cloud: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setIsImportingDB(false);
    }
  };

  // Add custom product to catalog
  const handleAddProduct = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const newId = `product_${Date.now()}_${randomSuffix}`;
    const newProd: ProductSetting = {
      id: newId,
      name: 'PRODUK BARU',
      price: 50,
      stock: 50,
      maxPerOrder: 5,
      isActive: true,
      description: 'Deskripsi produk baru',
    };
    
    // Deduplicate existing products just in case before adding new one
    const uniqueExisting = formData.products.filter((p, index, self) => 
      index === self.findIndex((t) => t.id === p.id)
    );
    
    setFormData({ ...formData, products: [...uniqueExisting, newProd] });
    setSavedSuccess(false);
  };

  // Trigger delete product modal
  const handleDeleteProduct = (prod: ProductSetting) => {
    setProductToDelete(prod);
  };

  const handleConfirmDeleteProduct = () => {
    if (!productToDelete) return;
    const updatedProducts = formData.products.filter((p) => p.id !== productToDelete.id);
    const updatedConfig = { ...formData, products: updatedProducts };
    setFormData(updatedConfig);
    onSaveConfig(updatedConfig);
    setProductToDelete(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Statistics calculation
  const totalRevenue = orders.reduce((acc, o) => {
    if (!o) return acc;
    const items = o.items || [];
    return (
      acc +
      (o.totalPrice ??
        items.reduce((sum, it) => sum + (it.subtotal || 100 * (it.quantity || 1)), 0))
    );
  }, 0);

  const paidOrdersCount = orders.filter((o) => o?.paymentStatus === 'PAID').length;
  const pendingOrdersCount = orders.filter((o) => o?.paymentStatus !== 'PAID').length;

  // Detect duplicate PO numbers across orders
  const duplicatePOInfo = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => {
      const po = (o?.poNumber || '').trim().toUpperCase();
      if (po) {
        counts.set(po, (counts.get(po) || 0) + 1);
      }
    });
    const dupSet = new Set<string>();
    counts.forEach((count, po) => {
      if (count > 1) dupSet.add(po);
    });
    return {
      duplicateSet: dupSet,
      duplicateList: Array.from(dupSet),
    };
  }, [orders]);

  // Helper to normalize text for robust duplicate comparison
  const normalizeDuplicateKey = (val: string) => {
    return (val || '')
      .trim()
      .toLowerCase()
      .replace(/[\n\r\t]+/g, ' ')
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s+/g, ' ');
  };

  // Detect duplicate Name & Address across orders
  const duplicateNameAddressInfo = useMemo(() => {
    const groupMap = new Map<string, SimplePOOrder[]>();

    orders.forEach((o) => {
      if (!o) return;
      const nameKey = normalizeDuplicateKey(o.customerName || '');
      const addrKey = normalizeDuplicateKey(o.customerAddress || '');

      // Check duplicate only when both name and address have meaningful content
      if (nameKey.length >= 2 && addrKey.length >= 3) {
        const compositeKey = `${nameKey}:::${addrKey}`;
        const existing = groupMap.get(compositeKey) || [];
        existing.push(o);
        groupMap.set(compositeKey, existing);
      }
    });

    const duplicateOrderIds = new Set<string>();
    const duplicateConflictMap = new Map<
      string,
      { otherPOs: string[]; otherOrders: SimplePOOrder[] }
    >();
    const duplicateGroups: Array<{
      key: string;
      customerName: string;
      customerAddress: string;
      orders: SimplePOOrder[];
    }> = [];

    groupMap.forEach((matchedOrders, compositeKey) => {
      if (matchedOrders.length > 1) {
        duplicateGroups.push({
          key: compositeKey,
          customerName: matchedOrders[0].customerName,
          customerAddress: matchedOrders[0].customerAddress,
          orders: matchedOrders,
        });

        matchedOrders.forEach((currOrder) => {
          duplicateOrderIds.add(currOrder.id);
          const others = matchedOrders.filter((o) => o.id !== currOrder.id);
          duplicateConflictMap.set(currOrder.id, {
            otherPOs: others.map((o) => o.poNumber),
            otherOrders: others,
          });
        });
      }
    });

    return {
      duplicateOrderIds,
      duplicateConflictMap,
      groups: duplicateGroups,
      totalDuplicateOrders: duplicateOrderIds.size,
    };
  }, [orders]);

  const shippedCount = orders.filter((o) => o?.shippingStatus === 'SHIPPED').length;
  const pendingShipCount = orders.filter((o) => !o?.shippingStatus || o.shippingStatus === 'PENDING_SHIPMENT').length;

  // Filtered orders for payment status check & Tandai Lunas
  const searchFilterActive = Boolean(
    searchPO.trim() || searchName.trim() || searchPhone.trim() || statusFilter !== 'ALL'
  );

  const filteredOrders = orders.filter((order) => {
    if (!order) return false;
    const poNum = order.poNumber || '';
    const custName = order.customerName || '';
    const custPhone = order.customerPhone || '';

    const matchPO =
      !searchPO.trim() ||
      poNum.toLowerCase().includes(searchPO.trim().toLowerCase());
    const matchName =
      !searchName.trim() ||
      custName.toLowerCase().includes(searchName.trim().toLowerCase());

    const cleanSearchPhone = searchPhone.trim().replace(/\D/g, '');
    const cleanCustPhone = custPhone.replace(/\D/g, '');
    const matchPhone =
      !searchPhone.trim() ||
      (cleanSearchPhone
        ? cleanCustPhone.includes(cleanSearchPhone) || custPhone.toLowerCase().includes(searchPhone.trim().toLowerCase())
        : custPhone.toLowerCase().includes(searchPhone.trim().toLowerCase()));

    const isPaid = order.paymentStatus === 'PAID';
    const isDuplicateNameAddress = duplicateNameAddressInfo.duplicateOrderIds.has(order.id);

    const matchStatus =
      statusFilter === 'ALL' || statusFilter === 'SEARCH_ONLY'
        ? true
        : statusFilter === 'PAID'
        ? isPaid
        : statusFilter === 'PENDING'
        ? !isPaid
        : statusFilter === 'DUPLICATE_NAME_ADDRESS'
        ? isDuplicateNameAddress
        : true;

    if (statusFilter === 'SEARCH_ONLY') {
      const hasQuery = Boolean(searchPO.trim() || searchName.trim() || searchPhone.trim());
      if (!hasQuery) return false;
    }

    return matchPO && matchName && matchPhone && matchStatus;
  });

  // Filtered orders for Status Proses Kirim
  const shipFilterActive = Boolean(
    shipSearchPO.trim() || shipSearchName.trim() || shipSearchPhone.trim() || shippingFilter !== 'ALL'
  );

  const filteredShippingOrders = orders.filter((order) => {
    if (!order) return false;
    const poNum = order.poNumber || '';
    const custName = order.customerName || '';
    const custPhone = order.customerPhone || '';

    const matchPO =
      !shipSearchPO.trim() ||
      poNum.toLowerCase().includes(shipSearchPO.trim().toLowerCase());
    const matchName =
      !shipSearchName.trim() ||
      custName.toLowerCase().includes(shipSearchName.trim().toLowerCase());

    const cleanSearchPhone = shipSearchPhone.trim().replace(/\D/g, '');
    const cleanCustPhone = custPhone.replace(/\D/g, '');
    const matchPhone =
      !shipSearchPhone.trim() ||
      (cleanSearchPhone
        ? cleanCustPhone.includes(cleanSearchPhone) || custPhone.toLowerCase().includes(shipSearchPhone.trim().toLowerCase())
        : custPhone.toLowerCase().includes(shipSearchPhone.trim().toLowerCase()));

    const status = order.shippingStatus || 'PENDING_SHIPMENT';
    const matchStatus =
      shippingFilter === 'ALL' || shippingFilter === 'SEARCH_ONLY'
        ? true
        : status === shippingFilter;

    if (shippingFilter === 'SEARCH_ONLY') {
      const hasQuery = Boolean(shipSearchPO.trim() || shipSearchName.trim() || shipSearchPhone.trim());
      if (!hasQuery) return false;
    }

    return matchPO && matchName && matchPhone && matchStatus;
  });

  const totalPayPages = Math.ceil(filteredOrders.length / payPageSize) || 1;
  const safePayPage = Math.min(Math.max(1, payPage), totalPayPages);
  const paginatedOrders = filteredOrders.slice(
    (safePayPage - 1) * payPageSize,
    safePayPage * payPageSize
  );

  const totalShipPages = Math.ceil(filteredShippingOrders.length / shipPageSize) || 1;
  const safeShipPage = Math.min(Math.max(1, shipPage), totalShipPages);
  const paginatedShippingOrders = filteredShippingOrders.slice(
    (safeShipPage - 1) * shipPageSize,
    safeShipPage * shipPageSize
  );

  // Filtered Operational Expenses
  const filteredExpenses = expenses.filter((exp) => {
    if (!exp) return false;
    const q = expenseSearch.trim().toLowerCase();
    const matchSearch =
      !q ||
      (exp.title && exp.title.toLowerCase().includes(q)) ||
      (exp.recipientOrVendor && exp.recipientOrVendor.toLowerCase().includes(q)) ||
      (exp.notes && exp.notes.toLowerCase().includes(q)) ||
      (exp.paymentMethod && exp.paymentMethod.toLowerCase().includes(q));

    const matchCategory =
      expenseCategoryFilter === 'ALL' || exp.category === expenseCategoryFilter;

    const matchMonth =
      expenseMonthFilter === 'ALL' || (exp.date && exp.date.startsWith(expenseMonthFilter));

    return matchSearch && matchCategory && matchMonth;
  });

  const totalExpenseAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const filteredExpenseAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const currentMonthExpenses = expenses
    .filter((e) => e.date && e.date.startsWith(currentMonthPrefix))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const paidRevenue = orders
    .filter((o) => o?.paymentStatus === 'PAID')
    .reduce((acc, o) => {
      const items = o.items || [];
      return (
        acc +
        (o.totalPrice ??
          items.reduce((sum, it) => sum + (it.subtotal || 100 * (it.quantity || 1)), 0))
      );
    }, 0);

  const netCashFlow = paidRevenue - totalExpenseAmount;

  const availableExpenseMonths = Array.from(
    new Set(
      expenses
        .map((e) => (e.date ? e.date.slice(0, 7) : ''))
        .filter(Boolean)
    )
  ).sort().reverse();

  const totalExpensePages = Math.ceil(filteredExpenses.length / expensePageSize) || 1;
  const safeExpensePage = Math.min(Math.max(1, expensePage), totalExpensePages);
  const paginatedExpenses = filteredExpenses.slice(
    (safeExpensePage - 1) * expensePageSize,
    safeExpensePage * expensePageSize
  );

  // Group expenses by category for summary visualization
  const categoryBreakdown = allCategories.map((cat) => {
    const total = expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const count = expenses.filter((e) => e.category === cat).length;
    const percentage = totalExpenseAmount > 0 ? (total / totalExpenseAmount) * 100 : 0;
    return { category: cat, total, count, percentage };
  }).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);

  const handleProductChange = (
    index: number,
    field: keyof ProductSetting,
    value: string | number | boolean
  ) => {
    const updated = [...formData.products];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setFormData({ ...formData, products: updated });
    setIsDirtySettings(true);
    setSavedSuccess(false);
  };

  const handleStockAdjust = (index: number, delta: number) => {
    const updated = [...formData.products];
    const current = updated[index].stock || 0;
    updated[index] = {
      ...updated[index],
      stock: Math.max(0, current + delta),
    };
    setFormData({ ...formData, products: updated });
    setIsDirtySettings(true);
    setSavedSuccess(false);
  };

  const handleResetToDefault = () => {
    if (confirm('Kembalikan semua harga, stok barang, dan nomor DANA ke setelan awal pabrik?')) {
      setIsDirtySettings(false);
      setFormData(DEFAULT_ADMIN_CONFIG);
      onSaveConfig(DEFAULT_ADMIN_CONFIG);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    handleConfirmExecuteSaveSettings(false);
  };

  const handleConfirmExecuteSaveSettings = (shouldNavigateBack = false) => {
    setIsDirtySettings(false);
    onSaveConfig(formData);
    onSaveWAConfig(formWA);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
    setConfirmSaveSettings(false);
    if (shouldNavigateBack) {
      onNavigateToForm();
    }
  };

  const handleSaveShipping = (orderId: string) => {
    const draft = shippingDrafts[orderId];
    if (!draft) return;
    if (onUpdateOrderShipping) {
      onUpdateOrderShipping(orderId, draft.courier, draft.trackingNumber, draft.status);
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Login Panel Admin
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Silakan masukkan kredensial admin untuk mengakses panel kontrol sistem.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Username Admin
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => {
                  let val = e.target.value;
                  // Auto uppercase first letter as user types
                  if (val.length > 0) {
                    val = val.charAt(0).toUpperCase() + val.slice(1);
                  }
                  setLoginUsername(val);
                }}
                placeholder="Contoh: WaveId"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-slate-400">Huruf depan otomatis menjadi kapital (misal: delta menjadi Delta)</span>
            </div>

            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer btn-gradient"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Masuk Panel Admin</span>
              </button>
            </div>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onNavigateToForm}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              ← Kembali ke Form Pemesanan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      
      {/* Top Banner / Header of Admin Panel */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Panel Kontrol Admin
              </h1>
              <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                <Cloud className="w-3 h-3 text-indigo-500" />
                <span>REAL-TIME CLOUD</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Kelola pesanan, verifikasi bayar, resi pengiriman, stok katalog, biaya operasional &amp; ekspor laporan.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
            <button
              type="button"
              onClick={onNavigateToForm}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-600 shadow-2xs cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Form Pembeli</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminTab('sheets')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-xl transition-all border border-indigo-300 dark:border-indigo-800 shadow-2xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Database Google Sheets</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('database-management-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  setAdminTab('database');
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-xl transition-all border border-indigo-300 dark:border-indigo-800 shadow-2xs cursor-pointer"
            >
              <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Backup/Restore</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('admin_logged_in');
                setIsAdminLoggedIn(false);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-xl transition-all border border-rose-300 dark:border-rose-800 shadow-2xs cursor-pointer"
              title="Keluar / Logout dari sesi admin"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Quick Report Download Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>Pusat Unduh Laporan Rekapitulasi:</span>
          </span>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
            {/* Combined Laba Rugi Reports */}
            <button
              type="button"
              onClick={() => exportCombinedReportToExcel(orders, expenses)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-lg transition-all border border-indigo-200 dark:border-indigo-800 shadow-2xs cursor-pointer"
              title="Download Laporan Laba Rugi Gabungan (Excel .xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>📊 Laba Rugi (Excel)</span>
            </button>

            <button
              type="button"
              onClick={() => exportCombinedReportToPDF(orders, expenses)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-lg transition-all border border-indigo-200 dark:border-indigo-800 shadow-2xs cursor-pointer"
              title="Download Laporan Laba Rugi Gabungan (PDF)"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>📄 Laba Rugi (PDF)</span>
            </button>

            {/* Individual PO Reports */}
            <button
              type="button"
              onClick={() => exportToExcel(orders)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg transition-all border border-emerald-200 dark:border-emerald-800 cursor-pointer"
              title="Download rekap khusus pesanan (Excel)"
            >
              <span>Excel PO</span>
            </button>

            <button
              type="button"
              onClick={() => exportToPDF(orders)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg transition-all border border-emerald-200 dark:border-emerald-800 cursor-pointer"
              title="Download rekap khusus pesanan (PDF)"
            >
              <span>PDF PO</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all border border-slate-200 dark:border-slate-600 cursor-pointer"
              title="Download CSV Pesanan"
            >
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics / Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Omzet */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Omzet</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Dari {orders.length} pesanan masuk
          </div>
        </div>

        {/* Total PO Masuk & Status */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="font-semibold uppercase tracking-wider">Status Pembayaran</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
            {paidOrdersCount} <span className="text-xs font-sans text-slate-500 font-normal">Lunas</span>
          </div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
            {pendingOrdersCount} Menunggu Pembayaran
          </div>
        </div>

        {/* Status Pengiriman */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="font-semibold uppercase tracking-wider">Status Kirim</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-blue-600 dark:text-blue-400">
            {shippedCount} <span className="text-xs font-sans text-slate-500 font-normal">Dikirim</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {pendingShipCount} Belum Dikirim
          </div>
        </div>

        {/* Dynamic Product Metrics */}
        {formData.products.slice(0, 1).map((prod) => {
          const itemSold = orders.reduce((acc, o) => {
            const item = o.items.find((i) => i.name.toLowerCase().includes(prod.name.toLowerCase()) || prod.name.toLowerCase().includes(i.name.toLowerCase()));
            return acc + (item ? item.quantity : 0);
          }, 0);

          return (
            <div key={prod.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span className="font-semibold uppercase tracking-wider truncate">Stok {prod.name}</span>
                <Package className="w-4 h-4 text-indigo-500 shrink-0" />
              </div>
              <div className="font-mono font-bold text-base sm:text-lg text-indigo-600 dark:text-indigo-400">
                {prod.stock} <span className="text-xs font-sans text-slate-500">unit</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Terjual: {itemSold} unit
              </div>
            </div>
          );
        })}

        {/* Biaya Operasional Quick Metric */}
        <div
          onClick={() => setAdminTab('expenses')}
          className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs cursor-pointer hover:border-rose-400 dark:hover:border-rose-700 transition-all col-span-2 sm:col-span-1"
          title="Klik untuk membuka menu Biaya Operasional"
        >
          <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
            <span className="font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Biaya Ops</span>
            <Receipt className="w-4 h-4 text-rose-500" />
          </div>
          <div className="font-mono font-bold text-base sm:text-lg text-rose-600 dark:text-rose-400">
            Rp {totalExpenseAmount.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{expenses.length} item</span>
            <span className={`font-bold ${netCashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              Kas: Rp {netCashFlow.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Clean Admin Sub-Navigation Menu Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-200 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-bold overflow-x-auto scrollbar-none shadow-xs sticky top-16 z-20 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setAdminTab('payment')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'payment'
              ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm font-extrabold border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/50'
          }`}
        >
          <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>1. Verifikasi</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('shipping')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'shipping'
              ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-sm font-extrabold border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/50'
          }`}
        >
          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>2. Pengiriman</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('products')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'products'
              ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm font-extrabold border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/50'
          }`}
        >
          <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>3. Produk, Stok</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('expenses')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'expenses'
              ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-sm font-extrabold border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/50'
          }`}
        >
          <Receipt className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>4. Operasional</span>
          {expenses.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              {expenses.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('database')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'database'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm font-extrabold border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/50'
          }`}
        >
          <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>5. Backup</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('sheets')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            adminTab === 'sheets'
              ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm font-extrabold border border-slate-200 dark:border-slate-600'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-slate-700/50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>6. Google Sheets</span>
        </button>
      </div>

      {/* TAB 1: VERIFIKASI PEMBAYARAN */}
      {adminTab === 'payment' && (
        <div className="gradient-border-box bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                Verifikasi Pembayaran &amp; Tandai Lunas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cek transaksi berdasarkan No PO, Nama Pemesan, dan Nomor HP
              </p>
            </div>
          </div>

          {/* Quick Status Filter Tabs & Bulk Clear Button */}
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {onFixDuplicatePONumbers && orders.length > 1 && (
              <button
                type="button"
                onClick={onFixDuplicatePONumbers}
                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                title="Urutkan kembali seluruh Nomor PO dari 001 sampai N secara berurutan"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Urutkan No. PO</span>
              </button>
            )}

            {onClearAllOrders && orders.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClearAllOrders(true)}
                className="px-2.5 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 rounded-lg border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1 cursor-pointer"
                title="Hapus seluruh data riwayat PO dari Cloud"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua Data</span>
              </button>
            )}

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-slate-600'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Semua ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-500 text-white font-bold shadow-2xs'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                Belum Lunas ({pendingOrdersCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PAID')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'PAID'
                    ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                Lunas ({paidOrdersCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('DUPLICATE_NAME_ADDRESS');
                  setPayPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'DUPLICATE_NAME_ADDRESS'
                    ? 'bg-rose-600 text-white font-bold shadow-2xs'
                    : duplicateNameAddressInfo.totalDuplicateOrders > 0
                    ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-700'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                title="Tampilkan pesanan dengan Nama & Alamat yang sama (Double)"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Nama &amp; Alamat Double ({duplicateNameAddressInfo.totalDuplicateOrders})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SEARCH_ONLY')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'SEARCH_ONLY'
                    ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                }`}
                title="Mode Cari: Hanya menampilkan pesanan yang dicari pada kolom pencarian"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Mode Cari</span>
              </button>
            </div>
          </div>
        </div>

        {/* Peringatan Otomatis jika Ada Nomor PO yang Double / Ganda */}
        {duplicatePOInfo.duplicateList.length > 0 && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-amber-900 dark:text-amber-200">
                  Terdeteksi {duplicatePOInfo.duplicateList.length} Nomor PO Ganda (Double):{' '}
                  <span className="font-mono underline">
                    {duplicatePOInfo.duplicateList.join(', ')}
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  Anda dapat merapikan nomor PO yang ganda secara otomatis (urutan lama tetap, urutan baru diberi nomor PO berikutnya) atau klik tombol <strong>Edit</strong> pada pesanan terkait.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  setSearchPO(duplicatePOInfo.duplicateList[0] || '');
                  setStatusFilter('ALL');
                }}
                className="px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/70 hover:bg-amber-200 rounded-xl border border-amber-300 dark:border-amber-700 cursor-pointer"
              >
                Lihat yang Double
              </button>
              {onFixDuplicatePONumbers && (
                <button
                  type="button"
                  onClick={onFixDuplicatePONumbers}
                  className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Perbaiki Otomatis Nomor Ganda</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Peringatan Otomatis jika Ada Nama & Alamat yang Double / Ganda */}
        {duplicateNameAddressInfo.totalDuplicateOrders > 0 && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-300 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5 text-xs">
              <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/80 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-1.5 flex-wrap">
                  <span>Terdeteksi {duplicateNameAddressInfo.totalDuplicateOrders} Pesanan ({duplicateNameAddressInfo.groups.length} Pemesan) dengan Nama &amp; Alamat Ganda (Double)</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-100">
                    Perlu Dicek
                  </span>
                </div>
                <p className="text-[11px] text-rose-800/90 dark:text-rose-300/90 mt-1 leading-relaxed">
                  Ditemukan beberapa pesanan dengan nama pemesan &amp; alamat pengiriman yang sama persis. Anda dapat memverifikasi, mengubah data melalui tombol <strong>Edit</strong>, atau menghapus jika terjadi penginputan ganda oleh pembeli.
                </p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                  <span className="font-semibold text-rose-950 dark:text-rose-200">Daftar Pemesan Double:</span>
                  {duplicateNameAddressInfo.groups.slice(0, 4).map((grp, gIdx) => (
                    <span
                      key={gIdx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono text-[10px]"
                    >
                      <strong>{grp.customerName}</strong> ({grp.orders.map((o) => o.poNumber).join(', ')})
                    </span>
                  ))}
                  {duplicateNameAddressInfo.groups.length > 4 && (
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">
                      +{duplicateNameAddressInfo.groups.length - 4} lainnya
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('DUPLICATE_NAME_ADDRESS');
                  setPayPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5 ${
                  statusFilter === 'DUPLICATE_NAME_ADDRESS'
                    ? 'bg-rose-700 text-white border-rose-800 ring-2 ring-rose-400/50'
                    : 'bg-rose-100 hover:bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:hover:bg-rose-900 dark:text-rose-100 border-rose-300 dark:border-rose-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{statusFilter === 'DUPLICATE_NAME_ADDRESS' ? 'Sedang Difilter' : 'Filter Data Double'}</span>
              </button>
              {statusFilter === 'DUPLICATE_NAME_ADDRESS' && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setPayPage(1);
                  }}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Tampilkan Semua
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3 Search Input Fields: No PO, Nama Pemesan, Nomor HP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              🔍 Cek No. PO
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchPO}
                onChange={(e) => setSearchPO(e.target.value)}
                placeholder="Contoh: PO-202610-001"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-slate-900 dark:text-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchPO && (
                <button
                  type="button"
                  onClick={() => setSearchPO('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
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
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchName && (
                <button
                  type="button"
                  onClick={() => setSearchName('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
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
                placeholder="Contoh: 081234567890"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-slate-900 dark:text-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchPhone && (
                <button
                  type="button"
                  onClick={() => setSearchPhone('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {searchFilterActive && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-750 gap-2">
            <span>
              Menampilkan <strong className="text-slate-900 dark:text-white font-mono">{filteredOrders.length}</strong> dari {orders.length} pesanan
              {statusFilter === 'DUPLICATE_NAME_ADDRESS' && (
                <span className="ml-2 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 font-bold text-[11px] border border-rose-300 dark:border-rose-800">
                  Filter Nama &amp; Alamat Double
                </span>
              )}
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => exportToExcel(filteredOrders, 'Pesanan_Terfilter.xlsx')}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 cursor-pointer hover:bg-emerald-100 transition-colors"
                title="Ekspor hasil pencarian/filter ini ke Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Filter Excel</span>
              </button>

              <button
                type="button"
                onClick={() => exportToPDF(filteredOrders, 'Pesanan_Terfilter.pdf')}
                className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer hover:bg-rose-100 transition-colors"
                title="Ekspor hasil pencarian/filter ini ke PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>Export Filter PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchPO('');
                  setSearchName('');
                  setSearchPhone('');
                  setStatusFilter('ALL');
                }}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer ml-1"
              >
                <X className="w-3 h-3" />
                Reset Filter
              </button>
            </div>
          </div>
        )}

        {/* Orders List / Cards */}
        <div className="space-y-3">
          {statusFilter === 'SEARCH_ONLY' && !(searchPO.trim() || searchName.trim() || searchPhone.trim()) ? (
            <div className="py-10 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Mode Cari Aktif
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Silakan ketik No PO, Nama Pemesan, atau Nomor HP pada kolom pencarian di atas untuk menampilkan data pesanan yang Anda cari.
                </p>
              </div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada pesanan yang sesuai</p>
              <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian No PO, Nama Pemesan, atau Nomor HP.</p>
            </div>
          ) : (
            paginatedOrders.map((order) => {
              const isPaid = order.paymentStatus === 'PAID';
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

              let paidDateStr = null;
              try {
                if (order.paidAt) {
                  const d = new Date(order.paidAt);
                  if (!isNaN(d.getTime())) {
                    paidDateStr = new Intl.DateTimeFormat('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(d);
                  }
                }
              } catch {
                paidDateStr = null;
              }

              const items = Array.isArray(order.items) ? order.items : [];

              const conflictInfo = duplicateNameAddressInfo.duplicateConflictMap.get(order.id);

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-xl border transition-all ${
                    conflictInfo
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20 shadow-2xs'
                      : isPaid
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/80 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                          {order.poNumber}
                        </span>
                        {duplicatePOInfo.duplicateSet.has((order.poNumber || '').trim().toUpperCase()) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            NO. PO DOUBLE
                          </span>
                        )}
                        {conflictInfo && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                            <Users className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                            NAMA &amp; ALAMAT DOUBLE
                          </span>
                        )}
                        
                        {/* Payment Status Badge */}
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            LUNAS {paidDateStr && `(${paidDateStr})`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            MENUNGGU PEMBAYARAN
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-mono">
                          {dateStr} WIB
                        </span>
                      </div>

                      {/* Customer Info */}
                      <div className="text-xs text-slate-800 dark:text-slate-200 font-medium flex items-center gap-2 flex-wrap">
                        <span>👤 <strong className="text-slate-900 dark:text-white">{order.customerName || 'Pembeli'}</strong></span>
                        <span className="text-slate-400">·</span>
                        <span>📱 <span className="font-mono text-indigo-700 dark:text-indigo-300 font-bold">{order.customerPhone || '-'}</span></span>
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-2">
                        📍 {order.customerAddress || '-'}
                      </div>

                      {/* Conflict Alert Box if Duplicate Name & Address */}
                      {conflictInfo && (
                        <div className="p-2.5 bg-rose-50/90 dark:bg-rose-950/60 rounded-xl border border-rose-300 dark:border-rose-800 text-[11px] space-y-1.5 mt-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-rose-900 dark:text-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                            <span>Peringatan: Nama &amp; Alamat Sama Persis dengan {conflictInfo.otherPOs.length} PO Lain!</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap text-rose-800 dark:text-rose-300">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Sama dengan PO:</span>
                            {conflictInfo.otherOrders.map((otherOrd) => (
                              <button
                                key={otherOrd.id}
                                type="button"
                                onClick={() => {
                                  setSearchPO(otherOrd.poNumber);
                                  setStatusFilter('ALL');
                                  setPayPage(1);
                                }}
                                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 font-mono font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer text-[10px] transition-colors"
                                title="Klik untuk membuka & melihat PO ini"
                              >
                                {otherOrd.poNumber} ({otherOrd.paymentStatus === 'PAID' ? 'LUNAS' : 'BELUM LUNAS'})
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => handleOpenEditOrder(order)}
                              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer text-[10px] transition-all shadow-2xs"
                              title="Benahi nama atau alamat pesanan ini"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              <span>Benahi Data PO Ini</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Items & Total */}
                      <div className="text-xs text-slate-600 dark:text-slate-300 pt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {items.length > 0 ? items.map((i) => `${i.name || 'Barang'} (${i.quantity || 1}x)`).join(', ') : 'Rincian pesanan'}
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Total: {(() => {
                            const basePrice = order.totalPrice ?? items.reduce((acc, it) => acc + (it.subtotal || (100 * (it.quantity || 1))), 0);
                            const poDigits = parseInt((order.poNumber || '001').replace(/\D/g, '').slice(-3) || '1', 10);
                            const finalSum = basePrice + poDigits;
                            return `${basePrice.toLocaleString('id-ID')} + ${poDigits.toString().padStart(3, '0')} = ${finalSum.toLocaleString('id-ID')}`;
                          })()}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Edit, Cetak Struk, Tandai Lunas, Undang WA & Hapus Data */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEditOrder(order)}
                        className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-xl transition-all border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Edit data pesanan ini (Nama, Nomor HP, Alamat, Barang, Harga, Status)"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInvoiceOrder(order)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-300 dark:border-slate-700 inline-flex items-center gap-1 cursor-pointer"
                        title="Lihat & cetak nota invoice pesanan"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cetak Struk</span>
                      </button>

                      {isPaid && (
                        <button
                          type="button"
                          onClick={() => {
                            const link = formWA.paidGroupLink || 'https://chat.whatsapp.com/GrupPCBUtamaLunas';
                            openPaidWhatsAppInvite(order, link);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 rounded-xl transition-all border border-emerald-300 dark:border-emerald-800 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          title="Kirim pesan WhatsApp berisi tautan undangan Grup WA LUNAS ke pembeli ini"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Undang WA LUNAS</span>
                        </button>
                      )}

                      {onUpdatePaymentStatus && (
                        isPaid ? (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmPaidTargetStatus('PENDING');
                              setConfirmPaidOrder(order);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-300 dark:border-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                            title="Ubah kembali status ke belum lunas"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                            <span>Batal Lunas</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmPaidTargetStatus('PAID');
                              setConfirmPaidOrder(order);
                            }}
                            className="px-4 py-2 text-xs font-extrabold text-white rounded-xl transition-all shadow-md active:scale-95 inline-flex items-center gap-1.5 cursor-pointer btn-gradient"
                            title="Tandai LUNAS dan buka WhatsApp untuk mengundang ke Grup WA LUNAS"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Tandai Lunas &amp; Undang WA</span>
                          </button>
                        )
                      )}

                      {/* Explicit Delete Order Button for Admin */}
                      {onDeleteOrder && (
                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-950/90 rounded-xl transition-all border border-rose-200 dark:border-rose-900 inline-flex items-center gap-1 cursor-pointer"
                          title="Hapus pesanan ini dari database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls for Verifikasi Pembayaran */}
        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span>Tampilkan:</span>
              <select
                value={payPageSize}
                onChange={(e) => {
                  setPayPageSize(Number(e.target.value));
                  setPayPage(1);
                }}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value={10}>10 per halaman</option>
                <option value={25}>25 per halaman</option>
                <option value={50}>50 per halaman</option>
                <option value={100}>100 per halaman</option>
              </select>
              <span>
                (Menampilkan {(safePayPage - 1) * payPageSize + 1}-{Math.min(safePayPage * payPageSize, filteredOrders.length)} dari {filteredOrders.length} data)
              </span>
            </div>

            <div className="flex items-center gap-2 font-semibold">
              <button
                type="button"
                disabled={safePayPage <= 1}
                onClick={() => setPayPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              >
                ← Sebelumnya
              </button>
              <span className="px-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                Halaman {safePayPage} / {totalPayPages}
              </span>
              <button
                type="button"
                disabled={safePayPage >= totalPayPages}
                onClick={() => setPayPage((p) => Math.min(totalPayPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* TAB 2: STATUS PROSES KIRIM */}
      {adminTab === 'shipping' && (
        <div className="gradient-border-box bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                Status Proses Kirim &amp; Nomor Resi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Input Jasa Kirim, Nomor Resi, dan ubah status pengiriman pesanan
              </p>
            </div>
          </div>

          {/* Quick Shipping Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setShippingFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                shippingFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold border border-slate-200 dark:border-slate-600'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Semua ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setShippingFilter('PENDING_SHIPMENT')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                shippingFilter === 'PENDING_SHIPMENT'
                  ? 'bg-amber-500 text-white font-bold shadow-2xs'
                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
              }`}
            >
              Belum Kirim ({pendingShipCount})
            </button>
            <button
              type="button"
              onClick={() => setShippingFilter('SHIPPED')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                shippingFilter === 'SHIPPED'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
            >
              Dikirim ({shippedCount})
            </button>
            <button
              type="button"
              onClick={() => setShippingFilter('DELIVERED')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                shippingFilter === 'DELIVERED'
                  ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              Selesai
            </button>
            <button
              type="button"
              onClick={() => setShippingFilter('SEARCH_ONLY')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                shippingFilter === 'SEARCH_ONLY'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
              }`}
              title="Mode Cari: Hanya menampilkan pesanan yang dicari pada kolom pencarian"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Mode Cari</span>
            </button>
          </div>
        </div>

        {/* 3 Search Input Fields for Status Kirim: No PO, Nama Pemesan, Nomor HP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              🚚 Cari No. PO
            </label>
            <div className="relative">
              <input
                type="text"
                value={shipSearchPO}
                onChange={(e) => setShipSearchPO(e.target.value)}
                placeholder="Contoh: PO-202610-001"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-slate-900 dark:text-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {shipSearchPO && (
                <button
                  type="button"
                  onClick={() => setShipSearchPO('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              👤 Cari Nama Pemesan
            </label>
            <div className="relative">
              <input
                type="text"
                value={shipSearchName}
                onChange={(e) => setShipSearchName(e.target.value)}
                placeholder="Contoh: Edi Purnomo"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {shipSearchName && (
                <button
                  type="button"
                  onClick={() => setShipSearchName('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              📱 Cari Nomor HP
            </label>
            <div className="relative">
              <input
                type="text"
                value={shipSearchPhone}
                onChange={(e) => setShipSearchPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-slate-900 dark:text-white"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {shipSearchPhone && (
                <button
                  type="button"
                  onClick={() => setShipSearchPhone('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {shipFilterActive && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-750">
            <span>
              Menampilkan <strong className="text-slate-900 dark:text-white font-mono">{filteredShippingOrders.length}</strong> dari {orders.length} pesanan
            </span>
            <button
              type="button"
              onClick={() => {
                setShipSearchPO('');
                setShipSearchName('');
                setShipSearchPhone('');
                setShippingFilter('ALL');
              }}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Reset Filter Kirim
            </button>
          </div>
        )}

        {/* List of Orders for Shipping Update */}
        <div className="space-y-4">
          {shippingFilter === 'SEARCH_ONLY' && !(shipSearchPO.trim() || shipSearchName.trim() || shipSearchPhone.trim()) ? (
            <div className="py-10 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Truck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Mode Cari Pengiriman Aktif
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Silakan ketik No PO, Nama Pemesan, atau Nomor HP pada kolom pencarian di atas untuk menampilkan data pengiriman yang Anda cari.
                </p>
              </div>
            </div>
          ) : filteredShippingOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4">
              <Truck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada pesanan pengiriman yang sesuai</p>
            </div>
          ) : (
            paginatedShippingOrders.map((order) => {
              const draft = shippingDrafts[order.id] || {
                courier: order.courier || 'J&T Express',
                trackingNumber: order.trackingNumber || '',
                status: order.shippingStatus || 'PENDING_SHIPMENT',
              };

              const isShipped = draft.status === 'SHIPPED';
              const isDelivered = draft.status === 'DELIVERED';

              return (
                <div
                  key={order.id}
                  className="gradient-border-box bg-white dark:bg-slate-800 p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                          {order.poNumber}
                        </span>
                        <span className="text-xs text-slate-900 dark:text-white font-bold">
                          {order.customerName} ({order.customerPhone})
                        </span>
                        {order.paymentStatus === 'PAID' ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                            LUNAS
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                            Belum Bayar
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        📍 {order.customerAddress}
                      </div>
                    </div>

                    {/* Current Shipping Status Badge */}
                    <div className="self-start sm:self-auto">
                      {isDelivered ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          PESANAN TERKIRIM
                        </span>
                      ) : isShipped ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          DALAM PENGIRIMAN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          BELUM DIKIRIM
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Input Form for Jasa Kirim & Nomor Resi */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        📦 Pilih Jasa Kirim (Ekspedisi)
                      </label>
                      <select
                        value={draft.courier}
                        onChange={(e) =>
                          setShippingDrafts({
                            ...shippingDrafts,
                            [order.id]: { ...draft, courier: e.target.value },
                          })
                        }
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {COURIER_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        🎫 Nomor Resi Pengiriman
                      </label>
                      <input
                        type="text"
                        value={draft.trackingNumber}
                        onChange={(e) =>
                          setShippingDrafts({
                            ...shippingDrafts,
                            [order.id]: { ...draft, trackingNumber: e.target.value },
                          })
                        }
                        placeholder="Contoh: JT1982739281..."
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        📌 Status Proses Pengiriman
                      </label>
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setShippingDrafts({
                            ...shippingDrafts,
                            [order.id]: { ...draft, status: e.target.value as ShippingStatus },
                          })
                        }
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-blue-700 dark:text-blue-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="PENDING_SHIPMENT">⏳ Belum Dikirim</option>
                        <option value="SHIPPED">🚚 Dalam Pengiriman</option>
                        <option value="DELIVERED">✅ Pesanan Selesai / Terkirim</option>
                      </select>
                    </div>
                  </div>

                  {/* Save Shipping Status Button */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-slate-750">
                    <div className="text-[11px] text-slate-500">
                      {order.shippedAt ? `Dikirim pada: ${new Date(order.shippedAt).toLocaleString('id-ID')}` : 'Belum ada tanggal kirim'}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const currentDraft = shippingDrafts[order.id] || {
                          courier: order.courier || 'J&T Express',
                          trackingNumber: order.trackingNumber || '',
                          status: order.shippingStatus || 'PENDING_SHIPMENT',
                        };
                        setConfirmShippingData({
                          order,
                          courier: currentDraft.courier,
                          trackingNumber: currentDraft.trackingNumber,
                          status: currentDraft.status,
                        });
                      }}
                      className="px-4 py-1.5 text-xs font-bold text-white rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer btn-gradient"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Resi &amp; Status Kirim</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls for Status Proses Kirim */}
        {filteredShippingOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span>Tampilkan:</span>
              <select
                value={shipPageSize}
                onChange={(e) => {
                  setShipPageSize(Number(e.target.value));
                  setShipPage(1);
                }}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value={10}>10 per halaman</option>
                <option value={25}>25 per halaman</option>
                <option value={50}>50 per halaman</option>
                <option value={100}>100 per halaman</option>
              </select>
              <span>
                (Menampilkan {(safeShipPage - 1) * shipPageSize + 1}-{Math.min(safeShipPage * shipPageSize, filteredShippingOrders.length)} dari {filteredShippingOrders.length} data)
              </span>
            </div>

            <div className="flex items-center gap-2 font-semibold">
              <button
                type="button"
                disabled={safeShipPage <= 1}
                onClick={() => setShipPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              >
                ← Sebelumnya
              </button>
              <span className="px-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                Halaman {safeShipPage} / {totalShipPages}
              </span>
              <button
                type="button"
                disabled={safeShipPage >= totalShipPages}
                onClick={() => setShipPage((p) => Math.min(totalShipPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              >
                Selanjutnya →
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* TAB 4: BACKUP & INTEGRASI */}
      {adminTab === 'database' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Quick Export Tools Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Ekspor Rekapitulasi Pesanan PO</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Download seluruh rekap data transaksi ke format Excel (.xlsx), PDF, atau CSV
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button
                type="button"
                onClick={() => exportToExcel(orders)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl transition-all border border-white/10 shadow-2xs cursor-pointer btn-gradient"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>Ekspor Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => exportToPDF(orders)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl transition-all border border-white/10 shadow-2xs cursor-pointer btn-gradient"
              >
                <FileText className="w-4 h-4 text-white" />
                <span>Ekspor PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl transition-all border border-white/10 shadow-2xs cursor-pointer btn-gradient"
              >
                <Download className="w-4 h-4 text-white" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* SEKSI KHUSUS 3: MANAJEMEN BACKUP & RESTORE DATABASE (EXPORT & IMPORT) */}
          <div id="database-management-section" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  Backup &amp; Restore Database (Export &amp; Import)
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Cloud className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Cloud Firestore Sync Active</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cadangkan seluruh basis data pesanan PO &amp; pengaturan sistem ke file JSON atau pulihkan data cadangan kapan saja.
              </p>
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto truncate max-w-xs">
            DB: <span className="text-indigo-600 dark:text-indigo-400 font-bold">ai-studio-halamanpurchaseo...</span>
          </div>
        </div>

        {/* 2 Big Action Cards: EXPORT & IMPORT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Ekspor Database */}
          <div className="p-4 sm:p-5 bg-linear-to-br from-indigo-50/70 to-blue-50/40 dark:from-slate-900 dark:to-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Download className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Ekspor Database (Backup)
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Unduh seluruh data sistem saat ini: <strong>{orders.length} data pesanan PO</strong>, seluruh pengaturan katalog produk &amp; stok, serta konfigurasi WhatsApp &amp; DANA ke dalam file <code>.json</code>.
              </p>
              
              <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-lg border border-indigo-100 dark:border-indigo-950/80 text-[11px] text-slate-500 space-y-1">
                <div className="flex justify-between items-center">
                  <span>Total Pesanan PO:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{orders.length} pesanan</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Katalog Produk:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{formData.products.length} item aktif</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Rekening DANA:</span>
                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{formData.danaPhone || '-'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleExportFullDatabase}
                disabled={isExportingDB}
                className="w-full py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer btn-gradient"
              >
                <Download className="w-4 h-4 text-white" />
                <span>{isExportingDB ? 'Mengekspor...' : 'Ekspor Database Lengkap (.json)'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportOrdersOnlyJson}
                className="w-full py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer btn-gradient"
              >
                <FileText className="w-3.5 h-3.5 text-white" />
                <span>Ekspor Hanya Data Pesanan (.json)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Impor Database */}
          <div className="p-4 sm:p-5 bg-linear-to-br from-emerald-50/70 to-teal-50/40 dark:from-slate-900 dark:to-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Impor Database (Restore / Merge)
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Pilih file backup <code>.json</code> untuk dipulihkan ke Cloud Firestore. Anda dapat memilih untuk <strong>menggabungkan (merge)</strong> data baru atau <strong>mengganti total</strong> database saat ini.
              </p>
              
              <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-lg border border-emerald-100 dark:border-emerald-950/80 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Mendukung file backup lengkap atau file JSON pesanan</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Dilengkapi pratinjau data sebelum konfirmasi impor</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <input
                ref={dbFileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleDBFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => dbFileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer btn-gradient"
              >
                <Upload className="w-4 h-4 text-white" />
                <span>Pilih File Backup (.json) untuk Diimpor</span>
              </button>
              <p className="text-center text-[10px] text-slate-400">
                Data yang diimpor akan langsung tersinkron ke semua perangkat HP &amp; PC secara real-time.
              </p>
            </div>
          </div>
        </div>
      </div>

      </div>
      )}

      {/* TAB 3: PRODUK, STOK & DANA */}
      {adminTab === 'products' && (
        <form onSubmit={handleSaveAll} className="space-y-6 animate-in fade-in duration-150">
        
        {/* BAGIAN 1: KELOLA HARGA & STOK BARANG */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  1. Pengaturan Harga &amp; Stok Barang Katalog
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kelola nama, harga, stok, dan ketersediaan barang. Perubahan stok akan disinkronkan otomatis.
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddProduct}
                className="px-3 py-1.5 text-xs font-bold text-white rounded-xl border border-white/10 inline-flex items-center gap-1 cursor-pointer btn-gradient"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Produk Baru</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.products.map((prod, idx) => {
              const isOutOfStock = prod.stock === 0;
              const isLowStock = prod.stock > 0 && prod.stock <= 5;

              return (
                <div
                  key={prod.id}
                  className={`p-4 rounded-xl border transition-all ${
                    prod.isActive
                      ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-xs'
                      : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
                  }`}
                >
                  {/* Card Title & Status Switch */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 gap-2">
                    <div className="flex-1 pr-2">
                      <input
                        type="text"
                        value={prod.name}
                        onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                        className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500 w-full"
                        placeholder="Nama Produk..."
                      />
                      <div className="mt-1">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-900">
                            Stok Habis (0)
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-900">
                            Stok Menipis ({prod.stock})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-900">
                            Tersedia ({prod.stock} unit)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {prod.isActive ? 'Aktif' : 'Off'}
                        </span>
                        <input
                          type="checkbox"
                          checked={prod.isActive}
                          onChange={(e) => handleProductChange(idx, 'isActive', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-700 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod)}
                        className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                        title={`Hapus ${prod.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-3 pt-3">
                    {/* Harga Satuan */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Harga Satuan (Rp) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 font-mono text-slate-400 font-bold text-xs">
                          Rp
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={prod.price}
                          onChange={(e) =>
                            handleProductChange(
                              idx,
                              'price',
                              Math.max(0, Number(e.target.value) || 0)
                            )
                          }
                          className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Format: Rp {prod.price.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Stok Gudang */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Stok Barang Tersedia (Unit) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={prod.stock}
                          onChange={(e) =>
                            handleProductChange(
                              idx,
                              'stock',
                              Math.max(0, Number(e.target.value) || 0)
                            )
                          }
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Quick stock shortcuts */}
                      <div className="flex items-center gap-1 mt-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(idx, +10)}
                          className="px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer btn-gradient"
                          title="Tambah 10 unit"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(idx, +50)}
                          className="px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer btn-gradient"
                          title="Tambah 50 unit"
                        >
                          +50
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStockAdjust(idx, +100)}
                          className="px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer btn-gradient"
                          title="Tambah 100 unit"
                        >
                          +100
                        </button>
                        <button
                          type="button"
                          onClick={() => handleProductChange(idx, 'stock', 0)}
                          className="px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer btn-gradient"
                          title="Kosongkan stok"
                        >
                          Habiskan
                        </button>
                      </div>
                    </div>

                    {/* Batas Maksimal Pesan */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Batas Maksimal Pesan per Pembeli *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={prod.maxPerOrder}
                        onChange={(e) =>
                          handleProductChange(
                            idx,
                            'maxPerOrder',
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Deskripsi */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Deskripsi Singkat:
                      </label>
                      <input
                        type="text"
                        value={prod.description}
                        onChange={(e) => handleProductChange(idx, 'description', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                        placeholder="Keterangan barang..."
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BAGIAN 2: PENGATURAN PEMBAYARAN DANA & OTOMASI */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#118EEA]" />
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                2. Pengaturan Pembayaran DANA &amp; QRIS
              </h2>
            </div>
            <span className="text-[11px] text-[#118EEA] font-bold">
              E-Wallet DANA
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Input Data DANA */}
            <div className="md:col-span-2 space-y-4">
              <div className="space-y-1.5">
                <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Nomor Akun DANA (Tujuan Transfer) *
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={formData.danaPhone}
                    onChange={(e) => {
                      setFormData({ ...formData, danaPhone: e.target.value });
                      setIsDirtySettings(true);
                      setSavedSuccess(false);
                    }}
                    placeholder="Masukkan nomor DANA..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-[#118EEA] focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Nomor ini akan otomatis dikodekan ke dalam QRIS dan template format pesanan WhatsApp.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300">
                  Nama Akun / Pemilik DANA
                </label>
                <input
                  type="text"
                  value={formData.danaAccountName}
                  onChange={(e) => {
                    setFormData({ ...formData, danaAccountName: e.target.value });
                    setIsDirtySettings(true);
                    setSavedSuccess(false);
                  }}
                  placeholder="Masukkan nama akun DANA..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-[#118EEA] focus:outline-none"
                />
              </div>

              {/* Auto Deduct Stock Switch */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-850/80 rounded-xl border border-slate-200 dark:border-slate-700/80 cursor-pointer">
                  <div className="pr-3">
                    <span className="font-semibold text-slate-900 dark:text-white block text-xs">
                      Kurangi Stok Otomatis Saat Pesanan Dibuat
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Setiap kali pembeli submit PO baru, jumlah stok barang di gudang akan otomatis dipotong.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoDeductStock}
                    onChange={(e) => {
                      setFormData({ ...formData, autoDeductStock: e.target.checked });
                      setIsDirtySettings(true);
                      setSavedSuccess(false);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 relative shrink-0"></div>
                </label>
              </div>

              {/* Upload Foto Barcode QRIS Asli Toko (All-Bank / E-Wallet) */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Upload Foto Barcode QRIS Asli Toko (All-Bank / E-Wallet)</span>
                  </label>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Unggah foto/screenshot Barcode QRIS Asli Toko Anda (dari DANA Bisnis, BCA, Mandiri, GoPay, Nobu, ShopeePay, dll). Barcode ini akan langsung tampil di modal pemesanan pembeli dan dapat di-scan oleh <strong>SEMUA aplikasi m-Banking dan E-Wallet</strong>.
                </p>

                <input
                  ref={qrisFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQRISFileChange}
                  className="hidden"
                />

                {formData.qrisImageUrl ? (
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-300 dark:border-emerald-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={formData.qrisImageUrl}
                        alt="QRIS Toko Preview"
                        className="w-20 h-20 object-contain rounded-lg border border-slate-300 bg-white p-1 shadow-2xs shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Barcode QRIS Asli Toko Siap</span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">
                          Foto QRIS ini otomatis ditampilkan ke seluruh pembeli saat berhasil membuat PO.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => qrisFileInputRef.current?.click()}
                        disabled={isUploadingQRIS}
                        className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        {isUploadingQRIS ? 'Memuat...' : 'Ganti Foto QRIS'}
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveQRISImage}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Gambar QRIS"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => qrisFileInputRef.current?.click()}
                    className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-1.5 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-800 dark:text-white">
                        Klik untuk Unggah Foto Barcode QRIS Asli
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Format PNG, JPG, WEBP (Bisa di-scan oleh BCA, Mandiri, BRI, GoPay, OVO, ShopeePay, DANA)
                      </p>
                    </div>
                  </div>
                )}

                {qrisUploadMsg && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    {qrisUploadMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Live QRIS Card Preview for Admin */}
            <div className="bg-slate-50 dark:bg-slate-850/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col items-center text-center justify-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-2">
                Pratinjau QRIS DANA
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                {previewQrUrl ? (
                  <img
                    src={previewQrUrl}
                    alt="Preview QRIS"
                    className="w-28 h-28 object-contain rounded"
                  />
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center text-slate-400 text-[10px]">
                    Memuat...
                  </div>
                )}
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 mt-2">
                {formData.danaPhone || 'Belum diatur'}
              </div>
              <div className="text-[9px] text-emerald-600 font-medium">
                Siap di-scan oleh pembeli
              </div>
            </div>
          </div>
        </div>

        {/* BAGIAN 3: PENGATURAN TUJUAN WHATSAPP */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                3. Tujuan WhatsApp Penerima Pesanan
              </h2>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">
              WhatsApp Integration
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setFormWA({ ...formWA, mode: 'group_link' });
                setIsDirtySettings(true);
                setSavedSuccess(false);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                formWA.mode === 'group_link'
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 font-semibold shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="text-xs font-bold">Grup WhatsApp</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Kirim via tautan undangan grup
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormWA({ ...formWA, mode: 'phone_number' });
                setIsDirtySettings(true);
                setSavedSuccess(false);
              }}
              className={`p-3 rounded-xl border text-left transition-all ${
                formWA.mode === 'phone_number'
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 font-semibold shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="text-xs font-bold">Nomor Pribadi Admin</div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Kirim langsung chat ke nomor WA admin
              </div>
            </button>
          </div>

          {/* Dynamic input according to mode */}
          {formWA.mode === 'group_link' ? (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tautan Undangan Grup WhatsApp Pemesanan *
                </label>
                <input
                  type="text"
                  value={formWA.groupLink}
                  onChange={(e) => {
                    setFormWA({ ...formWA, groupLink: e.target.value });
                    setIsDirtySettings(true);
                    setSavedSuccess(false);
                  }}
                  placeholder="https://chat.whatsapp.com/GrupPemesananPCB..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Label Grup WhatsApp
                </label>
                <input
                  type="text"
                  value={formWA.groupName}
                  onChange={(e) => {
                    setFormWA({ ...formWA, groupName: e.target.value });
                    setIsDirtySettings(true);
                    setSavedSuccess(false);
                  }}
                  placeholder="Contoh: Grup Order PCB GEN 3 & SOLDER C21"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nomor Telepon WhatsApp Admin *
                </label>
                <input
                  type="tel"
                  value={formWA.phoneNumber}
                  onChange={(e) => {
                    setFormWA({ ...formWA, phoneNumber: e.target.value });
                    setIsDirtySettings(true);
                    setSavedSuccess(false);
                  }}
                  placeholder="6281234567890 atau 081234567890"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          )}

          {/* Seksi khusus: Tautan Undangan Grup WA LUNAS */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span>🟢 Tautan Undangan Grup WhatsApp Pelanggan LUNAS</span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Link Grup WA LUNAS (Diundang Otomatis Saat Tandai Lunas) *
              </label>
              <input
                type="text"
                value={formWA.paidGroupLink || ''}
                onChange={(e) => {
                  setFormWA({ ...formWA, paidGroupLink: e.target.value });
                  setIsDirtySettings(true);
                  setSavedSuccess(false);
                }}
                placeholder="https://chat.whatsapp.com/GrupPCBUtamaLunas"
                className="w-full px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Saat admin menekan &quot;Tandai Lunas&quot;, sistem akan membuka chat WA ke pembeli dengan tautan grup ini.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Save Notifications */}
        <div className="sticky bottom-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {savedSuccess ? (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Semua pengaturan berhasil disimpan &amp; disinkron ke Cloud!</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500">
                Perubahan tersimpan otomatis &amp; tersinkron real-time antar device admin.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3 py-2 text-xs font-semibold text-white rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer btn-gradient"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="submit"
              disabled={!isSynced}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white rounded-xl transition-all cursor-pointer btn-gradient ${!isSynced ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Save className="w-4 h-4 text-white" />
              <span>Simpan Pengaturan</span>
            </button>

            <button
              type="button"
              disabled={!isSynced}
              onClick={() => setConfirmSaveSettings(true)}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer btn-gradient ${!isSynced ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Simpan &amp; Kembali</span>
            </button>
          </div>
        </div>
      </form>
      )}

      {/* TAB 6: PENGATURAN SERVER & REALTIME CLOUD */}
      {adminTab === 'sheets' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  Koneksi Database Google Sheets
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Gunakan Google Sheets sebagai database 100% gratis dan aman.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                URL Web App Google Apps Script
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={config.googleSheetsUrl || getGoogleSheetsUrl()}
                  onChange={(e) => {
                    const url = e.target.value;
                    onSaveConfig({ ...config, googleSheetsUrl: url });
                    saveGoogleSheetsUrl(url);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                />
                <button
                  type="button"
                  onClick={handleRunSyncVerification}
                  disabled={isVerifyingSync || syncingSheets}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isVerifyingSync ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>Cek &amp; Verifikasi Sinkronisasi</span>
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                Tempelkan URL Web App yang Anda dapatkan setelah melakukan <b>Deploy</b> pada Apps Script di Google Sheet Anda.
              </p>
            </div>

            {/* SYNC VERIFICATION DIAGNOSTIC PANEL */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Diagnostik Verifikasi Sinkronisasi (App State vs Google Sheets API)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Mengambil JSON mentah dari Google Sheets API secara langsung dan membandingkannya dengan state aplikasi saat ini.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleForcePushLocalToSheets}
                    disabled={syncingSheets || isVerifyingSync}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    title="Kirim paksa pengaturan DANA, WA, dan Produk dari aplikasi ke Google Sheets"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Push App → Sheets</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleManualSheetsSync}
                    disabled={syncingSheets || isVerifyingSync}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all border border-slate-300 dark:border-slate-600 cursor-pointer disabled:opacity-50"
                    title="Tarik paksa data dari Google Sheets ke aplikasi"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pull Sheets → App</span>
                  </button>
                </div>
              </div>

              {sheetsSyncResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    sheetsSyncResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {sheetsSyncResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{sheetsSyncResult.message}</span>
                </div>
              )}

              {syncDiagReport ? (
                <div className="space-y-3">
                  {/* Overall Banner */}
                  <div
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      syncDiagReport.error
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                        : syncDiagReport.allMatched
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-2 text-xs font-bold">
                      {syncDiagReport.error ? (
                        <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                      ) : syncDiagReport.allMatched ? (
                        <BadgeCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                      )}
                      <div>
                        {syncDiagReport.error ? (
                          <span>{syncDiagReport.error}</span>
                        ) : syncDiagReport.allMatched ? (
                          <span>100% SINKRON: Seluruh pengaturan DANA, WA, Produk, dan Pesanan di Aplikasi sama persis dengan Google Sheets!</span>
                        ) : (
                          <span>
                            TERDETEKSI PERBEDAAN DATA: Beberapa pengaturan di Aplikasi belum sama dengan Google Sheets.
                            {!syncDiagReport.hasSettingsSheet &&
                              ' (Objek "settings" di Google Sheets masih kosong — pastikan Apps Script di-deploy versi terbaru lalu klik "Push App → Sheets").'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono opacity-75 shrink-0">
                      Dicek: {syncDiagReport.checkedAt}
                    </span>
                  </div>

                  {/* Comparison Table */}
                  {syncDiagReport.fields.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                            <th className="py-2.5 px-3 font-bold">Parameter Pengaturan</th>
                            <th className="py-2.5 px-3 font-bold">State Aplikasi (Lokal)</th>
                            <th className="py-2.5 px-3 font-bold">Google Sheets API (Cloud)</th>
                            <th className="py-2.5 px-3 font-bold text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                          {syncDiagReport.fields.map((field) => (
                            <tr
                              key={field.key}
                              className={
                                field.matched
                                  ? 'bg-white dark:bg-slate-800/60'
                                  : 'bg-amber-50/50 dark:bg-amber-950/20'
                              }
                            >
                              <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                {field.label}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                                {field.localValue}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                                {field.remoteValue}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {field.matched ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                    <Check className="w-3 h-3" /> Cocok
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                                    <AlertTriangle className="w-3 h-3" /> Berbeda
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Toggle Raw JSON Inspector */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowRawDiagnosticJson(!showRawDiagnosticJson)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {showRawDiagnosticJson
                        ? '▼ Sembunyikan Raw JSON dari Google Sheets API'
                        : '▶ Tampilkan Raw JSON dari Google Sheets API'}
                    </button>
                    {showRawDiagnosticJson && (
                      <pre className="mt-2 p-3 bg-slate-950 text-emerald-400 rounded-xl text-[10px] font-mono overflow-x-auto max-h-72 border border-slate-800">
                        {JSON.stringify(syncDiagReport.rawResponse, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                  Klik tombol <b>&quot;Cek &amp; Verifikasi Sinkronisasi&quot;</b> di atas untuk memeriksa apakah Nomor DANA, Nama DANA, dan Tujuan WhatsApp sudah tersimpan di Google Sheets Anda.
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
              <h3 className="font-bold text-xs text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Panduan Setup Cepat (Jika Sheet &quot;Settings&quot; Belum Muncul)
              </h3>
              <ol className="text-[11px] text-slate-600 dark:text-slate-400 space-y-2 list-decimal ml-4">
                <li>Buka Google Sheets Anda, lalu klik menu <b>Extensions &gt; Apps Script</b>.</li>
                <li>Pastikan seluruh kode dari file <code>google-apps-script.gs</code> sudah ditempelkan (terutama fungsi <code>saveSetting</code>).</li>
                <li>Klik tombol <b>Deploy &gt; Manage deployments &gt; Edit (ikon pensil) &gt; Version: New version &gt; Deploy</b>.</li>
                <li>Klik tombol <b>Push App → Sheets</b> di atas, lalu klik <b>Cek &amp; Verifikasi Sinkronisasi</b>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}



      {/* TAB 4: BIAYA OPERASIONAL */}
      {adminTab === 'expenses' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Header Card & Quick Action */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    Kelola Biaya Operasional Toko
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-900 flex items-center gap-1">
                    <Cloud className="w-2.5 h-2.5 text-rose-600" />
                    <span>Real-time Cloud Sync</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Catat seluruh pengeluaran utilitas, bahan kemasan, transportasi, serta pantau laba bersih &amp; arus kas toko.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <button
                type="button"
                onClick={() => exportExpensesToExcel(filteredExpenses)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl transition-all border border-emerald-300 dark:border-emerald-800 shadow-2xs cursor-pointer flex-1 sm:flex-none justify-center"
                title="Download data pengeluaran operasional ke file Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Ekspor Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => exportExpensesToPDF(filteredExpenses)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-xl transition-all border border-rose-300 dark:border-rose-800 shadow-2xs cursor-pointer flex-1 sm:flex-none justify-center"
                title="Download rekap laporan biaya operasional ke file PDF (.pdf)"
              >
                <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Ekspor PDF (.pdf)</span>
              </button>

              <button
                type="button"
                onClick={handleExportExpensesCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/70 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-300 dark:border-slate-600 shadow-2xs cursor-pointer flex-1 sm:flex-none justify-center"
                title="Download data pengeluaran ke file CSV"
              >
                <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddExpense}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-white rounded-xl shadow-md cursor-pointer flex-1 sm:flex-none justify-center btn-gradient"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>+ Catat Biaya Baru</span>
              </button>
            </div>
          </div>

          {/* Executive Financial Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Total Pengeluaran */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span className="font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Total Biaya</span>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <div className="font-mono font-bold text-base sm:text-lg text-rose-600 dark:text-rose-400">
                Rp {totalExpenseAmount.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                {expenses.length} transaksi pengeluaran
              </div>
            </div>

            {/* Biaya Bulan Ini */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span className="font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Bulan Ini</span>
                <Calendar className="w-4 h-4 text-amber-500" />
              </div>
              <div className="font-mono font-bold text-base sm:text-lg text-amber-600 dark:text-amber-400">
                Rp {currentMonthExpenses.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Periode {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Omzet Penjualan Lunas */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span className="font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Omzet Lunas</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="font-mono font-bold text-base sm:text-lg text-emerald-600 dark:text-emerald-400">
                Rp {paidRevenue.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Dari {paidOrdersCount} pesanan berstatus Lunas
              </div>
            </div>

            {/* Estimasi Arus Kas / Laba Bersih */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1">
                <span className={`font-semibold uppercase tracking-wider ${netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  Laba / Kas Bersih
                </span>
                <DollarSign className={`w-4 h-4 ${netCashFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
              </div>
              <div className={`font-mono font-bold text-base sm:text-lg ${netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                Rp {netCashFlow.toLocaleString('id-ID')}
              </div>
              <div className="text-[10px] mt-1 font-semibold flex items-center gap-1">
                <span className={`px-1.5 py-0.2 rounded ${netCashFlow >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                  {netCashFlow >= 0 ? 'Surplus' : 'Defisit'}
                </span>
                <span className="text-slate-400">
                  (Omzet Lunas - Biaya Ops)
                </span>
              </div>
            </div>
          </div>

          {/* Visual Category Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 gap-2">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-indigo-500" />
                <span>Distribusi Pengeluaran Berdasarkan Kategori</span>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setNewCategoryInput('');
                    setIsAddCategoryModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs"
                  title="Tambah kategori baru sesuai kebutuhan"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>+ Buat Kategori Baru</span>
                </button>
                <span className="text-[11px] text-slate-400 font-normal">
                  Total: Rp {totalExpenseAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Progress bar stack if expenses exist */}
            {categoryBreakdown.length > 0 ? (
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden flex">
                {categoryBreakdown.map((item, i) => {
                  const colors = [
                    'bg-indigo-500',
                    'bg-rose-500',
                    'bg-amber-500',
                    'bg-orange-500',
                    'bg-teal-500',
                    'bg-purple-500',
                    'bg-cyan-500',
                    'bg-emerald-500',
                  ];
                  const color = colors[i % colors.length];
                  return (
                    <div
                      key={item.category}
                      style={{ width: `${item.percentage}%` }}
                      className={`${color} h-full transition-all`}
                      title={`${item.category}: Rp ${item.total.toLocaleString('id-ID')} (${item.percentage.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Belum ada transaksi pengeluaran. Anda dapat memilih kategori default atau membuat kategori baru.
              </p>
            )}

            {/* Category Badges Grid */}
            <div className="flex flex-wrap gap-2 pt-1">
              {allCategories.map((cat) => {
                const item = categoryBreakdown.find((b) => b.category === cat);
                const total = item ? item.total : 0;
                const isSelected = expenseCategoryFilter === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setExpenseCategoryFilter(
                        expenseCategoryFilter === cat ? 'ALL' : cat
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900 ' + getCategoryBadgeClass(cat)
                        : getCategoryBadgeClass(cat)
                    }`}
                  >
                    <span>{cat}</span>
                    {total > 0 && (
                      <>
                        <span className="font-mono font-bold">: Rp {total.toLocaleString('id-ID')}</span>
                        {item && <span className="text-[10px] opacity-75 font-normal">({item.percentage.toFixed(0)}%)</span>}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search, Category Filter, and Date Range Controls */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 sm:p-5 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={expenseSearch}
                  onChange={(e) => {
                    setExpenseSearch(e.target.value);
                    setExpensePage(1);
                  }}
                  placeholder="Cari keperluan, toko, catatan..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                />
                {expenseSearch && (
                  <button
                    type="button"
                    onClick={() => setExpenseSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => {
                    setExpenseCategoryFilter(e.target.value);
                    setExpensePage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="ALL">Semua Kategori ({expenses.length})</option>
                  {allCategories.map((cat) => {
                    const count = expenses.filter((e) => e.category === cat).length;
                    return (
                      <option key={cat} value={cat}>
                        {cat} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Month Period Filter */}
              <div>
                <select
                  value={expenseMonthFilter}
                  onChange={(e) => {
                    setExpenseMonthFilter(e.target.value);
                    setExpensePage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="ALL">Semua Periode Transaksi</option>
                  {availableExpenseMonths.map((m) => (
                    <option key={m} value={m}>
                      Bulan {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Summary & Reset */}
            {(expenseSearch || expenseCategoryFilter !== 'ALL' || expenseMonthFilter !== 'ALL') && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60">
                <div className="text-slate-500 dark:text-slate-400">
                  Menampilkan <strong className="text-slate-900 dark:text-white">{filteredExpenses.length}</strong> dari {expenses.length} catatan (Total Filter: <strong className="text-rose-600 dark:text-rose-400 font-mono">Rp {filteredExpenseAmount.toLocaleString('id-ID')}</strong>)
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseSearch('');
                    setExpenseCategoryFilter('ALL');
                    setExpenseMonthFilter('ALL');
                    setExpensePage(1);
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-xs cursor-pointer"
                >
                  Reset Filter
                </button>
              </div>
            )}
          </div>

          {/* Operational Expenses Data Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Daftar Riwayat Catatan Biaya Operasional
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                  {filteredExpenses.length} catatan
                </span>
              </div>

              {/* Rows Per Page selector */}
              <div className="flex items-center gap-2 text-xs self-end sm:self-auto">
                <span className="text-slate-500 text-[11px]">Tampilkan:</span>
                <select
                  value={expensePageSize}
                  onChange={(e) => {
                    setExpensePageSize(Number(e.target.value));
                    setExpensePage(1);
                  }}
                  className="px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value={10}>10 baris</option>
                  <option value={25}>25 baris</option>
                  <option value={50}>50 baris</option>
                </select>
              </div>
            </div>

            {/* Table View */}
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                  <Receipt className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Tidak Ada Catatan Biaya Ditemukan
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {expenses.length === 0
                    ? 'Belum ada catatan biaya operasional yang diinput. Klik tombol di bawah untuk mencatat pengeluaran pertama Anda.'
                    : 'Tidak ada catatan pengeluaran yang cocok dengan kriteria pencarian dan filter saat ini.'}
                </p>
                {expenses.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleOpenAddExpense}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer btn-gradient"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>+ Catat Biaya Pertama</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setExpenseSearch('');
                      setExpenseCategoryFilter('ALL');
                      setExpenseMonthFilter('ALL');
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Hapus Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Keperluan &amp; Keterangan</th>
                      <th className="py-3 px-4">Metode Bayar</th>
                      <th className="py-3 px-4 text-right">Jumlah (Nominal)</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60 font-medium text-slate-800 dark:text-slate-200">
                    {paginatedExpenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        {/* Tanggal */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {exp.date}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {exp.createdAt ? new Date(exp.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </td>

                        {/* Kategori Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg border ${getCategoryBadgeClass(
                              exp.category
                            )}`}
                          >
                            {exp.category}
                          </span>
                        </td>

                        {/* Keperluan, Toko, & Catatan */}
                        <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                            {exp.title}
                          </div>
                          {(exp.recipientOrVendor || exp.notes) && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 space-y-0.5">
                              {exp.recipientOrVendor && (
                                <div>
                                  <span className="font-semibold text-slate-600 dark:text-slate-300">Penerima/Toko:</span> {exp.recipientOrVendor}
                                </div>
                              )}
                              {exp.notes && (
                                <div className="italic text-[10px] text-slate-400">
                                  &ldquo;{exp.notes}&rdquo;
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Metode Bayar */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                            {exp.paymentMethod || 'Tunai'}
                          </span>
                        </td>

                        {/* Jumlah / Nominal */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                            Rp {Number(exp.amount || 0).toLocaleString('id-ID')}
                          </span>
                        </td>

                        {/* Aksi (Edit & Hapus) */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditExpense(exp)}
                              className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Edit Pengeluaran"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpenseToDelete(exp)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Pengeluaran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalExpensePages > 1 && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Halaman <strong>{safeExpensePage}</strong> dari {totalExpensePages}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safeExpensePage <= 1}
                    onClick={() => setExpensePage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer text-slate-800 dark:text-slate-200"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={safeExpensePage >= totalExpensePages}
                    onClick={() => setExpensePage((p) => Math.min(totalExpensePages, p + 1))}
                    className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer text-slate-800 dark:text-slate-200"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT BIAYA OPERASIONAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {editingExpense ? 'Edit Catatan Biaya Operasional' : 'Catat Biaya Operasional Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Data pengeluaran akan langsung tersimpan &amp; disinkron ke Cloud Firestore.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpenseSubmit} className="space-y-4 text-xs">
              {/* Judul / Keperluan */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Judul / Keperluan Pengeluaran *
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="Contoh: 5 Rol Lakban Fragile & Bubble Wrap"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900 dark:text-white"
                />
              </div>

              {/* Tanggal & Kategori Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Tanggal Pengeluaran *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Kategori Pengeluaran *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewCategoryInForm(!isCreatingNewCategoryInForm);
                        if (!isCreatingNewCategoryInForm) {
                          setCustomCategoryInputInForm('');
                        }
                      }}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      {isCreatingNewCategoryInForm ? '← Pilih dari List' : '+ Kategori Baru'}
                    </button>
                  </div>

                  {!isCreatingNewCategoryInForm ? (
                    <select
                      value={expenseForm.category}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCreatingNewCategoryInForm(true);
                          setCustomCategoryInputInForm('');
                        } else {
                          setExpenseForm({ ...expenseForm, category: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900 dark:text-white cursor-pointer"
                    >
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__NEW__">+ Buat Kategori Baru...</option>
                    </select>
                  ) : (
                    <div className="space-y-1">
                      <input
                        type="text"
                        required
                        value={customCategoryInputInForm}
                        onChange={(e) => setCustomCategoryInputInForm(e.target.value)}
                        placeholder="Ketik nama kategori baru..."
                        className="w-full px-3 py-2 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-400 dark:border-indigo-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900 dark:text-white"
                        autoFocus
                      />
                      <span className="text-[10px] text-slate-400 block">
                        Kategori ini akan otomatis disimpan ke daftar kategori Anda.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Nominal & Metode Bayar Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Nominal Biaya (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-mono text-slate-400 font-bold text-xs">
                      Rp
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="85000"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  {Number(expenseForm.amount) > 0 && (
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Rp {Number(expenseForm.amount).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Metode Pembayaran
                  </label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900 dark:text-white cursor-pointer"
                  >
                    <option value="Tunai (Cash)">Tunai (Cash)</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="DANA / E-Wallet">DANA / E-Wallet</option>
                    <option value="Kartu Debit/Kredit">Kartu Debit/Kredit</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Toko / Vendor */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Dibayarkan Kepada / Toko / Vendor (Opsional)
                </label>
                <input
                  type="text"
                  value={expenseForm.recipientOrVendor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, recipientOrVendor: e.target.value })}
                  placeholder="Contoh: Toko Plastik Makmur / PLN / Telkomsel"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Catatan / Keterangan */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Catatan Tambahan / Nomor Nota (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="Keterangan lebih lanjut atau nomor nota struk pengeluaran..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer btn-gradient"
                >
                  {editingExpense ? 'Simpan Perubahan' : 'Catat Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS BIAYA OPERASIONAL */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Hapus Catatan Biaya Ini?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Apakah Anda yakin ingin menghapus catatan pengeluaran ini dari basis data Cloud? Tindakan ini tidak dapat dibatalkan.
                </p>

                <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs space-y-1 mt-2">
                  <div>📝 Keperluan: <strong>{expenseToDelete.title}</strong></div>
                  <div>🏷️ Kategori: <strong>{expenseToDelete.category}</strong></div>
                  <div>💰 Nominal: <strong className="font-mono text-rose-600 dark:text-rose-400">Rp {Number(expenseToDelete.amount || 0).toLocaleString('id-ID')}</strong></div>
                  <div>📅 Tanggal: <strong>{expenseToDelete.date}</strong></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteExpense}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BUAT KATEGORI BIAYA BARU */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Buat Kategori Baru
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Tambahkan kategori operasional sesuai kebutuhan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewCategory} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Nama Kategori Baru *
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="Misal: Sewa Gudang / Listrik / Pajak"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900 dark:text-white"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Kategori default toko: <strong>Cetak PCB, Bayar Bea Cukai, Bahan Packing &amp; Lakban, Transportasi &amp; BBM</strong>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-md cursor-pointer btn-gradient"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PESANAN PO OLEH ADMIN (BAGIAN VERIFIKASI) */}
      {editingOrder && editOrderForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 my-8 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Edit Data Pesanan PO (Admin)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Perbarui identitas pembeli, alamat, rincian barang, maupun status pesanan secara langsung.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingOrder(null);
                  setEditOrderForm(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedOrder} className="space-y-4 text-xs">
              {/* Baris 1: Nomor PO & Status Pembayaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Nomor PO *
                  </label>
                  <input
                    type="text"
                    required
                    value={editOrderForm.poNumber}
                    onChange={(e) =>
                      setEditOrderForm({ ...editOrderForm, poNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Status Pembayaran
                  </label>
                  <select
                    value={editOrderForm.paymentStatus}
                    onChange={(e) =>
                      setEditOrderForm({
                        ...editOrderForm,
                        paymentStatus: e.target.value as 'PENDING' | 'PAID',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="PENDING">⏳ MENUNGGU PEMBAYARAN (BELUM LUNAS)</option>
                    <option value="PAID">✅ LUNAS (PAID)</option>
                  </select>
                </div>
              </div>

              {/* Baris 2: Nama Pemesan & Nomor HP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Nama Pemesan *
                  </label>
                  <input
                    type="text"
                    required
                    value={editOrderForm.customerName}
                    onChange={(e) =>
                      setEditOrderForm({ ...editOrderForm, customerName: e.target.value })
                    }
                    placeholder="Nama lengkap pembeli..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Nomor HP / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={editOrderForm.customerPhone}
                    onChange={(e) =>
                      setEditOrderForm({ ...editOrderForm, customerPhone: e.target.value })
                    }
                    placeholder="081234567890"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Baris 3: Alamat Pengiriman */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Alamat Pengiriman Lengkap *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editOrderForm.customerAddress}
                  onChange={(e) =>
                    setEditOrderForm({ ...editOrderForm, customerAddress: e.target.value })
                  }
                  placeholder="Alamat lengkap pengiriman..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Cek Realtime Nama & Alamat Double saat Mengedit PO */}
              {(() => {
                const currentNameKey = normalizeDuplicateKey(editOrderForm.customerName);
                const currentAddrKey = normalizeDuplicateKey(editOrderForm.customerAddress);
                if (currentNameKey.length < 2 || currentAddrKey.length < 3) return null;

                const conflicts = orders.filter((o) => {
                  if (o.id === editingOrder.id) return false;
                  return (
                    normalizeDuplicateKey(o.customerName) === currentNameKey &&
                    normalizeDuplicateKey(o.customerAddress) === currentAddrKey
                  );
                });

                if (conflicts.length === 0) return null;

                return (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs space-y-1 animate-in fade-in duration-150">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>Terdeteksi Duplikat! Nama &amp; alamat ini sama dengan {conflicts.length} PO lain:</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap font-mono font-bold text-[11px] text-rose-700 dark:text-rose-300 pt-0.5">
                      {conflicts.map((c) => (
                        <span key={c.id} className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800">
                          {c.poNumber} ({c.customerPhone})
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                      💡 Anda dapat mengubah atau membedakan nama/alamat di form ini untuk membenahinya, atau simpan apa adanya jika pembeli memang melakukan repeat order.
                    </p>
                  </div>
                );
              })()}

              {/* Baris 4: Rincian Barang Pesanan */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    📦 Rincian Barang yang Dipesan
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultProd = formData.products[0];
                      const newItem: SimplePOItem = {
                        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                        name: defaultProd ? defaultProd.name : 'Barang Baru',
                        quantity: 1,
                        unitPrice: defaultProd ? defaultProd.price : 100,
                        subtotal: defaultProd ? defaultProd.price : 100,
                      };
                      setEditOrderForm({
                        ...editOrderForm,
                        items: [...editOrderForm.items, newItem],
                      });
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Barang</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {editOrderForm.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end"
                    >
                      <div className="sm:col-span-5 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-slate-500">
                            Nama Barang
                          </label>
                          {formData.products.length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                const selectedProd = formData.products.find(
                                  (p) => p.id === e.target.value
                                );
                                if (selectedProd) {
                                  const nextItems = [...editOrderForm.items];
                                  const qty = Math.max(1, Number(nextItems[idx].quantity) || 1);
                                  nextItems[idx] = {
                                    ...nextItems[idx],
                                    name: selectedProd.name,
                                    unitPrice: selectedProd.price,
                                    subtotal: selectedProd.price * qty,
                                  };
                                  setEditOrderForm({ ...editOrderForm, items: nextItems });
                                }
                              }}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-transparent font-semibold cursor-pointer focus:outline-none"
                            >
                              <option value="">Pilih dari Katalog...</option>
                              {formData.products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (Rp {p.price.toLocaleString('id-ID')})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => {
                            const nextItems = [...editOrderForm.items];
                            nextItems[idx] = { ...nextItems[idx], name: e.target.value };
                            setEditOrderForm({ ...editOrderForm, items: nextItems });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="block text-[10px] font-semibold text-slate-500">
                          Jumlah (Qty)
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = Math.max(1, Number(e.target.value) || 1);
                            const nextItems = [...editOrderForm.items];
                            const price = Number(nextItems[idx].unitPrice) || 0;
                            nextItems[idx] = {
                              ...nextItems[idx],
                              quantity: qty,
                              subtotal: qty * price,
                            };
                            setEditOrderForm({ ...editOrderForm, items: nextItems });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-center text-slate-900 dark:text-white text-xs"
                        />
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <label className="block text-[10px] font-semibold text-slate-500">
                          Harga Satuan (Rp)
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={item.unitPrice ?? 100}
                          onChange={(e) => {
                            const price = Math.max(0, Number(e.target.value) || 0);
                            const nextItems = [...editOrderForm.items];
                            const qty = Math.max(1, Number(nextItems[idx].quantity) || 1);
                            nextItems[idx] = {
                              ...nextItems[idx],
                              unitPrice: price,
                              subtotal: qty * price,
                            };
                            setEditOrderForm({ ...editOrderForm, items: nextItems });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white text-xs"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          disabled={editOrderForm.items.length <= 1}
                          onClick={() => {
                            if (editOrderForm.items.length <= 1) return;
                            const nextItems = editOrderForm.items.filter((_, i) => i !== idx);
                            setEditOrderForm({ ...editOrderForm, items: nextItems });
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Hapus baris barang ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Subtotal Summary */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Total Harga Pesanan:</span>
                  <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                    Rp{' '}
                    {editOrderForm.items
                      .reduce(
                        (sum, it) =>
                          sum +
                          (Math.max(1, Number(it.quantity) || 1) *
                            Math.max(0, Number(it.unitPrice) || 0)),
                        0
                      )
                      .toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Baris 5: Jasa Kirim, No Resi, Status Kirim */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Jasa Kirim (Ekspedisi)
                  </label>
                  <select
                    value={editOrderForm.courier}
                    onChange={(e) =>
                      setEditOrderForm({ ...editOrderForm, courier: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white"
                  >
                    {COURIER_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Nomor Resi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editOrderForm.trackingNumber}
                    onChange={(e) =>
                      setEditOrderForm({ ...editOrderForm, trackingNumber: e.target.value })
                    }
                    placeholder="Contoh: JT1982739281"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold uppercase text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Status Pengiriman
                  </label>
                  <select
                    value={editOrderForm.shippingStatus}
                    onChange={(e) =>
                      setEditOrderForm({
                        ...editOrderForm,
                        shippingStatus: e.target.value as ShippingStatus,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    <option value="PENDING_SHIPMENT">⏳ Belum Dikirim</option>
                    <option value="SHIPPED">🚚 Dalam Pengiriman</option>
                    <option value="DELIVERED">✅ Terkirim / Selesai</option>
                  </select>
                </div>
              </div>

              {/* Baris 6: Catatan Pesanan */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Catatan Pesanan (Opsional)
                </label>
                <input
                  type="text"
                  value={editOrderForm.notes}
                  onChange={(e) =>
                    setEditOrderForm({ ...editOrderForm, notes: e.target.value })
                  }
                  placeholder="Catatan tambahan untuk pesanan ini..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Tombol Batal & Simpan */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSavingEditedOrder}
                  onClick={() => {
                    setEditingOrder(null);
                    setEditOrderForm(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEditedOrder}
                  className="px-5 py-2.5 text-xs font-extrabold text-white rounded-xl shadow-md inline-flex items-center gap-1.5 cursor-pointer btn-gradient disabled:opacity-50"
                >
                  {isSavingEditedOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice / Printable Receipt Modal */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Nota / Struk Invoice PO
                </h3>
              </div>
              <button
                onClick={() => setInvoiceOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Content Container */}
            <div id="printable-receipt" className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 font-mono text-xs">
              <div className="text-center pb-2 border-b border-dashed border-slate-300 dark:border-slate-700">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">PO WAVEID PEMESANAN</h4>
                <p className="text-[10px] text-slate-500">Struk Resmi Bukti Pre-Order</p>
              </div>

              <div className="space-y-1 text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span>No PO:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{invoiceOrder.poNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{new Date(invoiceOrder.createdAt).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status Pembayaran:</span>
                  <span className={`font-bold ${invoiceOrder.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {invoiceOrder.paymentStatus === 'PAID' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN'}
                  </span>
                </div>
                {invoiceOrder.courier && (
                  <div className="flex justify-between">
                    <span>Jasa Kirim:</span>
                    <span className="font-bold">{invoiceOrder.courier}</span>
                  </div>
                )}
                {invoiceOrder.trackingNumber && (
                  <div className="flex justify-between">
                    <span>No. Resi:</span>
                    <span className="font-bold text-indigo-600">{invoiceOrder.trackingNumber}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Pelanggan:</div>
                <div className="font-sans font-bold text-slate-900 dark:text-white">{invoiceOrder.customerName}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">HP: {invoiceOrder.customerPhone}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">Alamat: {invoiceOrder.customerAddress}</div>
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 dark:border-slate-700 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Rincian Barang:</div>
                {invoiceOrder.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-slate-800 dark:text-slate-200">
                    <span>{it.name} x{it.quantity}</span>
                    <span>Rp {((it.unitPrice || 100) * it.quantity).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-300 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>TOTAL BAYAR:</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Rp {(invoiceOrder.totalPrice ?? invoiceOrder.items.reduce((acc, it) => acc + (it.subtotal || 100 * it.quantity), 0)).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak / Save PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL KONFIRMASI: TANDAI LUNAS / BATAL LUNAS */}
      {confirmPaidOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                confirmPaidTargetStatus === 'PAID'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
              }`}>
                {confirmPaidTargetStatus === 'PAID' ? <CheckCircle2 className="w-6 h-6" /> : <RefreshCw className="w-6 h-6" />}
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {confirmPaidTargetStatus === 'PAID' ? 'Konfirmasi Tandai Lunas' : 'Konfirmasi Batal Lunas'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Apakah Anda yakin ingin mengubah status pembayaran pesanan{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {confirmPaidOrder.poNumber}
                  </strong>{' '}
                  ({confirmPaidOrder.customerName}) menjadi{' '}
                  <strong className={confirmPaidTargetStatus === 'PAID' ? 'text-emerald-600 font-extrabold' : 'text-amber-600 font-extrabold'}>
                    {confirmPaidTargetStatus === 'PAID' ? 'LUNAS' : 'BELUM BAYAR'}
                  </strong>?
                </p>
                {confirmPaidTargetStatus === 'PAID' && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-900 text-[11px] text-emerald-800 dark:text-emerald-300 mt-2">
                    📌 Tautan undangan <strong>Grup WA LUNAS</strong> akan otomatis dibuka untuk dikirim ke WhatsApp pembeli.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmPaidOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdatePaymentStatus && confirmPaidOrder) {
                    onUpdatePaymentStatus(confirmPaidOrder.id, confirmPaidTargetStatus);
                    if (confirmPaidTargetStatus === 'PAID') {
                      const link = formWA.paidGroupLink || 'https://chat.whatsapp.com/GrupPCBUtamaLunas';
                      setTimeout(() => {
                        openPaidWhatsAppInvite(confirmPaidOrder, link);
                      }, 300);
                    }
                  }
                  setConfirmPaidOrder(null);
                }}
                className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer ${
                  confirmPaidTargetStatus === 'PAID'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                }`}
              >
                Benar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* POPUP MODAL KONFIRMASI: SIMPAN RESI & STATUS KIRIM */}
      {confirmShippingData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Konfirmasi Simpan Resi &amp; Status Kirim
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Apakah data pengiriman untuk pesanan No. PO{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {confirmShippingData.order.poNumber}
                  </strong>{' '}
                  atas nama <strong>{confirmShippingData.order.customerName}</strong> sudah benar?
                </p>

                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs space-y-1">
                  <div>📦 Jasa Kirim: <strong>{confirmShippingData.courier}</strong></div>
                  <div>🎫 Nomor Resi: <strong className="font-mono text-blue-700 dark:text-blue-300">{confirmShippingData.trackingNumber || '(Belum di-input)'}</strong></div>
                  <div>📌 Status Kirim: <strong>{
                    confirmShippingData.status === 'DELIVERED'
                      ? '✅ Pesanan Selesai / Terkirim'
                      : confirmShippingData.status === 'SHIPPED'
                      ? '🚚 Dalam Pengiriman'
                      : '⏳ Belum Dikirim'
                  }</strong></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmShippingData(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateOrderShipping && confirmShippingData) {
                    onUpdateOrderShipping(
                      confirmShippingData.order.id,
                      confirmShippingData.courier,
                      confirmShippingData.trackingNumber,
                      confirmShippingData.status
                    );
                  }
                  setConfirmShippingData(null);
                }}
                className="px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Benar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL KONFIRMASI: SIMPAN PENGATURAN PANEL ADMIN */}
      {confirmSaveSettings && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Save className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Konfirmasi Simpan Pengaturan
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Apakah Anda ingin menyimpan seluruh perubahan pengaturan ke Cloud Firestore dan memilih tindakan selanjutnya?
                </p>

                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/60 text-xs space-y-1">
                  <div>🛍️ Total Produk Katalog: <strong>{formData.products.length} produk</strong></div>
                  <div>💳 Nomor Rekening DANA: <strong className="font-mono text-indigo-700 dark:text-indigo-300">{formData.danaPhone || '-'}</strong> ({formData.danaAccountName || '-'})</div>
                  <div>💬 WhatsApp Tujuan: <strong>{formWA.phoneNumber || formWA.groupLink || 'Belum diatur'}</strong></div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmSaveSettings(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleConfirmExecuteSaveSettings(false)}
                className="px-4 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-all border border-slate-300 dark:border-slate-600 cursor-pointer"
              >
                Simpan &amp; Tetap di Admin
              </button>
              <button
                type="button"
                onClick={() => handleConfirmExecuteSaveSettings(true)}
                className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Simpan &amp; Kembali ke Form PO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL KONFIRMASI: HAPUS PRODUK KATALOG */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Konfirmasi Hapus Produk
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin menghapus produk <strong>"{productToDelete.name}"</strong> dari katalog?
                </p>

                <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs space-y-1 mt-2">
                  <div>📦 Nama Produk: <strong>{productToDelete.name}</strong></div>
                  <div>💰 Harga Satuan: <strong>Rp {productToDelete.price.toLocaleString('id-ID')}</strong></div>
                  <div>📊 Sisa Stok: <strong>{productToDelete.stock} unit</strong></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus &amp; Simpan ke Cloud</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL KONFIRMASI: HAPUS SATU PESANAN PO */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Hapus Data Pesanan Ini?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin menghapus pesanan ini dari Cloud Firestore &amp; penyimpanan? Tindakan ini tidak dapat dibatalkan.
                </p>

                <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs space-y-1 mt-2">
                  <div>📄 No. PO: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{orderToDelete.poNumber}</strong></div>
                  <div>👤 Pemesan: <strong>{orderToDelete.customerName}</strong> ({orderToDelete.customerPhone})</div>
                  <div>💰 Total: <strong className="font-mono text-rose-600 dark:text-rose-400">Rp {(orderToDelete.totalPrice ?? 0).toLocaleString('id-ID')}</strong></div>
                </div>

                {/* Checkbox: Otomatis urutkan kembali nomor PO */}
                <label className="flex items-start gap-2.5 p-2.5 mt-2 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={resequenceAfterDelete}
                    onChange={(e) => setResequenceAfterDelete(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-[11px] leading-snug text-slate-700 dark:text-slate-200">
                    <strong className="text-indigo-700 dark:text-indigo-300 block">
                      Urutkan kembali nomor PO otomatis (001 s/d {String(Math.max(1, orders.length - 1)).padStart(3, '0')})
                    </strong>
                    <span>
                      Rekomendasi: merapikan nomor PO lainnya agar tetap berurutan tanpa ada nomor yang loncat/terlewat.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={async () => {
                  const targetId = orderToDelete.id;
                  const shouldReseq = resequenceAfterDelete;
                  setOrderToDelete(null);
                  if (onDeleteOrder) {
                    await onDeleteOrder(targetId, shouldReseq);
                  }
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus {resequenceAfterDelete ? '& Urutkan PO' : 'Pesanan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL KONFIRMASI: HAPUS SEMUA DATA PESANAN */}
      {confirmClearAllOrders && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Hapus Seluruh Data Pesanan ({orders.length} PO)?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Perhatian: Tindakan ini akan mengosongkan <strong>seluruh {orders.length} riwayat pesanan</strong> dari Cloud Firestore dan penyimpanan lokal. Pastikan Anda sudah mengunduh Backup JSON terlebih dahulu jika diperlukan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmClearAllOrders(null as any)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={async () => {
                  setConfirmClearAllOrders(false);
                  if (onClearAllOrders) {
                    await onClearAllOrders();
                  }
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal Konfirmasi & Pratinjau Impor Database */}
      {importModalOpen && importFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Konfirmasi Impor Database
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    File: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{importFile.name}</span> ({importFile.sizeKb} KB)
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isImportingDB}
                onClick={() => {
                  setImportModalOpen(false);
                  setImportFile(null);
                  setImportError(null);
                  setImportSuccessMsg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications */}
            {importError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* Analysis of file content */}
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Ringkasan Data yang Terdeteksi dalam File:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-slate-400 text-[10px]">Data Pesanan PO</div>
                  <div className="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400">
                    {importFile.orderCount}
                  </div>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-slate-400 text-[10px]">Biaya Operasional</div>
                  <div className="font-mono font-bold text-base text-rose-600 dark:text-rose-400">
                    {importFile.expenseCount}
                  </div>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-slate-400 text-[10px]">Katalog &amp; Stok</div>
                  <div className="font-bold text-xs text-slate-700 dark:text-slate-300 mt-1">
                    {importFile.hasAdminConfig ? '✓ Tersedia' : '— Tidak ada'}
                  </div>
                </div>
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <div className="text-slate-400 text-[10px]">Pengaturan WA</div>
                  <div className="font-bold text-xs text-slate-700 dark:text-slate-300 mt-1">
                    {importFile.hasWAConfig ? '✓ Tersedia' : '— Tidak ada'}
                  </div>
                </div>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="block font-bold text-xs text-slate-800 dark:text-slate-200">
                Pilih Mode Impor ke Cloud Firestore:
              </label>

              <div
                onClick={() => setImportMode('merge')}
                className={`p-3 rounded-xl border cursor-pointer select-none transition-all ${
                  importMode === 'merge'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    Gabungkan Data (Merge) — Rekomendasi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-5 leading-relaxed">
                  Menambahkan atau memperbarui pesanan dari file backup tanpa menghapus {orders.length} pesanan yang sudah ada di database.
                </p>
              </div>

              <div
                onClick={() => setImportMode('replace')}
                className={`p-3 rounded-xl border cursor-pointer select-none transition-all ${
                  importMode === 'replace'
                    ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-400 dark:border-rose-700 shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-bold text-xs text-rose-700 dark:text-rose-300">
                    Timpa Seluruh Database (Replace)
                  </span>
                </div>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1 pl-5 leading-relaxed">
                  Perhatian: Menghapus seluruh {orders.length} pesanan saat ini dan menggantikannya secara total dengan data dari file backup.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={isImportingDB}
                onClick={() => {
                  setImportModalOpen(false);
                  setImportFile(null);
                  setImportError(null);
                  setImportSuccessMsg(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isImportingDB}
                onClick={handleExecuteImport}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-rose-600 hover:bg-rose-700 active:scale-95'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
                }`}
              >
                {isImportingDB ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Cloud Firestore...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Mulai Impor ({importMode === 'replace' ? 'Timpa Semua' : 'Gabungkan'})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
