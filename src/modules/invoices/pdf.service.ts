import puppeteer from 'puppeteer';
import Decimal from 'decimal.js';
import { amountInWords } from './gst';
import { env } from '../../config/env';

interface InvoiceItemData {
  product: { name: string; hsnCode: string };
  quantity: number;
  unitOfMeasure?: string | null;
  batchNo?: string | null;
  mfgDate?: string | null;
  expDate?: string | null;
  unitPrice: Decimal | string | number;
  gstRate: Decimal | string | number;
  cgstAmount: Decimal | string | number;
  sgstAmount: Decimal | string | number;
  igstAmount: Decimal | string | number;
  lineTotal: Decimal | string | number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: Date;
  customer: {
    name: string;
    mobile: string;
    email?: string | null;
    address?: string | null;
    gstin?: string | null;
  };
  items: InvoiceItemData[];
  subtotal: Decimal | string | number;
  totalCgst: Decimal | string | number;
  totalSgst: Decimal | string | number;
  totalIgst: Decimal | string | number;
  totalAmount: Decimal | string | number;
  notes?: string | null;
}

// ─── helpers ────────────────────────────────────────────────────────────────
const n = (v: Decimal | string | number) =>
  parseFloat(new Decimal(v.toString()).toFixed(2))
    .toLocaleString('en-IN', { minimumFractionDigits: 2 });

const formatDate = (date: Date) => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Map GST state codes → state names
const STATE: Record<string, string> = {
  '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
  '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
  '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
  '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
  '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat',
  '26':'Dadra & Nagar Haveli','27':'Maharashtra','28':'Andhra Pradesh','29':'Karnataka',
  '30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry',
  '36':'Telangana','37':'Andhra Pradesh',
};
const stateName = (code: string) => STATE[code] ?? code;

// ─── HTML template ───────────────────────────────────────────────────────────
const buildHtml = (inv: InvoiceData): string => {
  const interState = Number(inv.totalIgst) > 0;
  const totalDec   = new Decimal(inv.totalAmount.toString());
  const taxTotal   = totalDec.minus(new Decimal(inv.subtotal.toString()));

  // Determine columns: inter-state → 9 cols, intra → 10 cols
  // SrNo | Product Name | HSN/SAC | Nos | Qty | Per | Rate | [IGST% | IGST Amt] OR [CGST% | CGST Amt | SGST% | SGST Amt] | Amount
  // We'll use a simplified set: SrNo | Product | HSN | Nos | Rate | GST% | GST Amt | Amount  (8 cols)
  // keeping it clean and aligned

  const itemRows = inv.items.map((item, i) => {
    const rate    = parseFloat(item.unitPrice.toString());
    const gstPct  = parseFloat(item.gstRate.toString());
    const qty     = item.quantity;
    const unit    = item.unitOfMeasure ?? 'Pcs';
    const taxable = rate * qty;

    const gstAmt = interState
      ? parseFloat(item.igstAmount.toString())
      : parseFloat(item.cgstAmount.toString()) + parseFloat(item.sgstAmount.toString());

    const batchBlock = [
      item.batchNo  ? `<span class="meta">Batch :- ${item.batchNo}</span>` : '',
      item.mfgDate  ? `<span class="meta">Mfg Dt :- ${item.mfgDate}</span>` : '',
      item.expDate  ? `<span class="meta">Exp Dt :- ${item.expDate}</span>` : '',
    ].filter(Boolean).join('');

    return `
      <tr>
        <td class="c">${i + 1}</td>
        <td class="l product-cell">
          <div class="prod-name">${item.product.name}</div>
          ${batchBlock ? `<div class="batch-block">${batchBlock}</div>` : ''}
        </td>
        <td class="c">${item.product.hsnCode}</td>
        <td class="c">${qty}</td>
        <td class="c">${unit}</td>
        <td class="r">${n(rate)}</td>
        <td class="c">${gstPct.toFixed(2)}%</td>
        <td class="r">${n(gstAmt)}</td>
        <td class="r bold">${n(item.lineTotal)}</td>
      </tr>`;
  }).join('');

  // Filler rows to keep table tidy on short invoices
  const fillerCount = Math.max(0, 5 - inv.items.length);
  const fillerRows = Array(fillerCount).fill(
    `<tr class="filler"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`
  ).join('');

  // Terms as numbered list items
  const termsItems = env.invoiceTerms
    .split(/\\n|\n/)           // handle both literal \n (from .env) and real newlines
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .map(t => `<li>${t.replace(/^\d+\.\s*/, '')}</li>`)
    .join('');

  // Customer state from GSTIN
  const custStateCode = inv.customer.gstin ? inv.customer.gstin.slice(0, 2) : '';
  const custStateName = custStateCode ? `${custStateCode} - ${stateName(custStateCode)}` : '';

  const taxLabel     = interState ? 'IGST' : 'CGST + SGST';
  const taxAmtTotal  = taxTotal.toNumber();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 210mm; }
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10.5pt;
  color: #111;
  background: #fff;
  padding: 0;
}

