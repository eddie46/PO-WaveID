import { SimplePOOrder } from '../types/po';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType?: 'phone' | 'name' | 'address';
  matchedOrder?: SimplePOOrder;
  reason?: string;
}

/**
 * Normalizes phone number: strips non-digits, strips country code prefix (62 or 0)
 * Example: "0812-3456-7890" -> "81234567890", "+62 812-3456-7890" -> "81234567890"
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('62')) {
    digits = digits.substring(2);
  } else if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  return digits;
}

/**
 * Normalizes customer name: lowercases, strips salutations and special characters
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(bapak|bpk|ibu|sdr|sdri)\.?\s+/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

/**
 * Normalizes shipping address: lowercases, strips common punctuation and whitespace
 */
export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/(jalan|jl|jln|blok|rt|rw|no|nomor|kel|kec|kab|kota)\.?\s+/gi, '')
    .replace(/[^a-z0-9]/gi, '')
    .trim();
}

/**
 * Validates whether the given Name, Phone, and Address already exist in past orders
 */
export function checkDuplicateOrder(
  name: string,
  phone: string,
  address: string,
  orders: SimplePOOrder[]
): DuplicateCheckResult {
  const normPhone = normalizePhone(phone);
  const normName = normalizeName(name);
  const normAddr = normalizeAddress(address);

  for (const order of orders) {
    // 1. Cek Duplikasi Nomor HP (Valid jika minimal 8 digit)
    if (normPhone.length >= 8) {
      const orderPhone = normalizePhone(order.customerPhone);
      if (orderPhone === normPhone || orderPhone.endsWith(normPhone) || normPhone.endsWith(orderPhone)) {
        return {
          isDuplicate: true,
          matchType: 'phone',
          matchedOrder: order,
          reason: `Nomor HP/WhatsApp "${phone}" sudah pernah melakukan pemesanan pada ${new Date(order.createdAt).toLocaleDateString('id-ID')} (${order.poNumber}).`,
        };
      }
    }

    // 2. Cek Duplikasi Nama Pemesan (Valid jika minimal 3 karakter)
    if (normName.length >= 3) {
      const orderName = normalizeName(order.customerName);
      if (orderName.length >= 3 && (orderName === normName || orderName.includes(normName) || normName.includes(orderName))) {
        return {
          isDuplicate: true,
          matchType: 'name',
          matchedOrder: order,
          reason: `Nama pemesan "${name}" sudah pernah tercatat dalam riwayat pemesanan (${order.poNumber}).`,
        };
      }
    }

    // 3. Cek Duplikasi Alamat Lengkap Pengiriman (Valid jika minimal 12 karakter)
    if (normAddr.length >= 12) {
      const orderAddr = normalizeAddress(order.customerAddress);
      if (orderAddr.length >= 12 && (orderAddr === normAddr || orderAddr.includes(normAddr) || normAddr.includes(orderAddr))) {
        return {
          isDuplicate: true,
          matchType: 'address',
          matchedOrder: order,
          reason: `Alamat pengiriman ini sudah pernah digunakan pada pesanan ${order.poNumber}.`,
        };
      }
    }
  }

  return { isDuplicate: false };
}
