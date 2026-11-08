import { SimplePOOrder, OperationalExpense, ProductSetting, AdminStoreConfig, WAConfig } from '../types/po';

const STORAGE_KEY_GS_URL = 'po_waveid_gs_url_v2';

export function getGoogleSheetsUrl(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_KEY_GS_URL);
  if (stored) return stored;
  
  // URL restored for convenience, but be aware this is now public.
  return 'https://script.google.com/macros/s/AKfycbwVbUGxhGpqwZfqJH8VZ0FspPRQt5lBRKYbaftFyaa4jnpH6pgFNzENZK5gtm9dtiegWA/exec';
}

export function saveGoogleSheetsUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY_GS_URL, url.trim());
}

async function callGsAction(action: string, data?: any) {
  const url = getGoogleSheetsUrl();
  if (!url) return null;

  try {
    // For POST (writing) - use text/plain to avoid CORS preflight rejection on Google Apps Script Web Apps
    if (data) {
      const payload = JSON.stringify({ action, data, ...data });
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        redirect: 'follow',
        body: payload,
      });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { success: res.ok, raw: text };
      }
    }
    
    // For GET (reading)
    const getUrl = `${url}${url.includes('?') ? '&' : '?'}action=${action}&t=${Date.now()}`;
    const res = await fetch(getUrl, { redirect: 'follow' });
    return await res.json();
  } catch (err) {
    console.error(`Google Sheets Action Failed (${action}):`, err);
    return null;
  }
}

function normalizePaymentStatus(rawStatus: any): 'PAID' | 'PENDING' {
  const val = String(rawStatus ?? '').trim().toUpperCase();
  if (
    val === 'PAID' ||
    val === 'LUNAS' ||
    val === 'SUDAH LUNAS' ||
    val === 'SUDAH BAYAR' ||
    val === 'TERVERIFIKASI' ||
    val === 'DONE' ||
    val === 'TRUE' ||
    val === '1'
  ) {
    return 'PAID';
  }
  return 'PENDING';
}

export function normalizeOrderFromSheets(raw: any): SimplePOOrder {
  const statusCandidate =
    raw?.paymentStatus ?? raw?.payment_status ?? raw?.status ?? raw?.statusPembayaran ?? 'PENDING';
  const normalizedStatus = normalizePaymentStatus(statusCandidate);
  return {
    ...raw,
    customerPhone: String(raw?.customerPhone ?? raw?.customer_phone ?? '').replace(/^'+/, ''),
    paymentStatus: normalizedStatus,
    paidAt:
      normalizedStatus === 'PAID'
        ? raw?.paidAt || raw?.createdAt || new Date().toISOString()
        : undefined,
  };
}

export async function fetchAllDataFromSheets() {
  const res = await callGsAction('getData');
  if (res && Array.isArray(res.orders)) {
    res.orders = res.orders.map(normalizeOrderFromSheets);
  }
  return res;
}

export async function upsertOrderToSheets(order: SimplePOOrder) {
  return await callGsAction('upsertOrder', { data: order });
}

export async function deleteOrderFromSheets(id: string) {
  return await callGsAction('deleteOrder', { id });
}

export async function upsertExpenseToSheets(expense: OperationalExpense) {
  return await callGsAction('upsertExpense', { data: expense });
}

export async function deleteExpenseFromSheets(id: string) {
  return await callGsAction('deleteExpense', { id });
}

export async function saveProductsToSheets(products: ProductSetting[]) {
  return await callGsAction('saveProducts', { data: products });
}

export async function saveDanaConfigToSheets(config: AdminStoreConfig) {
  return await callGsAction('saveDanaConfig', {
    data: {
      danaPhone: config.danaPhone || '',
      danaAccountName: config.danaAccountName || '',
      autoDeductStock: config.autoDeductStock !== false,
      qrisImageUrl:
        config.qrisImageUrl && config.qrisImageUrl.length <= 45000 ? config.qrisImageUrl : '',
    },
  });
}

export async function saveWAConfigToSheets(config: WAConfig) {
  return await callGsAction('saveWAConfig', {
    data: {
      mode: config.mode || 'group_link',
      phoneNumber: config.phoneNumber || '',
      groupLink: config.groupLink || '',
      groupName: config.groupName || '',
      paidGroupLink: config.paidGroupLink || '',
      paidGroupName: config.paidGroupName || '',
    },
  });
}

export async function saveSettingToSheets(key: string, value: any) {
  return await callGsAction('saveSetting', { key, value });
}

export async function saveAllOrdersToSheets(orders: SimplePOOrder[]) {
  return await callGsAction('saveAllOrders', { data: orders });
}

export async function saveAllExpensesToSheets(expenses: OperationalExpense[]) {
  return await callGsAction('saveAllExpenses', { data: expenses });
}

/**
 * Real-time polling for Google Sheets (Polite Polling)
 */
export function subscribeToSheetsRealtime(
  onData: (data: {
    orders: SimplePOOrder[];
    products: ProductSetting[];
    danaConfig?: Partial<AdminStoreConfig> | null;
    waConfig?: Partial<WAConfig> | null;
    expenses: OperationalExpense[];
    settings: any;
  }) => void
): () => void {
  let isCancelled = false;
  
  const poll = async () => {
    if (isCancelled || !getGoogleSheetsUrl()) return;
    const data = await fetchAllDataFromSheets();
    if (data && !isCancelled) {
      onData(data);
    }
  };

  poll();
  const interval = setInterval(poll, 20000); // 20s polling for Sheets to be safe with quota

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
}
