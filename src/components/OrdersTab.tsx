/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Order,
  User,
  Customer,
  CRMCustomer,
  CRMQuotation,
  StatusLog,
  Payment,
  normalizeStage,
} from '../types';
import { formatToDDMMYYYY } from '../utils';
import {
  PIPELINE_STAGES,
  ALL_STAGES_FILTER,
  PipelineStageKey,
  OrdersStatusFilter,
  OrdersPriorityFilter,
  OrdersSortOption,
  computeOrdersKPIs,
  computeStageCounts,
  filterAndSortOrders,
  resolveOrderDetailsContext,
  mapOrderToPipelineStage,
  getPipelineStageIndex,
  isOrderOverdue,
  isOrderCompleted,
  isOrderDispatched,
  buildOrdersCSV,
  formatCurrencyINR,
} from './orderHelpers';
import OrderDetailsPanel from './OrderDetailsPanel';
import {
  OrderJobCardModal,
  OrderShippingLabelModal,
  QuotationContextModal,
} from './OrderPrintModals';
import {
  Search,
  Eye,
  Plus,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  SlidersHorizontal,
  Trash2,
  Loader2,
  Download,
  RefreshCw,
  Clock,
  CheckCircle2,
  ClipboardList,
  Layers,
  UserX,
  Compass,
  Trees,
  Hammer,
  Cpu,
  Wrench,
  ShieldCheck,
  PackageCheck,
  Sparkles,
  Award,
  Truck,
  LayoutList,
  LayoutGrid,
  X,
  Link2,
  Zap,
  AlertCircle,
} from 'lucide-react';

export interface OrdersTabProps {
  orders: Order[];
  users: User[];
  customers: Customer[];
  payments: Payment[];
  statusLogs?: StatusLog[];
  crmQuotations?: CRMQuotation[];
  crmCustomers?: CRMCustomer[];
  currentUser?: User | null;
  onViewOrder: (orderId: string) => void;
  onUpdateOrder?: (updatedOrder: Order, newLog?: StatusLog) => void;
  onNavigateTab: (tabId: string) => void;
  isAdmin: boolean;
  onDeleteOrder?: (orderId: string) => void | Promise<void>;
  isDeletingOrderId?: string | null;
}

const STAGE_ICONS: Record<PipelineStageKey, React.ComponentType<{ size?: number; className?: string }>> = {
  Pending: Clock,
  Designing: Compass,
  'Wood Procurement': Trees,
  'Making Started': Hammer,
  'CNC Wood Carving': Cpu,
  Assembly: Wrench,
  'QC 1': ShieldCheck,
  'Making Completed': PackageCheck,
  Polish: Sparkles,
  'QC 2': Award,
  Delivery: Truck,
};

