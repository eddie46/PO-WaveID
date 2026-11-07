export type POStatus = 
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT'
  | 'PARTIALLY_RECEIVED'
  | 'FULFILLED'
  | 'CANCELLED';

export type UserRole = 'PURCHASING' | 'MANAGER' | 'FINANCE_WAREHOUSE';

export type ShippingStatus = 'PENDING_SHIPMENT' | 'SHIPPED' | 'DELIVERED';

export interface POLineItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  receivedQty: number;
}

export interface Vendor {
  id: string;
  name: string;
  picName: string;
  picPhone: string;
  email: string;
  address: string;
  taxId: string;
  category: string;
  rating: number;
  bankInfo: string;
}

export interface ApprovalLog {
  id: string;
  action: 'CREATED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SENT_TO_VENDOR' | 'RECEIVED' | 'CANCELLED';
  performedBy: string;
  role: string;
  timestamp: string;
  notes?: string;
  commitHash?: string;
}

export interface GoodsReceiptItem {
  itemId: string;
  sku: string;
  description: string;
  qtyReceived: number;
  condition: 'Baik' | 'Rusak/Cacat' | 'Kurang';
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  poNumber: string;
  receivedDate: string;
  deliveryNoteNumber: string;
  receivedBy: string;
  notes?: string;
  items: GoodsReceiptItem[];
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  vendorPic: string;
  vendorEmail: string;
  vendorAddress: string;
  vendorTaxId: string;
  createdAt: string;
  deliveryDate: string;
  department: 'IT & Hardware' | 'Operasional' | 'Logistik & Gudang' | 'Marketing' | 'HR & General Affairs' | 'Produksi';
  status: POStatus;
  items: POLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: 'IDR' | 'USD';
  paymentTerms: 'Net 14' | 'Net 30' | 'Net 60' | 'Cash on Delivery (COD)' | '50% DP, 50% Pelunasan';
  shippingAddress: string;
  notes?: string;
  createdBy: string;
  approvals: ApprovalLog[];
  goodsReceipts: GoodsReceipt[];
  gitSyncStatus?: 'synced' | 'pending' | 'local';
  gitCommitSha?: string;
}

export interface GitHubSyncConfig {
  repoOwner: string;
  repoName: string;
  branch: string;
  path: string;
  token?: string;
  lastSyncTime?: string;
}

// Simple PO Types for streamlined WhatsApp order flow
export interface SimplePOItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
  notes?: string;
}

export interface SimplePOOrder {
  id: string;
  poNumber: string;
  createdAt: string;
  items: SimplePOItem[];
  totalPrice?: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  confirmed: boolean;
  notes?: string;
  sentToWA: boolean;
  paymentStatus?: 'PENDING' | 'PAID';
  paidAt?: string;
  
  // Shipping & Tracking details
  courier?: string; // e.g. JNE, J&T, SiCepat, Pos, GoSend, Grab, Anteraja
  trackingNumber?: string; // Nomor Resi
  shippingStatus?: ShippingStatus; // 'PENDING_SHIPMENT' | 'SHIPPED' | 'DELIVERED'
  shippedAt?: string;

  // Payment Proof
  paymentProofUrl?: string;
  paymentProofUploadedAt?: string;
}

export interface WAConfig {
  mode: 'group_link' | 'phone_number';
  groupLink: string;
  phoneNumber: string;
  groupName: string;
  paidGroupLink?: string;
  paidGroupName?: string;
}

export interface ProductSetting {
  id: string;
  name: string;
  price: number;
  stock: number;
  maxPerOrder: number;
  isActive: boolean;
  description: string;
}

export interface AdminStoreConfig {
  products: ProductSetting[];
  danaPhone: string;
  danaAccountName: string;
  autoDeductStock: boolean;
  qrisImageUrl?: string;
  supabaseConfig?: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    tableName: string;
    isEnabled: boolean;
    realtimeProvider?: 'supabase';
    secondarySupabaseUrl?: string;
    secondarySupabaseAnonKey?: string;
    enableAutoFailover?: boolean;
    activeAccountIndex?: 1 | 2;
  };
  googleSheetsUrl?: string;
}

export interface DatabaseBackup {
  version: string;
  appName: string;
  exportedAt: string;
  totalOrders: number;
  data: {
    orders: SimplePOOrder[];
    adminConfig?: AdminStoreConfig;
    waConfig?: WAConfig;
    expenses?: OperationalExpense[];
  };
}

export type DefaultExpenseCategory =
  | 'Cetak PCB'
  | 'Bayar Bea Cukai'
  | 'Bahan Packing & Lakban'
  | 'Transportasi & BBM';

export type ExpenseCategory = DefaultExpenseCategory | (string & {});

export interface OperationalExpense {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: 'Tunai (Cash)' | 'Transfer Bank' | 'DANA / E-Wallet' | 'Kartu Debit/Kredit' | 'Lainnya';
  recipientOrVendor?: string;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
  createdBy?: string;
}

