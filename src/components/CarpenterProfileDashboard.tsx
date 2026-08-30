/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { User, Order, StatusLog, Customer } from '../types';
import {  
  ShieldCheck,
  RefreshCw,
  Bell,
  CheckCircle2,
  Wallet,
  Clock,
  ChevronRight,
  Bed,
  Utensils,
  Armchair,
  Box,
  Check,
  ClipboardList,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface CarpenterProfileDashboardProps {
  currentUser: User;
  users?: User[];
  orders: Order[];
  customers: Customer[];
  statusLogs: StatusLog[];
  onRefresh?: () => void;
}

type DateFilterType = 'current_month' | 'previous_month' | 'last_3_months' | 'custom';

export default function CarpenterProfileDashboard({
  currentUser,
  users = [],
  orders = [],
  customers = [],
  statusLogs = [],
  onRefresh,
}: CarpenterProfileDashboardProps) {
  // Allow admin/manager to switch carpenter view if desired, default to currentUser
  const [selectedCarpenterId, setSelectedCarpenterId] = useState<string>(currentUser.id);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('current_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Target user profile
  const targetUser = useMemo(() => {
    if (selectedCarpenterId === currentUser.id) return currentUser;
    return users.find((u) => u.id === selectedCarpenterId) || currentUser;
  }, [selectedCarpenterId, currentUser, users]);

  // List of carpenters for dropdown selection (if admin/manager)
  const carpentersList = useMemo(() => {
    return users.filter((u) => u.role === 'carpenter' || u.role === 'polish_person');
  }, [users]);

  const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager';

  // Manual refresh animation handler
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Helper date range filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (dateFilter === 'current_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (dateFilter === 'previous_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (dateFilter === 'last_3_months') {
      start = new Date();
      start.setDate(now.getDate() - 90);
      end = now;
    } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59);
    }

    // Previous equivalent period for growth calculations
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start.getTime() - 1);

    return { start, end, prevStart, prevEnd };
  }, [dateFilter, customStartDate, customEndDate]);

  // Filter orders belonging to target carpenter / staff member
  const carpenterOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!o) return false;
      const cId = o.carpenter_id || '';
      const pId = o.polish_person_id || '';
      const nameMatch = targetUser.name.toLowerCase();
      return (
        cId === targetUser.id ||
        cId.toLowerCase() === nameMatch ||
        pId === targetUser.id ||
        pId.toLowerCase() === nameMatch
      );
    });
  }, [orders, targetUser]);

  // Orders in selected period
  const ordersInPeriod = useMemo(() => {
    return carpenterOrders.filter((o) => {
      const orderDate = new Date(o.order_date || o.created_at);
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });
  }, [carpenterOrders, dateRange]);

  // Orders in previous period (for growth comparison)
  const prevOrdersInPeriod = useMemo(() => {
    return carpenterOrders.filter((o) => {
      const orderDate = new Date(o.order_date || o.created_at);
      return orderDate >= dateRange.prevStart && orderDate <= dateRange.prevEnd;
    });
  }, [carpenterOrders, dateRange]);

  // Helper to extract labour rate for target user on a given order
  const getLabourRate = (o: Order, user: User): number => {
    if (!o) return 0;
    if (user.role === 'polish_person' || o.polish_person_id === user.id) {
      const pRate = o.polish_labour_rate;
      if (typeof pRate === 'number' && !isNaN(pRate)) return pRate;
      if (pRate !== undefined && pRate !== null && !isNaN(Number(pRate))) return Number(pRate);
    }
    const cRate = o.carpenter_labour_rate;
    if (typeof cRate === 'number' && !isNaN(cRate)) return cRate;
    if (cRate !== undefined && cRate !== null && !isNaN(Number(cRate))) return Number(cRate);
    return 0;
  };

  const isOrderFinalized = (status: string): boolean =>
    status === 'Completed' || status === 'Delivered';

  const isOrderLogistics = (status: string): boolean =>
    isOrderFinalized(status) || status === 'Dispatched';

  const isPendingApprovalStage = (status: string): boolean =>
    ['QC 1', 'QC Check 1', 'QC 2', 'QC Check 2', 'Pending'].includes(status);

  // KPI Calculations (Strict Real Database Queries)
  const kpis = useMemo(() => {
    const totalAssigned = ordersInPeriod.length;
    const prevTotalAssigned = prevOrdersInPeriod.length;

    // Growth %
    const orderGrowth = prevTotalAssigned > 0
      ? Math.round(((totalAssigned - prevTotalAssigned) / prevTotalAssigned) * 100)
      : totalAssigned > 0 ? 100 : 0;

    // Total Assigned Labour Value
    const assignedValue = ordersInPeriod.reduce(
      (sum, o) => sum + getLabourRate(o, targetUser),
      0
    );

    // Completed Orders in Period
    const completedOrders = ordersInPeriod.filter(
      (o) => isOrderFinalized(o.current_status) || o.carpenter_sub_status === 'completed'
    );
    const completedCount = completedOrders.length;

    // Completion Rate
    const completionRate = totalAssigned > 0
      ? Math.round((completedCount / totalAssigned) * 100)
      : 0;

    // Completed Labour Earnings
    const completedValue = completedOrders.reduce(
      (sum, o) => sum + getLabourRate(o, targetUser),
      0
    );

    // Completion Target %
    const completedValueTarget = assignedValue > 0
      ? Math.round((completedValue / assignedValue) * 100)
      : 0;

    return {
      totalAssigned,
      orderGrowth,
      assignedValue,
      completedCount,
      completionRate,
      completedValue,
      completedValueTarget,
    };
  }, [ordersInPeriod, prevOrdersInPeriod, targetUser]);


  // Work Stage Status Metrics (Total Work, Wood Procurement, Under Carpentry, QC 1 Inspection, Completed)
  const stageMetrics = useMemo(() => {
    const total = carpenterOrders.length;
    let woodPending = 0;
    let underCarpentry = 0;
    let qc1Pending = 0;
    let completed = 0;

    carpenterOrders.forEach((o) => {
      const isDone =
        o.carpenter_sub_status === 'completed' ||
        o.qc_1_status === 'passed' ||
        o.current_status === 'Making Completed' ||
        ['Polish', 'QC 2', 'Ready to Dispatch', 'Dispatched', 'Completed', 'Delivered'].includes(o.current_status);

      if (isDone) {
        completed++;
      } else if (o.carpenter_sub_status === 'wood_procurement' || o.current_status === 'Wood Procurement') {
        woodPending++;
      } else if (o.carpenter_sub_status === 'under_carpentry' || o.current_status === 'Making Started') {
        underCarpentry++;
      } else if (o.carpenter_sub_status === 'qc_check_1' || o.current_status === 'QC 1' || o.current_status === 'QC Check 1') {
        qc1Pending++;
      }
    });

    return {
      total,
      woodPending,
      underCarpentry,
      qc1Pending,
      completed,
    };
  }, [carpenterOrders]);


  // Workload Status Breakdown
  const workloadStatus = useMemo(() => {
    const active = carpenterOrders.filter(
      (o) => !isOrderFinalized(o.current_status)
    ).length;

    const pendingApprovals = carpenterOrders.filter(
      (o) => isPendingApprovalStage(o.current_status)
    ).length;

    const todayStr = new Date().toISOString().split('T')[0];
    const completedToday = carpenterOrders.filter((o) => {
      const isComp = isOrderFinalized(o.current_status) || o.carpenter_sub_status === 'completed';
      const isToday = (o.updated_at || o.created_at || '').startsWith(todayStr);
      return isComp && isToday;
    }).length;

    return {
      active,
      pendingApprovals,
      completedToday,
    };
  }, [carpenterOrders]);

  // Productivity % and Avg Completion Time
  const productivityStats = useMemo(() => {
    const total = carpenterOrders.length;
    const completed = carpenterOrders.filter(
      (o) => isOrderFinalized(o.current_status) || o.carpenter_sub_status === 'completed'
    );

    const overallRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    // Calculate avg completion time in days
    let totalDays = 0;
    let counted = 0;

    completed.forEach((o) => {
      if (o.order_date && o.updated_at) {
        const start = new Date(o.order_date).getTime();
        const end = new Date(o.updated_at).getTime();
        const diffDays = Math.max(0.5, (end - start) / (1000 * 60 * 60 * 24));
        totalDays += diffDays;
        counted++;
      }
    });

    const avgDays = counted > 0 ? (totalDays / counted).toFixed(1) : '0';

    return {
      overallRate,
      avgDays,
    };
  }, [carpenterOrders]);

  // Timeline Events for Current Month
  const timelineMilestones = useMemo(() => {
    const events: Array<{
      id: string;
      title: string;
      customer: string;
      date: string;
      stage: 'Completed' | 'Logistics' | 'Working' | 'Pending';
      week: 1 | 2 | 3 | 4;
    }> = [];

    ordersInPeriod.forEach((o) => {
      const cust = customers.find((c) => c.id === o.customer_id)?.name || 'Client';
      const orderDate = new Date(o.order_date || o.created_at);
      const dayOfMonth = orderDate.getDate();
      const week: 1 | 2 | 3 | 4 = dayOfMonth <= 7 ? 1 : dayOfMonth <= 14 ? 2 : dayOfMonth <= 21 ? 3 : 4;

      let stage: 'Completed' | 'Logistics' | 'Working' | 'Pending' = 'Working';
      if (isOrderFinalized(o.current_status) || o.carpenter_sub_status === 'completed') stage = 'Completed';
      else if (isOrderLogistics(o.current_status)) stage = 'Logistics';
      else if (['Pending', 'Designing', 'Design'].includes(o.current_status)) stage = 'Pending';


      const prodName = `${o.sub_category || o.category || 'Order'} (${stage})`;

      events.push({
        id: o.id,
        title: prodName,
        customer: cust,
        date: o.order_date || new Date().toISOString().split('T')[0],
        stage,
        week,
      });
    });

    return events.slice(0, 4);
  }, [ordersInPeriod, customers]);

  // Chart Data: Orders Completed This Month (grouped by Day of Week)
  const chartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };

    ordersInPeriod.forEach((o) => {
      if (isOrderFinalized(o.current_status) || o.carpenter_sub_status === 'completed') {
        const d = new Date(o.updated_at || o.order_date || o.created_at);
        const dayIdx = (d.getDay() + 6) % 7; // Convert Sun=0 to Mon=0
        const dayName = days[dayIdx];
        counts[dayName] = (counts[dayName] || 0) + 1;
      }
    });

    return days.map((day) => ({
      day,
      completed: counts[day] || 0,
    }));
  }, [ordersInPeriod]);

  // Product Category Statistics (Beds, Dining Tables, Sofa Sets, Wardrobes)
  const productStats = useMemo(() => {
    const cats = [
      { key: 'bed', name: 'BED UNITS', icon: Bed },
      { key: 'table', name: 'DINING TABLES', icon: Utensils },
      { key: 'sofa', name: 'SOFA SETS', icon: Armchair },
      { key: 'wardrobe', name: 'WARDROBES', icon: Box },
    ];

    return cats.map((cat) => {
      const currCount = ordersInPeriod.filter((o) => {
        const sub = (o.sub_category || '').toLowerCase();
        const mainCat = (o.category || '').toLowerCase();
        return sub.includes(cat.key) || mainCat.includes(cat.key);
      }).length;

      const prevCount = prevOrdersInPeriod.filter((o) => {
        const sub = (o.sub_category || '').toLowerCase();
        const mainCat = (o.category || '').toLowerCase();
        return sub.includes(cat.key) || mainCat.includes(cat.key);
      }).length;

      let growthStr = '0%';
      if (prevCount > 0) {
        const g = Math.round(((currCount - prevCount) / prevCount) * 100);
        growthStr = g >= 0 ? `+${g}%` : `${g}%`;
      } else if (currCount > 0) {
        growthStr = '+100%';
      }

      return {
        ...cat,
        count: String(currCount).padStart(2, '0'),
        growth: growthStr,
      };
    });
  }, [ordersInPeriod, prevOrdersInPeriod]);

  // Recent Workshop Activity Logs (Limit 10)
  const recentActivities = useMemo(() => {
    const logs = statusLogs.filter((log) => {
      const order = orders.find((o) => o.id === log.order_id);
      if (!order) return false;
      const cId = order.carpenter_id || '';
      return (
        log.changed_by === targetUser.id ||
        cId === targetUser.id ||
        cId.toLowerCase() === targetUser.name.toLowerCase()
      );
    });

    return logs.slice(0, 10).map((log) => {
      const order = orders.find((o) => o.id === log.order_id);
      const cust = customers.find((c) => c.id === order?.customer_id)?.name || 'Customer';
      const prodName = order?.sub_category || order?.category || 'Furniture';

      let type: 'completed' | 'working' | 'assigned' = 'working';
      let title = `Updated ${prodName} for ${cust}`;

      if (['Completed', 'QC 1', 'QC Check 1', 'QC 2', 'QC Check 2', 'Making Completed'].includes(log.stage as string)) {
        type = 'completed';
        title = `Completed ${prodName} for ${cust}`;
      } else if (log.stage === 'Pending') {
        type = 'assigned';
        title = `Assigned new ${prodName} Order`;
      } else {
        type = 'working';
        title = `Started ${prodName} for ${cust}`;
      }

      return {
        id: log.id,
        title,
        orderNo: order ? `#${order.article_no || order.id.substring(0, 8)}` : '#BWS-ORDER',
        time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        type,
      };
    });
  }, [statusLogs, orders, customers, targetUser]);

  // Currency Formatter helper
  const formatRupee = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* WORKSHOP LIVE FEED TOP BANNER */}
      <div className="bg-stone-50 border border-stone-250 rounded-2xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/15 text-amber-700 rounded-xl border border-amber-500/20">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest font-mono text-stone-900 uppercase">
                WORKSHOP LIVE FEED
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                CLOUD SYNC LIVE
              </span>
            </div>
            <p className="text-stone-500 text-xs font-medium mt-0.5">
              Poller active: Monitoring assignments for{' '}
              <strong className="text-stone-800 font-bold">{targetUser.name}</strong> ({targetUser.role.replace('_', ' ')})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Admin Switcher Dropdown */}
          {isAdminOrManager && carpentersList.length > 0 && (
            <select
              value={selectedCarpenterId}
              onChange={(e) => setSelectedCarpenterId(e.target.value)}
              className="bg-white border border-stone-300 text-stone-800 text-xs font-semibold rounded-xl px-3 py-1.5 shadow-2xs focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value={currentUser.id}>My Dashboard ({currentUser.name})</option>
              {carpentersList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            title="Refresh Live Dashboard"
            className="p-2 rounded-xl border border-stone-250 bg-white hover:bg-stone-100 text-stone-700 transition-all active:scale-95 shadow-2xs"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-amber-600' : ''} />
          </button>

          {/* Notification Button */}
          <div className="relative">
            <button
              title="Notifications"
              className="p-2 rounded-xl border border-stone-250 bg-white hover:bg-stone-100 text-stone-700 transition-all active:scale-95 shadow-2xs"
            >
              <Bell size={16} />
            </button>
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
              {workloadStatus.active}
            </span>
          </div>
        </div>
      </div>

      {/* PAGE HEADER & DATE FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight font-display">
            My Dashboard
          </h1>
          <p className="text-stone-500 text-xs mt-1">
            Monitor your assigned work, earnings, monthly performance, and productivity.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="bg-stone-100/90 p-1.5 rounded-2xl flex flex-wrap items-center gap-1 border border-stone-200 shadow-2xs">
          <button
            onClick={() => setDateFilter('current_month')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'current_month'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            Current Month
          </button>
          <button
            onClick={() => setDateFilter('previous_month')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'previous_month'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            Previous Month
          </button>
          <button
            onClick={() => setDateFilter('last_3_months')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'last_3_months'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            Last 3 Months
          </button>
          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              dateFilter === 'custom'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {/* Custom Date Inputs if Custom Selected */}
      {dateFilter === 'custom' && (
        <div className="bg-white p-4 rounded-2xl border border-stone-250 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-600">Start Date:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="border border-stone-300 rounded-lg p-1.5"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-600">End Date:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="border border-stone-300 rounded-lg p-1.5"
            />
          </div>
        </div>
      )}


      {/* WORKSHOP STAGE METRICS (5 KPI CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl border bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/20 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">TOTAL WORK</span>
          <strong className="text-xl font-black text-stone-900 font-mono mt-0.5 block">{stageMetrics.total}</strong>
        </div>

        <div className="p-3.5 rounded-2xl border bg-white border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">WOOD PROCUREMENT</span>
          <strong className="text-xl font-black text-amber-800 font-mono mt-0.5 block">{stageMetrics.woodPending}</strong>
        </div>

        <div className="p-3.5 rounded-2xl border bg-white border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">UNDER CARPENTRY</span>
          <strong className="text-xl font-black text-amber-700 font-mono mt-0.5 block">{stageMetrics.underCarpentry}</strong>
        </div>

        <div className="p-3.5 rounded-2xl border bg-white border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">QC 1 INSPECTION</span>
          <strong className="text-xl font-black text-indigo-700 font-mono mt-0.5 block">{stageMetrics.qc1Pending}</strong>
        </div>

        <div className="p-3.5 rounded-2xl border bg-white border-stone-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">COMPLETED</span>
          <strong className="text-xl font-black text-emerald-700 font-mono mt-0.5 block">{stageMetrics.completed}</strong>
        </div>
      </div>

      {/* ROW 1: 4 KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Assigned Orders */}
        <div className="bg-white p-5 rounded-2xl border border-stone-250 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <ClipboardList size={20} />
            </div>
            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              {kpis.orderGrowth >= 0 ? `+${kpis.orderGrowth}%` : `${kpis.orderGrowth}%`} vs last mo
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase block mt-4">
            TOTAL ASSIGNED ORDERS
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-black text-stone-900 font-display">
              {kpis.totalAssigned}
            </span>
            <span className="text-sm font-bold text-stone-500">Orders</span>
          </div>
        </div>

        {/* Card 2: Assigned Labour Value */}
        <div className="bg-white p-5 rounded-2xl border border-stone-250 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 font-black text-base flex items-center justify-center w-11 h-11">
              ₹
            </div>
            {kpis.assignedValue > 100000 && (
              <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                High Value
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase block mt-4">
            ASSIGNED LABOUR VALUE
          </span>
          <div className="mt-1">
            <span className="text-3xl font-black text-stone-900 font-display">
              ₹{formatRupee(kpis.assignedValue)}
            </span>
          </div>
        </div>

        {/* Card 3: Completed Orders */}
        <div className="bg-white p-5 rounded-2xl border border-stone-250 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-[11px] font-extrabold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
              {kpis.completionRate}% Rate
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase block mt-4">
            COMPLETED ORDERS
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-3xl font-black text-stone-900 font-display">
              {kpis.completedCount}
            </span>
            <span className="text-sm font-bold text-stone-500">Orders</span>
          </div>
        </div>

        {/* Card 4: Completed Labour Earnings */}
        <div className="bg-white p-5 rounded-2xl border border-stone-250 shadow-2xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100">
              <Wallet size={20} />
            </div>
            <span className="text-[11px] font-extrabold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
              {kpis.completedValueTarget}% Target
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-stone-400 uppercase block mt-4">
            COMPLETED LABOUR EARNINGS
          </span>
          <div className="mt-1">
            <span className="text-3xl font-black text-stone-900 font-display">
              ₹{formatRupee(kpis.completedValue)}
            </span>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: LEFT COLUMN (8 COLS) & RIGHT COLUMN (4 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">
          {/* CURRENT MONTH TIMELINE */}
          <div className="bg-white p-6 rounded-3xl border border-stone-250 shadow-2xs space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-stone-900 font-display">
                Current Month Timeline
              </h2>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-stone-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Completed
                </span>
                <span className="flex items-center gap-1.5 text-stone-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  Logistics
                </span>
                <span className="flex items-center gap-1.5 text-stone-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Working
                </span>
              </div>
            </div>

            {/* Timeline Horizontal Axis */}
            {timelineMilestones.length === 0 ? (
              <div className="py-12 text-center text-stone-400 font-semibold text-xs font-mono tracking-wider uppercase bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
                No activity this month
              </div>
            ) : (
              <div className="relative pt-12 pb-8 px-4">
                {/* Connecting line */}
                <div className="absolute top-1/2 left-6 right-6 h-1 bg-stone-200 -translate-y-1/2 rounded-full"></div>

                {/* Timeline Milestones Overlay */}
                <div className="grid grid-cols-4 relative z-10 text-center">
                  {[1, 2, 3, 4].map((wk) => {
                    const wkEvents = timelineMilestones.filter((m) => m.week === wk);
                    const mainEvt = wkEvents[0];
                    let dotColor = 'bg-stone-400';
                    let badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';

                    if (mainEvt) {
                      if (mainEvt.stage === 'Completed') {
                        dotColor = 'bg-emerald-500';
                        badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                      } else if (mainEvt.stage === 'Logistics') {
                        dotColor = 'bg-blue-500';
                        badgeColor = 'bg-blue-50 text-blue-800 border-blue-300';
                      } else {
                        dotColor = 'bg-amber-500';
                        badgeColor = 'bg-amber-50 text-amber-900 border-amber-300';
                      }
                    }

                    return (
                      <div key={wk} className="relative flex flex-col items-center">
                        {mainEvt && (
                          <div className="absolute -top-12 flex flex-col items-center">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs whitespace-nowrap max-w-[130px] truncate ${badgeColor}`}>
                              {mainEvt.title}
                            </span>
                          </div>
                        )}
                        <div className={`w-4 h-4 rounded-full ${dotColor} border-2 border-white shadow-xs z-20`}></div>
                        <span className="text-[11px] font-bold font-mono tracking-widest text-stone-400 uppercase mt-8 block">
                          WEEK {wk}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ORDERS COMPLETED THIS MONTH CHART */}
          <div className="bg-white p-6 rounded-3xl border border-stone-250 shadow-2xs space-y-4">
            <h2 className="text-xl font-bold text-stone-900 font-display">
              Orders Completed This Month
            </h2>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#78716c', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#a8a29e', fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#292524',
                      borderRadius: '12px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                    cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }}
                  />
                  <Bar dataKey="completed" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.completed > 0 ? '#f59e0b' : '#e7e5e4'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">
          {/* PROFILE CARD */}
          <div className="bg-white p-5 rounded-3xl border border-stone-250 shadow-2xs space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 bg-amber-500 font-extrabold text-[#1a110a] text-lg rounded-2xl flex items-center justify-center shadow-xs shrink-0">
                {targetUser.initials || targetUser.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <strong className="text-base font-bold text-stone-900 truncate block">
                  {targetUser.name}
                </strong>
                <span className="text-[10px] font-mono tracking-widest text-stone-400 font-black uppercase block">
                  {targetUser.role.toUpperCase().replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="border-t border-stone-200 pt-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Active Level:</span>
                <span className="text-emerald-600 font-black tracking-wider uppercase">
                  ACTIVE
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Contact Line:</span>
                <span className="text-stone-800 font-bold font-mono">
                  {targetUser.phone || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Assigned Serial initials:</span>
                <span className="text-stone-900 font-black font-mono">
                  {targetUser.initials || targetUser.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* WORKLOAD STATUS CARD */}
          <div className="bg-white p-5 rounded-3xl border border-stone-250 shadow-2xs space-y-4 relative">
            <h3 className="text-xs font-mono font-bold tracking-widest text-stone-900 uppercase">
              WORKLOAD STATUS
            </h3>

            <div className="space-y-3.5">
              {/* Active Orders */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-stone-600">Active Orders</span>
                  <span className="text-stone-900 font-bold">{workloadStatus.active}</span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#593622] rounded-full transition-all duration-500"
                    style={{ width: `${workloadStatus.active > 0 ? Math.min(100, (workloadStatus.active / Math.max(10, workloadStatus.active)) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Pending Approvals */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-stone-600">Pending Approvals</span>
                  <span className="text-stone-900 font-bold">{workloadStatus.pendingApprovals}</span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-300 rounded-full transition-all duration-500"
                    style={{ width: `${workloadStatus.pendingApprovals > 0 ? Math.min(100, (workloadStatus.pendingApprovals / Math.max(10, workloadStatus.pendingApprovals)) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Completed Today */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-stone-600">Completed Today</span>
                  <span className="text-stone-900 font-bold">{workloadStatus.completedToday}</span>
                </div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${workloadStatus.completedToday > 0 ? Math.min(100, (workloadStatus.completedToday / Math.max(5, workloadStatus.completedToday)) * 100) : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Bottom Right Floating Icon Button */}
            <div className="flex justify-end pt-2">
              <button
                className="w-10 h-10 bg-amber-500 text-stone-950 rounded-2xl flex items-center justify-center shadow-md hover:bg-amber-400 active:scale-95 transition-transform"
                title="Quick Action"
              >
                <Check size={18} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* PRODUCTIVITY CARD */}
          <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-xl space-y-6 border border-stone-800">
            <h3 className="text-xs font-mono font-bold tracking-widest text-stone-400 uppercase">
              PRODUCTIVITY
            </h3>

            {/* Circular Gauge */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Track Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#292524"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f59e0b"
                    strokeWidth="10"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * productivityStats.overallRate) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center text-center">
                  <span className="text-3xl font-black font-display text-white">
                    {productivityStats.overallRate}%
                  </span>
                  <span className="text-[9px] font-mono font-bold tracking-widest text-stone-400 block uppercase mt-0.5">
                    OVERALL
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-stone-800 pt-4 text-center">
              <p className="text-xs text-stone-300 font-medium">
                Avg Completion Time:{' '}
                <strong className="text-white font-bold ml-1">{productivityStats.avgDays} Days</strong>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: RECENT WORKSHOP ACTIVITY & PRODUCT STATISTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RECENT WORKSHOP ACTIVITY (LEFT 8 COLS) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-stone-250 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-stone-900 font-display">
              Recent Workshop Activity
            </h2>
            <button className="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors">
              View All
            </button>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-stone-400 font-medium text-xs font-mono">
              No recent workshop activity found for this period.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="py-3.5 flex items-center justify-between hover:bg-stone-50/80 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        act.type === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : act.type === 'working'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {act.type === 'completed' ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <Clock size={16} />
                      )}
                    </div>
                    <div>
                      <strong className="text-sm font-bold text-stone-900 block">
                        {act.title}
                      </strong>
                      <span className="text-xs text-stone-500 font-medium">
                        Order <span className="font-mono">{act.orderNo}</span> • {act.time}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-stone-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PRODUCT STATISTICS (RIGHT 4 COLS - 2X2 GRID) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-4">
          {productStats.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.key}
                className="bg-white p-4 rounded-2xl border border-stone-250 shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-stone-100 text-stone-700 rounded-xl">
                    <Icon size={18} />
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    {p.growth}
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-2xl font-black text-stone-900 font-display block">
                    {p.count}
                  </span>
                  <span className="text-[9px] font-mono font-bold tracking-wider text-stone-400 uppercase block mt-0.5">
                    {p.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <div className="pt-8 text-center text-xs text-stone-400 font-medium border-t border-stone-200/80">
        © 2026 Bhise'z Workshop • Industrial Grade Craftsmanship
      </div>
    </div>
  );
}
