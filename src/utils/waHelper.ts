import { SimplePOOrder, WAConfig } from '../types/po';

export function formatSimpleOrderForWA(order: SimplePOOrder, danaPhone?: string): string {
  const targetDana = danaPhone || '085213174959';
  let dateFormatted = '-';
  try {
    if (order.createdAt) {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) {
        dateFormatted = new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(d);
      }
    }
  } catch {
    dateFormatted = '-';
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const itemsList = items.length > 0
    ? items.map((item, idx) => {
        const price = item.unitPrice ?? 100;
        const subtotal = item.subtotal ?? (price * (item.quantity || 1));
        return `  ${idx + 1}. *${item.name || 'Produk'}* (${item.quantity || 1} unit @ Rp ${price.toLocaleString('id-ID')}) = *Rp ${subtotal.toLocaleString('id-ID')}*`;
      }).join('\n')
    : '  -';

  const totalCalculated = order.totalPrice ?? items.reduce((acc, it) => {
    const price = it.unitPrice ?? 100;
    return acc + (it.subtotal ?? (price * (it.quantity || 1)));
  }, 0);

  let text = `📦 *PO WaveID-PURCHASE ORDER*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `*No. PO:* \`${order.poNumber}\`\n`;
  text += `*Waktu:* ${dateFormatted} WIB\n\n`;
  text += `📋 *Rincian Barang Dipesan:*\n${itemsList}\n\n`;
  text += `💰 *TOTAL HARGA: Rp ${totalCalculated.toLocaleString('id-ID')}*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👤 *Data Pemesan:*\n`;
  text += `• *Nama Pemesan:* ${order.customerName}\n`;
  text += `• *Nomor HP/WA:* ${order.customerPhone}\n\n`;

  if (order.notes && order.notes.trim()) {
    text += `📝 *Catatan Khusus:*\n${order.notes.trim()}\n\n`;
  }

  text += `💳 *Informasi Pembayaran (DANA / QRIS):*\n`;
  text += `• Metode: *DANA / QRIS*\n`;
  text += `• No. DANA: *${targetDana}*\n`;
  text += `• Total Tagihan: *Rp ${totalCalculated.toLocaleString('id-ID')}*\n`;
  text += `_(Harap lampirkan bukti transfer / screenshot DANA di chat ini)_\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `✅ *Konfirmasi:* Pemesan telah menyetujui pemesanan dan kebenaran data di atas.`;

  return text;
}

export function openWhatsAppWithOrder(
  order: SimplePOOrder,
  config: WAConfig,
  danaPhone?: string
): { mode: 'group' | 'direct'; url: string } {
  const messageText = formatSimpleOrderForWA(order, danaPhone);

  // If phone number mode
  if (config.mode === 'phone_number' && config.phoneNumber.trim()) {
    let cleanPhone = config.phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
    return { mode: 'direct', url };
  }

  // If group link mode
  if (config.groupLink && config.groupLink.trim()) {
    let link = config.groupLink.trim();
    if (!link.startsWith('http')) {
      link = 'https://' + link;
    }
    return { mode: 'group', url: link };
  }

  // Fallback to generic WhatsApp share
  const genericUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;
  return { mode: 'direct', url: genericUrl };
}

export function formatPaidGroupInviteMessage(order: SimplePOOrder, paidGroupLink: string): string {
  let link = paidGroupLink.trim();
  if (!link.startsWith('http')) {
    link = 'https://' + link;
  }

  let text = `🎉 *PEMBAYARAN DITERIMA & STATUS LUNAS!*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Halo *${order.customerName}*,\n\n`;
  text += `Pesanan Anda dengan No. PO *${order.poNumber}* telah kami konfirmasi *LUNAS*! 🟢\n\n`;
  text += `Silakan bergabung ke *Grup WhatsApp WaveId Confirm* di bawah ini untuk menerima update status pengerjaan, bukti packing, dan nomor resi pengiriman kurir:\n\n`;
  text += `👉 *Link Grup WA LUNAS:* ${link}\n\n`;
  text += `Terima kasih telah berbelanja! 🙏\n`;
  text += `━━━━━━━━━━━━━━━━━━━━`;
  return text;
}

export function openPaidWhatsAppInvite(order: SimplePOOrder, paidGroupLink: string): string {
  let cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.substring(1);
  }
  const messageText = formatPaidGroupInviteMessage(order, paidGroupLink);
  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`;
  window.open(url, '_blank');
  return url;
}
