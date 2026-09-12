import Decimal from 'decimal.js';
import { env } from '../../config/env';

export const isInterState = (customerGstin?: string | null): boolean => {
  if (!customerGstin) return false; // unregistered → intra-state by default
  const customerStateCode = customerGstin.slice(0, 2);
  return customerStateCode !== env.businessState;
};

interface LineItem {
  unitPrice: number;
  quantity: number;
  gstRate: number;
}

export interface CalculatedItem {
  unitPrice: Decimal;
  quantity: number;
  gstRate: Decimal;
  taxableValue: Decimal;
  cgstAmount: Decimal;
  sgstAmount: Decimal;
  igstAmount: Decimal;
  lineTotal: Decimal;
}

export const calculateLineItem = (item: LineItem, interState: boolean): CalculatedItem => {
  const unitPrice = new Decimal(item.unitPrice);
  const qty = item.quantity;
  const gstRate = new Decimal(item.gstRate);
  const taxableValue = unitPrice.times(qty);

  let cgstAmount = new Decimal(0);
  let sgstAmount = new Decimal(0);
  let igstAmount = new Decimal(0);

  if (interState) {
    igstAmount = taxableValue.times(gstRate).dividedBy(100).toDecimalPlaces(2);
  } else {
    const halfRate = gstRate.dividedBy(2);
    cgstAmount = taxableValue.times(halfRate).dividedBy(100).toDecimalPlaces(2);
    sgstAmount = taxableValue.times(halfRate).dividedBy(100).toDecimalPlaces(2);
  }

  const lineTotal = taxableValue.plus(cgstAmount).plus(sgstAmount).plus(igstAmount);

  return { unitPrice, quantity: qty, gstRate, taxableValue, cgstAmount, sgstAmount, igstAmount, lineTotal };
};

export const amountInWords = (amount: Decimal): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const toWords = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return (ones[n] ?? '') + ' ';
    if (n < 100) return (tens[Math.floor(n / 10)] ?? '') + ' ' + toWords(n % 10);
    if (n < 1000) return (ones[Math.floor(n / 100)] ?? '') + ' Hundred ' + toWords(n % 100);
    if (n < 100000) return toWords(Math.floor(n / 1000)) + 'Thousand ' + toWords(n % 1000);
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + 'Lakh ' + toWords(n % 100000);
    return toWords(Math.floor(n / 10000000)) + 'Crore ' + toWords(n % 10000000);
  };

  const rupees = Math.floor(amount.toNumber());
  const paise = Math.round(amount.minus(rupees).times(100).toNumber());

  let result = 'INR ' + toWords(rupees).trim() + ' Rupees';
  if (paise > 0) result += ' and ' + toWords(paise).trim() + ' Paise';
  result += ' Only';
  return result;
};
