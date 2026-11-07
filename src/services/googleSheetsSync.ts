import { SimplePOOrder, OperationalExpense, ProductSetting, AdminStoreConfig, WAConfig } from '../types/po';

const STORAGE_KEY_GS_URL = 'po_waveid_gs_url';

export function getGoogleSheetsUrl(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_KEY_GS_URL);
  if (stored) return stored;
  
  // URL restored for convenience, but be aware this is now public.
  return 'https://script.google.com/macros/s/AKfycbxRyxJXcjvYGrKayHTQfx9sl8WvacVNCyKRyO5HMlFG1WO_SXSBbuRW6RMqFm_fjuwE/exec';
}

export function saveGoogleSheetsUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY_GS_URL, url.trim());
}

async function callGsAction(action: string, data?: any) {
  const url = getGoogleSheetsUrl();
  if (!url) return null;

  try {
    // For POST (writing)
    if (data) {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action, data, ...data }), // Flatten if needed
      });
      return await res.json();
    }
    
    // For GET (reading)
    const getUrl = `${url}${url.includes('?') ? '&' : '?'}action=${action}&t=${Date.now()}`;
    const res = await fetch(getUrl);
    return await res.json();
  } catch (err) {
    console.error(`Google Sheets Action Failed (${action}):`, err);
    return null;
  }
}

export async function fetchAllDataFromSheets() {
  return await callGsAction('getData');
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
  onData: (data: { orders: SimplePOOrder[]; products: ProductSetting[]; expenses: OperationalExpense[]; settings: any }) => void
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
