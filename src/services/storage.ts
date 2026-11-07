import { SimplePOOrder, WAConfig, AdminStoreConfig, ProductSetting, ShippingStatus, OperationalExpense } from '../types/po';

const STORAGE_ORDERS_KEY = 'simple_po_orders_v2';
const STORAGE_WA_CONFIG_KEY = 'simple_po_wa_config_v2';
const STORAGE_ADMIN_CONFIG_KEY = 'simple_po_admin_config_v1';
const STORAGE_EXPENSES_KEY = 'simple_po_expenses_v1';
const STORAGE_CUSTOM_CATEGORIES_KEY = 'custom_expense_categories_v1';

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'Cetak PCB',
  'Bayar Bea Cukai',
  'Bahan Packing & Lakban',
  'Transportasi & BBM',
];

export const INITIAL_OPERATIONAL_EXPENSES: OperationalExpense[] = [
  {
    id: 'exp-001',
    date: '2026-11-01',
    title: 'Cetak Batch PCB Gen 3 & Solder C21',
    category: 'Cetak PCB',
    amount: 350000,
    paymentMethod: 'Transfer Bank',
    recipientOrVendor: 'Pabrik PCB Mandiri',
    notes: 'Batch 100 keping 2-layer FR4',
    createdAt: '2026-11-01T08:30:00.000Z',
    createdBy: 'DeltaC',
  },
  {
    id: 'exp-002',
    date: '2026-11-02',
    title: 'Pajak Impor & Bea Cukai Komponen PCB',
    category: 'Bayar Bea Cukai',
    amount: 125000,
    paymentMethod: 'Transfer Bank',
    recipientOrVendor: 'Bea Cukai / Kantor Pos',
    notes: 'Pungutan impor PIB no 98213',
    createdAt: '2026-11-02T10:15:00.000Z',
    createdBy: 'DeltaC',
  },
  {
    id: 'exp-003',
    date: '2026-11-02',
    title: '5 Rol Lakban Fragile & Bubble Wrap Tebal',
    category: 'Bahan Packing & Lakban',
    amount: 85000,
    paymentMethod: 'DANA / E-Wallet',
    recipientOrVendor: 'Toko Plastik Makmur',
    notes: 'Untuk packing pengiriman batch PO November',
    createdAt: '2026-11-02T11:45:00.000Z',
    createdBy: 'DeltaC',
  },
  {
    id: 'exp-004',
    date: '2026-11-03',
    title: 'Bensin Motor Antar Paket ke Agen Kurir',
    category: 'Transportasi & BBM',
    amount: 35000,
    paymentMethod: 'Tunai (Cash)',
    recipientOrVendor: 'SPBU Pertamina',
    notes: 'Pengiriman paket batch sore',
    createdAt: '2026-11-03T09:20:00.000Z',
    createdBy: 'DeltaC',
  },
];

export const DEFAULT_ADMIN_CONFIG: AdminStoreConfig = {
  products: [
    {
      id: 'pcb_gen3',
      name: 'PCB GEN 3',
      price: 100,
      stock: 50,
      maxPerOrder: 2,
      isActive: true,
      description: 'Papan sirkuit cetak generasi 3',
    },
    {
      id: 'solder_c21',
      name: 'PCB SOLDER C21',
      price: 100,
      stock: 50,
      maxPerOrder: 2,
      isActive: true,
      description: 'Modul PCB solder C21 only',
    },
  ],
  danaPhone: '',
  danaAccountName: '',
  autoDeductStock: true,
  qrisImageUrl: '',
};

export const DEFAULT_WA_CONFIG: WAConfig = {
  mode: 'group_link',
  groupLink: '',
  phoneNumber: '',
  groupName: '',
  paidGroupLink: '',
  paidGroupName: '',
};

