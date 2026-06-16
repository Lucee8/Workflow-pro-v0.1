/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Order, User, Customer, OrderStage, Payment } from '../types';
import { Eye, Clock, CheckCircle2, AlertTriangle, Briefcase, CalendarCheck, ArrowUpRight, PiggyBank, CreditCard, ShieldCheck } from 'lucide-react';

interface DashboardTabProps {
  orders: Order[];
  users: User[];
  customers: Customer[];
  payments: Payment[];
  onViewOrder: (orderId: string) => void;
  onNavigateTab: (tabId: string) => void;
}

export default function DashboardTab({
  orders,
  users,
  customers,
  payments,
  onViewOrder,
  onNavigateTab,
}: DashboardTabProps) {
  // Stats Calculation
  const totalOrdersUrl = orders.length;
  const inProgressCount = orders.filter((o) => !['Ready to Dispatch', 'Dispatched'].includes(o.current_status)).length;
  const completedCount = orders.filter((o) => ['Ready to Dispatch', 'Dispatched'].includes(o.current_status)).length;
  const delayedCount = orders.filter((o) => o.is_delayed).length;

  // Payments calculations
  const totalOutstandingBalance = payments.reduce((sum, p) => sum + p.balance_due, 0);
  const fullyPaidCount = orders.filter(o => {
    const p = payments.find(pay => pay.order_id === o.id);
    return p !== undefined && p.balance_due <= 0;
  }).length;
  const partialOrUnpaidCount = orders.length - fullyPaidCount;

  // Pie chart calculation
  const getStageCount = (stage: OrderStage) => orders.filter((o) => o.current_status === stage).length;
  const stages: { name: OrderStage; count: number; color: string; percent: number }[] = [
    { name: 'Pending', count: getStageCount('Pending'), color: '#a8a29e', percent: 0 },
    { name: 'Design', count: getStageCount('Design'), color: '#d97706', percent: 0 },
    { name: 'Carpentry', count: getStageCount('Carpentry'), color: '#3b82f6', percent: 0 },
    { name: 'QC Check 1', count: getStageCount('QC Check 1'), color: '#c084fc', percent: 0 },
    { name: 'Polish', count: getStageCount('Polish'), color: '#0d9488', percent: 0 },
    { name: 'QC Check 2', count: getStageCount('QC Check 2'), color: '#818cf8', percent: 0 },
    { name: 'Ready to Dispatch', count: getStageCount('Ready to Dispatch'), color: '#16a34a', percent: 0 },
    { name: 'Dispatched', count: getStageCount('Dispatched'), color: '#059669', percent: 0 },
  ];

  const totalStagesSum = stages.reduce((s, x) => s + x.count, 0) || 1;
  stages.forEach((s) => {
    s.percent = Math.round((s.count / totalStagesSum) * 100);
  });

  // Upcoming Deliveries schedule list (sorted by soonest date)
  const sortedUpcoming = [...orders]
    .filter((o) => !['Ready to Dispatch', 'Dispatched'].includes(o.current_status))
    .sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime())
    .slice(0, 4);

  // Helper to format date badges
  const formatDateBadge = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return {
        month: months[date.getMonth()],
        day: date.getDate(),
      };
    } catch {
      return { month: 'MAY', day: 25 };
    }
  };

  // Helper for status classes
  const getStatusClass = (stage: OrderStage) => {
    switch (stage) {
      case 'Pending': return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'Design': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Carpentry': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'QC Check 1': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Polish': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'QC Check 2': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Ready to Dispatch': return 'bg-green-50 text-green-700 border-green-200';
      case 'Dispatched': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header Title */}
      <div>
        <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">Dashboard</h1>
        <p className="text-stone-500 text-xs mt-1">Overview of all active orders, worker assignments and workshop activity</p>
      </div>

      {/* Top Metric Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05, type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.025, y: -3, borderColor: '#d97706' }}
          className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-stone-200/80 transition-all flex items-center justify-between gap-1.5 min-w-0 cursor-pointer"
          onClick={() => onNavigateTab('orders')}
        >
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-stone-400 block font-bold truncate">Total Orders</span>
            <span className="text-xl sm:text-2xl font-black text-stone-800 font-display block mt-0.5">{totalOrdersUrl}</span>
            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5 mt-1 sm:mt-2 truncate">
              View all
            </span>
          </div>
          <div className="bg-[#fcf8f2] text-amber-700 p-2 rounded-xl border border-amber-200/40 shrink-0 hidden xs:block">
            <Briefcase size={16} className="sm:w-5 sm:h-5 text-[#593622]" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.025, y: -3, borderColor: '#3b82f6' }}
          className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-stone-200/80 transition-all flex items-center justify-between gap-1.5 min-w-0 cursor-pointer"
          onClick={() => onNavigateTab('orders')}
        >
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-stone-400 block font-bold truncate">In Progress</span>
            <span className="text-xl sm:text-2xl font-black text-stone-800 font-display block mt-0.5">{inProgressCount}</span>
            <span className="text-[10px] text-blue-700 font-semibold mt-1 sm:mt-2 block truncate">
              View all Active
            </span>
          </div>
          <div className="bg-[#eff6ff] text-blue-700 p-2 rounded-xl border border-blue-200/40 shrink-0 hidden xs:block">
            <Clock size={16} className="sm:w-5 sm:h-5 text-blue-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15, type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.025, y: -3, borderColor: '#16a34a' }}
          className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-stone-200/80 transition-all flex items-center justify-between gap-1.5 min-w-0 cursor-pointer"
          onClick={() => onNavigateTab('orders')}
        >
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-stone-400 block font-bold truncate">Completed</span>
            <span className="text-xl sm:text-2xl font-black text-stone-800 font-display block mt-0.5">{completedCount}</span>
            <span className="text-[10px] text-green-700 font-semibold mt-1 sm:mt-2 block truncate">
              View all Ready
            </span>
          </div>
          <div className="bg-[#f0fdf4] text-green-700 p-2 rounded-xl border border-green-200/40 shrink-0 hidden xs:block">
            <CheckCircle2 size={16} className="sm:w-5 sm:h-5 text-green-600" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
          whileHover={{ scale: 1.025, y: -3, borderColor: '#e11d48' }}
          className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-stone-200/80 transition-all flex items-center justify-between gap-1.5 min-w-0 cursor-pointer"
          onClick={() => onNavigateTab('orders')}
        >
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] uppercase font-mono tracking-wider text-stone-400 block font-bold truncate">Delayed</span>
            <span className="text-xl sm:text-2xl font-black text-stone-800 font-display block mt-0.5">{delayedCount}</span>
            <span className="text-[10px] text-rose-650 font-bold block mt-1 sm:mt-2 truncate">
              {delayedCount} items flagged
            </span>
          </div>
          <div className="bg-[#fef2f2] text-rose-700 p-2 rounded-xl border border-rose-200/40 shrink-0 hidden xs:block">
            <AlertTriangle size={16} className="sm:w-5 sm:h-5 text-rose-600" />
          </div>
        </motion.div>
      </div>

      {/* Financial & Payment Overview Row */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">Financial Ledger Overview</h2>
          <span className="text-[10px] bg-[#593622]/5 text-[#593622] font-semibold border border-[#593622]/20 px-2.5 py-0.5 rounded-lg font-mono">ADMIN PRIVILEGED ACCESS</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Total Outstanding Balance Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.22, type: 'spring', stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.025, y: -2, borderColor: '#593622' }}
            className="bg-white p-4 rounded-xl shadow-xs border border-stone-200/80 transition-all flex items-center justify-between gap-3 cursor-pointer"
            onClick={() => onNavigateTab('orders')}
          >
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block font-bold">Total Outstanding Balance</span>
              <strong className="text-xl sm:text-2xl font-black text-rose-600 font-display block mt-1">₹ {totalOutstandingBalance.toLocaleString('en-IN')}</strong>
              <span className="text-[10px] text-stone-550 block mt-1.5 font-medium leading-tight">Accumulated balance amounts across all orders</span>
            </div>
            <div className="bg-rose-50 text-rose-700 p-2.5 rounded-xl border border-rose-200/40 shrink-0">
              <CreditCard size={18} />
            </div>
          </motion.div>

          {/* Fully Paid Orders Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.26, type: 'spring', stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.025, y: -2, borderColor: '#16a34a' }}
            className="bg-white p-4 rounded-xl shadow-xs border border-stone-200/80 transition-all flex items-center justify-between gap-3 cursor-pointer"
            onClick={() => onNavigateTab('orders')}
          >
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block font-bold">Fully Paid Orders</span>
              <strong className="text-xl sm:text-2xl font-black text-emerald-600 font-display block mt-1">{fullyPaidCount} <span className="text-stone-450 text-xs font-bold font-sans">/ {orders.length}</span></strong>
              <span className="text-[10px] text-stone-550 block mt-1.5 font-medium leading-tight">Orders that are completely paid off</span>
            </div>
            <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-xl border border-emerald-200/40 shrink-0">
              <CheckCircle2 size={18} />
            </div>
          </motion.div>

          {/* Partial / Unpaid Orders Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.025, y: -2, borderColor: '#d97706' }}
            className="bg-white p-4 rounded-xl shadow-xs border border-stone-200/80 transition-all flex items-center justify-between gap-3 cursor-pointer"
            onClick={() => onNavigateTab('orders')}
          >
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block font-bold">Partial / Unpaid Orders</span>
              <strong className="text-xl sm:text-2xl font-black text-amber-700 font-display block mt-1">{partialOrUnpaidCount} <span className="text-stone-450 text-xs font-bold font-sans">remaining</span></strong>
              <span className="text-[10px] text-stone-550 block mt-1.5 font-medium leading-tight">Orders with outstanding balance dues</span>
            </div>
            <div className="bg-amber-50 text-amber-700 p-2.5 rounded-xl border border-amber-200/40 shrink-0">
              <Clock size={18} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Card: Orders by Status Donut */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-stone-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <h3 className="font-display font-black text-stone-900 text-sm">Orders by Status</h3>
            <button onClick={() => onNavigateTab('orders')} className="text-[10px] text-amber-700 font-semibold hover:underline">
              View all
            </button>
          </div>

          {/* Render SVG-based donut chart to keep output lightweight and compatible with React 19 */}
          <div className="my-6 relative flex justify-center items-center">
            <svg width="180" height="180" className="rotate-[-90deg]">
              {/* Outer stroke container */}
              <circle cx="90" cy="90" r="70" fill="transparent" stroke="#f5f5f4" strokeWidth="20" />
              {(() => {
                let accumulatedPercent = 0;
                return stages.map((s, idx) => {
                  if (s.count === 0) return null;
                  const radius = 70;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDasharray = `${(s.count / totalStagesSum) * circumference} ${circumference}`;
                  const strokeDashoffset = -accumulatedPercent * circumference;
                  accumulatedPercent += s.count / totalStagesSum;

                  return (
                    <motion.circle
                      key={s.name}
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="transparent"
                      stroke={s.color}
                      strokeWidth="20"
                      strokeDashoffset={strokeDashoffset}
                      initial={{ strokeDasharray: `0 ${circumference}` }}
                      animate={{ strokeDasharray: strokeDasharray }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                      whileHover={{ strokeWidth: 24 }}
                      style={{ originX: "90px", originY: "90px" }}
                      className="cursor-pointer transition-all duration-150"
                    />
                  );
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-mono text-2xl font-black text-stone-800">{totalOrdersUrl}</span>
              <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">Total units</span>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            {stages.map((stg) => (
              <div key={stg.name} className="flex items-center justify-between text-xs text-stone-600">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full animate-pulse" style={{ backgroundColor: stg.color }} />
                  <span className="font-semibold text-stone-700">{stg.name}</span>
                </div>
                <div className="font-mono font-bold text-stone-800">
                  {stg.count} <span className="text-stone-400 text-[10px]">({stg.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: Recent Orders list */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-stone-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="font-display font-black text-stone-900 text-sm">Recent Orders</h3>
              <button onClick={() => onNavigateTab('orders')} className="text-[10px] text-amber-700 font-semibold hover:underline">
                View all
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600 border-collapse mt-3" style={{ contentVisibility: 'auto' }}>
                <thead>
                  <tr className="border-b border-stone-100 font-mono text-[10px] uppercase text-stone-400 font-bold">
                    <th className="py-2.5">Article No.</th>
                    <th className="py-2.5">Customer</th>
                    <th className="py-2.5">Stage</th>
                    <th className="py-2.5">Assigned To</th>
                    <th className="py-2.5">Delivery</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {[...orders]
                    .sort((a, b) => new Date(b.created_at || b.order_date).getTime() - new Date(a.created_at || a.order_date).getTime())
                    .slice(0, 5)
                    .map((order, i) => {
                    const cust = customers.find((c) => c.id === order.customer_id);
                    const carpenter = users.find((u) => u.id === order.carpenter_id);
                    return (
                      <tr 
                        key={order.id} 
                        className="hover:bg-stone-50/50 transition duration-150 cursor-pointer"
                        onClick={() => onViewOrder(order.id)}
                      >
                        <td className="py-3 font-mono font-bold text-stone-900">{order.article_no}</td>
                        <td className="py-3 font-semibold text-stone-800">{cust?.name || 'Unknown'}</td>
                        <td className="py-3 font-medium text-stone-400">
                          <span className="font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded text-[10px]">
                            {order.current_status}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-stone-700">
                          {carpenter ? `${carpenter.name} (${carpenter.initials})` : '—'}
                        </td>
                        <td className="py-3 font-medium text-stone-500">
                          {new Date(order.delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusClass(order.current_status)}`}>
                            {order.is_delayed ? 'Delayed' : 'In Progress'}
                          </span>
                        </td>
                        <td className="py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onViewOrder(order.id)}
                            className="bg-stone-100 hover:bg-[#593622] hover:text-white text-stone-600 p-1.5 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye size={13} />
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

      {/* Schedule Deliveries & Stepper Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" style={{ contentVisibility: 'auto' }}>
        {/* Left Column: Upcoming Deliveries Cards */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-stone-200/80">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
            <h3 className="font-display font-black text-stone-900 text-sm">Upcoming Deliveries</h3>
            <button onClick={() => onNavigateTab('calendar')} className="text-[10px] text-amber-700 font-semibold hover:underline">
              View Calendar
            </button>
          </div>

          <div className="space-y-3.5">
            {sortedUpcoming.map((order) => {
              const cust = customers.find((c) => c.id === order.customer_id);
              const badge = formatDateBadge(order.delivery_date);
              return (
                <motion.div 
                  key={order.id} 
                  whileHover={{ scale: 1.015, x: 2 }}
                  className="flex gap-3 hover:bg-stone-50 p-2 rounded-xl transition cursor-pointer" 
                  onClick={() => onViewOrder(order.id)}
                >
                  <div className="bg-stone-100 text-stone-700 font-mono flex flex-col items-center justify-center p-2 rounded-xl border border-stone-200 shrink-0 w-12 h-12">
                    <span className="text-[9px] font-bold text-stone-400 block uppercase leading-none">{badge.month}</span>
                    <span className="text-sm font-black text-stone-800 leading-none block mt-1">{badge.day}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-stone-900 text-xs block">{cust?.name || 'Walk-in Customer'}</span>
                    <span className="font-mono text-[10px] text-amber-700 font-semibold block uppercase mt-0.5">{order.article_no}</span>
                    <span className="text-[10px] text-stone-500 block truncate mt-1">
                      {order.category} &rsaquo; {order.sub_category} ({order.size})
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Stage Overview progress stepper */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-stone-200/80 flex flex-col">
          <div className="pb-3 border-b border-stone-100 mb-6 font-sans">
            <h3 className="font-display font-black text-stone-900 text-sm">Stage Overview (Live)</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">Distribution of unit volume across workspace active processes</p>
          </div>

          <div className="flex-1 flex flex-col justify-center overflow-x-hidden w-full">
            {/* Mobile View: Vertical Stages Overview */}
            <div className="md:hidden space-y-3.5 relative pl-1.5 py-1">
              {stages.map((s, idx) => {
                const isActive = s.count > 0;
                return (
                  <div key={s.name} className="flex items-center gap-4 relative">
                    {idx < stages.length - 1 && (
                      <div className={`absolute left-[18px] top-[36px] w-0.5 h-[18px] ${isActive ? 'bg-[#593622]' : 'bg-stone-200'}`} />
                    )}
                    {/* Circle Node wrapper */}
                    <motion.div
                      animate={isActive ? { scale: [1, 1.08, 1], rotate: [0, 3, 0] } : { scale: 1, rotate: 0 }}
                      transition={isActive ? { type: "tween", repeat: Infinity, duration: 3, ease: "easeInOut" } : { type: "tween", duration: 0.25 }}
                      className={`h-9 w-9 rounded-full flex items-center justify-center border font-mono font-black text-xs shrink-0 z-10 transition duration-200 ${
                        isActive
                          ? 'bg-[#593622] text-amber-300 border-amber-500 shadow-md ring-4 ring-amber-500/10'
                          : 'bg-white text-stone-400 border-stone-300 hover:border-stone-400'
                      }`}
                      title={`${s.name}: ${s.count} items`}
                    >
                      {s.count}
                    </motion.div>
                    <div className="flex-1">
                      <span className={`text-[12px] font-bold ${isActive ? 'text-stone-900 font-extrabold' : 'text-stone-500'}`}>
                        {s.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] text-amber-800 font-bold block leading-none mt-1">
                          {s.count} {s.count === 1 ? 'order' : 'orders'} active here
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Horizontal Stepper Diagram scroll container */}
            <div className="hidden md:block overflow-x-auto no-scrollbar w-full py-1">
              <div className="relative flex justify-between items-center min-w-[720px] px-4 py-3">
                {/* Connected Line Background */}
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-stone-200 -translate-y-1/2 z-0" />

                {stages.map((s, idx) => {
                  const isActive = s.count > 0;
                  return (
                    <div key={s.name} className="relative z-10 flex flex-col items-center select-none shrink-0 w-[80px]">
                      {/* Circle Node wrapper */}
                      <motion.div
                        animate={isActive ? { scale: [1, 1.1, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                        transition={isActive ? { type: "tween", repeat: Infinity, duration: 4, ease: "easeInOut" } : { type: "tween", duration: 0.25 }}
                        className={`h-9 w-9 rounded-full flex items-center justify-center border font-mono font-black text-xs transition duration-200 ${
                          isActive
                            ? 'bg-[#593622] text-amber-300 border-amber-500 shadow-md ring-4 ring-amber-500/10'
                            : 'bg-white text-stone-400 border-stone-300 hover:border-stone-400'
                        }`}
                        title={`${s.name}: ${s.count} items`}
                      >
                        {s.count}
                      </motion.div>
                      <span className={`text-[10px] font-bold text-center mt-2.5 block truncate w-full ${isActive ? 'text-stone-900 font-extrabold' : 'text-stone-400'}`}>
                        {s.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
