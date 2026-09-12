import { prisma } from '../../lib/prisma';
import { AppError } from '../../types';

export const getGstReport = async (from: Date, to: Date) => {
  if (from > to) throw new AppError(400, 'From date must be before to date');

  const invoices = await prisma.invoice.findMany({
    where: {
      invoiceDate: { gte: from, lte: to },
    },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
    orderBy: { invoiceDate: 'asc' },
  });

  const rows = invoices.map((inv) => ({
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    customerName: inv.customer.name,
    customerGstin: inv.customer.gstin ?? '',
    taxableValue: inv.subtotal,
    cgst: inv.totalCgst,
    sgst: inv.totalSgst,
    igst: inv.totalIgst,
    totalTax: Number(inv.totalCgst) + Number(inv.totalSgst) + Number(inv.totalIgst),
    totalInvoiceValue: inv.totalAmount,
    paymentStatus: inv.paymentStatus,
  }));

  const summary = {
    totalInvoices: rows.length,
    totalTaxableValue: rows.reduce((sum, r) => sum + Number(r.taxableValue), 0).toFixed(2),
    totalCgst: rows.reduce((sum, r) => sum + Number(r.cgst), 0).toFixed(2),
    totalSgst: rows.reduce((sum, r) => sum + Number(r.sgst), 0).toFixed(2),
    totalIgst: rows.reduce((sum, r) => sum + Number(r.igst), 0).toFixed(2),
    totalTax: rows.reduce((sum, r) => sum + r.totalTax, 0).toFixed(2),
    totalValue: rows.reduce((sum, r) => sum + Number(r.totalInvoiceValue), 0).toFixed(2),
  };

  return { rows, summary };
};

// Build CSV string for export
export const exportGstReportCsv = async (from: Date, to: Date): Promise<string> => {
  const { rows } = await getGstReport(from, to);

  const header = [
    'Invoice No',
    'Invoice Date',
    'Customer Name',
    'Customer GSTIN',
    'Taxable Value (₹)',
    'CGST (₹)',
    'SGST (₹)',
    'IGST (₹)',
    'Total Tax (₹)',
    'Invoice Total (₹)',
    'Payment Status',
  ].join(',');

  const dataRows = rows.map((r) =>
    [
      r.invoiceNumber,
      new Date(r.invoiceDate).toLocaleDateString('en-IN'),
      `"${r.customerName}"`,
      r.customerGstin,
      Number(r.taxableValue).toFixed(2),
      Number(r.cgst).toFixed(2),
      Number(r.sgst).toFixed(2),
      Number(r.igst).toFixed(2),
      r.totalTax.toFixed(2),
      Number(r.totalInvoiceValue).toFixed(2),
      r.paymentStatus,
    ].join(',')
  );

  return [header, ...dataRows].join('\n');
};