export const INITIAL_SIMPLE_ORDERS: SimplePOOrder[] = [
  {
    id: 'ord-001',
    poNumber: 'PO-202610-001',
    createdAt: '2026-10-31T14:30:00.000Z',
    items: [
      {
        id: 'it-1',
        name: 'PCB GEN 3',
        quantity: 2,
        unitPrice: 100,
        subtotal: 200,
      },
    ],
    totalPrice: 200,
    customerName: 'Edi Purnomo',
    customerPhone: '0812-3456-7890',
    customerAddress: 'Jl. Merdeka No. 45, RT 02/05, Jakarta Selatan',
    confirmed: true,
    notes: 'Mohon dicek sebelum dikirim. Terima kasih.',
    sentToWA: true,
    paymentStatus: 'PAID',
    paidAt: '2026-10-31T15:00:00.000Z',
    courier: 'J&T Express',
    trackingNumber: 'JT1982739281',
    shippingStatus: 'SHIPPED',
    shippedAt: '2026-10-31T16:00:00.000Z',
  },
  {
    id: 'ord-002',
    poNumber: 'PO-202610-002',
    createdAt: '2026-10-31T17:15:00.000Z',
    items: [
      {
        id: 'it-2',
        name: 'PCB SOLDER C21',
        quantity: 2,
        unitPrice: 100,
        subtotal: 200,
      },
    ],
    totalPrice: 200,
    customerName: 'Bambang Irawan',
    customerPhone: '0813-8899-7711',
    customerAddress: 'Kawasan Industri Cikarang Blok D-10, Bekasi',
    confirmed: true,
    notes: 'Kirim via kurir sameday jika tersedia.',
    sentToWA: true,
    paymentStatus: 'PENDING',
    courier: 'JNE Reguler',
    trackingNumber: '',
    shippingStatus: 'PENDING_SHIPMENT',
  },
];

