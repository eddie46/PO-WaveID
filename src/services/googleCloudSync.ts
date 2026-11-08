import { SimplePOOrder, WAConfig, AdminStoreConfig, ShippingStatus, OperationalExpense, ProductSetting } from '../types/po';
import { simpleStorage } from './storage';
import {
  getGoogleSheetsUrl,
  saveGoogleSheetsUrl,
  upsertOrderToSheets,
  deleteOrderFromSheets,
  upsertExpenseToSheets,
  deleteExpenseFromSheets,
  saveProductsToSheets,
  saveDanaConfigToSheets,
  saveWAConfigToSheets,
  saveSettingToSheets,
  saveAllOrdersToSheets,
  saveAllExpensesToSheets,
  subscribeToSheetsRealtime,
  fetchAllDataFromSheets
} from './googleSheetsSync';

/**
 * PURE GOOGLE SHEETS DISPATCHER
 * Every local change is synced to Google Sheets.
 * Real-time updates are polled from Google Sheets.
 */

function isSheetsActive(): boolean {
  return !!getGoogleSheetsUrl();
}

let isSavingSettings = false;
let lastSavedSettingsAt = 0;

/**
 * Subscribe to all data from Google Sheets
 */
export function subscribeToOrders(
  onData: (orders: SimplePOOrder[]) => void,
  onAdminConfig?: (cfg: AdminStoreConfig) => void,
  onWAConfig?: (cfg: WAConfig) => void
): () => void {
  return subscribeToSheetsRealtime((data) => {
    console.log('Realtime sync received data:', data);
    
    // Skip overwriting orders, settings & products if a save/resequence is currently in-flight or just completed (< 8s ago)
    if (isSavingSettings || Date.now() - lastSavedSettingsAt < 8000) {
      console.log('Skipping poll update because local save/resequence is in-flight or recent.');
      return;
    }

    // 1. Sync Orders (Allow empty array)
    if (data.orders) {
      simpleStorage.saveOrders(data.orders);
      onData(data.orders);
    }

    // 2. Sync Admin Config (from DanaConfig table, danaConfig_v2, or Settings fallback) & Products (from Products table)
    const cloudAdmin = data.danaConfig || data.settings?.danaConfig_v2 || data.settings?.adminConfig;
    if (onAdminConfig && (cloudAdmin || Array.isArray(data.products))) {
      const currentAdmin = simpleStorage.getAdminConfig();

      let mergedProducts = currentAdmin.products;
      if (Array.isArray(data.products) && data.products.length > 0) {
        const uniqueProds: ProductSetting[] = [];
        const seenIds = new Set<string>();
        for (const p of data.products) {
          if (p && p.id && !seenIds.has(p.id)) {
            uniqueProds.push(p);
            seenIds.add(p.id);
          }
        }
        mergedProducts = uniqueProds;
      } else if (Array.isArray((cloudAdmin as any)?.products)) {
        mergedProducts = (cloudAdmin as any).products;
      }

      const updatedAdmin: AdminStoreConfig = {
        ...currentAdmin,
        ...(cloudAdmin && typeof cloudAdmin === 'object' ? cloudAdmin : {}),
        danaPhone:
          cloudAdmin?.danaPhone !== undefined && cloudAdmin.danaPhone !== ''
            ? String(cloudAdmin.danaPhone).replace(/^'+/, '')
            : currentAdmin.danaPhone || cloudAdmin?.danaPhone || '',
        danaAccountName:
          cloudAdmin?.danaAccountName !== undefined && cloudAdmin.danaAccountName !== ''
            ? String(cloudAdmin.danaAccountName)
            : currentAdmin.danaAccountName || cloudAdmin?.danaAccountName || '',
        qrisImageUrl:
          cloudAdmin?.qrisImageUrl !== undefined && cloudAdmin.qrisImageUrl !== ''
            ? String(cloudAdmin.qrisImageUrl)
            : currentAdmin.qrisImageUrl || cloudAdmin?.qrisImageUrl || '',
        autoDeductStock:
          cloudAdmin?.autoDeductStock !== undefined
            ? Boolean(cloudAdmin.autoDeductStock)
            : currentAdmin.autoDeductStock,
        products: mergedProducts,
      };

      simpleStorage.saveAdminConfig(updatedAdmin);
      onAdminConfig(updatedAdmin);
    }

    // 3. Sync WA Config (from WhatsAppConfig table, waConfig_v2, or Settings fallback)
    const cloudWA = data.waConfig || data.settings?.waConfig_v2 || data.settings?.waConfig;
    if (cloudWA && onWAConfig && typeof cloudWA === 'object') {
      const currentWA = simpleStorage.getWAConfig();
      const updatedWA: WAConfig = {
        ...currentWA,
        ...cloudWA,
        mode: cloudWA.mode || currentWA.mode || 'group_link',
        phoneNumber:
          cloudWA.phoneNumber !== undefined && cloudWA.phoneNumber !== ''
            ? String(cloudWA.phoneNumber).replace(/^'+/, '')
            : currentWA.phoneNumber || cloudWA.phoneNumber || '',
        groupLink:
          cloudWA.groupLink !== undefined && cloudWA.groupLink !== ''
            ? String(cloudWA.groupLink)
            : currentWA.groupLink || cloudWA.groupLink || '',
        groupName:
          cloudWA.groupName !== undefined && cloudWA.groupName !== ''
            ? String(cloudWA.groupName)
            : currentWA.groupName || cloudWA.groupName || '',
        paidGroupLink:
          cloudWA.paidGroupLink !== undefined && cloudWA.paidGroupLink !== ''
            ? String(cloudWA.paidGroupLink)
            : currentWA.paidGroupLink || cloudWA.paidGroupLink || '',
        paidGroupName:
          cloudWA.paidGroupName !== undefined && cloudWA.paidGroupName !== ''
            ? String(cloudWA.paidGroupName)
            : currentWA.paidGroupName || cloudWA.paidGroupName || '',
      };
      simpleStorage.saveWAConfig(updatedWA);
      onWAConfig(updatedWA);
    }
  });
}

/**
 * Save or update an order
 */
export async function saveOrderCloud(order: SimplePOOrder): Promise<void> {
  const local = simpleStorage.getOrders();
  const idx = local.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    local[idx] = order;
  } else {
    local.unshift(order);
  }
  simpleStorage.saveOrders(local);

  if (isSheetsActive()) {
    upsertOrderToSheets(order).catch(e => console.warn('Sheets sync failed', e));
  }
}

/**
 * Delete an order
 */
export async function deleteOrderCloud(orderId: string): Promise<void> {
  const local = simpleStorage.getOrders().filter((o) => o.id !== orderId);
  simpleStorage.saveOrders(local);

  if (isSheetsActive()) {
    deleteOrderFromSheets(orderId).catch(e => console.warn('Sheets delete failed', e));
  }
}

/**
 * Save Admin Store Config (saves to DanaConfig table, Products table, danaConfig_v2, and Settings fallback)
 */
export async function saveAdminConfigCloud(config: AdminStoreConfig): Promise<AdminStoreConfig> {
  isSavingSettings = true;
  lastSavedSettingsAt = Date.now();
  simpleStorage.saveAdminConfig(config);
  try {
    if (isSheetsActive()) {
      console.log('Sending DanaConfig & Products payload to Sheets:', config);
      const safeSheetConfig: AdminStoreConfig = {
        ...config,
        qrisImageUrl:
          config.qrisImageUrl && config.qrisImageUrl.length > 45000
            ? ''
            : config.qrisImageUrl,
      };
      await saveDanaConfigToSheets(safeSheetConfig);
      await saveSettingToSheets('danaConfig_v2', {
        danaPhone: safeSheetConfig.danaPhone || '',
        danaAccountName: safeSheetConfig.danaAccountName || '',
        autoDeductStock: safeSheetConfig.autoDeductStock !== false,
        qrisImageUrl: safeSheetConfig.qrisImageUrl || '',
      });
      await saveSettingToSheets('adminConfig', safeSheetConfig);
      if (config.products) {
        await saveProductsToSheets(config.products);
      }
    }
  } finally {
    lastSavedSettingsAt = Date.now();
    isSavingSettings = false;
  }
  return config;
}

/**
 * Save WA Config (saves to WhatsAppConfig table, waConfig_v2, and Settings fallback)
 */
export async function saveWAConfigCloud(config: WAConfig): Promise<WAConfig> {
  isSavingSettings = true;
  lastSavedSettingsAt = Date.now();
  simpleStorage.saveWAConfig(config);
  try {
    if (isSheetsActive()) {
      console.log('Sending WhatsAppConfig payload to Sheets:', config);
      await saveWAConfigToSheets(config);
      await saveSettingToSheets('waConfig_v2', config);
      await saveSettingToSheets('waConfig', config);
    }
  } finally {
    lastSavedSettingsAt = Date.now();
    isSavingSettings = false;
  }
  return config;
}

/**
 * Expenses
 */
export async function saveExpenseCloud(expense: OperationalExpense): Promise<void> {
  const local = simpleStorage.getExpenses();
  const idx = local.findIndex(e => e.id === expense.id);
  if (idx >= 0) local[idx] = expense;
  else local.unshift(expense);
  simpleStorage.saveExpenses(local);
  
  if (isSheetsActive()) {
    upsertExpenseToSheets(expense);
  }
}

export async function deleteExpenseCloud(id: string): Promise<void> {
  const local = simpleStorage.getExpenses().filter(e => e.id !== id);
  simpleStorage.saveExpenses(local);
  
  if (isSheetsActive()) {
    deleteExpenseFromSheets(id);
  }
}

// Missing exports that App.tsx expects
export async function updateOrderPaymentStatusCloud(orderId: string, status: 'PENDING' | 'PAID'): Promise<SimplePOOrder[]> {
  const updated = simpleStorage.updateOrderPaymentStatus(orderId, status);
  const order = updated.find(o => o.id === orderId);
  if (order && isSheetsActive()) {
    upsertOrderToSheets(order);
  }
  return updated;
}

export async function updateOrderShippingCloud(
  orderId: string,
  courier: string,
  trackingNumber: string,
  shippingStatus: ShippingStatus
): Promise<SimplePOOrder[]> {
  const updated = simpleStorage.updateOrderShipping(orderId, courier, trackingNumber, shippingStatus);
  const order = updated.find(o => o.id === orderId);
  if (order && isSheetsActive()) {
    upsertOrderToSheets(order);
  }
  return updated;
}

export async function deductStockCloud(items: { name: string; quantity: number }[]): Promise<AdminStoreConfig> {
  const updatedConfig = simpleStorage.deductStock(items);
  if (isSheetsActive()) {
    saveProductsToSheets(updatedConfig.products);
  }
  return updatedConfig;
}

export async function resequenceOrdersCloud(
  sourceOrders?: SimplePOOrder[]
): Promise<{ orders: SimplePOOrder[]; changedCount: number }> {
  const current = [...(sourceOrders || simpleStorage.getOrders())];
  if (current.length === 0) {
    return { orders: [], changedCount: 0 };
  }

  // Sort orders chronologically by createdAt (oldest first gets 001, newest gets N)
  const chronological = [...current].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
      return timeA - timeB;
    }
    return String(a.id || '').localeCompare(String(b.id || ''));
  });

  const now = new Date();
  const fallbackPrefix = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-`;

  let changedCount = 0;
  const newPoById = new Map<string, string>();

  chronological.forEach((order, idx) => {
    const seqStr = String(idx + 1).padStart(3, '0');
    // Preserve existing PO-YYYYMM- prefix if valid, or derive from order.createdAt
    let prefix = fallbackPrefix;
    const existingMatch = (order.poNumber || '').trim().match(/^(PO-\d{6}-)/i);
    if (existingMatch) {
      prefix = existingMatch[1].toUpperCase();
    } else if (order.createdAt) {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) {
        prefix = `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-`;
      }
    }

    const expectedPoNumber = `${prefix}${seqStr}`;
    if ((order.poNumber || '').trim().toUpperCase() !== expectedPoNumber.toUpperCase()) {
      changedCount++;
    }
    newPoById.set(order.id, expectedPoNumber);
  });

  // Map back while keeping newest-first display order (or existing list order)
  const resequencedOrders = [...chronological]
    .reverse()
    .map((order) => ({
      ...order,
      poNumber: newPoById.get(order.id) || order.poNumber,
    }));

  isSavingSettings = true;
  lastSavedSettingsAt = Date.now();
  simpleStorage.saveOrders(resequencedOrders);
  try {
    if (isSheetsActive()) {
      await saveAllOrdersToSheets(resequencedOrders);
    }
  } catch (err) {
    console.warn('Failed to sync resequenced orders to Google Sheets:', err);
  } finally {
    lastSavedSettingsAt = Date.now();
    isSavingSettings = false;
  }

  return { orders: resequencedOrders, changedCount };
}

export async function deleteAllOrdersCloud(): Promise<void> {
  isSavingSettings = true;
  lastSavedSettingsAt = Date.now();
  simpleStorage.saveOrders([]);
  try {
    if (isSheetsActive()) {
      await saveAllOrdersToSheets([]);
    }
  } finally {
    lastSavedSettingsAt = Date.now();
    isSavingSettings = false;
  }
}

// Dummy/Compatibility exports
export function subscribeToAdminConfig(onData: (cfg: AdminStoreConfig) => void) {
  return () => {};
}
export function subscribeToWAConfig(onData: (cfg: WAConfig) => void) {
  return () => {};
}
export function subscribeToSupabaseProductsRealtime(onData: (p: ProductSetting[]) => void) {
  return () => {};
}
export function subscribeToSupabaseExpensesRealtime(onData: (e: OperationalExpense[]) => void) {
  return () => {};
}
export function subscribeToExpenses(onData: (e: OperationalExpense[]) => void) {
  return subscribeToSheetsRealtime((data) => {
    if (data.expenses) {
      simpleStorage.saveExpenses(data.expenses);
      onData(data.expenses);
    }
  });
}

// Backup compatibility
export function exportDatabaseBackup(
  orders: SimplePOOrder[],
  waConfig: WAConfig,
  adminConfig: AdminStoreConfig,
  expenses: OperationalExpense[]
) {
  return {
    version: '1.0',
    appName: 'PO-WaveID',
    exportedAt: new Date().toISOString(),
    totalOrders: orders.length,
    data: { orders, waConfig, adminConfig, expenses }
  };
}

export function downloadDatabaseBackupFile(backup: any) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Backup_Database_PO_WaveID_${new Date().toISOString().replace(/:/g, '-')}.json`;
  a.click();
}

