/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Order, User, Customer, OrderStage, OrderPriority, Payment } from '../types';
import { Search, Eye, PlusCircle, AlertCircle, ChevronLeft, ChevronRight, Calendar, SlidersHorizontal, CreditCard, Trash2 } from 'lucide-react';
import { formatToDDMMYYYY, compareOrdersByArticleSerialDesc } from '../utils';
import { parseParentOrderSequence } from '../db/orderIdService';

interface OrdersTabProps {
  orders: Order[];
  users: User[];
  customers: Customer[];
  payments: Payment[];
  onViewOrder: (orderId: string) => void;
  onNavigateTab: (tabId: string) => void;
  isAdmin: boolean;
  onDeleteOrder?: (orderId: string) => void;
}

export default function OrdersTab({
  orders,
  users,
  customers,
  payments = [],
  onViewOrder,
  onNavigateTab,
  isAdmin,
  onDeleteOrder,
}: OrdersTabProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [stageFilter, setStageFilter] = React.useState<string>('All Stages');
  const [statusFilter, setStatusFilter] = React.useState<string>('All Status');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('All Priority');
  
  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stageFilter, statusFilter, priorityFilter]);

  // Filter Logic
  const filteredOrders = orders.filter((order) => {
    const cust = customers.find((c) => c.id === order.customer_id);
    const carpenter = users.find((u) => u.id === order.carpenter_id);

    const matchesSearch =
      order.article_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.parent_order_id && order.parent_order_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cust && cust.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cust && cust.phone.includes(searchTerm)) ||
      (carpenter && carpenter.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStage = stageFilter === 'All Stages' || order.current_status === stageFilter;

    let matchesStatus = true;
    if (statusFilter !== 'All Status') {
      if (statusFilter === 'Delayed') matchesStatus = order.is_delayed;
      else if (statusFilter === 'Ready') matchesStatus = order.current_status === 'Ready to Dispatch' || order.current_status === 'Dispatched';
      else if (statusFilter === 'In Progress') matchesStatus = !['Ready to Dispatch', 'Dispatched'].includes(order.current_status);
    }

    const matchesPriority = priorityFilter === 'All Priority' || order.priority === priorityFilter.toLowerCase();

    return matchesSearch && matchesStage && matchesStatus && matchesPriority;
  });

  // Group products by parent order
  interface ParentGroup {
    parentOrderId: string;
    orderSequence: number;
    latestCreatedAt: string;
    orderDate: string;
    customer?: Customer;
    items: Order[];
  }

  const groupsMap = new Map<string, ParentGroup>();
  filteredOrders.forEach((order) => {
    const parentKey = order.parent_order_id || order.id;
    const seq = parseParentOrderSequence(parentKey, order.order_sequence);
    const cust = customers.find((c) => c.id === order.customer_id);

    if (!groupsMap.has(parentKey)) {
      groupsMap.set(parentKey, {
        parentOrderId: parentKey,
        orderSequence: seq,
        latestCreatedAt: order.created_at || order.order_date || '',
        orderDate: order.order_date,
        customer: cust,
        items: [],
      });
    }

    const g = groupsMap.get(parentKey)!;
    g.items.push(order);
    if (!g.customer && cust) g.customer = cust;
    const tOrder = new Date(order.created_at || order.order_date || 0).getTime();
    const tGroup = new Date(g.latestCreatedAt || 0).getTime();
    if (tOrder > tGroup) g.latestCreatedAt = order.created_at || order.order_date || '';
  });

  // Sort items inside each group by product Article Numbers descending
  groupsMap.forEach((g) => {
    g.items.sort(compareOrdersByArticleSerialDesc);
  });

  // Sort parent order groups descending (latest parent order first)
  const sortedParentGroups = Array.from(groupsMap.values()).sort((a, b) => {
    const timeA = new Date(a.latestCreatedAt || 0).getTime();
    const timeB = new Date(b.latestCreatedAt || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    if (b.orderSequence !== a.orderSequence) return b.orderSequence - a.orderSequence;
    return b.parentOrderId.localeCompare(a.parentOrderId);
  });

  // Pagination for parent order groups
  const totalParentGroups = sortedParentGroups.length;
  const totalPages = Math.ceil(totalParentGroups / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentGroups = sortedParentGroups.slice(startIndex, startIndex + itemsPerPage);

  const getStatusClass = (stage: OrderStage) => {
    switch (stage) {
      case 'Pending': return 'bg-stone-100 text-stone-700 border-stone-200';
      case 'Design': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Carpentry': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'QC Check 1': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Polish': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'QC Check 2': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Ready to Dispatch': return 'bg-green-100 text-green-800 border-green-200';
      case 'Dispatched': return 'bg-emerald-100 text-emerald-850 border-emerald-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Title */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">Orders</h1>
          <p className="text-stone-500 text-xs mt-1">Manage and track workshop custom product items status pipeline</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              alert("OrderFlow Pro Protocol: Orders must be placed through the CRM! Mark a CRM lead status as 'Order Confirmed' or approve a customer quotation to automatically queue a production order. Redirecting to CRM...");
              onNavigateTab('crm');
            }}
            className="flex items-center gap-2 bg-[#593622] hover:bg-[#402414] text-white font-bold py-2.5 px-4 rounded-xl shadow transition text-xs"
          >
            <PlusCircle size={15} />
            Place Order via CRM
          </button>
        )}
      </div>

      {/* Advanced Filter Suite bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3.5 text-stone-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by article no., customer, or phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none transition leading-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
            {/* Stages Select */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#593622] transition min-w-[120px]"
            >
              <option>All Stages</option>
              <option>Pending</option>
              <option>Design</option>
              <option>Carpentry</option>
              <option>QC Check 1</option>
              <option>Polish</option>
              <option>QC Check 2</option>
              <option>Ready to Dispatch</option>
              <option>Dispatched</option>
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#593622] transition min-w-[120px]"
            >
              <option>All Status</option>
              <option>In Progress</option>
              <option>Ready</option>
              <option>Delayed</option>
            </select>

            {/* Priority Select */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:border-[#593622] transition min-w-[120px]"
            >
              <option>All Priority</option>
              <option>Normal</option>
              <option>Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Primary Database Output Tabulate */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600 border-collapse" style={{ contentVisibility: 'auto' }}>
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100 font-mono text-[10px] uppercase text-stone-400 font-black">
                <th className="py-3 px-4">Article No.</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4 font-sans font-bold">Delivery Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {currentGroups.length > 0 ? (
                currentGroups.map((group) => (
                  <React.Fragment key={group.parentOrderId}>
                    {/* Parent Order Group Header Row */}
                    <tr className="bg-stone-100/90 border-t-2 border-stone-200">
                      <td colSpan={9} className="py-2.5 px-4">
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-[#593622] bg-[#593622]/10 px-2.5 py-0.5 rounded border border-[#593622]/20 text-[11px]">
                              Parent Order: {group.parentOrderId}
                            </span>
                            <span className="font-semibold text-stone-800">
                              Customer: {group.customer?.name || 'Walk-In Customer'}
                            </span>
                            <span className="text-stone-400 font-mono text-[10px]">
                              {group.customer?.phone ? `(${group.customer.phone})` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-stone-500 font-medium font-mono">
                            <span>{group.items.length} Product Item{group.items.length > 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>Order Date: {formatToDDMMYYYY(group.orderDate)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Product Line Items */}
                    {group.items.map((order) => {
                      const cust = customers.find((c) => c.id === order.customer_id);
                      const carpenter = users.find((u) => u.id === order.carpenter_id);
                      return (
                        <tr key={order.id} className="hover:bg-amber-50/30 transition border-b border-stone-100">
                          <td className="py-3 px-4 font-mono font-black text-stone-900">
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1.5 text-xs">
                                {order.priority === 'urgent' && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" title="Urgent priority!" />
                                )}
                                {order.article_no}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-stone-850">
                              {cust?.name || 'Walk-In'}
                            </div>
                            <p className="text-[10px] text-stone-400 font-mono mt-0.5">{cust?.phone || ''}</p>
                          </td>
                          <td className="py-3 px-4 font-medium text-stone-500">
                            {order.category} &rsaquo; <span className="text-stone-700">{order.sub_category}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusClass(order.current_status)}`}>
                              {order.current_status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-700 text-[11px]">
                            {carpenter ? (
                              <div className="flex items-center gap-1.5">
                                <span className="h-5 w-5 rounded bg-amber-100 text-amber-800 text-[9px] font-black flex items-center justify-center">
                                  {carpenter.initials}
                                </span>
                                <span>{carpenter.name}</span>
                              </div>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-stone-600">
                            {formatToDDMMYYYY(order.delivery_date)}
                          </td>
                          <td className="py-3 px-4">
                            {order.is_delayed ? (
                              <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 font-bold text-[9px]">
                                <AlertCircle size={10} /> Delayed
                              </span>
                            ) : order.current_status === 'Ready to Dispatch' ? (
                              <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 font-bold text-[9px]">
                                Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 font-bold text-[9px]">
                                In Progress
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {(() => {
                              const p = payments.find((pay) => pay.order_id === order.id);
                              if (!p) {
                                return (
                                  <span className="inline-flex items-center bg-rose-50 border border-rose-200 text-rose-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                                    Unpaid
                                  </span>
                                );
                              }
                              if (p.balance_due <= 0) {
                                return (
                                  <span className="inline-flex items-center bg-green-50 border border-green-200 text-green-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-md">
                                    Paid
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center bg-amber-50 border border-amber-200 text-amber-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-md" title={`Due: ₹${p.balance_due}`}>
                                  Partial
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onViewOrder(order.id)}
                                className="bg-stone-100 hover:bg-[#593622] hover:text-white p-2 rounded-xl text-stone-600 transition"
                                title="Open details screen"
                              >
                                <Eye size={13} strokeWidth={2.5} />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => onDeleteOrder?.(order.id)}
                                  className="bg-stone-100 hover:bg-rose-600 hover:text-white p-2 rounded-xl text-rose-600 transition"
                                  title="Cancel & Delete Order"
                                >
                                  <Trash2 size={13} strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-stone-400">
                      <SlidersHorizontal size={24} className="mb-2 text-stone-300" />
                      <p className="text-xs font-bold font-sans">No Orders Found</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">Try widening or clearing your search filtering tags.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dense Pagination Navigation Bar */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between font-mono text-[11px] text-stone-500">
          <span>
            Showing parent orders <strong className="text-stone-700">{totalParentGroups > 0 ? Math.min(startIndex + 1, totalParentGroups) : 0}</strong> to{' '}
            <strong className="text-stone-700">{Math.min(startIndex + itemsPerPage, totalParentGroups)}</strong> of{' '}
            <strong className="text-stone-700">{totalParentGroups}</strong> ({filteredOrders.length} line items)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1 px-2.5 rounded bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 disabled:opacity-40 transition"
              aria-label="Previous Page"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="font-bold">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1 px-2.5 rounded bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 disabled:opacity-40 transition"
              aria-label="Next Page"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