export const simpleStorage = {
  getOrders(): SimplePOOrder[] {
    try {
      const data = localStorage.getItem(STORAGE_ORDERS_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(INITIAL_SIMPLE_ORDERS));
        return INITIAL_SIMPLE_ORDERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_SIMPLE_ORDERS;
    }
  },

  saveOrders(orders: SimplePOOrder[]): void {
    try {
      localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders to localStorage', e);
    }
  },

  updateOrderPaymentStatus(orderId: string, status: 'PENDING' | 'PAID'): SimplePOOrder[] {
    const orders = this.getOrders();
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentStatus: status,
          paidAt: status === 'PAID' ? new Date().toISOString() : undefined,
        };
      }
      return o;
    });
    this.saveOrders(updated);
    return updated;
  },

  updateOrderShipping(
    orderId: string,
    courier: string,
    trackingNumber: string,
    shippingStatus: ShippingStatus
  ): SimplePOOrder[] {
    const orders = this.getOrders();
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          courier,
          trackingNumber,
          shippingStatus,
          shippedAt:
            shippingStatus === 'SHIPPED' || shippingStatus === 'DELIVERED'
              ? o.shippedAt || new Date().toISOString()
              : undefined,
        };
      }
      return o;
    });
    this.saveOrders(updated);
    return updated;
  },

  updateOrderPaymentProof(orderId: string, paymentProofUrl: string): SimplePOOrder[] {
    const orders = this.getOrders();
    const now = new Date().toISOString();
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentProofUrl,
          paymentProofUploadedAt: now,
        };
      }
      return o;
    });
    this.saveOrders(updated);
    return updated;
  },

  getWAConfig(): WAConfig {
    const data = localStorage.getItem(STORAGE_WA_CONFIG_KEY);
    if (!data) return DEFAULT_WA_CONFIG;
    
    try {
      const parsed = JSON.parse(data) as WAConfig;
      // Merge stored data with defaults only for missing keys to preserve user settings
      return { ...DEFAULT_WA_CONFIG, ...parsed };
    } catch {
      return DEFAULT_WA_CONFIG;
    }
  },

  saveWAConfig(config: WAConfig): void {
    try {
      localStorage.setItem(STORAGE_WA_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save WA config', e);
    }
  },

  getAdminConfig(): AdminStoreConfig {
    const data = localStorage.getItem(STORAGE_ADMIN_CONFIG_KEY);
    if (!data) return DEFAULT_ADMIN_CONFIG;
    
    try {
      const parsed = JSON.parse(data) as AdminStoreConfig;
      // Ensure products array is treated as valid data, don't fall back to defaults
      const storedProducts = Array.isArray(parsed.products) ? parsed.products : DEFAULT_ADMIN_CONFIG.products;
        
      const uniqueProducts: ProductSetting[] = [];
      const seenIds = new Set<string>();
      
      for (const p of storedProducts) {
        if (p && p.id && !seenIds.has(p.id)) {
          uniqueProducts.push(p);
          seenIds.add(p.id);
        }
      }

      return {
        ...DEFAULT_ADMIN_CONFIG, // Base defaults
        ...parsed,               // User settings override defaults
        products: uniqueProducts // Ensure unique products
      };
    } catch {
      return DEFAULT_ADMIN_CONFIG;
    }
  },

  saveAdminConfig(config: AdminStoreConfig): void {
    try {
      localStorage.setItem(STORAGE_ADMIN_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save admin config', e);
    }
  },

  deductStock(items: { name: string; quantity: number }[]): AdminStoreConfig {
    const current = this.getAdminConfig();
    if (!current.autoDeductStock) return current;

    const updatedProducts = current.products.map((p) => {
      const match = items.find((it) => it.name.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(it.name.toLowerCase()));
      if (match) {
        return {
          ...p,
          stock: Math.max(0, p.stock - match.quantity),
        };
      }
      return p;
    });

    const updatedConfig: AdminStoreConfig = {
      ...current,
      products: updatedProducts,
    };
    this.saveAdminConfig(updatedConfig);
    return updatedConfig;
  },

  generatePONumber(ordersOrCount: SimplePOOrder[] | number): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `PO-${year}${month}-`;

    const ordersList: SimplePOOrder[] = Array.isArray(ordersOrCount)
      ? ordersOrCount
      : this.getOrders();

    const existingNumbers = new Set<string>();
    let maxSeq = typeof ordersOrCount === 'number' ? ordersOrCount : ordersList.length;

    for (const o of ordersList) {
      if (!o?.poNumber) continue;
      const upper = o.poNumber.trim().toUpperCase();
      existingNumbers.add(upper);
      const match = upper.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    while (existingNumbers.has(candidate.toUpperCase())) {
      nextSeq++;
      candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    }
    return candidate;
  },

  getExpenses(): OperationalExpense[] {
    try {
      const data = localStorage.getItem(STORAGE_EXPENSES_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(INITIAL_OPERATIONAL_EXPENSES));
        return INITIAL_OPERATIONAL_EXPENSES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_OPERATIONAL_EXPENSES;
    }
  },

  saveExpenses(expenses: OperationalExpense[]): void {
    try {
      localStorage.setItem(STORAGE_EXPENSES_KEY, JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save expenses to localStorage', e);
    }
  },

  addExpense(expense: OperationalExpense): OperationalExpense[] {
    const current = this.getExpenses();
    const updated = [expense, ...current];
    this.saveExpenses(updated);
    return updated;
  },

  updateExpense(expense: OperationalExpense): OperationalExpense[] {
    const current = this.getExpenses();
    const updated = current.map((item) => (item.id === expense.id ? expense : item));
    this.saveExpenses(updated);
    return updated;
  },

  deleteExpense(id: string): OperationalExpense[] {
    const current = this.getExpenses();
    const updated = current.filter((item) => item.id !== id);
    this.saveExpenses(updated);
    return updated;
  },

  getCustomExpenseCategories(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_CUSTOM_CATEGORIES_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveCustomExpenseCategories(categories: string[]): void {
    try {
      localStorage.setItem(STORAGE_CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save custom categories to localStorage', e);
    }
  },

  addCustomExpenseCategory(category: string): string[] {
    const clean = category.trim();
    if (!clean) return this.getCustomExpenseCategories();
    const current = this.getCustomExpenseCategories();
    if (!current.includes(clean) && !DEFAULT_EXPENSE_CATEGORIES.includes(clean)) {
      const updated = [...current, clean];
      this.saveCustomExpenseCategories(updated);
      return updated;
    }
    return current;
  },
};