/* ── Outer wrapper with thick border ── */
.page {
  width: 100%;
  min-height: 277mm;
  border: 2.5px solid #1a5e20;
  display: flex;
  flex-direction: column;
}

/* ── Letterhead ── */
.letterhead {
  background: linear-gradient(135deg, #1a5e20 0%, #2e7d32 60%, #388e3c 100%);
  color: #fff;
  text-align: center;
  padding: 10px 14px 8px;
}
.co-name {
  font-size: 20pt;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.4);
}
.co-tagline {
  font-size: 8pt;
  letter-spacing: 3px;
  margin-top: 1px;
  opacity: 0.85;
  text-transform: uppercase;
}
.co-addr {
  font-size: 8.5pt;
  margin-top: 5px;
  line-height: 1.55;
  opacity: 0.95;
}

/* ── License strip ── */
.license-strip {
  background: #f9f5e7;
  border-top: 1px solid #c8a400;
  border-bottom: 1px solid #c8a400;
  text-align: center;
  font-size: 8.5pt;
  font-weight: bold;
  color: #5a4000;
  padding: 3px;
  letter-spacing: 0.5px;
}

/* ── Invoice type banner ── */
.type-banner {
  display: flex;
  align-items: stretch;
  border-bottom: 1.5px solid #1a5e20;
}
.banner-left, .banner-right {
  flex: 1;
  padding: 5px 10px;
  font-size: 9.5pt;
  font-weight: bold;
  color: #333;
}
.banner-center {
  flex: 2;
  text-align: center;
  font-size: 13pt;
  font-weight: 900;
  color: #1a5e20;
  padding: 5px 10px;
  letter-spacing: 2px;
  border-left: 1px solid #1a5e20;
  border-right: 1px solid #1a5e20;
}
.banner-right { text-align: right; }

