  /**
   * @license
   * SPDX-License-Identifier: Apache-2.0
   */

  import React from 'react';
  import { motion } from 'motion/react';
  import { Order, User, Customer, OrderStage, Payment, CRMQuotation, CRMPayment, normalizeStage } from '../types';
  import { 
    Eye, 
    CheckCircle2, 
    UserPlus, 
    Plus, 
    FileText, 
    Boxes,
    Calendar,
    Layers,
    Sparkles,
    ArrowUpRight
  } from 'lucide-react';
  import { formatToDDMMYYYY, compareOrdersByArticleSerialDesc } from '../utils';

  interface DashboardTabProps {
    orders: Order[];
    users: User[];
    customers: Customer[];
    payments: Payment[];
    crmQuotations?: CRMQuotation[];
    crmPayments?: CRMPayment[];
    onViewOrder: (orderId: string) => void;
    onNavigateTab: (tabId: string) => void;
    onQuickCrmAction?: (
      action: 'add-customer' | 'new-quotation' | 'invoiced-all' | 'invoiced-received' | 'invoiced-due'
    ) => void;
  }

  const isDateInBounds = (
    dateStr?: string,
    startMs?: number | null,
    endMs?: number | null
  ): boolean => {
    if (startMs === null && endMs === null) return true;
    if (!dateStr) return false;

    let time: number | null = null;
    const str = String(dateStr).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const datePart = str.split('T')[0];
      const parts = datePart.split('-');
      time = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0).getTime();
    } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(str)) {
      const parts = str.split(/[\/\-]/);
      time = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0).getTime();
    } else {
      const parsed = new Date(str).getTime();
      if (!isNaN(parsed)) time = parsed;
    }

    if (time === null || isNaN(time)) return false;

    if (startMs !== null && time < startMs) return false;
    if (endMs !== null && time > endMs) return false;
    return true;
  };

  export const isQuotationDeleted = (q: any): boolean => {
    if (!q || !q.id || !String(q.id).trim()) return true;
    if (q.deleted === true || q.isDeleted === true || q.is_deleted === true) return true;
    if (Boolean(q.deletedAt) || Boolean(q.deleted_at)) return true;
    if (q.isActive === false || q.is_active === false) return true;
    const st = String(q.status || '').trim().toUpperCase();
    if (st === 'DELETED' || st === 'VOID' || st === 'CANCELLED') return true;
    return false;
  };

  export const isInvoicedQuotationStatus = (status?: string): boolean => {
    return String(status || '').trim().toUpperCase() === 'INVOICED';
  };

  const escapeRegExp = (str: string): string =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const hasExactReferenceToken = (text: string | undefined, token: string): boolean => {
    if (!text || !token) return false;
    const regex = new RegExp(`(?:^|[^A-Za-z0-9_-])${escapeRegExp(token)}(?:$|[^A-Za-z0-9_-])`);
    return regex.test(text);
  };

  const roundCurrency = (val: number): number =>
    Math.round((Number(val) || 0) * 100) / 100;

  export function calculateInvoicedDashboardFinancials(params: {
    crmQuotations: CRMQuotation[];
    orders: Order[];
    payments: Payment[];
    crmPayments: CRMPayment[];
    startMs: number | null;
    endMs: number | null;
  }): {
    totalBusiness: number;
    moneyReceived: number;
    moneyDue: number;
    overpaymentAmount: number;
    invoicedCount: number;
  } {
    const { crmQuotations, orders, payments, crmPayments, startMs, endMs } = params;

    const seenQuoteIds = new Set<string>();
    const invoicedQuotations = (crmQuotations || []).filter((q) => {
      if (isQuotationDeleted(q)) return false;
      const qId = String(q.id).trim();
      if (seenQuoteIds.has(qId)) return false;
      if (!isInvoicedQuotationStatus(q.status)) return false;
      const invoiceTimestamp =
        (q as any).invoiced_at ||
        (q as any).invoice_date ||
        (q as any).invoiceDate ||
        q.created_at ||
        (q as any).date;
      if (!isDateInBounds(invoiceTimestamp, startMs, endMs)) return false;
      seenQuoteIds.add(qId);
      return true;
    });

    const usedPaymentIds = new Set<string>();
    const usedCrmPaymentIds = new Set<string>();

    let totalBusiness = 0;
    let totalReceived = 0;
    let totalInvoiceOverpayment = 0;

    invoicedQuotations.forEach((q) => {
      const qTotal = Math.max(0, Number(q.totalAmount) || 0);
      const ordBase = q.id.includes('QT') ? q.id.replace('QT', 'ORD') : '';

      // Find orders explicitly linked back to this INVOICED quotation
      const linkedOrders = (orders || []).filter((o) => {
        if (!o || !o.id) return false;
        if (o.quotation_ref === q.id || o.parent_order_id === q.id) return true;
        if (ordBase && (o.id === ordBase || o.id.startsWith(`${ordBase}-`))) return true;
        if (hasExactReferenceToken(o.special_notes, q.id)) return true;
        return false;
      });

      const linkedOrderIds = new Set(linkedOrders.map((o) => o.id).filter(Boolean));

      // Sum all Payment records explicitly allocated to this quotation or its linked orders (deduplicated)
      let linkedOrderPaymentSum = 0;
      (payments || []).forEach((p) => {
        if (!p) return;
        const pKey = p.id || `${p.order_id}_${p.payment_date}_${p.advance_paid}`;
        if (usedPaymentIds.has(pKey)) return;

        const isLinked =
          p.order_id === q.id ||
          (Boolean(p.order_id) && linkedOrderIds.has(p.order_id)) ||
          hasExactReferenceToken(p.notes, q.id);

        if (isLinked) {
          usedPaymentIds.add(pKey);
          const val = Number(p.advance_paid) || Number((p as any).amount) || 0;
          if (val > 0) {
            linkedOrderPaymentSum += val;
          }
        }
      });

      // Sum all CRMPayment records explicitly allocated to this quotation or its linked orders (deduplicated)
      let linkedCrmPaymentSum = 0;
      (crmPayments || []).forEach((cp) => {
        if (!cp) return;
        const cpKey = cp.id || `${cp.order_id}_${cp.payment_date}_${cp.advance_paid}`;
        if (usedCrmPaymentIds.has(cpKey)) return;

        const isLinked =
          cp.id === `pay_${q.id}` ||
          cp.order_id === q.id ||
          (Boolean(cp.order_id) && linkedOrderIds.has(cp.order_id));

        if (isLinked) {
          usedCrmPaymentIds.add(cpKey);
          const val = Number(cp.advance_paid) || Number((cp as any).amount) || 0;
          if (val > 0) {
            linkedCrmPaymentSum += val;
          }
        }
      });

      // Authoritative received amount for this INVOICED quotation:
      // Reconcile quotation.received_amount with its mirrored/additional CRMPayment & order Payment records without double-counting
      const qReceivedDirect = Math.max(
        0,
        Number(q.received_amount) || Number((q as any).receivedAmount) || 0
      );
      const qReceived = Math.max(qReceivedDirect, linkedCrmPaymentSum, linkedOrderPaymentSum);

      totalBusiness += qTotal;
      totalReceived += qReceived;
      if (qReceived > qTotal) {
        totalInvoiceOverpayment += qReceived - qTotal;
      }
    });

    const roundedTotal = roundCurrency(totalBusiness);
    const roundedReceived = roundCurrency(totalReceived);
    const roundedDue = roundCurrency(Math.max(0, roundedTotal - roundedReceived));
    const roundedOverpayment = roundCurrency(
      Math.max(0, roundedReceived - roundedTotal, totalInvoiceOverpayment)
    );

    return {
      totalBusiness: roundedTotal,
      moneyReceived: roundedReceived,
      moneyDue: roundedDue,
      overpaymentAmount: roundedOverpayment,
      invoicedCount: invoicedQuotations.length,
    };
  }

  export default function DashboardTab({
    orders,
    users,
    customers,
    payments,
    crmQuotations = [],
    crmPayments = [],
    onViewOrder,
    onNavigateTab,
    onQuickCrmAction,
  }: DashboardTabProps) {
    // Date Range Filter State
    type DateRangePreset = 'today' | '7days' | '30days' | '4months' | 'currentmonth' | 'all' | 'custom';
    const [datePreset, setDatePreset] = React.useState<DateRangePreset>('currentmonth');
    const [customStartDate, setCustomStartDate] = React.useState<string>(() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    });
    const [customEndDate, setCustomEndDate] = React.useState<string>(() => new Date().toISOString().split('T')[0]);
    const [isFilterLoading, setIsFilterLoading] = React.useState<boolean>(false);

    const handlePresetChange = (preset: DateRangePreset) => {
      if (preset === datePreset) return;
      setIsFilterLoading(true);
      setDatePreset(preset);
      setTimeout(() => {
        setIsFilterLoading(false);
      }, 200);
    };

    const getDateFilterBounds = (
      preset: DateRangePreset,
      customStart?: string,
      customEnd?: string
    ): { startMs: number | null; endMs: number | null } => {
      if (preset === 'all') return { startMs: null, endMs: null };

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (preset === 'today') {
        return { startMs: todayStart.getTime(), endMs: todayEnd.getTime() };
      }

      if (preset === '7days') {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 6);
        return { startMs: start.getTime(), endMs: todayEnd.getTime() };
      }

      if (preset === '30days') {
        const start = new Date(todayStart);
        start.setDate(start.getDate() - 29);
        return { startMs: start.getTime(), endMs: todayEnd.getTime() };
      }

      if (preset === '4months') {
        const start = new Date(todayStart);
        start.setMonth(start.getMonth() - 4);
        return { startMs: start.getTime(), endMs: todayEnd.getTime() };
      }

      if (preset === 'currentmonth') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        return { startMs: start.getTime(), endMs: todayEnd.getTime() };
      }

      if (preset === 'custom') {
        let sMs: number | null = null;
        let eMs: number | null = null;
        if (customStart) {
          const s = new Date(customStart + 'T00:00:00');
          if (!isNaN(s.getTime())) sMs = s.getTime();
        }
        if (customEnd) {
          const e = new Date(customEnd + 'T23:59:59.999');
          if (!isNaN(e.getTime())) eMs = e.getTime();
        }
        return { startMs: sMs, endMs: eMs };
      }

      return { startMs: null, endMs: null };
    };

    // Filter collections based on active date filter bounds
    const { startMs, endMs } = React.useMemo(
      () => getDateFilterBounds(datePreset, customStartDate, customEndDate),
      [datePreset, customStartDate, customEndDate]
    );

    const filteredOrders = React.useMemo(() => {
      return orders.filter((o) => isDateInBounds(o.created_at || (o as any).date, startMs, endMs));
    }, [orders, startMs, endMs]);

    const filteredCrmQuotations = React.useMemo(() => {
      return (crmQuotations || []).filter((q) => isDateInBounds(q.created_at || (q as any).date, startMs, endMs));
    }, [crmQuotations, startMs, endMs]);

    // 1 & 2. Financial calculation strictly from INVOICED quotations & their allocated payments
    const {
      totalFurnitureBusiness,
      moneyReceived,
      moneyDue,
      overpaymentAmount,
      finalizedOrdersCount,
    } = React.useMemo(() => {
      const fin = calculateInvoicedDashboardFinancials({
        crmQuotations: crmQuotations || [],
        orders: orders || [],
        payments: payments || [],
        crmPayments: crmPayments || [],
        startMs,
        endMs,
      });

      return {
        totalFurnitureBusiness: fin.totalBusiness,
        moneyReceived: fin.moneyReceived,
        moneyDue: fin.moneyDue,
        overpaymentAmount: fin.overpaymentAmount,
        finalizedOrdersCount: filteredOrders.length,
      };
    }, [crmQuotations, orders, payments, crmPayments, startMs, endMs, filteredOrders.length]);

    // 3. Ongoing in factory: Count of orders whose current stage is not 'Pending'
    const ongoingInFactory = React.useMemo(() => {
      return filteredOrders.filter((o) => {
        const stage = normalizeStage(o.current_status || (o as any).stage || (o as any).status);
        return stage !== 'Pending';
      }).length;
    }, [filteredOrders]);

    // 4. Quotation Pipeline breakdown & conversion rate
    const quotationStats = React.useMemo(() => {
      const quotes = filteredCrmQuotations || [];
      const total = quotes.length;

      let draft = 0;
      let sent = 0;
      let approved = 0;
      let rejectedExpired = 0;

      quotes.forEach((q) => {
        const st = (q.status || '').toLowerCase().trim();
        if (st === 'draft') {
          draft++;
        } else if (st === 'sent' || st === 'quote sent') {
          sent++;
        } else if (st === 'approved' || st === 'order confirmed' || st === 'closed won') {
          approved++;
        } else if (st === 'rejected' || st === 'expired' || st === 'deal lost' || st === 'disqualified') {
          rejectedExpired++;
        } else {
          draft++;
        }
      });

      const conversionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

      return {
        total,
        draft,
        sent,
        approved,
        rejectedExpired,
        conversionRate,
      };
    }, [filteredCrmQuotations]);

    // 5. Production stages counts
    const getStageCount = (stage: OrderStage) =>
      filteredOrders.filter((o) => normalizeStage(o.current_status || (o as any).stage || (o as any).status) === normalizeStage(stage)).length;

    const productionStages: {
      name: OrderStage;
      label: string;
      count: number;
      badgeBg: string;
      activeText: string;
    }[] = [
      { name: 'Pending', label: 'PENDING', count: getStageCount('Pending'), badgeBg: 'bg-stone-400', activeText: 'text-stone-700' },
      { name: 'Designing', label: 'DESIGNING', count: getStageCount('Designing'), badgeBg: 'bg-[#b45309]', activeText: 'text-amber-800' },
      { name: 'Wood Procurement', label: 'WOOD PROCURE', count: getStageCount('Wood Procurement'), badgeBg: 'bg-[#78350f]', activeText: 'text-amber-900' },
      { name: 'Making Started', label: 'MAKING STARTED', count: getStageCount('Making Started'), badgeBg: 'bg-[#2563eb]', activeText: 'text-blue-700' },
      { name: 'CNC Wood Carving', label: 'CNC CARVING', count: getStageCount('CNC Wood Carving'), badgeBg: 'bg-[#0891b2]', activeText: 'text-cyan-700' },
      { name: 'Assembly', label: 'ASSEMBLY', count: getStageCount('Assembly'), badgeBg: 'bg-[#d97706]', activeText: 'text-amber-700' },
      { name: 'QC 1', label: 'QC 1', count: getStageCount('QC 1'), badgeBg: 'bg-[#9333ea]', activeText: 'text-purple-700' },
      { name: 'Making Completed', label: 'MAKING COMPLETED', count: getStageCount('Making Completed'), badgeBg: 'bg-[#0284c7]', activeText: 'text-sky-700' },
      { name: 'Polish', label: 'POLISH', count: getStageCount('Polish'), badgeBg: 'bg-[#7e22ce]', activeText: 'text-purple-800' },
      { name: 'QC 2', label: 'QC 2', count: getStageCount('QC 2'), badgeBg: 'bg-[#ea580c]', activeText: 'text-orange-700' },
      { name: 'Delivery', label: 'DELIVERY', count: getStageCount('Delivery') + getStageCount('Ready to Dispatch') + getStageCount('Dispatched'), badgeBg: 'bg-[#059669]', activeText: 'text-emerald-700' },
    ];

    // 6. Upcoming Deliveries (sorted by delivery date ascending)
    const upcomingDeliveries = React.useMemo(() => {
      const list = filteredOrders.length > 0 ? filteredOrders : orders;
      return [...list]
        .filter((o) => !['Dispatched'].includes(normalizeStage(o.current_status || (o as any).stage || (o as any).status)))
        .sort((a, b) => new Date(a.delivery_date || '').getTime() - new Date(b.delivery_date || '').getTime())
        .slice(0, 3);
    }, [filteredOrders, orders]);

    // Currency formatters
    const formatINR = (val: number) =>
      '₹' + (Math.round((Number(val) || 0) * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const formatLakhs = (val: number) => {
      if (val >= 10000000) {
        return `₹${(val / 10000000).toFixed(2)}Cr`;
      }
      if (val >= 100000) {
        return `₹${(val / 100000).toFixed(2)}L`;
      }
      return '₹' + val.toLocaleString('en-IN');
    };

    // Helper for delivery date badge
    const parseDateBadge = (dateStr?: string) => {
      if (!dateStr) return { dayMonth: '--/--', year: '2026' };
      const parts = formatToDDMMYYYY(dateStr).split('/');
      if (parts.length === 3) {
        return { dayMonth: `${parts[0]}/${parts[1]}`, year: parts[2] };
      }
      return { dayMonth: dateStr.slice(5, 10), year: dateStr.slice(0, 4) };
    };

    const isDateOverdue = (dateStr?: string) => {
      if (!dateStr) return false;
      const dueTime = new Date(dateStr).setHours(0, 0, 0, 0);
      const today = new Date().setHours(0, 0, 0, 0);
      return dueTime < today;
    };

    // Status badge styling for Recent Orders
    const getStageBadgeStyle = (rawStage: string) => {
      const stage = normalizeStage(rawStage);
      switch (stage) {
        case 'Making Completed':
          return 'bg-[#e0f2fe] text-[#0284c7] border-[#bae6fd]';
        case 'Designing':
          return 'bg-[#ffedd5] text-[#b45309] border-[#fed7aa]';
        case 'Pending':
          return 'bg-[#f5f5f4] text-[#78716c] border-[#e7e5e4]';
        case 'Wood Procurement':
          return 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]';
        case 'Making Started':
          return 'bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe]';
        case 'CNC Wood Carving':
          return 'bg-[#cffafe] text-[#0e7490] border-[#a5f3fc]';
        case 'Assembly':
          return 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]';
        case 'QC 1':
          return 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]';
        case 'Polish':
          return 'bg-[#fae8ff] text-[#a21caf] border-[#f5d0fe]';
        case 'QC 2':
          return 'bg-[#ffedd5] text-[#c2410c] border-[#fed7aa]';
        case 'Delivery':
        case 'Ready to Dispatch':
          return 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]';
        case 'Dispatched':
          return 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]';
        default:
          return 'bg-[#f5f5f4] text-[#78716c] border-[#e7e5e4]';
      }
    };

    return (
      <div className="space-y-6">
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">Dashboard</h1>
            <p className="text-stone-500 text-xs mt-0.5">Overview of all active orders, worker assignments and workshop activity</p>
          </div>

          {/* Filter and Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Filter Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center bg-stone-200/70 p-0.5 rounded-2xl gap-0.5 overflow-x-auto max-w-full">
                <button
                  onClick={() => handlePresetChange('today')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === 'today'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => handlePresetChange('7days')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === '7days'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => handlePresetChange('30days')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === '30days'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => handlePresetChange('4months')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === '4months'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  4 Months
                </button>
                <button
                  onClick={() => handlePresetChange('currentmonth')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === 'currentmonth'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  Current Month
                </button>
                <button
                  onClick={() => handlePresetChange('all')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === 'all'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  All Time
                </button>
                <button
                  onClick={() => handlePresetChange('custom')}
                  className={`whitespace-nowrap px-3 py-1.5 text-xs font-bold transition rounded-xl cursor-pointer ${
                    datePreset === 'custom'
                      ? 'bg-[#593622] text-white shadow-xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-300/50'
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {/* Custom Range Picker Drawer */}
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] font-semibold text-stone-500">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="border border-stone-300 rounded-lg px-2 py-1 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#593622] bg-white"
                  />
                  <span className="text-[11px] font-semibold text-stone-500">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="border border-stone-300 rounded-lg px-2 py-1 text-xs text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#593622] bg-white"
                  />
                </div>
              )}
            </div>

            {onQuickCrmAction && (
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => onQuickCrmAction('add-customer')}
                  className="bg-white border border-stone-300 text-stone-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs hover:bg-stone-50 active:scale-95 transition cursor-pointer"
                >
                  <UserPlus size={14} className="text-stone-600" /> Add Customer
                </button>
                <button
                  onClick={() => onQuickCrmAction('new-quotation')}
                  className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <Plus size={14} /> New Quotation
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`space-y-6 transition-opacity duration-200 ${isFilterLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

        {/* TOP KPI SECTION - 6 Live Business Metric Cards */}
        <div className="space-y-4">
          {/* Row 1: Financial KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: TOTAL AMOUNT OF MONEY */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (onQuickCrmAction) onQuickCrmAction('invoiced-all');
                else onNavigateTab('crm');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onQuickCrmAction) onQuickCrmAction('invoiced-all');
                  else onNavigateTab('crm');
                }
              }}
              title="Click to view all invoiced quotations sorted by Highest Value"
              className="group bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-500 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-stone-400 block">
                    TOTAL AMOUNT OF MONEY
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-stone-400 opacity-0 group-hover:opacity-100 group-hover:text-amber-600 transition-all shrink-0"
                  />
                </div>
                <strong className="text-2xl sm:text-3xl font-black font-display text-stone-900 block mt-2 tracking-tight">
                  {formatINR(totalFurnitureBusiness)}
                </strong>
              </div>
              <span className="text-xs text-stone-400 group-hover:text-stone-600 mt-2 block transition-colors">
                Grand total of invoiced quotations
              </span>
            </motion.div>

            {/* Card 2: MONEY RECEIVED */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (onQuickCrmAction) onQuickCrmAction('invoiced-received');
                else onNavigateTab('crm');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onQuickCrmAction) onQuickCrmAction('invoiced-received');
                  else onNavigateTab('crm');
                }
              }}
              title="Click to view invoiced quotations with Received Amount > 0"
              className="group bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-stone-400 block">
                    MONEY RECEIVED
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  />
                </div>
                <strong className="text-2xl sm:text-3xl font-black font-display text-[#16a34a] block mt-2 tracking-tight">
                  {formatINR(moneyReceived)}
                </strong>
              </div>
              <span className="text-xs text-stone-400 group-hover:text-stone-600 mt-2 block transition-colors">
                Payments received on invoiced quotations
              </span>
            </motion.div>

            {/* Card 3: MONEY DUE */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (onQuickCrmAction) onQuickCrmAction('invoiced-due');
                else onNavigateTab('crm');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onQuickCrmAction) onQuickCrmAction('invoiced-due');
                  else onNavigateTab('crm');
                }
              }}
              title="Click to view invoiced quotations with Balance Amount > 0"
              className="group bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between relative cursor-pointer hover:border-rose-400 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-stone-400 block">
                    MONEY DUE
                  </span>
                  <strong className="text-2xl sm:text-3xl font-black font-display text-[#dc2626] block mt-2 tracking-tight">
                    {formatINR(moneyDue)}
                  </strong>
                </div>
                <div className="flex items-center gap-1.5 mt-1 shrink-0">
                  <ArrowUpRight
                    size={14}
                    className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626] inline-block shrink-0" />
                </div>
              </div>
              {overpaymentAmount > 0 ? (
                <span className="text-xs text-emerald-600 font-semibold mt-2 block">
                  Overpayment recorded: {formatINR(overpaymentAmount)}
                </span>
              ) : (
                <span className="text-xs text-stone-400 group-hover:text-stone-600 mt-2 block transition-colors">
                  Balance due on invoiced quotations
                </span>
              )}
            </motion.div>
          </div>

          {/* Row 2: Operational Volume KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 4: TOTAL FINALIZED ORDERS */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              onClick={() => onNavigateTab('orders')}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-amber-500 transition"
            >
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-stone-400 block">
                  TOTAL FINALIZED ORDERS
                </span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl sm:text-3xl font-black font-display text-[#92400e]">
                    {finalizedOrdersCount}
                  </span>
                  <span className="text-sm font-bold text-stone-800">Orders</span>
                </div>
              </div>
              <span className="text-xs text-stone-400 mt-2 block">
                Total volume of finalized/invoiced orders
              </span>
              <CheckCircle2
                size={56}
                strokeWidth={1.5}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-100 pointer-events-none"
              />
            </motion.div>

            {/* Card 5: ONGOING IN FACTORY */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              onClick={() => onNavigateTab('orders')}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-amber-500 transition"
            >
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-stone-400 block">
                  ONGOING IN FACTORY
                </span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl sm:text-3xl font-black font-display text-[#92400e]">
                    {ongoingInFactory}
                  </span>
                  <span className="text-sm font-bold text-stone-800">Orders</span>
                </div>
              </div>
              <span className="text-xs text-stone-400 mt-2 block">
                Orders currently in the factory pipeline
              </span>
              <Boxes
                size={56}
                strokeWidth={1.5}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-100 pointer-events-none"
              />
            </motion.div>

            {/* Card 6: QUOTATION PIPELINE */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              onClick={() => onNavigateTab('crm')}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs relative overflow-hidden flex flex-col justify-between cursor-pointer hover:border-amber-500 transition"
            >
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-stone-400 block">
                  QUOTATION PIPELINE
                </span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-2xl sm:text-3xl font-black font-display text-stone-900">
                    {quotationStats.total}
                  </span>
                  <span className="text-sm font-bold text-stone-800">Quotations</span>
                </div>
              </div>
              <span className="text-xs text-stone-400 mt-2 block">
                Potential orders from quotations
              </span>
              <FileText
                size={56}
                strokeWidth={1.5}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-100 pointer-events-none"
              />
            </motion.div>
          </div>
        </div>

        {/* MIDDLE SECTION - Quotation Pipeline & Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Card: Quotation Pipeline Stepper */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3">
              <h2 className="font-display font-black text-stone-900 text-base">Quotation Pipeline</h2>
              <span className="bg-[#fff7ed] text-[#ea580c] border border-[#ffedd5] font-bold text-xs px-3 py-1 rounded-full">
                {quotationStats.conversionRate}% Conversion
              </span>
            </div>

            <div className="py-8 px-4 relative flex items-center justify-between w-full">
              {/* Connecting line */}
              <div className="absolute top-[48px] left-10 right-10 h-0.5 bg-stone-200 -translate-y-1/2 z-0" />

              {/* Step 1: Draft */}
              <div className="relative z-10 flex flex-col items-center select-none">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-white border-2 border-stone-300 text-stone-700 shadow-xs">
                  {quotationStats.draft}
                </div>
                <span className="text-xs font-semibold text-stone-600 mt-3">Draft</span>
              </div>

              {/* Step 2: Sent */}
              <div className="relative z-10 flex flex-col items-center select-none">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-[#f0f9ff] border-2 border-[#bae6fd] text-[#0284c7] shadow-xs">
                  {quotationStats.sent}
                </div>
                <span className="text-xs font-semibold text-stone-600 mt-3">Sent</span>
              </div>

              {/* Step 3: Approved */}
              <div className="relative z-10 flex flex-col items-center select-none">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-[#f0fdf4] border-2 border-[#bbf7d0] text-[#16a34a] shadow-xs">
                  {quotationStats.approved}
                </div>
                <span className="text-xs font-semibold text-stone-600 mt-3">Approved</span>
              </div>

              {/* Step 4: Rejected / Expired */}
              <div className="relative z-10 flex flex-col items-center select-none">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-[#fef2f2] border-2 border-[#fecaca] text-[#dc2626] shadow-xs">
                  {quotationStats.rejectedExpired}
                </div>
                <span className="text-xs font-semibold text-stone-600 mt-3">Rejected/Expired</span>
              </div>
            </div>
          </div>

          {/* Right Card: Financial Overview Progress Bars */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div className="pb-2">
              <h2 className="font-display font-black text-stone-900 text-base">Financial Overview</h2>
            </div>

            <div className="space-y-4 py-2">
              {/* Total Business */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1.5">
                  <span>Total Business</span>
                  <span className="font-mono font-bold text-stone-900">{formatLakhs(totalFurnitureBusiness)}</span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-stone-900 rounded-full w-full" />
                </div>
              </div>

              {/* Received */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1.5">
                  <span>Received</span>
                  <span className="font-mono font-bold text-[#16a34a]">{formatLakhs(moneyReceived)}</span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#16a34a] rounded-full transition-all duration-500"
                    style={{
                      width: `${totalFurnitureBusiness > 0 ? Math.min(100, Math.round((moneyReceived / totalFurnitureBusiness) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Due */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1.5">
                  <span>Due</span>
                  <span className="font-mono font-bold text-[#dc2626]">{formatLakhs(moneyDue)}</span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#dc2626] rounded-full transition-all duration-500"
                    style={{
                      width: `${totalFurnitureBusiness > 0 ? Math.min(100, Math.round((moneyDue / totalFurnitureBusiness) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCTION PIPELINE SECTION (10 Stages Stepper) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="pb-4">
            <h2 className="font-display font-black text-stone-900 text-base">Production Pipeline</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Live tracking of {ongoingInFactory} active orders across workshop stages
            </p>
          </div>

          <div className="overflow-x-auto no-scrollbar w-full py-4">
            <div className="relative flex justify-between items-center min-w-[860px] px-4">
              {/* Connecting Line */}
              <div className="absolute top-[20px] left-6 right-6 h-0.5 bg-stone-200 -translate-y-1/2 z-0" />

              {productionStages.map((stage) => {
                const isActive = stage.count > 0;
                return (
                  <div key={stage.name} className="relative z-10 flex flex-col items-center select-none w-20 shrink-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-xs transition-all ${
                        isActive
                          ? `${stage.badgeBg} text-white`
                          : 'bg-stone-100 text-stone-400 border border-stone-200'
                      }`}
                    >
                      {stage.count}
                    </div>
                    <span
                      className={`text-[9.5px] font-black text-center mt-2.5 uppercase tracking-wider block truncate w-full ${
                        isActive ? stage.activeText : 'text-stone-400'
                      }`}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION - Upcoming Deliveries & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Card: Upcoming Deliveries */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-2">
                <h2 className="font-display font-black text-stone-900 text-base">Upcoming Deliveries</h2>
                <button
                  onClick={() => onNavigateTab('calendar')}
                  className="border border-stone-900 text-stone-900 px-2 py-0.5 rounded text-[11px] font-bold hover:bg-stone-900 hover:text-white transition cursor-pointer"
                >
                  View Calendar
                </button>
              </div>

              <div className="space-y-3 mt-3">
                {upcomingDeliveries.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs">No pending upcoming deliveries</div>
                ) : (
                  upcomingDeliveries.map((ord) => {
                    const cust = customers.find((c) => c.id === ord.customer_id);
                    const dateInfo = parseDateBadge(ord.delivery_date);
                    const overdue = isDateOverdue(ord.delivery_date);

                    return (
                      <div
                        key={ord.id}
                        onClick={() => onViewOrder(ord.id)}
                        className={`flex items-center gap-3.5 p-3 rounded-xl border bg-stone-50/50 hover:bg-stone-50 transition cursor-pointer ${
                          overdue ? 'border-l-4 border-l-rose-500 border-stone-200' : 'border-stone-200'
                        }`}
                      >
                        {/* Date Badge */}
                        <div className="bg-white border border-stone-200 rounded-lg w-12 h-12 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[11px] font-bold text-stone-900 leading-none">{dateInfo.dayMonth}</span>
                          <span className="text-[9px] text-stone-400 leading-none mt-1">{dateInfo.year}</span>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="font-bold text-stone-900 text-xs truncate">
                              {cust?.name || 'Walk-in Customer'}
                            </h3>
                            {overdue && (
                              <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[9.5px] font-bold px-1.5 py-0.5 rounded">
                                Overdue
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[10.5px] text-[#b45309] font-bold block mt-0.5">
                            {ord.article_no}
                          </span>
                          <p className="text-[11px] text-stone-500 truncate mt-0.5">
                            {ord.category || 'Custom Furniture'} {ord.sub_category ? `> ${ord.sub_category}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Card: Recent Orders */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-2">
                <h2 className="font-display font-black text-stone-900 text-base">Recent Orders</h2>
                <button
                  onClick={() => onNavigateTab('orders')}
                  className="text-xs text-stone-600 font-semibold hover:text-stone-900 hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="font-mono text-[10px] uppercase text-stone-500 font-bold border-b border-stone-100">
                      <th className="py-2.5">ARTICLE NO.</th>
                      <th className="py-2.5">CUSTOMER</th>
                      <th className="py-2.5">STAGE</th>
                      <th className="py-2.5 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {[...(filteredOrders.length > 0 ? filteredOrders : orders)]
                      .sort(compareOrdersByArticleSerialDesc)
                      .slice(0, 4)
                      .map((ord) => {
                        const cust = customers.find((c) => c.id === ord.customer_id);
                        return (
                          <tr
                            key={ord.id}
                            className="hover:bg-stone-50/70 transition cursor-pointer"
                            onClick={() => onViewOrder(ord.id)}
                          >
                            <td className="py-3 font-mono font-bold text-[#b45309]">
                              {ord.article_no}
                            </td>
                            <td className="py-3 font-semibold text-stone-800">
                              {cust?.name || 'Walk-in Customer'}
                            </td>
                            <td className="py-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStageBadgeStyle(
                                  ord.current_status
                                )}`}
                              >
                                {ord.current_status}
                              </span>
                            </td>
                            <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onViewOrder(ord.id)}
                                className="text-stone-500 hover:text-stone-900 p-1 hover:bg-stone-100 rounded transition cursor-pointer"
                                title="View Details"
                              >
                                <Eye size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }
