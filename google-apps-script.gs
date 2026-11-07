/**
 * GOOGLE APPS SCRIPT FOR PO-WAVEID
 * Paste this into Extensions > Apps Script in your Google Sheet
 * Then Deploy > Manage deployments > Edit (pencil icon) > Version: New version > Deploy
 */

const CONFIG = {
  sheetNameOrders: 'Orders',
  sheetNameProducts: 'Products',
  sheetNameDana: 'DanaConfig',
  sheetNameWA: 'WhatsAppConfig',
  sheetNameExpenses: 'Expenses',
  sheetNameSettings: 'Settings'
};

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss.getSheetByName(CONFIG.sheetNameOrders)) {
    const s = ss.insertSheet(CONFIG.sheetNameOrders);
    s.appendRow(['id', 'po_number', 'customer_name', 'customer_phone', 'total_price', 'payment_status', 'items_json', 'raw_data_json', 'created_at']);
    s.setFrozenRows(1);
  }
  
  // 1. Tabel Pengaturan Harga & Stok Barang Katalog
  if (!ss.getSheetByName(CONFIG.sheetNameProducts)) {
    const s = ss.insertSheet(CONFIG.sheetNameProducts);
    s.appendRow(['id', 'name', 'price', 'stock', 'maxPerOrder', 'isActive', 'description']);
    s.setFrozenRows(1);
  }
  
  // 2. Tabel Pengaturan Pembayaran DANA & QRIS
  if (!ss.getSheetByName(CONFIG.sheetNameDana)) {
    const s = ss.insertSheet(CONFIG.sheetNameDana);
    s.appendRow(['danaPhone', 'danaAccountName', 'autoDeductStock', 'qrisImageUrl', 'updatedAt']);
    s.setFrozenRows(1);
  }

  // 3. Tabel Tujuan WhatsApp Penerima Pesanan
  if (!ss.getSheetByName(CONFIG.sheetNameWA)) {
    const s = ss.insertSheet(CONFIG.sheetNameWA);
    s.appendRow(['mode', 'phoneNumber', 'groupLink', 'groupName', 'paidGroupLink', 'paidGroupName', 'updatedAt']);
    s.setFrozenRows(1);
  }

  if (!ss.getSheetByName(CONFIG.sheetNameExpenses)) {
    const s = ss.insertSheet(CONFIG.sheetNameExpenses);
    s.appendRow(['id', 'date', 'title', 'category', 'amount', 'paymentMethod', 'recipientOrVendor', 'notes', 'created_at']);
    s.setFrozenRows(1);
  }

  if (!ss.getSheetByName(CONFIG.sheetNameSettings)) {
    const s = ss.insertSheet(CONFIG.sheetNameSettings);
    s.appendRow(['key', 'value_json']);
    s.setFrozenRows(1);
  }
}

function saveDanaSheet(ss, cfg) {
  const sheet = ss.getSheetByName(CONFIG.sheetNameDana);
  if (!sheet) return;
  sheet.clearContents();
  sheet.appendRow(['danaPhone', 'danaAccountName', 'autoDeductStock', 'qrisImageUrl', 'updatedAt']);
  // Prefix phone with apostrophe so Google Sheets preserves leading zero (e.g. '0812...)
  const phoneStr = cfg.danaPhone ? "'" + String(cfg.danaPhone).replace(/^'+/, '') : '';
  sheet.appendRow([
    phoneStr,
    cfg.danaAccountName || '',
    cfg.autoDeductStock !== false,
    cfg.qrisImageUrl && String(cfg.qrisImageUrl).length <= 45000 ? cfg.qrisImageUrl : '',
    new Date().toISOString()
  ]);
}

function saveWASheet(ss, cfg) {
  const sheet = ss.getSheetByName(CONFIG.sheetNameWA);
  if (!sheet) return;
  sheet.clearContents();
  sheet.appendRow(['mode', 'phoneNumber', 'groupLink', 'groupName', 'paidGroupLink', 'paidGroupName', 'updatedAt']);
  const phoneStr = cfg.phoneNumber ? "'" + String(cfg.phoneNumber).replace(/^'+/, '') : '';
  sheet.appendRow([
    cfg.mode || 'group_link',
    phoneStr,
    cfg.groupLink || '',
    cfg.groupName || '',
    cfg.paidGroupLink || '',
    cfg.paidGroupName || '',
    new Date().toISOString()
  ]);
}

function doPost(e) {
  const result = { success: false, message: '' };
  try {
    setup(); // Ensure all sheets exist before processing
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'upsertOrder') {
      const order = payload.data;
      const sheet = ss.getSheetByName(CONFIG.sheetNameOrders);
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == order.id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      const rowData = [
        order.id,
        order.poNumber,
        order.customerName,
        "'" + String(order.customerPhone || '').replace(/^'+/, ''),
        order.totalPrice,
        order.paymentStatus,
        JSON.stringify(order.items),
        JSON.stringify(order),
        order.createdAt || new Date().toISOString()
      ];
      
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
      result.success = true;
    }

    if (action === 'deleteOrder') {
      const id = payload.id;
      const sheet = ss.getSheetByName(CONFIG.sheetNameOrders);
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      result.success = true;
    }

    if (action === 'upsertExpense') {
      const exp = payload.data;
      const sheet = ss.getSheetByName(CONFIG.sheetNameExpenses);
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == exp.id) {
          rowIndex = i + 1;
          break;
        }
      }
      const rowData = [
        exp.id, exp.date, exp.title, exp.category, exp.amount, 
        exp.paymentMethod, exp.recipientOrVendor, exp.notes, 
        exp.createdAt || new Date().toISOString()
      ];
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        sheet.appendRow(rowData);
      }
      result.success = true;
    }

    if (action === 'deleteExpense') {
      const id = payload.id;
      const sheet = ss.getSheetByName(CONFIG.sheetNameExpenses);
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == id) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      result.success = true;
    }

    // 1. Simpan Tabel Products (Pengaturan Harga & Stok Barang Katalog)
    if (action === 'saveProducts') {
      const products = payload.data || [];
      const sheet = ss.getSheetByName(CONFIG.sheetNameProducts);
      sheet.clearContents();
      sheet.appendRow(['id', 'name', 'price', 'stock', 'maxPerOrder', 'isActive', 'description']);
      products.forEach(p => {
        sheet.appendRow([p.id, p.name, p.price, p.stock, p.maxPerOrder, p.isActive, p.description]);
      });
      result.success = true;
    }

    // 2. Simpan Tabel DanaConfig (Pengaturan Pembayaran DANA & QRIS)
    if (action === 'saveDanaConfig') {
      const cfg = payload.data || payload.value || payload;
      saveDanaSheet(ss, cfg);
      result.success = true;
    }

    // 3. Simpan Tabel WhatsAppConfig (Tujuan WhatsApp Penerima Pesanan)
    if (action === 'saveWAConfig') {
      const cfg = payload.data || payload.value || payload;
      saveWASheet(ss, cfg);
      result.success = true;
    }

    // Backward-compatible saveSetting (juga otomatis menulis ke tabel DanaConfig & WhatsAppConfig)
    if (action === 'saveSetting') {
      const { key, value } = payload;
      if (key === 'adminConfig' && value) {
        saveDanaSheet(ss, value);
        if (Array.isArray(value.products)) {
          const prodSheet = ss.getSheetByName(CONFIG.sheetNameProducts);
          prodSheet.clearContents();
          prodSheet.appendRow(['id', 'name', 'price', 'stock', 'maxPerOrder', 'isActive', 'description']);
          value.products.forEach(p => {
            prodSheet.appendRow([p.id, p.name, p.price, p.stock, p.maxPerOrder, p.isActive, p.description]);
          });
        }
      }
      if (key === 'waConfig' && value) {
        saveWASheet(ss, value);
      }

      const sheet = ss.getSheetByName(CONFIG.sheetNameSettings);
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == key) {
          rowIndex = i + 1;
          break;
        }
      }
      const valJson = JSON.stringify(value);
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 2).setValue(valJson);
      } else {
        sheet.appendRow([key, valJson]);
      }
      result.success = true;
    }

    if (action === 'saveAllOrders') {
      const orders = payload.data;
      const sheet = ss.getSheetByName(CONFIG.sheetNameOrders);
      sheet.clearContents();
      sheet.appendRow(['id', 'po_number', 'customer_name', 'customer_phone', 'total_price', 'payment_status', 'items_json', 'raw_data_json', 'created_at']);
      orders.forEach(order => {
        const rowData = [
          order.id,
          order.poNumber,
          order.customerName,
          "'" + String(order.customerPhone || '').replace(/^'+/, ''),
          order.totalPrice,
          order.paymentStatus,
          JSON.stringify(order.items),
          JSON.stringify(order),
          order.createdAt || new Date().toISOString()
        ];
        sheet.appendRow(rowData);
      });
      result.success = true;
    }

    if (action === 'saveAllExpenses') {
      const expenses = payload.data;
      const sheet = ss.getSheetByName(CONFIG.sheetNameExpenses);
      sheet.clearContents();
      sheet.appendRow(['id', 'date', 'title', 'category', 'amount', 'paymentMethod', 'recipientOrVendor', 'notes', 'created_at']);
      expenses.forEach(exp => {
        const rowData = [
          exp.id, exp.date, exp.title, exp.category, exp.amount, 
          exp.paymentMethod, exp.recipientOrVendor, exp.notes, 
          exp.createdAt || new Date().toISOString()
        ];
        sheet.appendRow(rowData);
      });
      result.success = true;
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    result.message = err.toString();
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  setup(); // Ensure all sheets exist before reading
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter.action;
  
  if (action === 'getData') {
    const data = {
      orders: [],
      products: [],
      danaConfig: null,
      waConfig: null,
      expenses: [],
      settings: {}
    };
    
    // Get Orders
    const orderSheet = ss.getSheetByName(CONFIG.sheetNameOrders);
    if (orderSheet) {
      const rows = orderSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        try {
          const raw = JSON.parse(rows[i][7]);
          data.orders.push(raw);
        } catch(e) {
          data.orders.push({
            id: rows[i][0],
            poNumber: rows[i][1],
            customerName: rows[i][2],
            customerPhone: String(rows[i][3] || ''),
            totalPrice: rows[i][4],
            paymentStatus: rows[i][5],
            items: JSON.parse(rows[i][6] || '[]'),
            createdAt: rows[i][8]
          });
        }
      }
    }
    
    // 1. Get Products (Tabel Pengaturan Harga & Stok Barang Katalog)
    const prodSheet = ss.getSheetByName(CONFIG.sheetNameProducts);
    if (prodSheet) {
      const rows = prodSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue;
        data.products.push({
          id: String(rows[i][0]),
          name: String(rows[i][1] || ''),
          price: Number(rows[i][2]) || 0,
          stock: Number(rows[i][3]) || 0,
          maxPerOrder: Number(rows[i][4]) || 1,
          isActive: rows[i][5] === true || String(rows[i][5]).toUpperCase() === 'TRUE',
          description: String(rows[i][6] || '')
        });
      }
    }

    // Get Legacy Settings first (fallback)
    const setSheet = ss.getSheetByName(CONFIG.sheetNameSettings);
    if (setSheet) {
      const rows = setSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        try {
          if (rows[i][0] && rows[i][1]) {
            data.settings[rows[i][0]] = JSON.parse(rows[i][1]);
          }
        } catch(e) {}
      }
    }

    // 2. Get DanaConfig (Tabel Pengaturan Pembayaran DANA & QRIS) - Prioritas Utama
    const danaSheet = ss.getSheetByName(CONFIG.sheetNameDana);
    if (danaSheet) {
      const rows = danaSheet.getDataRange().getValues();
      if (rows.length > 1) {
        const r = rows[1];
        data.danaConfig = {
          danaPhone: String(r[0] ?? '').replace(/^'+/, ''),
          danaAccountName: String(r[1] ?? ''),
          autoDeductStock: r[2] === true || String(r[2]).toUpperCase() === 'TRUE',
          qrisImageUrl: String(r[3] ?? '')
        };
        data.settings.adminConfig = Object.assign({}, data.settings.adminConfig || {}, data.danaConfig, {
          products: data.products
        });
      }
    }

    // 3. Get WhatsAppConfig (Tabel Tujuan WhatsApp Penerima Pesanan) - Prioritas Utama
    const waSheet = ss.getSheetByName(CONFIG.sheetNameWA);
    if (waSheet) {
      const rows = waSheet.getDataRange().getValues();
      if (rows.length > 1) {
        const r = rows[1];
        data.waConfig = {
          mode: String(r[0] || 'group_link'),
          phoneNumber: String(r[1] ?? '').replace(/^'+/, ''),
          groupLink: String(r[2] ?? ''),
          groupName: String(r[3] ?? ''),
          paidGroupLink: String(r[4] ?? ''),
          paidGroupName: String(r[5] ?? '')
        };
        data.settings.waConfig = data.waConfig;
      }
    }

    // Get Expenses
    const expSheet = ss.getSheetByName(CONFIG.sheetNameExpenses);
    if (expSheet) {
      const rows = expSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue;
        data.expenses.push({
          id: rows[i][0],
          date: rows[i][1],
          title: rows[i][2],
          category: rows[i][3],
          amount: rows[i][4],
          paymentMethod: rows[i][5],
          recipientOrVendor: rows[i][6],
          notes: rows[i][7],
          createdAt: rows[i][8]
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Invalid action' })).setMimeType(ContentService.MimeType.JSON);
}
