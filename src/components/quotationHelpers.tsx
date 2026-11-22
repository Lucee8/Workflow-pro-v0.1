/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CRMCustomer, CRMPayment, CRMQuotation, Customer, Order, Payment } from '../types';
import { formatToDDMMYYYY, resolveQuotationCustomer } from '../utils';

export type QuotationStatusTab = 'all' | 'draft' | 'sent' | 'approved' | 'invoiced' | 'in_production';
export type QuotationDatePreset = 'all' | 'today' | '7days' | '30days' | 'this_month' | 'custom';
export type QuotationValidityFilter = 'all' | 'active' | 'expiring_soon' | 'expired' | 'draft_review';
export type QuotationAmountRange = 'all' | 'under_50k' | '50k_150k' | 'above_150k' | 'custom';
export type QuotationSortBy = 'newest' | 'oldest' | 'highest_value' | 'lowest_value' | 'expiring_soon';

export interface QuotationFilterState {
  statusTab: QuotationStatusTab;
  search: string;
  datePreset: QuotationDatePreset;
  customStartDate: string;
  customEndDate: string;
  validity: QuotationValidityFilter;
  amountRange: QuotationAmountRange;
  customMinAmount: string;
  customMaxAmount: string;
  advQuoteStatus: string;
  advInvoiceStatus: string;
  advProductionStatus: string;
  sortBy: QuotationSortBy;
}

export interface QuotationValidityInfo {
  state: 'draft_review' | 'expired' | 'expiring_soon' | 'valid' | 'no_date';
  daysRemaining: number | null;
  label: string;
}

export interface EnrichedQuotation {
  quote: CRMQuotation;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerSource: string;
  firstItemTitle: string;
  firstItemSpecs: string;
  itemsSummary: string;
  itemsCount: number;
  totalQty: number;
  images: string[];
  totalAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  storedBalanceAmount: number | null;
  linkedOrders: Order[];
  linkedOrderLabels: string[];
  isDraft: boolean;
  isSent: boolean;
  isApproved: boolean;
  isInvoiced: boolean;
  isInProduction: boolean;
  isRejected: boolean;
  validity: QuotationValidityInfo;
  createdMs: number;
  validUntilMs: number;
}

export function parseQuotationDateMs(dateStr?: string): number {
  if (!dateStr) return 0;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return 0;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0).getTime();
  }
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split(/[\/\-]/).map(Number);
    return new Date(y, m - 1, d, 12, 0, 0).getTime();
  }
  const parsed = new Date(trimmed).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export function formatShortDateLabel(dateStr?: string): string {
  const ms = parseQuotationDateMs(dateStr);
  if (!ms) return '—';
  const d = new Date(ms);
  if (isNaN(d.getTime())) return formatToDDMMYYYY(dateStr) || '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getQuotationValidityInfo(quote: CRMQuotation, nowDate: Date = new Date()): QuotationValidityInfo {
  const statusLower = String(quote.status || '').trim().toLowerCase();
  if (statusLower === 'draft') {
    const validMs = parseQuotationDateMs(quote.validUntil);
    if (!validMs) {
      return { state: 'draft_review', daysRemaining: null, label: 'Draft review' };
    }
    return { state: 'draft_review', daysRemaining: null, label: 'Draft review' };
  }

  const validMs = parseQuotationDateMs(quote.validUntil);
  if (!validMs) {
    return { state: 'no_date', daysRemaining: null, label: 'No expiry set' };
  }

  const todayMidnight = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
  const validDateObj = new Date(validMs);
  const validMidnight = new Date(validDateObj.getFullYear(), validDateObj.getMonth(), validDateObj.getDate()).getTime();
  const diffDays = Math.round((validMidnight - todayMidnight) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      state: 'expired',
      daysRemaining: diffDays,
      label: absDays === 1 ? 'Expired 1 day ago' : `Expired ${absDays} days ago`,
    };
  }
  if (diffDays === 0) {
    return { state: 'expiring_soon', daysRemaining: 0, label: 'Expires today' };
  }
  if (diffDays <= 7) {
    return {
      state: 'expiring_soon',
      daysRemaining: diffDays,
      label: diffDays === 1 ? 'Expiring in 1 day' : `Expiring in ${diffDays} days`,
    };
  }
  return {
    state: 'valid',
    daysRemaining: diffDays,
    label: `${diffDays} days left`,
  };
}

