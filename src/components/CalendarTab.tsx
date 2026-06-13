/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Order, Customer, OrderStage } from '../types';
import { ChevronLeft, ChevronRight, Filter, PlusSquare, Info } from 'lucide-react';

interface CalendarTabProps {
  orders: Order[];
  customers: Customer[];
  onViewOrder: (orderId: string) => void;
  onNavigateTab: (tabId: string) => void;
}

export default function CalendarTab({
  orders,
  customers,
  onViewOrder,
  onNavigateTab,
}: CalendarTabProps) {
  // Calendar tracking state (Seeded month is May 2026)
  const [currentYear, setCurrentYear] = React.useState(2026);
  const [currentMonth, setCurrentMonth] = React.useState(4); // 0-indexed, so 4 is May

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Helper date lists for rendering 42-day calendar grids
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayIndex = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day; // 0 Sunday, 1 Monday, etc.
  };

  const totalDaysCurrent = getDaysInMonth(currentYear, currentMonth);
  const totalDaysPrevNeeded = getFirstDayIndex(currentYear, currentMonth);

  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYearIndex = currentMonth === 0 ? currentYear - 1 : currentYear;
  const totalDaysPrev = getDaysInMonth(prevYearIndex, prevMonthIndex);

  // Colors mapping matching screenshot
  // Design (Purple), Carpentry (Yellow), QC Check 1 (Blue), Polish (Pink), QC Check 2 (Orange), Ready to Dispatch (Green)
  const getStageColor = (stage: OrderStage) => {
    switch (stage) {
      case 'Pending': return 'bg-stone-500 text-white';
      case 'Design': return 'bg-purple-500 text-white';
      case 'Carpentry': return 'bg-amber-500 text-stone-900';
      case 'QC Check 1': return 'bg-blue-500 text-white';
      case 'Polish': return 'bg-[#ec4899] text-white'; // Pink
      case 'QC Check 2': return 'bg-orange-500 text-white';
      case 'Ready to Dispatch': return 'bg-green-600 text-white';
      case 'Dispatched': return 'bg-emerald-600 text-white';
    }
  };

  const getStageDotColor = (stage: OrderStage) => {
    switch (stage) {
      case 'Pending': return 'bg-stone-500';
      case 'Design': return 'bg-purple-500';
      case 'Carpentry': return 'bg-amber-500';
      case 'QC Check 1': return 'bg-blue-500';
      case 'Polish': return 'bg-[#ec4899]';
      case 'QC Check 2': return 'bg-orange-500';
      case 'Ready to Dispatch': return 'bg-green-600';
      case 'Dispatched': return 'bg-emerald-600';
    }
  };

  const getOrdersForDay = (dayNum: number, monthVal: number, yearVal: number) => {
    const dateStr = `${yearVal}-${String(monthVal + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return orders.filter((o) => o.delivery_date === dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Calendar Tab Heading */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">Calendar</h1>
          <p className="text-stone-500 text-xs mt-1">Check work orders deadline commitments by planned delivery dates</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigateTab('create_order')}
            className="flex items-center gap-1.5 bg-[#593622] hover:bg-[#402414] text-white py-2 px-3 rounded-lg text-xs font-bold shadow transition"
          >
            <PlusSquare size={13} />
            New Order
          </button>
        </div>
      </div>

      {/* Navigation and Filters Control Panel */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCurrentYear(2026);
              setCurrentMonth(4); // Reset to seed standard May 2026
            }}
            className="px-3.5 py-1.5 border border-stone-250 hover:bg-stone-100 rounded-lg text-xs font-bold text-stone-700 transition"
          >
            Today
          </button>
          
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 px-1.5 border border-stone-250 hover:bg-stone-100 rounded-lg text-stone-600 text-xs font-bold"
              aria-label="Previous Month"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 px-1.5 border border-stone-250 hover:bg-stone-100 rounded-lg text-stone-600 text-xs font-bold"
              aria-label="Next Month"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <strong className="text-stone-900 text-sm font-black tracking-tight font-display pl-2 select-none">
            {monthsList[currentMonth]} {currentYear}
          </strong>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => alert('Calendar list layouts are optimized dynamically.')}
            className="flex items-center gap-1 border border-stone-250 px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 rounded-lg font-bold"
          >
            <Filter size={12} /> Filter
          </button>
          <div className="bg-stone-100 p-0.5 border border-stone-200 rounded-lg inline-flex font-mono text-[10px] font-bold">
            <span className="bg-white p-1 px-2.5 rounded shadow-xs text-[#593622]">Month</span>
            <span className="p-1 px-2.5 text-stone-500 cursor-pointer" onClick={() => alert('Weekly calendars (Phase 3 Spec) is simulated.')}>Week</span>
            <span className="p-1 px-2.5 text-stone-500 cursor-pointer" onClick={() => alert('Lists format (Phase 3 Spec) is simulated.')}>List</span>
          </div>
        </div>
      </div>

      {/* Primary Calendar Grid */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Day Name Row Headers */}
        <div className="grid grid-cols-7 border-b border-stone-150 bg-stone-50 font-mono text-[9px] font-black text-stone-400 uppercase tracking-widest text-center py-2.5">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* 42 Day numbers Grid slots */}
        <div className="grid grid-cols-7 grid-rows-6 border-b border-stone-100/50 min-h-[480px]">
          {/* 1. Leading Prev Month padded days */}
          {(() => {
            const cells = [];
            for (let i = totalDaysPrevNeeded - 1; i >= 0; i--) {
              const dayPrev = totalDaysPrev - i;
              cells.push(
                <div key={`p-${dayPrev}`} className="bg-stone-50/50 p-2 border-r border-b border-stone-100/20 text-stone-300 font-bold font-mono text-xs select-none">
                  {dayPrev}
                </div>
              );
            }

            // 2. Main active month days
            for (let d = 1; d <= totalDaysCurrent; d++) {
              const dayOrders = getOrdersForDay(d, currentMonth, currentYear);
              const isToday = d === 25 && currentMonth === 4 && currentYear === 2026; // Highlight seeded today (25 May 2026)

              cells.push(
                <div
                  key={`day-${d}`}
                  className={`p-2 border-r border-b border-stone-150/40 relative min-h-[82px] flex flex-col justify-between transition group hover:bg-stone-50/10 ${
                    isToday ? 'bg-[#fcf8f2] shadow-inner ring-4 ring-amber-500/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-xs font-black ${
                        isToday
                          ? 'h-6 w-6 rounded-full bg-[#593622] text-amber-300 flex items-center justify-center font-serif text-[11px]'
                          : 'text-stone-700'
                      }`}
                    >
                      {d}
                    </span>
                    {isToday && (
                      <span className="text-[7.5px] uppercase font-mono font-black text-[#593622] tracking-wider shrink-0 bg-amber-100 rounded p-0.5 px-1 leading-none">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Daily delivery Items listing */}
                  <div className="space-y-1 mt-1.5 flex-1 overflow-y-auto max-h-[58px] no-scrollbar">
                    {dayOrders.map((ord) => {
                      const client = customers.find((c) => c.id === ord.customer_id);
                      return (
                        <div
                          key={ord.id}
                          onClick={() => onViewOrder(ord.id)}
                          className={`p-1 px-1.5 rounded text-[8.5px] font-extrabold cursor-pointer transition flex items-center justify-between border-l-2 gap-1 overflow-hidden shrink-0 hover:scale-[1.01] ${getStageColor(ord.current_status)}`}
                          title={`${ord.article_no} - ${client?.name || 'Walkin'}`}
                        >
                          <span className="truncate font-sans tracking-wide leading-none">{client?.name || 'Client'}</span>
                          <span className="font-mono text-[7px] shrink-0 font-normal leading-none opacity-80 uppercase block">
                            {ord.article_no.includes('/') ? ord.article_no.split('/').slice(-2).join('/') : ord.article_no.split('-')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // 3. Trailing Next Month padded days
            const totalRendered = totalDaysPrevNeeded + totalDaysCurrent;
            const remaining = 42 - totalRendered;
            for (let nextD = 1; nextD <= remaining; nextD++) {
              cells.push(
                <div key={`n-${nextD}`} className="bg-stone-50/50 p-2 border-r border-b border-stone-100/20 text-stone-300 font-bold font-mono text-xs select-none">
                  {nextD}
                </div>
              );
            }

            return cells;
          })()}
        </div>
      </div>

      {/* Visual Staging Legend Key Indicator list */}
      <div className="bg-stone-100/50 p-3.5 rounded-xl border border-stone-200 text-xs">
        <span className="font-bold text-stone-700 font-sans block mb-3 flex items-center gap-1.5">
          <Info size={13} className="text-stone-500" />
          Color-Coded Production Staging Legend
        </span>
        <div className="flex flex-wrap gap-4 select-none">
          {[
            { tag: 'Design', col: 'Design' },
            { tag: 'Carpentry WIP', col: 'Carpentry' },
            { tag: 'QC Check 1 (Admin)', col: 'QC Check 1' },
            { tag: 'Polish Finish', col: 'Polish' },
            { tag: 'QC Check 2 (Admin)', col: 'QC Check 2' },
            { tag: 'Ready to Dispatch (Green)', col: 'Ready to Dispatch' },
            { tag: 'Dispatched (Emerald)', col: 'Dispatched' },
          ].map((lgd) => (
            <div key={lgd.tag} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${getStageDotColor(lgd.col as any)}`} />
              <span className="font-semibold text-stone-600 text-[11px]">{lgd.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