/* ── Two-column party grid ── */
.party-grid {
  display: flex;
  border-bottom: 1px solid #1a5e20;
}
.party-col {
  flex: 1;
  padding: 7px 10px;
  font-size: 9.5pt;
  line-height: 1.65;
}
.party-col + .party-col { border-left: 1px solid #1a5e20; }
.party-label {
  font-size: 8pt;
  font-weight: bold;
  color: #1a5e20;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  border-bottom: 1px dashed #aaa;
  padding-bottom: 3px;
  margin-bottom: 5px;
}
.party-name { font-size: 11pt; font-weight: bold; }
.party-gstin { font-family: 'Courier New', monospace; font-size: 9pt; }
.inv-row { display: flex; gap: 6px; }
.inv-key { font-weight: bold; min-width: 72px; color: #333; }
.inv-val { color: #111; }

/* ── Divider between bill-to and ship-to ── */
.section-divider {
  border-top: 1px solid #1a5e20;
}

/* ── Product table ── */
.tbl-wrap {
  border-top: 1.5px solid #1a5e20;
  border-bottom: 1.5px solid #1a5e20;
}
table.items {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
  table-layout: fixed;
}
table.items col.c-sr    { width: 4%; }
table.items col.c-prod  { width: 32%; }
table.items col.c-hsn   { width: 9%; }
table.items col.c-nos   { width: 5%; }
table.items col.c-per   { width: 6%; }
table.items col.c-rate  { width: 9%; }
table.items col.c-gstp  { width: 6%; }
table.items col.c-gsta  { width: 9%; }
table.items col.c-amt   { width: 10%; }

table.items th {
  background: #1a5e20;
  color: #fff;
  padding: 5px 4px;
  text-align: center;
  font-size: 8.5pt;
  font-weight: bold;
  border-right: 1px solid #2e7d32;
  white-space: nowrap;
}
table.items th:last-child { border-right: none; }

table.items td {
  padding: 4px 5px;
  border-right: 1px solid #ccc;
  border-bottom: 1px solid #e0e0e0;
  vertical-align: top;
  font-size: 9.5pt;
}
table.items td:last-child { border-right: none; }
table.items tr:nth-child(even) td { background: #f7faf7; }
table.items tr.filler td { height: 18px; border-bottom: 1px solid #eee; }

table.items .c { text-align: center; }
table.items .r { text-align: right; }
table.items .l { text-align: left; }
table.items .bold { font-weight: bold; }

.prod-name { font-weight: 600; line-height: 1.4; }
.batch-block { margin-top: 4px; display: flex; flex-direction: column; gap: 1px; }
.meta {
  font-size: 8pt;
  color: #444;
  display: block;
  font-style: italic;
}

/* ── Table footer (subtotal rows) ── */
table.items tfoot td {
  border-bottom: 1px solid #ccc;
  border-right: 1px solid #ccc;
  background: #f9faf9;
  font-size: 9.5pt;
}
table.items tfoot tr.grand td {
  background: #1a5e20;
  color: #fff;
  font-size: 10.5pt;
  font-weight: bold;
  border-color: #1a5e20;
}

/* ── Amount in words ── */
.words-bar {
  border-bottom: 1px solid #1a5e20;
  padding: 5px 10px;
  font-size: 9pt;
  font-style: italic;
  background: #f5faf5;
}

/* ── Bottom split: bank | totals ── */
.bottom-split {
  display: flex;
  border-bottom: 1px solid #1a5e20;
  font-size: 9.5pt;
}
.bank-col {
  flex: 1.2;
  padding: 7px 10px;
  line-height: 1.7;
  border-right: 1px solid #1a5e20;
}
.bank-col .bank-title {
  font-weight: bold;
  font-size: 8pt;
  color: #1a5e20;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.bank-row { display: flex; gap: 6px; }
.bank-key { font-weight: bold; min-width: 110px; }
.totals-col {
  flex: 1;
  padding: 7px 10px;
}
.tot-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 9.5pt; }
.tot-row.subtotal { border-top: 1px dashed #aaa; margin-top: 4px; padding-top: 4px; }
.tot-row.grand {
  font-size: 11pt;
  font-weight: bold;
  color: #1a5e20;
  border-top: 2px solid #1a5e20;
  margin-top: 6px;
  padding-top: 6px;
}

/* ── Sig + notes row ── */
.sig-notes {
  display: flex;
  border-bottom: 1px solid #1a5e20;
  min-height: 62px;
  font-size: 9.5pt;
}
.notes-col {
  flex: 2;
  padding: 7px 10px;
  border-right: 1px solid #1a5e20;
}
.sig-col {
  flex: 1;
  padding: 7px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}
.sig-line {
  border-top: 1.5px solid #333;
  padding-top: 4px;
  font-weight: bold;
  font-size: 9pt;
  width: 100%;
  text-align: center;
}
.for-company { font-size: 8.5pt; color: #555; margin-bottom: 20px; }

/* ── Terms ── */
.terms-bar {
  padding: 6px 10px 8px;
  font-size: 8.5pt;
  line-height: 1.7;
  background: #fafafa;
}
.terms-title { font-weight: bold; color: #1a5e20; margin-bottom: 4px; font-size: 9pt; }
.terms-bar ol { padding-left: 18px; }
.terms-bar ol li { margin-bottom: 1px; }
</style>
</head>
<body>
<div class="page">

  <!-- ══ LETTERHEAD ══ -->
  <div class="letterhead">
    <div class="co-name">${env.businessName}</div>
    ${env.businessLicense ? '' : '<div class="co-tagline">Manufacturers &amp; Distributors of Agricultural Products</div>'}
    <div class="co-addr">
      ${env.businessAddress}
      ${env.businessPhone ? `&nbsp;&nbsp;&#9679;&nbsp;&nbsp; Ph: ${env.businessPhone}` : ''}
      ${env.businessEmail ? `&nbsp;&nbsp;&#9679;&nbsp;&nbsp; ${env.businessEmail}` : ''}
    </div>
  </div>

  <!-- ══ LICENSE STRIP ══ -->
  ${env.businessLicense ? `<div class="license-strip">${env.businessLicense}</div>` : ''}

  <!-- ══ TYPE BANNER ══ -->
  <div class="type-banner">
    <div class="banner-left">Debit Memo</div>
    <div class="banner-center">TAX INVOICE</div>
    <div class="banner-right">Original</div>
  </div>

  <!-- ══ BILL TO PARTY ══ -->
  <div class="party-grid">
    <div class="party-col">
      <div class="party-label">Bill To Party</div>
      <div class="party-name">M/s. : ${inv.customer.name}</div>
      ${inv.customer.address ? `<div style="margin-top:3px">${inv.customer.address}</div>` : ''}
      ${inv.customer.mobile ? `<div>MO: ${inv.customer.mobile}</div>` : ''}
      ${inv.customer.email  ? `<div>${inv.customer.email}</div>` : ''}
      ${custStateName ? `<div><strong>Place of Supply :</strong> ${custStateName}</div>` : ''}
      ${inv.customer.gstin  ? `<div class="party-gstin"><strong>GSTIN No. :</strong> ${inv.customer.gstin}</div>` : ''}
    </div>
    <div class="party-col">
      <div class="party-label">Invoice Details</div>
      <div class="inv-row"><span class="inv-key">Invoice No.</span><span class="inv-val">: <strong>${inv.invoiceNumber}</strong></span></div>
      <div class="inv-row"><span class="inv-key">Date</span><span class="inv-val">: <strong>${formatDate(inv.invoiceDate)}</strong></span></div>
      <div style="margin-top:6px">
        <div class="inv-row"><span class="inv-key">Ack No</span><span class="inv-val">:</span></div>
        <div class="inv-row"><span class="inv-key">Ack Dt</span><span class="inv-val">:</span></div>
        <div class="inv-row"><span class="inv-key">IRN No</span><span class="inv-val">:</span></div>
      </div>
    </div>
  </div>

  <!-- ══ SHIP TO PARTY ══ -->
  <div class="party-grid section-divider">
    <div class="party-col">
      <div class="party-label">Ship To Party</div>
      <div class="party-name">M/s. : ${inv.customer.name}</div>
      ${inv.customer.address ? `<div style="margin-top:3px">${inv.customer.address}</div>` : ''}
      ${inv.customer.mobile ? `<div>MO: ${inv.customer.mobile}</div>` : ''}
      ${custStateName ? `<div><strong>Place of Supply :</strong> ${custStateName}</div>` : ''}
      ${inv.customer.gstin  ? `<div class="party-gstin"><strong>GSTIN No. :</strong> ${inv.customer.gstin}</div>` : ''}
    </div>
    <div class="party-col">
      <div class="party-label">Supplier Details</div>
      ${env.businessGstin ? `<div class="party-gstin"><strong>GSTIN No. :</strong> ${env.businessGstin}</div>` : ''}
      <div><strong>State :</strong> ${env.businessState} - ${stateName(env.businessState.length === 2 && /^\d{2}$/.test(env.businessState) ? env.businessState : '27')}</div>
    </div>
  </div>

  <!-- ══ PRODUCT TABLE ══ -->
  <div class="tbl-wrap">
    <table class="items">
      <colgroup>
        <col class="c-sr"/>
        <col class="c-prod"/>
        <col class="c-hsn"/>
        <col class="c-nos"/>
        <col class="c-per"/>
        <col class="c-rate"/>
        <col class="c-gstp"/>
        <col class="c-gsta"/>
        <col class="c-amt"/>
      </colgroup>
      <thead>
        <tr>
          <th>Sr<br/>No</th>
          <th style="text-align:left">Product Name</th>
          <th>HSN/<br/>SAC</th>
          <th>Nos</th>
          <th>Per</th>
          <th>Rate<br/>(₹)</th>
          <th>${interState ? 'IGST' : 'GST'}<br/>%</th>
          <th>${interState ? 'IGST' : 'GST'}<br/>Amt (₹)</th>
          <th>Amount<br/>(₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${fillerRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="8" class="r" style="font-weight:bold; border-right:none">Sub Total</td>
          <td class="r bold">₹${n(inv.subtotal)}</td>
        </tr>
        <tr>
          <td colspan="8" class="r" style="border-right:none">${taxLabel} @ ${inv.items[0] ? parseFloat(inv.items[0].gstRate.toString()).toFixed(2) : '0'}%</td>
          <td class="r bold">₹${n(taxAmtTotal)}</td>
        </tr>
        <tr class="grand">
          <td colspan="8" class="r" style="border-right:none; letter-spacing:1px">GRAND TOTAL</td>
          <td class="r">₹${n(inv.totalAmount)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- ══ AMOUNT IN WORDS ══ -->
  <div class="words-bar">
    <strong>Bill Amount (in words) :</strong>&nbsp; ${amountInWords(totalDec)}
  </div>

  <!-- ══ BANK DETAILS + TOTALS ══ -->
  <div class="bottom-split">
    <div class="bank-col">
      ${env.businessGstin ? `<div><strong>GSTIN No. :</strong>&nbsp;<span style="font-family:monospace">${env.businessGstin}</span></div>` : ''}
      ${env.bankName || env.bankAccount || env.bankIfsc ? `
      <div class="bank-title" style="margin-top:5px">Bank Details</div>
      ${env.bankName    ? `<div class="bank-row"><span class="bank-key">Bank Name</span><span>: ${env.bankName}</span></div>` : ''}
      ${env.bankAccount ? `<div class="bank-row"><span class="bank-key">A/c. No.</span><span>: ${env.bankAccount}</span></div>` : ''}
      ${env.bankIfsc    ? `<div class="bank-row"><span class="bank-key">RTGS / IFSC</span><span>: ${env.bankIfsc}</span></div>` : ''}
      ` : ''}
    </div>
    <div class="totals-col">
      <div class="tot-row"><span>Sub Total</span><span>₹${n(inv.subtotal)}</span></div>
      <div class="tot-row"><span>Total ${taxLabel}</span><span>₹${n(taxAmtTotal)}</span></div>
      <div class="tot-row grand"><span>Bill Amount</span><span>₹${n(inv.totalAmount)}</span></div>
    </div>
  </div>

  <!-- ══ NOTES + SIGNATURE ══ -->
  <div class="sig-notes">
    <div class="notes-col">
      <strong>Note :</strong>
      ${inv.notes ? `<div style="margin-top:4px">${inv.notes}</div>` : ''}
    </div>
    <div class="sig-col">
      <div class="for-company">For <strong>${env.businessName}</strong></div>
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>

  <!-- ══ TERMS & CONDITIONS ══ -->
  <div class="terms-bar">
    <div class="terms-title">Terms &amp; Conditions :</div>
    <ol>${termsItems}</ol>
  </div>

</div>
</body>
</html>`;
};

// ─── export ──────────────────────────────────────────────────────────────────
export const generateInvoicePdf = async (inv: InvoiceData): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(buildHtml(inv), { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};
