/**
 * Utility formatters for Purchase Order numbers, currency, and Indonesian Terbilang
 */

export function formatCurrency(amount: number, currency: 'IDR' | 'USD' = 'IDR'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Konversi angka ke kalimat terbilang bahasa Indonesia (misal: 1500000 -> Satu Juta Lima Ratus Ribu Rupiah)
 */
export function numberToWordsID(n: number): string {
  if (n === 0) return 'Nol Rupiah';
  
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  function convert(num: number): string {
    if (num < 12) return bilangan[num];
    if (num < 20) return convert(num - 10) + ' Belas';
    if (num < 100) return convert(Math.floor(num / 10)) + ' Puluh ' + convert(num % 10);
    if (num < 200) return 'Seratus ' + convert(num - 100);
    if (num < 1000) return convert(Math.floor(num / 100)) + ' Ratus ' + convert(num % 100);
    if (num < 2000) return 'Seribu ' + convert(num - 1000);
    if (num < 1000000) return convert(Math.floor(num / 1000)) + ' Ribu ' + convert(num % 1000);
    if (num < 1000000000) return convert(Math.floor(num / 1000000)) + ' Juta ' + convert(num % 1000000);
    if (num < 1000000000000) return convert(Math.floor(num / 1000000000)) + ' Miliar ' + convert(num % 1000000000);
    return convert(Math.floor(num / 1000000000000)) + ' Triliun ' + convert(num % 1000000000000);
  }

  const raw = Math.floor(Math.abs(n));
  const result = convert(raw).replace(/\s+/g, ' ').trim();
  return result + ' Rupiah';
}

export const STATUS_LABELS: Record<string, { label: string; textClass: string; bgClass: string; borderClass: string }> = {
  DRAFT: {
    label: 'Draft',
    textClass: 'text-slate-700 dark:text-slate-300',
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    borderClass: 'border-slate-300 dark:border-slate-700',
  },
  PENDING_APPROVAL: {
    label: 'Menunggu Persetujuan',
    textClass: 'text-amber-700 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    borderClass: 'border-amber-200 dark:border-amber-800',
  },
  APPROVED: {
    label: 'Disetujui',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
  },
  SENT: {
    label: 'Terkirim ke Vendor',
    textClass: 'text-blue-700 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-950/40',
    borderClass: 'border-blue-200 dark:border-blue-800',
  },
  PARTIALLY_RECEIVED: {
    label: 'Diterima Sebagian',
    textClass: 'text-indigo-700 dark:text-indigo-400',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderClass: 'border-indigo-200 dark:border-indigo-800',
  },
  FULFILLED: {
    label: 'Selesai / Diterima Lengkap',
    textClass: 'text-emerald-800 dark:text-emerald-300',
    bgClass: 'bg-emerald-100 dark:bg-emerald-950/60',
    borderClass: 'border-emerald-300 dark:border-emerald-700',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    textClass: 'text-rose-700 dark:text-rose-400',
    bgClass: 'bg-rose-50 dark:bg-rose-950/40',
    borderClass: 'border-rose-200 dark:border-rose-800',
  },
};
