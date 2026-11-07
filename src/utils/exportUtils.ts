import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SimplePOOrder, OperationalExpense } from '../types/po';

export const exportToExcel = (orders: SimplePOOrder[], fileName = 'Rekap_Pesanan_PO.xlsx') => {
  if (!orders || orders.length === 0) {
    alert('Tidak ada data pesanan untuk diekspor ke Excel!');
    return;
  }

  const data = orders.map((o) => {
    const total = o.totalPrice ?? o.items.reduce((acc, it) => acc + (it.subtotal || (100 * it.quantity)), 0);
    const itemsStr = o.items.map((i) => `${i.name} (${i.quantity}x)`).join(', ');
    
    let shipStatus = 'Belum Dikirim';
    if (o.shippingStatus === 'SHIPPED') shipStatus = 'Dalam Pengiriman';
    if (o.shippingStatus === 'DELIVERED') shipStatus = 'Selesai / Terkirim';

    return {
      'No. PO': o.poNumber,
      'Tanggal Waktu': new Date(o.createdAt).toLocaleString('id-ID'),
      'Nama Pemesan': o.customerName,
      'No. WhatsApp / HP': o.customerPhone,
      'Alamat Pengiriman': o.customerAddress,
      'Rincian Produk': itemsStr,
      'Total Biaya (Rp)': total,
      'Status Pembayaran': o.paymentStatus === 'PAID' ? 'LUNAS' : 'Belum Bayar',
      'Ekspedisi': o.courier || 'J&T Express',
      'Nomor Resi': o.trackingNumber || '-',
      'Status Pengiriman': shipStatus,
      'Catatan': o.notes || '-',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set friendly column widths
  worksheet['!cols'] = [
    { wch: 18 }, // PO
    { wch: 20 }, // Tanggal
    { wch: 20 }, // Nama
    { wch: 16 }, // HP
    { wch: 35 }, // Alamat
    { wch: 35 }, // Produk
    { wch: 16 }, // Total
    { wch: 18 }, // Status Bayar
    { wch: 16 }, // Ekspedisi
    { wch: 20 }, // Resi
    { wch: 20 }, // Status Kirim
    { wch: 25 }, // Catatan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar PO');
  XLSX.writeFile(workbook, fileName);
};

export const exportToPDF = (orders: SimplePOOrder[], fileName = 'Rekap_Pesanan_PO.pdf') => {
  if (!orders || orders.length === 0) {
    alert('Tidak ada data pesanan untuk diekspor ke PDF!');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Title & Header
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129); // Emerald accent color
  doc.text('REKAP LAPORAN PESANAN PO (PURCHASE ORDER)', 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')} WIB  |  Total Pesanan: ${orders.length}`, 14, 22);

  const tableColumn = [
    'No. PO',
    'Tanggal',
    'Nama Pemesan',
    'No. HP',
    'Alamat',
    'Detail Produk',
    'Total (Rp)',
    'Status Bayar',
    'Ekspedisi',
    'No. Resi',
    'Status Kirim',
  ];

  const tableRows = orders.map((o) => {
    const itemsStr = o.items.map((i) => `${i.name} (${i.quantity}x)`).join('\n');
    const total = o.totalPrice ?? o.items.reduce((acc, it) => acc + (it.subtotal || (100 * it.quantity)), 0);
    const dateStr = new Date(o.createdAt).toLocaleDateString('id-ID');
    const payStatus = o.paymentStatus === 'PAID' ? 'LUNAS' : 'Belum Bayar';
    
    let shipStatus = 'Belum Dikirim';
    if (o.shippingStatus === 'SHIPPED') shipStatus = 'Pengiriman';
    if (o.shippingStatus === 'DELIVERED') shipStatus = 'Selesai';

    return [
      o.poNumber,
      dateStr,
      o.customerName,
      o.customerPhone,
      o.customerAddress,
      itemsStr,
      `Rp ${total.toLocaleString('id-ID')}`,
      payStatus,
      o.courier || 'J&T Express',
      o.trackingNumber || '-',
      shipStatus,
    ];
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 26,
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' }, // PO
      1: { cellWidth: 18 }, // Tanggal
      2: { cellWidth: 25 }, // Nama
      3: { cellWidth: 24 }, // HP
      4: { cellWidth: 35 }, // Alamat
      5: { cellWidth: 42 }, // Produk
      6: { cellWidth: 24, halign: 'right' }, // Total
      7: { cellWidth: 20 }, // Bayar
      8: { cellWidth: 18 }, // Ekspedisi
      9: { cellWidth: 22 }, // Resi
      10: { cellWidth: 18 }, // Status Kirim
    },
  });

  doc.save(fileName);
};

export const exportExpensesToExcel = (expenses: OperationalExpense[], fileName = 'Rekap_Biaya_Operasional.xlsx') => {
  if (!expenses || expenses.length === 0) {
    alert('Tidak ada data biaya operasional untuk diekspor ke Excel!');
    return;
  }

  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const data: Record<string, any>[] = expenses.map((e) => ({
    'ID Biaya': e.id,
    'Tanggal': e.date,
    'Keperluan / Judul': e.title,
    'Kategori': e.category,
    'Nominal Biaya (Rp)': Number(e.amount) || 0,
    'Metode Pembayaran': e.paymentMethod || 'Tunai (Cash)',
    'Penerima / Toko / Vendor': e.recipientOrVendor || '-',
    'Catatan / No. Nota': e.notes || '-',
    'Dibuat Oleh': e.createdBy || 'Admin',
  }));

  // Append Total summary row
  data.push({
    'ID Biaya': 'TOTAL',
    'Tanggal': '-',
    'Keperluan / Judul': `TOTAL PENGELUARAN (${expenses.length} Transaksi)`,
    'Kategori': '-',
    'Nominal Biaya (Rp)': totalAmount,
    'Metode Pembayaran': '-',
    'Penerima / Toko / Vendor': '-',
    'Catatan / No. Nota': '-',
    'Dibuat Oleh': '-',
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  worksheet['!cols'] = [
    { wch: 15 }, // ID
    { wch: 14 }, // Tanggal
    { wch: 35 }, // Keperluan
    { wch: 22 }, // Kategori
    { wch: 20 }, // Nominal
    { wch: 20 }, // Metode Bayar
    { wch: 25 }, // Penerima
    { wch: 30 }, // Catatan
    { wch: 18 }, // Dibuat
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Biaya Operasional');
  XLSX.writeFile(workbook, fileName);
};

export const exportExpensesToPDF = (expenses: OperationalExpense[], fileName = 'Rekap_Biaya_Operasional.pdf') => {
  if (!expenses || expenses.length === 0) {
    alert('Tidak ada data biaya operasional untuk diekspor ke PDF!');
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Title & Header
  doc.setFontSize(16);
  doc.setTextColor(225, 29, 72); // Rose accent color
  doc.text('LAPORAN BIAYA OPERASIONAL TOKO', 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Tanggal Cetak: ${new Date().toLocaleString('id-ID')} WIB  |  Total Transaksi: ${expenses.length} Catatan  |  Total Pengeluaran: Rp ${totalAmount.toLocaleString('id-ID')}`,
    14,
    22
  );

  const tableColumn = [
    'Tanggal',
    'Kategori',
    'Keperluan / Judul Pengeluaran',
    'Metode Bayar',
    'Penerima / Toko',
    'Catatan / No. Nota',
    'Jumlah (Rp)',
  ];

  const tableRows = expenses.map((e) => [
    e.date,
    e.category,
    e.title,
    e.paymentMethod || 'Tunai',
    e.recipientOrVendor || '-',
    e.notes || '-',
    `Rp ${(Number(e.amount) || 0).toLocaleString('id-ID')}`,
  ]);

  // Add Summary Total Row
  tableRows.push([
    'TOTAL',
    'AKUMULASI',
    `TOTAL PENGELUARAN (${expenses.length} Catatan)`,
    '-',
    '-',
    '-',
    `Rp ${totalAmount.toLocaleString('id-ID')}`,
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [253, 242, 244] },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: 'bold' }, // Tanggal
      1: { cellWidth: 35 }, // Kategori
      2: { cellWidth: 65 }, // Keperluan
      3: { cellWidth: 28 }, // Metode
      4: { cellWidth: 35 }, // Toko
      5: { cellWidth: 45 }, // Catatan
      6: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }, // Jumlah
    },
  });

  doc.save(fileName);
};

export const exportCombinedReportToExcel = (
  orders: SimplePOOrder[],
  expenses: OperationalExpense[],
  fileName = 'Laporan_Keuangan_Laba_Rugi_Gabungan.xlsx'
) => {
  const workbook = XLSX.utils.book_new();

  // 1. Ringkasan Laba Rugi (Summary Sheet)
  const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
  const totalOmzetLunas = paidOrders.reduce((sum, o) => {
    const total = o.totalPrice ?? o.items.reduce((acc, it) => acc + (it.subtotal || (100 * it.quantity)), 0);
    return sum + total;
  }, 0);

  const totalOmzetPending = orders
    .filter((o) => o.paymentStatus !== 'PAID')
    .reduce((sum, o) => {
      const total = o.totalPrice ?? o.items.reduce((acc, it) => acc + (it.subtotal || (100 * it.quantity)), 0);
      return sum + total;
    }, 0);

  const totalBiayaOperasional = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const labaBersihKas = totalOmzetLunas - totalBiayaOperasional;

  const summaryData = [
    { 'RINGKASAN KEUTAMAAN': 'Total Pesanan Masuk (PO)', 'NILAI / KETERANGAN': `${orders.length} Transaksi` },
    { 'RINGKASAN KEUTAMAAN': 'Jumlah Pesanan Status LUNAS', 'NILAI / KETERANGAN': `${paidOrders.length} Transaksi` },
    { 'RINGKASAN KEUTAMAAN': 'Jumlah Pesanan Menunggu Pembayaran', 'NILAI / KETERANGAN': `${orders.length - paidOrders.length} Transaksi` },
    { 'RINGKASAN KEUTAMAAN': '----------------------------------', 'NILAI / KETERANGAN': '----------------------------------' },
    { 'RINGKASAN KEUTAMAAN': 'TOTAL OMZET PENJUALAN LUNAS (A)', 'NILAI / KETERANGAN': totalOmzetLunas },
    { 'RINGKASAN KEUTAMAAN': 'TOTAL PENDAPATAN PENDING', 'NILAI / KETERANGAN': totalOmzetPending },
    { 'RINGKASAN KEUTAMAAN': 'TOTAL BIAYA OPERASIONAL (B)', 'NILAI / KETERANGAN': totalBiayaOperasional },
    { 'RINGKASAN KEUTAMAAN': '----------------------------------', 'NILAI / KETERANGAN': '----------------------------------' },
    { 'RINGKASAN KEUTAMAAN': 'ESTIMASI LABA BERSIH KAS (A - B)', 'NILAI / KETERANGAN': labaBersihKas },
    { 'RINGKASAN KEUTAMAAN': 'STATUS ARUS KAS', 'NILAI / KETERANGAN': labaBersihKas >= 0 ? 'SURPLUS (UNTUNG)' : 'DEFISIT (RUGI)' },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 40 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Laba Rugi');

  // 2. Sheet Pesanan (Pendapatan)
  if (orders.length > 0) {
    const ordersData = orders.map((o) => ({
      'No. PO': o.poNumber,
      'Tanggal': new Date(o.createdAt).toLocaleString('id-ID'),
      'Nama Pemesan': o.customerName,
      'No. HP': o.customerPhone,
      'Alamat': o.customerAddress,
      'Detail Produk': o.items.map((i) => `${i.name} (${i.quantity}x)`).join(', '),
      'Total (Rp)': o.totalPrice ?? o.items.reduce((acc, it) => acc + (it.subtotal || (100 * it.quantity)), 0),
      'Status Bayar': o.paymentStatus === 'PAID' ? 'LUNAS' : 'Belum Bayar',
      'Ekspedisi': o.courier || 'J&T Express',
      'No. Resi': o.trackingNumber || '-',
    }));
    const ordersSheet = XLSX.utils.json_to_sheet(ordersData);
    ordersSheet['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Data Pendapatan (PO)');
  }

  // 3. Sheet Biaya Operasional (Pengeluaran)
  if (expenses.length > 0) {
    const expensesData = expenses.map((e) => ({
      'Tanggal': e.date,
      'Keperluan': e.title,
      'Kategori': e.category,
      'Jumlah (Rp)': Number(e.amount) || 0,
      'Metode Bayar': e.paymentMethod || 'Tunai',
      'Penerima / Toko': e.recipientOrVendor || '-',
      'Catatan': e.notes || '-',
    }));
    const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
    expensesSheet['!cols'] = [{ wch: 14 }, { wch: 35 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Data Biaya Operasional');
  }

  XLSX.writeFile(workbook, fileName);
};

export const exportCombinedReportToPDF = (
  orders: SimplePOOrder[],
  expenses: OperationalExpense[],
  fileName = 'Laporan_Keuangan_Laba_Rugi_Gabungan.pdf'
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
  const totalOmzetLunas = paidOrders.reduce((sum, o) => {
    const total = o.totalPrice ?? o.items.reduce((acc, it) => acc + (it.subtotal || (100 * it.quantity)), 0);
    return sum + total;
  }, 0);

  const totalBiayaOperasional = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const labaBersihKas = totalOmzetLunas - totalBiayaOperasional;

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229); // Indigo Accent Color
  doc.text('LAPORAN KEUANGAN GABUNGAN & LABA RUGI TOKO', 14, 15);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Tanggal Cetak: ${new Date().toLocaleString('id-ID')} WIB  |  Total PO: ${orders.length}  |  Total Biaya Ops: ${expenses.length} Catatan`,
    14,
    22
  );

  // Summary Table Header
  autoTable(doc, {
    head: [['METRIK KEUANGAN', 'NILAI / JUMLAH (RP)']],
    body: [
      ['Total Omzet Penjualan (Pesanan Status LUNAS)', `Rp ${totalOmzetLunas.toLocaleString('id-ID')}`],
      ['Total Pengeluaran Biaya Operasional Toko', `Rp ${totalBiayaOperasional.toLocaleString('id-ID')}`],
      [
        'ESTIMASI LABA BERSIH / ARUS KAS KONTAN',
        `Rp ${labaBersihKas.toLocaleString('id-ID')} (${labaBersihKas >= 0 ? 'SURPLUS' : 'DEFISIT'})`,
      ],
    ],
    startY: 26,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    bodyStyles: { fontSize: 9.5, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 120, halign: 'right' },
    },
  });

  // Table 1: Pesanan Lunas (Pendapatan)
  const lastY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text('1. RINCIAN PENDAPATAN (PESANAN PO LUNAS)', 14, lastY);

  const orderRows = paidOrders.map((o) => {
    const total = o.totalPrice ?? o.items.reduce((acc, it) => acc + (it.subtotal || (100 * it.quantity)), 0);
    const dateStr = new Date(o.createdAt).toLocaleDateString('id-ID');
    const itemsStr = o.items.map((i) => `${i.name} (${i.quantity}x)`).join(', ');
    return [o.poNumber, dateStr, o.customerName, itemsStr, `Rp ${total.toLocaleString('id-ID')}`];
  });

  orderRows.push(['TOTAL', '-', 'TOTAL PENDAPATAN LUNAS', '-', `Rp ${totalOmzetLunas.toLocaleString('id-ID')}`]);

  autoTable(doc, {
    head: [['No. PO', 'Tanggal', 'Nama Pemesan', 'Rincian Produk', 'Jumlah (Rp)']],
    body: orderRows,
    startY: lastY + 3,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 25 },
      2: { cellWidth: 45 },
      3: { cellWidth: 120 },
      4: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
    },
  });

  // Table 2: Biaya Operasional (Pengeluaran)
  const lastY2 = (doc as any).lastAutoTable.finalY + 8;

  doc.setFontSize(11);
  doc.setTextColor(225, 29, 72); // Rose
  doc.text('2. RINCIAN PENGELUARAN (BIAYA OPERASIONAL)', 14, lastY2);

  const expenseRows = expenses.map((e) => [
    e.date,
    e.category,
    e.title,
    e.paymentMethod || 'Tunai',
    `Rp ${(Number(e.amount) || 0).toLocaleString('id-ID')}`,
  ]);

  expenseRows.push(['TOTAL', 'AKUMULASI', 'TOTAL BIAYA OPERASIONAL', '-', `Rp ${totalBiayaOperasional.toLocaleString('id-ID')}`]);

  autoTable(doc, {
    head: [['Tanggal', 'Kategori', 'Keperluan / Judul', 'Metode Bayar', 'Jumlah (Rp)']],
    body: expenseRows,
    startY: lastY2 + 3,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 45 },
      2: { cellWidth: 120 },
      3: { cellWidth: 32 },
      4: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(fileName);
};