export function getLinkedOrdersForQuotation(quote: CRMQuotation, orders: Order[]): Order[] {
  if (!quote?.id || !Array.isArray(orders) || orders.length === 0) return [];
  const qId = quote.id.trim();
  const qIdUpper = qId.toUpperCase();
  const ordBase = qIdUpper.startsWith('QT') ? `ORD${qIdUpper.slice(2)}` : '';

  return orders.filter((o) => {
    if (!o || !o.id) return false;
    const oRef = (o.quotation_ref || '').trim();
    const oParent = (o.parent_order_id || '').trim();
    const oIdUpper = o.id.trim().toUpperCase();

    if (oRef === qId || oParent === qId) return true;
    if (ordBase && (oIdUpper === ordBase || oIdUpper.startsWith(`${ordBase}-`))) return true;
    if (o.special_notes) {
      const escaped = qId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tokenRegex = new RegExp(`(^|[^A-Za-z0-9-])${escaped}([^A-Za-z0-9-]|$)`, 'i');
      if (tokenRegex.test(o.special_notes)) return true;
    }
    return false;
  });
}

function readStoredNumericField(obj: unknown, keys: string[]): number | null {
  if (!obj || typeof obj !== 'object') return null;
  const record = obj as Record<string, unknown>;
  for (const key of keys) {
    const val = record[key];
    if (val === undefined || val === null || val === '') continue;
    const num = Number(val);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

export function enrichQuotationRecord(
  quote: CRMQuotation,
  crmCustomers: CRMCustomer[] = [],
  legacyCustomers: Customer[] = [],
  orders: Order[] = [],
  payments: Payment[] = [],
  crmPayments: CRMPayment[] = [],
  nowDate: Date = new Date()
): EnrichedQuotation {
  const custInfo = resolveQuotationCustomer(quote, crmCustomers, legacyCustomers);
  const crmMatch = crmCustomers.find(
    (c) => c && (c.id === (custInfo.id || quote.customer_id) || (c.name && c.name === custInfo.name))
  );

  const items = Array.isArray(quote.items) ? quote.items : [];
  const itemsCount = items.length;
  const firstItem = items[0];
  const firstItemTitle = firstItem?.furnitureItem?.trim() || 'Custom Woodwork Scope';
  const firstItemSpecsParts = [
    firstItem?.material?.trim(),
    firstItem?.dimensions?.trim(),
  ].filter(Boolean);
  const firstItemSpecs = firstItemSpecsParts.join(' · ') || 'Bespoke Specification';
  const itemsSummary = items.map((i) => i.furnitureItem).filter(Boolean).join(', ') || firstItemTitle;
  const totalQty = items.reduce((sum, i) => sum + Math.max(1, Number(i.quantity) || 1), 0) || 1;
  const images = items
    .flatMap((i) => (i.images || []).map((img: any) => (typeof img === 'string' ? img : img?.url)))
    .filter(Boolean) as string[];

  const linkedOrders = getLinkedOrdersForQuotation(quote, orders);
  const linkedOrderIdSet = new Set(linkedOrders.map((o) => o.id));
  const linkedOrderLabels = linkedOrders.map((o) => o.article_no || o.id).filter(Boolean);

  const totalAmount = Math.max(0, Number(quote.totalAmount) || 0);
  const quoteReceived = Math.max(
    0,
    Number(quote.received_amount) || Number((quote as any).receivedAmount) || 0
  );
  const linkedCrmPaySum = crmPayments
    .filter(
      (cp) =>
        cp &&
        (cp.id === `pay_${quote.id}` ||
          cp.order_id === quote.id ||
          (Boolean(cp.order_id) && linkedOrderIdSet.has(cp.order_id)))
    )
    .reduce((sum, cp) => sum + Math.max(0, Number(cp.advance_paid) || Number((cp as any).amount) || 0), 0);
  const linkedOrderPaymentsTotal = payments
    .filter(
      (p) =>
        p &&
        (p.order_id === quote.id || (Boolean(p.order_id) && linkedOrderIdSet.has(p.order_id)))
    )
    .reduce((sum, p) => sum + Math.max(0, Number(p.advance_paid) || Number((p as any).amount) || 0), 0);
  const receivedAmount = Math.max(
    quoteReceived,
    linkedCrmPaySum,
    linkedOrderPaymentsTotal
  );
  const balanceAmount = Math.max(0, totalAmount - receivedAmount);
  const quoteStoredBalance =
    readStoredNumericField(quote, [
      'balance_amount',
      'balanceAmount',
      'balance_due',
      'balanceDue',
      'pending_amount',
      'pendingAmount',
      'balance',
    ]) ??
    readStoredNumericField((quote as any)?.invoice, [
      'balance_amount',
      'balanceAmount',
      'balance_due',
      'balanceDue',
      'pending_amount',
      'pendingAmount',
      'balance',
    ]);
  const directCrmPayment = crmPayments.find(
    (cp) => cp && (cp.id === `pay_${quote.id}` || cp.order_id === quote.id)
  );
  const crmPayStoredBalance = readStoredNumericField(directCrmPayment, [
    'balance_amount',
    'balanceAmount',
    'balance_due',
    'balanceDue',
    'pending_amount',
    'pendingAmount',
  ]);
  const storedBalanceAmount =
    quoteStoredBalance !== null ? quoteStoredBalance : crmPayStoredBalance;

  const rawStatus = String(quote.status || '').trim();
  const isDraft = rawStatus === 'Draft';
  const isSent = rawStatus === 'Sent';
  const isApproved = rawStatus === 'Approved';
  const isRejected = rawStatus === 'Rejected';
  const isInvoiced =
    rawStatus === 'INVOICED' ||
    rawStatus === 'Invoiced' ||
    receivedAmount > 0 ||
    linkedCrmPaySum > 0;
  const isInProduction = linkedOrders.length > 0;

  return {
    quote,
    customerId: custInfo.id || quote.customer_id || '',
    customerName: custInfo.name || quote.customer_name || 'Unknown Lead',
    customerPhone: custInfo.phone || crmMatch?.phone || '',
    customerSource: crmMatch?.source || 'Direct Lead',
    firstItemTitle,
    firstItemSpecs,
    itemsSummary,
    itemsCount,
    totalQty,
    images,
    totalAmount,
    receivedAmount,
    balanceAmount,
    storedBalanceAmount,
    linkedOrders,
    linkedOrderLabels,
    isDraft,
    isSent,
    isApproved,
    isInvoiced,
    isInProduction,
    isRejected,
    validity: getQuotationValidityInfo(quote, nowDate),
    createdMs: parseQuotationDateMs(quote.created_at),
    validUntilMs: parseQuotationDateMs(quote.validUntil),
  };
}

export interface QuotationPaymentDisplay {
  label: 'Received' | 'Balance' | 'Paid';
  amount: number;
  formatted: string;
  tone: 'green' | 'red';
}

export function getQuotationPaymentDisplay(
  item: Pick<EnrichedQuotation, 'totalAmount' | 'receivedAmount' | 'balanceAmount'> & {
    storedBalanceAmount?: number | null;
    quote?: Partial<CRMQuotation> & Record<string, any>;
  },
  advInvoiceStatus: string
): QuotationPaymentDisplay | null {
  const safeReceived = Math.max(0, Number(item.receivedAmount) || 0);

  if (advInvoiceStatus === 'received_amount') {
    return {
      label: 'Received',
      amount: safeReceived,
      formatted: `Received: ₹${safeReceived.toLocaleString('en-IN')}`,
      tone: 'green',
    };
  }

  if (advInvoiceStatus === 'balance_amount') {
    const directQuoteStoredBalance = item.quote
      ? readStoredNumericField(item.quote, [
          'balance_amount',
          'balanceAmount',
          'balance_due',
          'balanceDue',
          'pending_amount',
          'pendingAmount',
          'balance',
        ]) ??
        readStoredNumericField((item.quote as any)?.invoice, [
          'balance_amount',
          'balanceAmount',
          'balance_due',
          'balanceDue',
          'pending_amount',
          'pendingAmount',
          'balance',
        ])
      : null;

    const resolvedBalance =
      directQuoteStoredBalance !== null
        ? directQuoteStoredBalance
        : item.storedBalanceAmount !== undefined &&
            item.storedBalanceAmount !== null &&
            Number.isFinite(Number(item.storedBalanceAmount))
          ? Number(item.storedBalanceAmount)
          : Number.isFinite(Number(item.balanceAmount))
            ? Number(item.balanceAmount)
            : 0;

    const displayBalance = resolvedBalance < 0 ? 0 : resolvedBalance;
    return {
      label: 'Balance',
      amount: displayBalance,
      formatted: `Balance: ₹${displayBalance.toLocaleString('en-IN')}`,
      tone: 'red',
    };
  }

  if (safeReceived > 0) {
    return {
      label: 'Paid',
      amount: safeReceived,
      formatted: `Paid: ₹${safeReceived.toLocaleString('en-IN')}`,
      tone: 'green',
    };
  }

  return null;
}

export function computeQuotationTabCounts(enrichedList: EnrichedQuotation[]) {
  let draft = 0;
  let sent = 0;
  let approved = 0;
  let invoiced = 0;
  let in_production = 0;

  for (const item of enrichedList) {
    if (item.isDraft) draft++;
    if (item.isSent) sent++;
    if (item.isApproved) approved++;
    if (item.isInvoiced) invoiced++;
    if (item.isInProduction) in_production++;
  }

  return {
    all: enrichedList.length,
    draft,
    sent,
    approved,
    invoiced,
    in_production,
  };
}

function getDatePresetBounds(
  preset: QuotationDatePreset,
  customStart: string,
  customEnd: string,
  nowDate: Date
): { startMs: number | null; endMs: number | null } {
  if (preset === 'all') return { startMs: null, endMs: null };

  const todayStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 23, 59, 59, 999);

  if (preset === 'today') {
    return { startMs: todayStart.getTime(), endMs: todayEnd.getTime() };
  }
  if (preset === '7days') {
    const s = new Date(todayStart);
    s.setDate(s.getDate() - 6);
    return { startMs: s.getTime(), endMs: todayEnd.getTime() };
  }
  if (preset === '30days') {
    const s = new Date(todayStart);
    s.setDate(s.getDate() - 29);
    return { startMs: s.getTime(), endMs: todayEnd.getTime() };
  }
  if (preset === 'this_month') {
    const s = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0, 0);
    return { startMs: s.getTime(), endMs: todayEnd.getTime() };
  }
  if (preset === 'custom') {
    let startMs: number | null = null;
    let endMs: number | null = null;
    if (customStart) {
      const s = new Date(`${customStart}T00:00:00`);
      if (!isNaN(s.getTime())) startMs = s.getTime();
    }
    if (customEnd) {
      const e = new Date(`${customEnd}T23:59:59.999`);
      if (!isNaN(e.getTime())) endMs = e.getTime();
    }
    return { startMs, endMs };
  }
  return { startMs: null, endMs: null };
}