export async function importDatabaseBackupCloud(data: any, mode: 'merge' | 'replace') {
  // In pure sheets mode, we usually replace or merge local then sync up
  let finalOrders = simpleStorage.getOrders();
  if (mode === 'replace') {
    if (data.data?.orders) finalOrders = data.data.orders;
    else if (data.orders) finalOrders = data.orders;
  } else {
    // merge
    const incoming = data.data?.orders || data.orders || [];
    finalOrders = [...finalOrders, ...incoming];
  }
  
  simpleStorage.saveOrders(finalOrders);
  
  const adminConfig = data.data?.adminConfig || data.adminConfig;
  if (adminConfig) simpleStorage.saveAdminConfig(adminConfig);
  
  const waConfig = data.data?.waConfig || data.waConfig;
  if (waConfig) simpleStorage.saveWAConfig(waConfig);
  
  const expenses = data.data?.expenses || data.expenses || [];
  if (mode === 'replace') simpleStorage.saveExpenses(expenses);
  else simpleStorage.saveExpenses([...simpleStorage.getExpenses(), ...expenses]);
  
  if (isSheetsActive()) {
    // Sync all to sheets (bulk)
    saveSettingToSheets('adminConfig', simpleStorage.getAdminConfig());
    saveSettingToSheets('waConfig', simpleStorage.getWAConfig());
    saveProductsToSheets(simpleStorage.getAdminConfig().products);
    saveAllOrdersToSheets(finalOrders);
    saveAllExpensesToSheets(simpleStorage.getExpenses());
  }
  
  return {
    orderCount: finalOrders.length,
    expenseCount: expenses.length,
    hasAdminConfig: !!adminConfig,
    hasWAConfig: !!waConfig,
    finalOrders,
    finalExpenses: simpleStorage.getExpenses()
  };
}

export function updateExpenseCloud(expense: OperationalExpense) {
  return saveExpenseCloud(expense);
}
