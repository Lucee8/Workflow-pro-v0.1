/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Order,
  OrderStage,
  Customer,
  CRMCustomer,
  CRMQuotation,
  Payment,
  StatusLog,
  User,
  normalizeStage,
} from '../types';
import { compareOrdersByArticleSerialDesc, parseToInputDate, formatToDDMMYYYY } from '../utils';

export type PipelineStageKey =
  | 'Pending'
  | 'Designing'
  | 'Wood Procurement'
  | 'Making Started'
  | 'CNC Wood Carving'
  | 'Assembly'
  | 'QC 1'
  | 'Making Completed'
  | 'Polish'
  | 'QC 2'
  | 'Delivery';

export interface PipelineStageConfig {
  step: number;
  key: PipelineStageKey;
  label: string;
  shortLabel: string;
  subtitle: string;
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  { step: 1, key: 'Pending', label: 'Pending', shortLabel: 'Pending', subtitle: 'Awaiting lumber & draft release' },
  { step: 2, key: 'Designing', label: 'Designing', shortLabel: 'Designing', subtitle: 'CAD drawings & cutlist prep' },
  { step: 3, key: 'Wood Procurement', label: 'Wood Procurement', shortLabel: 'Wood Procure', subtitle: 'Timber selection & sizing' },
  { step: 4, key: 'Making Started', label: 'Making Started', shortLabel: 'Making Started', subtitle: 'Panel routing & joinery' },
  { step: 5, key: 'CNC Wood Carving', label: 'CNC Wood Carving', shortLabel: 'CNC Carving', subtitle: '3-axis carving & relief' },
  { step: 6, key: 'Assembly', label: 'Assembly', shortLabel: 'Assembly', subtitle: 'Carcass fit-up & clamping' },
  { step: 7, key: 'QC 1', label: 'QC 1', shortLabel: 'QC 1', subtitle: 'Pre-polish structural check' },
  { step: 8, key: 'Making Completed', label: 'Making Completed', shortLabel: 'Making Done', subtitle: 'Carpentry floor sign-off' },
  { step: 9, key: 'Polish', label: 'Polish', shortLabel: 'Polish', subtitle: 'Sealer, stain & PU matte coat' },
  { step: 10, key: 'QC 2', label: 'QC 2', shortLabel: 'QC 2', subtitle: 'Final surface & hardware QA' },
  { step: 11, key: 'Delivery', label: 'Delivery', shortLabel: 'Delivery', subtitle: 'Ready to dispatch / Delivered' },
];

export const ALL_STAGES_FILTER = 'All Stages';
export type OrdersStatusFilter = 'All Status' | 'In Progress' | 'Ready' | 'Delayed' | 'Overdue' | 'Unassigned';
export type OrdersPriorityFilter = 'All Priority' | 'Normal' | 'Urgent';
export type OrdersSortOption = 'newest' | 'due_asc' | 'due_desc' | 'stage_asc' | 'stage_desc';

/**
 * Maps any raw Order stage (including Ready to Dispatch / Dispatched / legacy names)
 * onto the canonical 11-stage workshop pipeline bucket.
 */
export function mapOrderToPipelineStage(order: Pick<Order, 'current_status' | 'stage'> & { status?: string }): PipelineStageKey {
  const norm = normalizeStage(order.current_status || order.stage || order.status || 'Pending');
  if (norm === 'Ready to Dispatch' || norm === 'Ready To Dispatch' || norm === 'Dispatched' || norm === 'Delivery') {
    return 'Delivery';
  }
  const found = PIPELINE_STAGES.find((s) => s.key === norm);
  return found ? found.key : 'Pending';
}

export function getPipelineStageIndex(order: Pick<Order, 'current_status' | 'stage'> & { status?: string }): number {
  const key = mapOrderToPipelineStage(order);
  const idx = PIPELINE_STAGES.findIndex((s) => s.key === key);
  return idx >= 0 ? idx : 0;
}