export function filterAndSortQuotations(
  enrichedList: EnrichedQuotation[],
  filters: QuotationFilterState,
  nowDate: Date = new Date()
): EnrichedQuotation[] {
  const searchLower = filters.search.trim().toLowerCase();
  const dateBounds = getDatePresetBounds(
    filters.datePreset,
    filters.customStartDate,
    filters.customEndDate,
    nowDate
  );

  const minCustomAmt = filters.customMinAmount.trim() !== '' ? Number(filters.customMinAmount) : null;
  const maxCustomAmt = filters.customMaxAmount.trim() !== '' ? Number(filters.customMaxAmount) : null;

  const filtered = enrichedList.filter((item) => {
    const q = item.quote;

    // 1. Horizontal Status Tab
    if (filters.statusTab === 'draft' && !item.isDraft) return false;
    if (filters.statusTab === 'sent' && !item.isSent) return false;
    if (filters.statusTab === 'approved' && !item.isApproved) return false;
    if (filters.statusTab === 'invoiced' && !item.isInvoiced) return false;
    if (filters.statusTab === 'in_production' && !item.isInProduction) return false;

    // 2. Search across ID, customer name, phone, item names, materials, linked order IDs
    if (searchLower) {
      const matchesSearch =
        (q.id || '').toLowerCase().includes(searchLower) ||
        item.customerName.toLowerCase().includes(searchLower) ||
        item.customerPhone.toLowerCase().includes(searchLower) ||
        item.itemsSummary.toLowerCase().includes(searchLower) ||
        (q.status || '').toLowerCase().includes(searchLower) ||
        item.linkedOrderLabels.some((lbl) => lbl.toLowerCase().includes(searchLower)) ||
        (q.items || []).some(
          (i) =>
            (i.furnitureItem || '').toLowerCase().includes(searchLower) ||
            (i.material || '').toLowerCase().includes(searchLower) ||
            (i.dimensions || '').toLowerCase().includes(searchLower)
        );
      if (!matchesSearch) return false;
    }

    // 3. Created Date filter
    if (filters.datePreset !== 'all') {
      if (!item.createdMs) return false;
      if (dateBounds.startMs !== null && item.createdMs < dateBounds.startMs) return false;
      if (dateBounds.endMs !== null && item.createdMs > dateBounds.endMs) return false;
    }

    // 4. Validity filter
    if (filters.validity !== 'all') {
      if (filters.validity === 'active' && item.validity.state !== 'valid' && item.validity.state !== 'expiring_soon') {
        return false;
      }
      if (filters.validity === 'expiring_soon' && item.validity.state !== 'expiring_soon') return false;
      if (filters.validity === 'expired' && item.validity.state !== 'expired') return false;
      if (filters.validity === 'draft_review' && item.validity.state !== 'draft_review') return false;
    }

    // 5. Amount Range filter
    if (filters.amountRange === 'under_50k' && item.totalAmount >= 50000) return false;
    if (filters.amountRange === '50k_150k' && (item.totalAmount < 50000 || item.totalAmount > 150000)) return false;
    if (filters.amountRange === 'above_150k' && item.totalAmount <= 150000) return false;
    if (filters.amountRange === 'custom') {
      if (minCustomAmt !== null && !isNaN(minCustomAmt) && item.totalAmount < minCustomAmt) return false;
      if (maxCustomAmt !== null && !isNaN(maxCustomAmt) && item.totalAmount > maxCustomAmt) return false;
    }

    // 6. Advanced Filters
    if (filters.advQuoteStatus !== 'all') {
      const normalizedQuoteStatus = String(q.status || '').toUpperCase();
      if (filters.advQuoteStatus === 'INVOICED') {
        if (normalizedQuoteStatus !== 'INVOICED') return false;
      } else if (String(q.status || '') !== filters.advQuoteStatus) {
        return false;
      }
    }

    if (filters.advInvoiceStatus !== 'all') {
      if (filters.advInvoiceStatus === 'invoiced' && !item.isInvoiced) return false;
      if (filters.advInvoiceStatus === 'not_invoiced' && item.isInvoiced) return false;
      if (filters.advInvoiceStatus === 'received_amount' && !(item.receivedAmount > 0)) return false;
      if (filters.advInvoiceStatus === 'balance_amount' && !(item.balanceAmount > 0)) return false;
      if (filters.advInvoiceStatus === 'partial' && (!item.isInvoiced || item.receivedAmount <= 0 || item.balanceAmount <= 0)) {
        return false;
      }
      if (filters.advInvoiceStatus === 'fully_paid' && (!item.isInvoiced || item.balanceAmount > 0)) {
        return false;
      }
    }

    if (filters.advProductionStatus !== 'all') {
      if (filters.advProductionStatus === 'in_production' && !item.isInProduction) return false;
      if (filters.advProductionStatus === 'not_converted' && item.isInProduction) return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'oldest': {
        const diff = a.createdMs - b.createdMs;
        if (diff !== 0) return diff;
        return (a.quote.id || '').localeCompare(b.quote.id || '');
      }
      case 'highest_value': {
        const diff = b.totalAmount - a.totalAmount;
        if (diff !== 0) return diff;
        return b.createdMs - a.createdMs;
      }
      case 'lowest_value': {
        const diff = a.totalAmount - b.totalAmount;
        if (diff !== 0) return diff;
        return b.createdMs - a.createdMs;
      }
      case 'expiring_soon': {
        const aDays = a.validity.daysRemaining ?? 99999;
        const bDays = b.validity.daysRemaining ?? 99999;
        const diff = aDays - bDays;
        if (diff !== 0) return diff;
        return b.createdMs - a.createdMs;
      }
      case 'newest':
      default: {
        const diff = b.createdMs - a.createdMs;
        if (diff !== 0) return diff;
        return (b.quote.id || '').localeCompare(a.quote.id || '');
      }
    }
  });
}

export function buildQuotationsCSV(enrichedList: EnrichedQuotation[]): string {
  const csvEscape = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'Quotation ID',
    'Customer Name',
    'Mobile Number',
    'Lead Source',
    'Product Items Included',
    'Total Quantity',
    'Created Date',
    'Valid Until',
    'Validity Status',
    'Grand Total (INR)',
    'Received Amount (INR)',
    'Balance Amount (INR)',
    'Current Status',
    'Linked Orders',
  ];

  const rows = enrichedList.map((item) =>
    [
      item.quote.id,
      item.customerName,
      item.customerPhone,
      item.customerSource,
      item.itemsSummary,
      item.totalQty,
      formatToDDMMYYYY(item.quote.created_at),
      formatToDDMMYYYY(item.quote.validUntil),
      item.validity.label,
      item.totalAmount,
      item.receivedAmount,
      item.balanceAmount,
      item.quote.status,
      item.linkedOrderLabels.join(' | '),
    ]
      .map(csvEscape)
      .join(',')
  );

  return '\uFEFF' + [headers.map(csvEscape).join(','), ...rows].join('\n');
}