export default function OrdersTab({
  orders,
  users,
  customers,
  payments = [],
  statusLogs = [],
  crmQuotations = [],
  crmCustomers = [],
  currentUser = null,
  onViewOrder,
  onUpdateOrder,
  onNavigateTab,
  isAdmin,
  onDeleteOrder,
  isDeletingOrderId,
}: OrdersTabProps) {
  const canEdit = isAdmin || currentUser?.role === 'manager';

  // Search, Filters, Sorting
  const [searchTerm, setSearchTerm] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState<string>(ALL_STAGES_FILTER);
  const [statusFilter, setStatusFilter] = React.useState<OrdersStatusFilter>('All Status');
  const [craftsmanFilter, setCraftsmanFilter] = React.useState<string>('All');
  const [priorityFilter, setPriorityFilter] = React.useState<OrdersPriorityFilter>('All Priority');
  const [sortBy, setSortBy] = React.useState<OrdersSortOption>('newest');

  // View & Selection states
  const [viewMode, setViewMode] = React.useState<'table' | 'cards'>('table');
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<string[]>([]);
  const [activeOrderId, setActiveOrderId] = React.useState<string | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = React.useState(false);

  // Modals
  const [printModalType, setPrintModalType] = React.useState<'jobcard' | 'label' | 'quotation' | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // Horizontal Pipeline Stepper Scroll Ref
  const pipelineScrollRef = React.useRef<HTMLDivElement | null>(null);

  // Real-data KPIs & Stage Counts (calculated across all orders in Firestore)
  const kpis = React.useMemo(() => computeOrdersKPIs(orders), [orders]);
  const stageCounts = React.useMemo(() => computeStageCounts(orders), [orders]);

  // Filtered & Sorted Orders
  const filteredOrders = React.useMemo(
    () =>
      filterAndSortOrders(orders, customers, crmCustomers, users, {
        searchTerm,
        stageFilter,
        statusFilter,
        craftsmanFilter,
        priorityFilter,
        sortBy,
      }),
    [orders, customers, crmCustomers, users, searchTerm, stageFilter, statusFilter, craftsmanFilter, priorityFilter, sortBy]
  );

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stageFilter, statusFilter, craftsmanFilter, priorityFilter, sortBy, rowsPerPage]);

  // Keep activeOrderId valid if orders update or get deleted, auto-select first on desktop initial load only if unset?
  // Note: allow explicit closing (null) cleanly; only auto-clear if selected order was deleted.
  React.useEffect(() => {
    if (activeOrderId && !orders.some((o) => o.id === activeOrderId)) {
      setActiveOrderId(null);
      setIsMobileDrawerOpen(false);
    }
  }, [orders, activeOrderId]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const currentItems = filteredOrders.slice(startIndex, startIndex + rowsPerPage);

  const activeOrder = React.useMemo(
    () => (activeOrderId ? orders.find((o) => o.id === activeOrderId) || null : null),
    [orders, activeOrderId]
  );

  const activeOrderContext = React.useMemo(() => {
    if (!activeOrder) return null;
    return resolveOrderDetailsContext(
      activeOrder,
      orders,
      customers,
      crmCustomers,
      crmQuotations,
      payments,
      users,
      statusLogs
    );
  }, [activeOrder, orders, customers, crmCustomers, crmQuotations, payments, users, statusLogs]);

  // Craftsmen list for dropdown filter
  const craftsmenList = React.useMemo(
    () =>
      users.filter(
        (u) =>
          u.is_active !== false &&
          ['carpenter', 'polish_person', 'qc_staff', 'manager'].includes(u.role)
      ),
    [users]
  );

  // Selection helpers
  const pageOrderIds = currentItems.map((o) => o.id);
  const allPageSelected =
    pageOrderIds.length > 0 && pageOrderIds.every((id) => selectedOrderIds.includes(id));

  const toggleSelectPage = () => {
    if (allPageSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !pageOrderIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...pageOrderIds])));
    }
  };

  const toggleSelectRow = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectOrderForPanel = (orderId: string) => {
    setActiveOrderId(orderId);
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setIsMobileDrawerOpen(true);
    }
  };

  const handleStageNodeClick = (stageKey: PipelineStageKey) => {
    setStageFilter((prev) => (prev === stageKey ? ALL_STAGES_FILTER : stageKey));
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStageFilter(ALL_STAGES_FILTER);
    setStatusFilter('All Status');
    setCraftsmanFilter('All');
    setPriorityFilter('All Priority');
    setSortBy('newest');
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    stageFilter !== ALL_STAGES_FILTER ||
    statusFilter !== 'All Status' ||
    craftsmanFilter !== 'All' ||
    priorityFilter !== 'All Priority';

  const handleExportCSV = (subsetOnly = false) => {
    const targetOrders =
      subsetOnly && selectedOrderIds.length > 0
        ? orders.filter((o) => selectedOrderIds.includes(o.id))
        : filteredOrders;

    const csv = buildOrdersCSV(targetOrders, customers, crmCustomers, users, payments);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orderflow-orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scrollPipeline = () => {
    if (!pipelineScrollRef.current) return;
    const el = pipelineScrollRef.current;
    const nextLeft = el.scrollLeft + 280 >= el.scrollWidth - el.clientWidth ? 0 : el.scrollLeft + 280;
    el.scrollTo({ left: nextLeft, behavior: 'smooth' });
  };

  const getStageBadgeColor = (stageKey: PipelineStageKey, isDispatchedOrder: boolean) => {
    if (isDispatchedOrder) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    switch (stageKey) {
      case 'Pending':
        return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'Designing':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Wood Procurement':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'Making Started':
        return 'bg-orange-50 text-[#e05e00] border-orange-200';
      case 'CNC Wood Carving':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'Assembly':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'QC 1':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Making Completed':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Polish':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'QC 2':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Delivery':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  const getStageBarColor = (stageKey: PipelineStageKey) => {
    switch (stageKey) {
      case 'Pending':
        return 'bg-stone-400';
      case 'Designing':
      case 'Wood Procurement':
      case 'Making Started':
        return 'bg-[#e05e00]';
      case 'CNC Wood Carving':
      case 'Assembly':
      case 'QC 1':
        return 'bg-sky-600';
      case 'Making Completed':
      case 'Polish':
      case 'QC 2':
        return 'bg-teal-600';
      case 'Delivery':
        return 'bg-emerald-600';
    }
  };

  const selectedCraftsmanUser =
    craftsmanFilter !== 'All' && craftsmanFilter !== 'Unassigned'
      ? users.find((u) => u.id === craftsmanFilter)
      : null;

  return (
    <div className="space-y-4">
      {/* Main Orders Workspace Shell (hidden during modal print capture) */}
      <div className={`space-y-4 ${printModalType === 'jobcard' || printModalType === 'label' ? 'print:hidden' : ''}`}>
        {/* 1. Breadcrumb + Page Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
              <span>Workshop</span>
              <span>&rsaquo;</span>
              <span>Production Pipeline</span>
              <span>&rsaquo;</span>
              <span className="text-[#4a2c1b]">Orders Management</span>
            </div>
            <div className="flex items-center gap-2.5 mt-1 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black font-display text-stone-900 tracking-tight">
                Orders
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-[10px] font-mono font-bold text-stone-600 uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Firestore Synced • {orders.length} Records
              </span>
            </div>
            <p className="text-stone-500 text-xs mt-1">
              Manage workshop orders, artisan assignments, real-time production stages and dispatch timelines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('calendar')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
            >
              <Calendar size={14} className="text-stone-500" />
              <span>Production Schedule</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportCSV(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
            >
              <Download size={14} className="text-stone-500" />
              <span>Export Orders</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  alert(
                    "OrderFlow Pro Protocol: Orders must be placed through the CRM! Mark a CRM lead status as 'Order Confirmed' or approve a customer quotation to automatically queue a production order. Redirecting to CRM..."
                  );
                  onNavigateTab('crm');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#e05e00] hover:bg-[#c85200] text-white text-xs font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Place Order via CRM</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Top 6 KPI Stat Cards (100% Real Data) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Card 1: Total Orders */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-left bg-white p-3.5 rounded-2xl border border-stone-200/80 hover:border-stone-300 shadow-xs transition cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                Total Orders
              </span>
              <span className="h-7 w-7 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                <ClipboardList size={14} />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-stone-900 mt-1.5 tabular-nums">
              {kpis.totalOrders}
            </div>
            <div className="flex items-center justify-between gap-1 mt-1 text-[11px]">
              <span className="text-stone-500 truncate">All active &amp; booked</span>
              {kpis.urgentCount > 0 && (
                <span className="font-mono font-bold text-[#e05e00] shrink-0">
                  {kpis.urgentCount} rush
                </span>
              )}
            </div>
          </button>

          {/* Card 2: Active Floor */}
          <button
            type="button"
            onClick={() => {
              setStageFilter(ALL_STAGES_FILTER);
              setStatusFilter((prev) => (prev === 'In Progress' ? 'All Status' : 'In Progress'));
            }}
            className={`text-left bg-white p-3.5 rounded-2xl border shadow-xs transition cursor-pointer ${
              statusFilter === 'In Progress'
                ? 'border-sky-400 ring-1 ring-sky-200'
                : 'border-stone-200/80 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-700">
                Active Floor
              </span>
              <span className="h-7 w-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                <Hammer size={14} />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-sky-900 mt-1.5 tabular-nums">
              {kpis.activeFloorCount}
            </div>
            <div className="flex items-center justify-between gap-1 mt-1 text-[11px]">
              <span className="text-stone-500 truncate">On workshop floor</span>
              <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 font-mono font-bold text-[10px] tabular-nums shrink-0">
                {kpis.activeFloorPct}
              </span>
            </div>
          </button>

          {/* Card 3: Pending */}
          <button
            type="button"
            onClick={() =>
              setStageFilter((prev) => (prev === 'Pending' ? ALL_STAGES_FILTER : 'Pending'))
            }
            className={`text-left bg-white p-3.5 rounded-2xl border shadow-xs transition cursor-pointer ${
              stageFilter === 'Pending'
                ? 'border-[#e05e00] ring-1 ring-orange-200'
                : 'border-stone-200/80 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#e05e00]">
                Pending
              </span>
              <span className="h-7 w-7 rounded-lg bg-orange-50 text-[#e05e00] flex items-center justify-center shrink-0">
                <Layers size={14} />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-[#e05e00] mt-1.5 tabular-nums">
              {kpis.pendingCount}
            </div>
            <div className="flex items-center justify-between gap-1 mt-1 text-[11px]">
              <span className="text-stone-500 truncate">Awaiting lumber/draft</span>
              <span className="font-mono font-bold text-[#e05e00] text-[10px] tabular-nums shrink-0">
                {kpis.pendingPct}
              </span>
            </div>
          </button>

          {/* Card 4: Completed */}
          <button
            type="button"
            onClick={() => {
              setStageFilter(ALL_STAGES_FILTER);
              setStatusFilter((prev) => (prev === 'Ready' ? 'All Status' : 'Ready'));
            }}
            className={`text-left bg-white p-3.5 rounded-2xl border shadow-xs transition cursor-pointer ${
              statusFilter === 'Ready'
                ? 'border-emerald-400 ring-1 ring-emerald-200'
                : 'border-stone-200/80 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                Completed
              </span>
              <span className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-stone-900 mt-1.5 tabular-nums">
              {kpis.completedCount}
            </div>
            <div className="flex items-center justify-between gap-1 mt-1 text-[11px]">
              <span className="text-stone-500 truncate">Delivery &amp; dispatched</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[10px] shrink-0">
                Ready
              </span>
            </div>
          </button>

          {/* Card 5: Overdue Target */}
          <button
            type="button"
            onClick={() => {
              setStageFilter(ALL_STAGES_FILTER);
              setStatusFilter((prev) => (prev === 'Overdue' ? 'All Status' : 'Overdue'));
            }}
            className={`text-left bg-white p-3.5 rounded-2xl border shadow-xs transition cursor-pointer ${
              statusFilter === 'Overdue'
                ? 'border-rose-400 ring-1 ring-rose-200'
                : 'border-stone-200/80 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-700">
                Overdue Target
              </span>
              <span className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={14} />
              </span>
            </div>
            <div
              className={`text-2xl font-black font-display mt-1.5 tabular-nums ${
                kpis.overdueCount > 0 ? 'text-rose-600' : 'text-stone-900'
              }`}
            >
              {kpis.overdueCount}
            </div>
            <div className="flex items-center justify-between gap-1 mt-1 text-[11px]">
              <span className="text-stone-500 truncate">Behind schedule</span>
              <span
                className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] shrink-0 ${
                  kpis.overdueCount > 0
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {kpis.overdueCount > 0 ? 'Critical' : 'On Track'}
              </span>
            </div>
          </button>

          {/* Card 6: Unassigned */}
          <button
            type="button"
            onClick={() =>
              setCraftsmanFilter((prev) => (prev === 'Unassigned' ? 'All' : 'Unassigned'))
            }
            className={`text-left bg-white p-3.5 rounded-2xl border shadow-xs transition cursor-pointer ${
              craftsmanFilter === 'Unassigned'
                ? 'border-[#593622] ring-1 ring-amber-200'
                : 'border-stone-200/80 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                Unassigned
              </span>
              <span className="h-7 w-7 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                <UserX size={14} />
              </span>
            </div>
            <div className="text-2xl font-black font-display text-stone-900 mt-1.5 tabular-nums">
              {kpis.unassignedCount}
            </div>
            <div className="flex items-center justify-between gap-1 mt-1 text-[11px]">
              <span className="text-stone-500 truncate">Needs master lead</span>
              <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-mono font-bold text-[10px] shrink-0">
                {kpis.unassignedCount > 0 ? 'Assign' : 'All Set'}
              </span>
            </div>
          </button>
        </div>

        {/* 3. 11-Stage Workshop Pipeline Velocity Stepper */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e05e00]" />
              <h2 className="text-sm font-bold text-stone-900">
                11-Stage Workshop Pipeline Velocity
              </h2>
              <span className="text-xs text-stone-400">
                • Click any stage node to filter the active queue
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200 font-mono">
                <span className="text-stone-500">Total WIP:</span>{' '}
                <strong className="text-stone-900 tabular-nums">{kpis.totalWipUnits} units</strong>
              </div>
              <button
                type="button"
                onClick={scrollPipeline}
                className="inline-flex items-center gap-1 text-stone-500 hover:text-stone-900 font-semibold transition cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Scroll stages</span>
              </button>
            </div>
          </div>

          <div
            ref={pipelineScrollRef}
            className="relative overflow-x-auto no-scrollbar pb-1"
          >
            <div className="min-w-[980px] relative pt-1">
              {/* Connecting Horizontal Track Line */}
              <div className="absolute left-8 right-8 top-6 h-[2px] bg-stone-200 z-0" />

              <div className="grid grid-cols-11 gap-2 relative z-10">
                {PIPELINE_STAGES.map((stage) => {
                  const IconComp = STAGE_ICONS[stage.key];
                  const count = stageCounts[stage.key] || 0;
                  const isSelected = stageFilter === stage.key;
                  const isMakingOrActive = stage.step <= 4 && count > 0;

                  return (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => handleStageNodeClick(stage.key)}
                      title={`${stage.step}. ${stage.label}: ${count} orders`}
                      className="group flex flex-col items-center text-center focus:outline-none cursor-pointer"
                    >
                      <div
                        className={`relative h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-[#4a2c1b] text-white ring-4 ring-orange-200 shadow-sm scale-105'
                            : isMakingOrActive
                            ? 'bg-white border-2 border-[#e05e00] text-[#e05e00] group-hover:bg-orange-50'
                            : 'bg-white border border-stone-300 text-stone-500 group-hover:border-[#593622] group-hover:text-stone-800'
                        }`}
                      >
                        <IconComp size={15} />
                        <span
                          className={`absolute -top-1 -right-1 h-4 w-4 rounded-full text-[9px] font-mono font-bold flex items-center justify-center border ${
                            isSelected
                              ? 'bg-[#e05e00] text-white border-white'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {stage.step}
                        </span>
                      </div>

                      <span
                        className={`mt-2 text-[11px] leading-tight whitespace-nowrap transition ${
                          isSelected
                            ? 'font-black text-[#4a2c1b]'
                            : 'font-semibold text-stone-600 group-hover:text-stone-900'
                        }`}
                      >
                        {stage.shortLabel}
                      </span>

                      <span
                        className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums transition ${
                          isSelected
                            ? 'bg-[#4a2c1b] text-white'
                            : count > 0
                            ? 'bg-orange-50 text-[#9a4a18] border border-orange-200/70'
                            : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Search, Filter & Active Criteria Bar */}
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-3.5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            {/* Search Box */}
            <div className="md:col-span-4 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search article, QT ref, customer, phone or item..."
                className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] focus:bg-white rounded-xl text-xs font-medium text-stone-800 focus:outline-none transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Stage Dropdown */}
            <div className="md:col-span-2">
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                aria-label="Filter by stage"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs font-semibold text-stone-700 focus:outline-none transition"
              >
                <option value={ALL_STAGES_FILTER}>Stage: All ({orders.length})</option>
                {PIPELINE_STAGES.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.step}. {st.shortLabel} ({stageCounts[st.key] || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="md:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrdersStatusFilter)}
                aria-label="Filter by status"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs font-semibold text-stone-700 focus:outline-none transition"
              >
                <option value="All Status">Status: All</option>
                <option value="In Progress">In Progress</option>
                <option value="Ready">Ready / Delivered</option>
                <option value="Overdue">Overdue Target</option>
                <option value="Delayed">Flagged Delayed</option>
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>

            {/* Craftsman Dropdown */}
            <div className="md:col-span-2">
              <select
                value={craftsmanFilter}
                onChange={(e) => setCraftsmanFilter(e.target.value)}
                aria-label="Filter by craftsman"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs font-semibold text-stone-700 focus:outline-none transition"
              >
                <option value="All">Craftsman: All</option>
                <option value="Unassigned">Unassigned Only</option>
                {craftsmenList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.initials})
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="md:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as OrdersSortOption)}
                aria-label="Sort orders"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs font-semibold text-stone-700 focus:outline-none transition"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="due_asc">Sort: Due Date (Soonest)</option>
                <option value="due_desc">Sort: Due Date (Latest)</option>
                <option value="stage_asc">Sort: Stage (1 → 11)</option>
                <option value="stage_desc">Sort: Stage (11 → 1)</option>
              </select>
            </div>
          </div>

          {/* Active Criteria Chips & Layout Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400 mr-1">
                Active Criteria:
              </span>

              {searchTerm.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold cursor-pointer"
                >
                  <span>Query: {searchTerm}</span>
                  <X size={11} />
                </button>
              )}

              {stageFilter !== ALL_STAGES_FILTER && (
                <button
                  type="button"
                  onClick={() => setStageFilter(ALL_STAGES_FILTER)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 border border-orange-200 text-[#9a4a18] text-[11px] font-semibold cursor-pointer"
                >
                  <span>Stage: {stageFilter}</span>
                  <X size={11} />
                </button>
              )}

              {statusFilter !== 'All Status' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('All Status')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold cursor-pointer"
                >
                  <span>Status: {statusFilter}</span>
                  <X size={11} />
                </button>
              )}

              {craftsmanFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => setCraftsmanFilter('All')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold cursor-pointer"
                >
                  <span>
                    Craftsman: {craftsmanFilter === 'Unassigned' ? 'Unassigned' : selectedCraftsmanUser?.name || craftsmanFilter}
                  </span>
                  <X size={11} />
                </button>
              )}

              {priorityFilter !== 'All Priority' && (
                <button
                  type="button"
                  onClick={() => setPriorityFilter('All Priority')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[11px] font-semibold cursor-pointer"
                >
                  <span>Priority: {priorityFilter}</span>
                  <X size={11} />
                </button>
              )}

              {!hasActiveFilters && (
                <span className="text-[11px] text-stone-400">None (showing full pipeline)</span>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="ml-1 text-[11px] font-bold text-[#e05e00] hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-2 bg-[#4a2c1b] text-white px-2.5 py-1 rounded-lg text-[11px]">
                  <span className="font-mono font-bold tabular-nums">{selectedOrderIds.length} selected</span>
                  <button
                    type="button"
                    onClick={() => handleExportCSV(true)}
                    className="underline font-bold hover:text-amber-300 cursor-pointer"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderIds([])}
                    className="text-amber-200 hover:text-white cursor-pointer"
                    aria-label="Clear selected checkboxes"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <span className="text-stone-500 font-mono text-[11px] tabular-nums">
                Showing <strong className="text-stone-900">{filteredOrders.length}</strong> of{' '}
                <strong className="text-stone-900">{orders.length}</strong> orders
              </span>

              {/* View Mode Switcher (Table / Cards) */}
              <div className="hidden md:flex items-center rounded-lg border border-stone-200 bg-stone-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-[#4a2c1b] shadow-xs'
                      : 'text-stone-400 hover:text-stone-700'
                  }`}
                  title="Table View"
                  aria-label="Table View"
                >
                  <LayoutList size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-md transition cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white text-[#4a2c1b] shadow-xs'
                      : 'text-stone-400 hover:text-stone-700'
                  }`}
                  title="Card View"
                  aria-label="Card View"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Responsive Split Workspace: Order List (Left) + Sticky Order Details Panel (Right) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Left Queue Column */}
          <div className={activeOrder ? 'xl:col-span-7 min-w-0' : 'xl:col-span-12 min-w-0'}>
            <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
              {/* Desktop Table View (hidden on < md mobile, or when user chooses Card View) */}
              {viewMode === 'table' && (
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-700 border-collapse">
                    <thead>
                      <tr className="bg-stone-50/90 border-b border-stone-200/80 font-mono text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                        <th className="py-3 pl-3.5 pr-2 w-8">
                          <input
                            type="checkbox"
                            checked={allPageSelected}
                            onChange={toggleSelectPage}
                            aria-label="Select all orders on page"
                            className="h-3.5 w-3.5 rounded border-stone-300 text-[#4a2c1b] focus:ring-[#e05e00] cursor-pointer"
                          />
                        </th>
                        <th className="py-3 px-2.5 whitespace-nowrap">Priority</th>
                        <th className="py-3 px-2.5 whitespace-nowrap">Article &amp; QT</th>
                        <th className="py-3 px-2.5 whitespace-nowrap">Customer</th>
                        <th className="py-3 px-2.5">Product &amp; Spec</th>
                        <th className="py-3 px-2.5 whitespace-nowrap">Stage</th>
                        {!activeOrder && (
                          <>
                            <th className="py-3 px-2.5 whitespace-nowrap">Delivery</th>
                            <th className="py-3 px-2.5 whitespace-nowrap">Payment</th>
                          </>
                        )}
                        <th className="py-3 pl-2 pr-3.5 text-right whitespace-nowrap">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-stone-100">
                      {currentItems.length > 0 ? (
                        currentItems.map((order) => {
                          const cust =
                            crmCustomers.find((c) => c.id === order.customer_id) ||
                            customers.find((c) => c.id === order.customer_id);
                          const carpenter = users.find((u) => u.id === order.carpenter_id);
                          const pay = payments.find((p) => p.order_id === order.id);
                          const stageBucket = mapOrderToPipelineStage(order);
                          const stageIdx = getPipelineStageIndex(order);
                          const overdue = isOrderOverdue(order);
                          const completed = isOrderCompleted(order);
                          const dispatched = isOrderDispatched(order);
                          const isRowSelected = selectedOrderIds.includes(order.id);
                          const isActivePanelOrder = activeOrderId === order.id;
                          const quoteRef = order.quotation_ref || order.parent_order_id;
                          const progressPct = Math.round(((stageIdx + 1) / PIPELINE_STAGES.length) * 100);

                          return (
                            <tr
                              key={order.id}
                              onClick={() => handleSelectOrderForPanel(order.id)}
                              className={`cursor-pointer transition ${
                                isActivePanelOrder
                                  ? 'bg-[#fff7f0] ring-1 ring-inset ring-orange-200'
                                  : 'hover:bg-stone-50/80'
                              }`}
                            >
                              {/* Checkbox */}
                              <td
                                className="py-3 pl-3.5 pr-2 align-top"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isRowSelected}
                                  onChange={() => toggleSelectRow(order.id)}
                                  aria-label={`Select order ${order.article_no}`}
                                  className="h-3.5 w-3.5 mt-1 rounded border-stone-300 text-[#4a2c1b] focus:ring-[#e05e00] cursor-pointer"
                                />
                              </td>

                              {/* Priority Pill */}
                              <td className="py-3 px-2.5 align-top whitespace-nowrap">
                                {overdue ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-[10px] uppercase">
                                    <AlertTriangle size={10} />
                                    Overdue
                                  </span>
                                ) : order.priority === 'urgent' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[#e05e00] font-mono font-bold text-[10px] uppercase">
                                    <Zap size={10} />
                                    Rush
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-50 border border-stone-200 text-stone-600 font-mono font-bold text-[10px] uppercase">
                                    <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                                    Normal
                                  </span>
                                )}
                              </td>

                              {/* Article & QT */}
                              <td className="py-3 px-2.5 align-top whitespace-nowrap">
                                <div className="font-mono font-bold text-stone-900 text-xs">
                                  {order.article_no}
                                </div>
                                {quoteRef && (
                                  <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-[10px] font-mono font-medium text-stone-600">
                                    <Link2 size={9} className="text-stone-400" />
                                    <span>{quoteRef}</span>
                                  </div>
                                )}
                              </td>

                              {/* Customer */}
                              <td className="py-3 px-2.5 align-top">
                                <div className="font-bold text-stone-900 truncate max-w-[140px]">
                                  {cust?.name || 'Walk-In'}
                                </div>
                                <div className="text-[11px] font-mono text-stone-500 mt-0.5">
                                  {cust?.phone || '—'}
                                </div>
                                {(cust as CRMCustomer | undefined)?.source && (
                                  <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-[9.5px] font-medium text-stone-600">
                                    {(cust as CRMCustomer).source}
                                  </span>
                                )}
                              </td>

                              {/* Product & Spec */}
                              <td className="py-3 px-2.5 align-top max-w-[200px]">
                                <div className="font-bold text-stone-900 truncate">
                                  {order.sub_category || order.category}
                                </div>
                                <div className="text-[11px] text-stone-500 truncate mt-0.5">
                                  {[order.material, order.custom_size || order.size].filter(Boolean).join(' • ')}
                                </div>
                                <div className="text-[10.5px] font-mono text-stone-500 mt-0.5">
                                  Qty: {order.no_of_units || 1} ({order.finish || order.design_type})
                                </div>
                              </td>

                              {/* Stage & Progress */}
                              <td className="py-3 px-2.5 align-top whitespace-nowrap min-w-[130px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${getStageBadgeColor(
                                      stageBucket,
                                      dispatched
                                    )}`}
                                  >
                                    {dispatched ? 'Dispatched' : normalizeStage(order.current_status)}
                                  </span>
                                </div>
                                <div className="mt-1.5 w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${getStageBarColor(stageBucket)}`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <div className="mt-1 text-[10px] text-stone-500 flex items-center justify-between gap-1">
                                  <span className="truncate max-w-[95px]">
                                    {carpenter ? carpenter.name : 'Unassigned'}
                                  </span>
                                  <span className="font-mono text-stone-400 tabular-nums">
                                    {stageIdx + 1}/11
                                  </span>
                                </div>
                              </td>

                              {/* Extra columns revealed cleanly when right panel is closed */}
                              {!activeOrder && (
                                <>
                                  <td className="py-3 px-2.5 align-top whitespace-nowrap">
                                    <div
                                      className={`font-mono font-semibold text-xs ${
                                        overdue ? 'text-rose-600' : 'text-stone-700'
                                      }`}
                                    >
                                      {formatToDDMMYYYY(order.delivery_date) || '—'}
                                    </div>
                                    <div className="text-[10px] text-stone-400 mt-0.5">
                                      {completed ? 'Completed' : overdue ? 'Delayed' : 'Scheduled'}
                                    </div>
                                  </td>

                                  <td className="py-3 px-2.5 align-top whitespace-nowrap">
                                    {(() => {
                                      const totalAmt = pay ? Number(pay.total_amount) : Number(order.total_amount) || 0;
                                      const bal = pay
                                        ? Number(pay.balance_due)
                                        : Math.max(0, totalAmt - (Number(order.advance_paid) || 0));
                                      if (!pay && totalAmt === 0) {
                                        return (
                                          <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-500 font-mono font-bold text-[10px] uppercase">
                                            Unpaid
                                          </span>
                                        );
                                      }
                                      if (bal <= 0 && totalAmt > 0) {
                                        return (
                                          <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-[10px] uppercase">
                                            Paid
                                          </span>
                                        );
                                      }
                                      return (
                                        <div>
                                          <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-mono font-bold text-[10px] uppercase">
                                            Partial
                                          </span>
                                          <div className="text-[10px] font-mono text-stone-500 mt-0.5 tabular-nums">
                                            Due {formatCurrencyINR(bal)}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </td>
                                </>
                              )}

                              {/* Actions */}
                              <td
                                className="py-3 pl-2 pr-3.5 align-top text-right whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onViewOrder(order.id)}
                                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-[#4a2c1b] hover:text-white text-stone-600 transition cursor-pointer"
                                    title="Open full order workspace"
                                    aria-label={`Open full view for ${order.article_no}`}
                                  >
                                    <Eye size={13} />
                                  </button>

                                  {isAdmin && onDeleteOrder && (
                                    <button
                                      type="button"
                                      onClick={() => onDeleteOrder(order.id)}
                                      disabled={isDeletingOrderId === order.id}
                                      className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-600 hover:text-white text-rose-600 transition cursor-pointer disabled:opacity-45"
                                      title="Cancel & Delete Order"
                                      aria-label={`Delete order ${order.article_no}`}
                                    >
                                      {isDeletingOrderId === order.id ? (
                                        <Loader2 size={13} className="animate-spin" />
                                      ) : (
                                        <Trash2 size={13} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={activeOrder ? 7 : 9} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-stone-400">
                              <SlidersHorizontal size={24} className="mb-2 text-stone-300" />
                              <p className="text-xs font-bold text-stone-600">No Orders Found</p>
                              <p className="text-[11px] text-stone-400 mt-0.5">
                                Try adjusting or resetting your stage, craftsman, or search filters.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mobile & Card Grid View (always visible on < md mobile, or on desktop when viewMode === 'cards') */}
              <div
                className={`${
                  viewMode === 'cards' ? 'grid' : 'grid md:hidden'
                } grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#fcfcfb]`}
              >
                {currentItems.length > 0 ? (
                  currentItems.map((order) => {
                    const cust =
                      crmCustomers.find((c) => c.id === order.customer_id) ||
                      customers.find((c) => c.id === order.customer_id);
                    const carpenter = users.find((u) => u.id === order.carpenter_id);
                    const stageBucket = mapOrderToPipelineStage(order);
                    const stageIdx = getPipelineStageIndex(order);
                    const overdue = isOrderOverdue(order);
                    const dispatched = isOrderDispatched(order);
                    const isActivePanelOrder = activeOrderId === order.id;
                    const quoteRef = order.quotation_ref || order.parent_order_id;
                    const progressPct = Math.round(((stageIdx + 1) / PIPELINE_STAGES.length) * 100);

                    return (
                      <div
                        key={order.id}
                        onClick={() => handleSelectOrderForPanel(order.id)}
                        className={`rounded-xl border p-3.5 bg-white cursor-pointer transition space-y-2.5 ${
                          isActivePanelOrder
                            ? 'border-[#e05e00] ring-2 ring-orange-100'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono font-black text-stone-900 text-xs">
                              {order.article_no}
                            </div>
                            {quoteRef && (
                              <span className="text-[10px] font-mono text-stone-500">
                                {quoteRef}
                              </span>
                            )}
                          </div>
                          {overdue ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-mono font-bold text-[10px] uppercase">
                              Overdue
                            </span>
                          ) : order.priority === 'urgent' ? (
                            <span className="px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[#e05e00] font-mono font-bold text-[10px] uppercase">
                              Rush
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 font-mono font-bold text-[10px] uppercase">
                              Normal
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-stone-900 truncate">
                            {cust?.name || 'Walk-In'}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate">
                            {order.sub_category || order.category} • Qty: {order.no_of_units || 1}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span
                              className={`px-2 py-0.5 rounded border font-bold ${getStageBadgeColor(
                                stageBucket,
                                dispatched
                              )}`}
                            >
                              {dispatched ? 'Dispatched' : normalizeStage(order.current_status)}
                            </span>
                            <span className="font-mono text-stone-400 tabular-nums">
                              Stage {stageIdx + 1}/11
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getStageBarColor(stageBucket)}`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        <div
                          className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-stone-500 truncate">
                            Lead: <strong className="text-stone-800">{carpenter?.name || 'Unassigned'}</strong>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectOrderForPanel(order.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#4a2c1b] text-white text-[10px] font-bold cursor-pointer"
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => onViewOrder(order.id)}
                              className="p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                              title="Full details"
                            >
                              <Eye size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-12 text-center text-stone-400">
                    <AlertCircle size={24} className="mx-auto mb-2 text-stone-300" />
                    <p className="text-xs font-bold text-stone-600">No Orders Found</p>
                  </div>
                )}
              </div>

              {/* Pagination & Rows-per-page Footer */}
              <div className="p-3.5 bg-stone-50 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span>Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    aria-label="Rows per page"
                    className="px-2 py-1 rounded-lg bg-white border border-stone-200 font-bold text-stone-800 focus:outline-none focus:border-[#593622]"
                  >
                    {[10, 25, 50, 100].map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                  <span className="ml-2 text-stone-500 tabular-nums">
                    Showing{' '}
                    <strong className="text-stone-800">
                      {filteredOrders.length === 0 ? 0 : startIndex + 1}
                    </strong>{' '}
                    to{' '}
                    <strong className="text-stone-800">
                      {Math.min(startIndex + rowsPerPage, filteredOrders.length)}
                    </strong>{' '}
                    of <strong className="text-stone-800">{filteredOrders.length}</strong> orders
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft size={12} />
                    <span>Prev</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - safePage) <= 1
                    )
                    .map((pageNum, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      return (
                        <React.Fragment key={pageNum}>
                          {prevPage && pageNum - prevPage > 1 && (
                            <span className="px-1 text-stone-400">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`h-7 min-w-[28px] px-2 rounded-lg font-bold transition tabular-nums cursor-pointer ${
                              safePage === pageNum
                                ? 'bg-[#4a2c1b] text-white'
                                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 transition cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sticky Details Panel (Desktop xl+) */}
          {activeOrder && activeOrderContext && (
            <div className="hidden xl:block xl:col-span-5 xl:sticky xl:top-4">
              <OrderDetailsPanel
                order={activeOrder}
                context={activeOrderContext}
                users={users}
                currentUser={currentUser}
                canEdit={canEdit}
                onClose={() => {
                  setActiveOrderId(null);
                  setIsMobileDrawerOpen(false);
                }}
                onUpdateOrder={onUpdateOrder}
                onOpenFullView={onViewOrder}
                onOpenJobCard={() => setPrintModalType('jobcard')}
                onOpenShippingLabel={() => setPrintModalType('label')}
                onOpenQuotation={() => setPrintModalType('quotation')}
                onNavigateTab={onNavigateTab}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tablet & Mobile Slide-Over Details Drawer (< xl viewports) */}
      {activeOrder && activeOrderContext && isMobileDrawerOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-xs print:hidden">
          <div
            className="flex-1"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto p-3 sm:p-4 shadow-2xl">
            <OrderDetailsPanel
              order={activeOrder}
              context={activeOrderContext}
              users={users}
              currentUser={currentUser}
              canEdit={canEdit}
              onClose={() => {
                setIsMobileDrawerOpen(false);
                setActiveOrderId(null);
              }}
              onUpdateOrder={onUpdateOrder}
              onOpenFullView={onViewOrder}
              onOpenJobCard={() => setPrintModalType('jobcard')}
              onOpenShippingLabel={() => setPrintModalType('label')}
              onOpenQuotation={() => setPrintModalType('quotation')}
              onNavigateTab={onNavigateTab}
            />
          </div>
        </div>
      )}

      {/* Printable Job Card Modal */}
      {printModalType === 'jobcard' && activeOrder && activeOrderContext && (
        <OrderJobCardModal
          order={activeOrder}
          context={activeOrderContext}
          onClose={() => setPrintModalType(null)}
        />
      )}

      {/* Printable Shipping Label Modal */}
      {printModalType === 'label' && activeOrder && activeOrderContext && (
        <OrderShippingLabelModal
          order={activeOrder}
          context={activeOrderContext}
          onClose={() => setPrintModalType(null)}
        />
      )}

      {/* Quotation Context Quick-View Modal */}
      {printModalType === 'quotation' && activeOrderContext?.quotation && (
        <QuotationContextModal
          quotation={activeOrderContext.quotation}
          context={activeOrderContext}
          onClose={() => setPrintModalType(null)}
          onGoToCRM={() => onNavigateTab('crm')}
        />
      )}
    </div>
  );
}