export function getTodayYMD(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isOrderCompleted(order: Pick<Order, 'current_status' | 'stage'> & { status?: string }): boolean {
  const norm = normalizeStage(order.current_status || order.stage || order.status || 'Pending');
  return norm === 'Delivery' || norm === 'Ready to Dispatch' || norm === 'Ready To Dispatch' || norm === 'Dispatched';
}

export function isOrderDispatched(order: Pick<Order, 'current_status' | 'stage'> & { status?: string }): boolean {
  const norm = normalizeStage(order.current_status || order.stage || order.status || 'Pending');
  return norm === 'Dispatched';
}

export function isOrderPending(order: Pick<Order, 'current_status' | 'stage'> & { status?: string }): boolean {
  const norm = normalizeStage(order.current_status || order.stage || order.status || 'Pending');
  return norm === 'Pending';
}

export function isOrderActiveFloor(order: Pick<Order, 'current_status' | 'stage'> & { status?: string }): boolean {
  return !isOrderCompleted(order) && !isOrderPending(order);
}

export function isOrderOverdue(order: Order, todayYMD: string = getTodayYMD()): boolean {
  if (isOrderCompleted(order)) return false;
  if (order.is_delayed) return true;
  if (!order.delivery_date) return false;
  const dueYMD = parseToInputDate(order.delivery_date);
  return /^\d{4}-\d{2}-\d{2}$/.test(dueYMD) && dueYMD < todayYMD;
}

export function isOrderUnassigned(order: Order): boolean {
  if (isOrderCompleted(order)) return false;
  return !order.carpenter_id || order.carpenter_id.trim() === '';
}

export interface OrdersKPIStats {
  totalOrders: number;
  activeFloorCount: number;
  activeFloorPct: string;
  pendingCount: number;
  pendingPct: string;
  completedCount: number;
  overdueCount: number;
  unassignedCount: number;
  totalWipUnits: number;
  urgentCount: number;
}

export function computeOrdersKPIs(orders: Order[], todayYMD: string = getTodayYMD()): OrdersKPIStats {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const totalOrders = safeOrders.length;

  let activeFloorCount = 0;
  let pendingCount = 0;
  let completedCount = 0;
  let overdueCount = 0;
  let unassignedCount = 0;
  let totalWipUnits = 0;
  let urgentCount = 0;

  for (const order of safeOrders) {
    const completed = isOrderCompleted(order);
    const pending = isOrderPending(order);

    if (completed) {
      completedCount++;
    } else {
      totalWipUnits += Math.max(1, Number(order.no_of_units) || 1);
      if (order.priority === 'urgent') urgentCount++;
      if (pending) pendingCount++;
      else activeFloorCount++;
    }

    if (isOrderOverdue(order, todayYMD)) {
      overdueCount++;
    }

    if (isOrderUnassigned(order)) {
      unassignedCount++;
    }
  }

  const fmtPct = (count: number) =>
    totalOrders > 0 ? `${((count / totalOrders) * 100).toFixed(1)}%` : '0.0%';

  return {
    totalOrders,
    activeFloorCount,
    activeFloorPct: fmtPct(activeFloorCount),
    pendingCount,
    pendingPct: fmtPct(pendingCount),
    completedCount,
    overdueCount,
    unassignedCount,
    totalWipUnits,
    urgentCount,
  };
}

export function computeStageCounts(orders: Order[]): Record<PipelineStageKey, number> {
  const counts: Record<PipelineStageKey, number> = {
    Pending: 0,
    Designing: 0,
    'Wood Procurement': 0,
    'Making Started': 0,
    'CNC Wood Carving': 0,
    Assembly: 0,
    'QC 1': 0,
    'Making Completed': 0,
    Polish: 0,
    'QC 2': 0,
    Delivery: 0,
  };

  for (const order of orders || []) {
    const key = mapOrderToPipelineStage(order);
    counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}

export interface OrderFilterParams {
  searchTerm: string;
  stageFilter: string;
  statusFilter: OrdersStatusFilter;
  craftsmanFilter: string; // 'All' | 'Unassigned' | userId
  priorityFilter: OrdersPriorityFilter;
  sortBy: OrdersSortOption;
  todayYMD?: string;
}

export function filterAndSortOrders(
  orders: Order[],
  customers: Customer[],
  crmCustomers: CRMCustomer[],
  users: User[],
  params: OrderFilterParams
): Order[] {
  const today = params.todayYMD || getTodayYMD();
  const q = params.searchTerm.trim().toLowerCase();

  const filtered = (orders || []).filter((order) => {
    const cust =
      customers.find((c) => c.id === order.customer_id) ||
      crmCustomers.find((c) => c.id === order.customer_id);
    const carpenter = users.find((u) => u.id === order.carpenter_id);
    const polish = order.polish_person_id ? users.find((u) => u.id === order.polish_person_id) : undefined;

    if (q) {
      const haystack = [
        order.article_no,
        order.id,
        order.quotation_ref,
        order.parent_order_id,
        order.category,
        order.sub_category,
        order.material,
        order.finish,
        cust?.name,
        cust?.phone,
        (cust as CRMCustomer | undefined)?.city,
        carpenter?.name,
        polish?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    if (params.stageFilter && params.stageFilter !== ALL_STAGES_FILTER) {
      const orderBucket = mapOrderToPipelineStage(order);
      const targetBucket = mapOrderToPipelineStage({ current_status: params.stageFilter as OrderStage });
      if (orderBucket !== targetBucket) return false;
    }

    if (params.statusFilter && params.statusFilter !== 'All Status') {
      const completed = isOrderCompleted(order);
      const overdue = isOrderOverdue(order, today);
      if (params.statusFilter === 'Delayed') {
        if (!order.is_delayed) return false;
      } else if (params.statusFilter === 'Overdue') {
        if (!overdue) return false;
      } else if (params.statusFilter === 'Ready') {
        if (!completed) return false;
      } else if (params.statusFilter === 'In Progress') {
        if (completed) return false;
      } else if (params.statusFilter === 'Unassigned') {
        if (!isOrderUnassigned(order)) return false;
      }
    }

    if (params.craftsmanFilter && params.craftsmanFilter !== 'All') {
      if (params.craftsmanFilter === 'Unassigned') {
        if (!isOrderUnassigned(order)) return false;
      } else {
        if (
          order.carpenter_id !== params.craftsmanFilter &&
          order.polish_person_id !== params.craftsmanFilter
        ) {
          return false;
        }
      }
    }

    if (params.priorityFilter && params.priorityFilter !== 'All Priority') {
      if ((order.priority || 'normal').toLowerCase() !== params.priorityFilter.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (params.sortBy === 'due_asc') {
      const da = parseToInputDate(a.delivery_date) || '9999-12-31';
      const db = parseToInputDate(b.delivery_date) || '9999-12-31';
      if (da !== db) return da.localeCompare(db);
      return compareOrdersByArticleSerialDesc(a, b);
    }
    if (params.sortBy === 'due_desc') {
      const da = parseToInputDate(a.delivery_date) || '0000-01-01';
      const db = parseToInputDate(b.delivery_date) || '0000-01-01';
      if (da !== db) return db.localeCompare(da);
      return compareOrdersByArticleSerialDesc(a, b);
    }
    if (params.sortBy === 'stage_asc') {
      const sa = getPipelineStageIndex(a);
      const sb = getPipelineStageIndex(b);
      if (sa !== sb) return sa - sb;
      return compareOrdersByArticleSerialDesc(a, b);
    }
    if (params.sortBy === 'stage_desc') {
      const sa = getPipelineStageIndex(a);
      const sb = getPipelineStageIndex(b);
      if (sa !== sb) return sb - sa;
      return compareOrdersByArticleSerialDesc(a, b);
    }
    return compareOrdersByArticleSerialDesc(a, b);
  });
}

export interface ResolvedOrderDetailsContext {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  customerId: string;
  customerSource?: string;
  quotationRef?: string;
  quotation?: CRMQuotation;
  siblingOrders: Order[];
  quoteTotal: number;
  advancePaid: number;
  balanceDue: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  carpenter?: User;
  polishPerson?: User;
  logs: StatusLog[];
  stageIndex: number;
  stageConfig: PipelineStageConfig;
}

export function resolveOrderDetailsContext(
  order: Order,
  allOrders: Order[],
  customers: Customer[],
  crmCustomers: CRMCustomer[],
  crmQuotations: CRMQuotation[],
  payments: Payment[],
  users: User[],
  statusLogs: StatusLog[]
): ResolvedOrderDetailsContext {
  const dirCust = customers.find((c) => c.id === order.customer_id);
  const crmCust = crmCustomers.find((c) => c.id === order.customer_id);

  const customerName = crmCust?.name || dirCust?.name || 'Walk-In Customer';
  const customerPhone = crmCust?.phone || dirCust?.phone || crmCust?.whatsappNumber || '';
  const customerEmail = crmCust?.email || '';
  const customerAddress =
    [crmCust?.address, crmCust?.city, crmCust?.state, crmCust?.pinCode].filter(Boolean).join(', ') ||
    dirCust?.address ||
    '';

  const quotationRef = order.quotation_ref || order.parent_order_id || undefined;
  const quotation = quotationRef
    ? crmQuotations.find((q) => q.id === quotationRef)
    : undefined;

  const siblingOrders = quotationRef
    ? allOrders.filter((o) => o.quotation_ref === quotationRef || o.parent_order_id === quotationRef)
    : [order];

  const orderPayment = payments.find((p) => p.order_id === order.id);

  // Compute financial totals strictly from linked quotation or actual order/payment records
  let quoteTotal = 0;
  let advancePaid = 0;
  let balanceDue = 0;

  if (quotation) {
    quoteTotal = Number(quotation.totalAmount) || 0;
    const siblingOrderIds = new Set(siblingOrders.map((o) => o.id));
    const siblingPayments = payments.filter((p) => siblingOrderIds.has(p.order_id));
    if (siblingPayments.length > 0) {
      advancePaid = siblingPayments.reduce((sum, p) => sum + (Number(p.advance_paid) || 0), 0);
      const totalFromPays = siblingPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
      if (quoteTotal === 0 && totalFromPays > 0) quoteTotal = totalFromPays;
      balanceDue = Math.max(0, quoteTotal - advancePaid);
    } else {
      advancePaid = Number(quotation.received_amount) || 0;
      balanceDue = Math.max(0, quoteTotal - advancePaid);
    }
  } else if (orderPayment) {
    quoteTotal = Number(orderPayment.total_amount) || Number(order.total_amount) || 0;
    advancePaid = Number(orderPayment.advance_paid) || 0;
    balanceDue =
      orderPayment.balance_due !== undefined
        ? Math.max(0, Number(orderPayment.balance_due))
        : Math.max(0, quoteTotal - advancePaid);
  } else {
    quoteTotal = Number(order.total_amount) || 0;
    advancePaid = Number(order.advance_paid) || 0;
    balanceDue = Math.max(0, quoteTotal - advancePaid);
  }

  const paymentStatus: 'Paid' | 'Partial' | 'Unpaid' =
    quoteTotal > 0 && balanceDue <= 0
      ? 'Paid'
      : advancePaid > 0
      ? 'Partial'
      : 'Unpaid';

  const carpenter = users.find((u) => u.id === order.carpenter_id);
  const polishPerson = order.polish_person_id
    ? users.find((u) => u.id === order.polish_person_id)
    : undefined;

  const logs = (statusLogs || [])
    .filter((l) => l.order_id === order.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const stageIndex = getPipelineStageIndex(order);
  const stageConfig = PIPELINE_STAGES[stageIndex] || PIPELINE_STAGES[0];

  return {
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    customerId: order.customer_id || 'N/A',
    customerSource: crmCust?.source,
    quotationRef,
    quotation,
    siblingOrders: siblingOrders.length > 0 ? siblingOrders : [order],
    quoteTotal,
    advancePaid,
    balanceDue,
    paymentStatus,
    carpenter,
    polishPerson,
    logs,
    stageIndex,
    stageConfig,
  };
}

export function formatCurrencyINR(amount: number): string {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

function escapeCSVField(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildOrdersCSV(
  orders: Order[],
  customers: Customer[],
  crmCustomers: CRMCustomer[],
  users: User[],
  payments: Payment[]
): string {
  const headers = [
    'Article No',
    'Order ID',
    'Quotation Ref',
    'Customer Name',
    'Customer Phone',
    'Category',
    'Product / Sub Category',
    'Dimensions / Size',
    'Material',
    'Finish',
    'Units',
    'Stage',
    'Priority',
    'Carpenter',
    'Polish Person',
    'Order Date',
    'Delivery Date',
    'Total Amount (INR)',
    'Advance Paid (INR)',
    'Balance Due (INR)',
  ];

  const rows = orders.map((o) => {
    const cust =
      crmCustomers.find((c) => c.id === o.customer_id) ||
      customers.find((c) => c.id === o.customer_id);
    const carp = users.find((u) => u.id === o.carpenter_id);
    const pol = o.polish_person_id ? users.find((u) => u.id === o.polish_person_id) : undefined;
    const pay = payments.find((p) => p.order_id === o.id);
    const totalAmt = pay ? Number(pay.total_amount) : Number(o.total_amount) || 0;
    const advAmt = pay ? Number(pay.advance_paid) : Number(o.advance_paid) || 0;
    const balAmt = pay ? Number(pay.balance_due) : Math.max(0, totalAmt - advAmt);

    return [
      o.article_no,
      o.id,
      o.quotation_ref || o.parent_order_id || '',
      cust?.name || 'Walk-In',
      cust?.phone || '',
      o.category,
      o.sub_category,
      o.custom_size || o.size,
      o.material,
      o.finish,
      o.no_of_units || 1,
      normalizeStage(o.current_status || o.stage),
      o.priority || 'normal',
      carp?.name || 'Unassigned',
      pol?.name || 'Unassigned',
      formatToDDMMYYYY(o.order_date),
      formatToDDMMYYYY(o.delivery_date),
      totalAmt,
      advAmt,
      balAmt,
    ]
      .map(escapeCSVField)
      .join(',');
  });

  return [headers.map(escapeCSVField).join(','), ...rows].join('\n');
}
