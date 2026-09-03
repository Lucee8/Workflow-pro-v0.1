/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Customer, Order, Payment, User, CRMCustomer } from '../types';
import { Search, Phone, MapPin, MessageSquare, CreditCard, CheckCircle, Clock, AlertTriangle, ChevronRight, User as UserIcon, Calendar, ArrowUpRight, Trash2, UserPlus, Plus, X, Building2, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { formatToDDMMYYYY } from '../utils';
import { generateUUID } from '../db/store';

interface CustomersTabProps {
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  users: User[];
  onViewOrder: (orderId: string) => void;
  initialSelectedCustomerId?: string | null;
  crmQuotations?: any[];
  onDeleteCustomer: (customerId: string) => void;
  onSaveCustomer?: (newCustomer: Customer, newCrmCustomer?: CRMCustomer) => void;
  currentUser?: User | null;
  onNavigateTab?: (tab: string) => void;
}

export default function CustomersTab({
  customers,
  orders,
  payments,
  users,
  onViewOrder,
  initialSelectedCustomerId = null,
  crmQuotations = [],
  onDeleteCustomer,
  onSaveCustomer,
  currentUser,
  onNavigateTab,
}: CustomersTabProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(
    initialSelectedCustomerId || (customers.length > 0 ? customers[0].id : null)
  );
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: '',
    phone: '',
    companyName: '',
    whatsappNumber: '',
    sameAsPhone: true,
    email: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    source: 'Walkin',
    notes: '',
    productRequirement: '',
    budget: '',
  });

  React.useEffect(() => {
    if (initialSelectedCustomerId) {
      setSelectedCustomerId(initialSelectedCustomerId);
    }
  }, [initialSelectedCustomerId]);

  React.useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  // Filters customers list based on searched term (sorted descending by ID)
  const filteredCustomers = customers
    .filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => b.id.localeCompare(a.id));

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Stats calculation for the selected customer profile
  const customerOrders = activeCustomer ? orders.filter((o) => o.customer_id === activeCustomer.id) : [];
  const customerPayments = activeCustomer
    ? payments.filter((p) => customerOrders.some((o) => o.id === p.order_id))
    : [];

  const { totalInvoiced, totalPaid, outstandingDue } = React.useMemo(() => {
    let tInvoiced = 0;
    let tPaid = 0;
    let tOutstanding = 0;

    if (activeCustomer) {
      // 1. Process all orders for this customer
      customerOrders.forEach((ord) => {
        const orderPayment = payments.find((p) => p.order_id === ord.id);
        
        let ordInvoiced = 0;
        let ordPaid = 0;
        let ordOutstanding = 0;

        if (orderPayment && orderPayment.total_amount > 0) {
          ordInvoiced = orderPayment.total_amount;
          ordPaid = orderPayment.advance_paid;
          ordOutstanding = orderPayment.balance_due;
        } else if (ord.total_amount !== undefined && ord.total_amount !== null) {
          ordInvoiced = ord.total_amount;
          ordPaid = ord.advance_paid || 0;
          ordOutstanding = Math.max(0, ordInvoiced - ordPaid);
        } else {
          // Fallback to the default Summary of Accounts & Totals formula in DetailOrderFormTab
          const qty = ord.no_of_units || 1;
          const finalRate = 15000;
          const packing = 1200;
          const transportation = 1800;
          ordInvoiced = (finalRate * qty) + packing + transportation;
          ordPaid = orderPayment ? orderPayment.advance_paid : 0;
          ordOutstanding = Math.max(0, ordInvoiced - ordPaid);
        }

        tInvoiced += ordInvoiced;
        tPaid += ordPaid;
        tOutstanding += ordOutstanding;
      });

      // 2. Process any approved quotations for this customer that haven't been converted to active orders yet
      if (crmQuotations && crmQuotations.length > 0) {
        const approvedQuotes = crmQuotations.filter(
          (q) => q.customer_id === activeCustomer.id && (q.status === 'Approved' || q.status === 'INVOICED' || q.status === 'Invoiced')
        );

        approvedQuotes.forEach((quote) => {
          const isAlreadyOrder = customerOrders.some(
            (o) => o.id === quote.id || (o.internal_notes && o.internal_notes.includes(quote.id))
          );

          if (!isAlreadyOrder) {
            const firstItem = quote.items?.[0];
            let qInvoiced = 0;
            if (firstItem) {
              const uPrice = firstItem.unitPrice || 0;
              const qQty = firstItem.quantity || 1;
              const qDiscountPercent = firstItem.discount || 0;
              const qDiscount = Math.round((uPrice * (qDiscountPercent / 100)) * qQty);
              const qFinalRate = Math.max(0, uPrice - qDiscount);
              qInvoiced = qFinalRate * qQty;
            } else {
              qInvoiced = quote.totalAmount || 0;
            }

            tInvoiced += qInvoiced;
            tOutstanding += qInvoiced;
          }
        });
      }
    }

    return {
      totalInvoiced: tInvoiced,
      totalPaid: tPaid,
      outstandingDue: tOutstanding,
    };
  }, [activeCustomer, customerOrders, payments, crmQuotations]);

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter the customer name.');
      return;
    }
    if (!formData.phone.trim()) {
      alert('Please enter the customer phone number.');
      return;
    }

    const d = new Date();
    const yy = d.getFullYear().toString().slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const prefix = `CRM-${yy}-${mm}-`;
    const randSuffix = Math.floor(100 + Math.random() * 900).toString();
    const custId = `${prefix}${randSuffix}`;

    const fullAddress = [
      formData.address.trim(),
      formData.city.trim(),
      formData.state.trim(),
      formData.pinCode.trim() ? `PIN: ${formData.pinCode.trim()}` : ''
    ].filter(Boolean).join(', ');

    const newCustomer: Customer = {
      id: custId,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      address: fullAddress || undefined,
      notes: formData.notes.trim() || (formData.productRequirement.trim() ? `Requirement: ${formData.productRequirement.trim()}` : undefined),
      whatsapp_opt_in: formData.sameAsPhone || Boolean(formData.whatsappNumber.trim()),
      created_at: new Date().toISOString(),
      created_by: currentUser?.name || 'Admin',
    };

    const newCrmCustomer: CRMCustomer = {
      id: custId,
      name: formData.name.trim(),
      companyName: formData.companyName.trim() || undefined,
      phone: formData.phone.trim(),
      whatsappNumber: formData.sameAsPhone ? formData.phone.trim() : (formData.whatsappNumber.trim() || undefined),
      email: formData.email.trim() || undefined,
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      state: formData.state.trim() || undefined,
      pinCode: formData.pinCode.trim() || undefined,
      source: (formData.source as any) || 'Walkin',
      budget: formData.budget ? Number(formData.budget) : undefined,
      status: 'New Inquiry',
      productRequirement: formData.productRequirement.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      preferredContactMethod: formData.sameAsPhone ? 'WhatsApp' : 'Phone',
      created_at: new Date().toISOString(),
      created_by: currentUser?.name || 'Admin',
    };

    if (onSaveCustomer) {
      onSaveCustomer(newCustomer, newCrmCustomer);
    }

    setSelectedCustomerId(custId);
    setShowAddModal(false);
    setFormData({
      name: '',
      phone: '',
      companyName: '',
      whatsappNumber: '',
      sameAsPhone: true,
      email: '',
      address: '',
      city: '',
      state: '',
      pinCode: '',
      source: 'Walkin',
      notes: '',
      productRequirement: '',
      budget: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">Customer Directory</h1>
          <p className="text-stone-500 text-xs mt-1">Review unified client profiles, contact pipelines, and aggregate payment ledgers</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-[#593622] hover:bg-[#432818] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
        >
          <UserPlus size={15} /> Add New Customer
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Directory search panel */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 text-stone-400" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers by name, phone..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl text-xs focus:outline-none transition leading-none font-medium"
            />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((cust) => {
                const isActive = cust.id === selectedCustomerId;
                const ordCount = orders.filter((o) => o.customer_id === cust.id).length;
                return (
                  <button
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition group cursor-pointer ${
                      isActive
                        ? 'bg-[#593622] border-[#593622] text-white shadow-md'
                        : 'bg-stone-50/50 border-stone-200/80 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <strong className={`block text-xs truncate ${isActive ? 'text-amber-300 font-bold' : 'text-stone-900'}`}>
                        {cust.name}
                      </strong>
                      <span className={`text-[10px] font-mono mt-1 block ${isActive ? 'text-stone-300' : 'text-stone-400'}`}>
                        {cust.phone}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-white/10 text-stone-100' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {ordCount} {ordCount === 1 ? 'order' : 'orders'}
                      </span>
                      <ChevronRight className={`opacity-40 group-hover:opacity-100 transition ${isActive ? 'text-white' : 'text-stone-400'}`} size={12} />
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-stone-400 text-center py-6">No customers found.</p>
            )}
          </div>
        </div>

        {/* Right Side: Active Customer Profile detailed page */}
        <div className="lg:col-span-8">
          {activeCustomer ? (
            <motion.div
              key={activeCustomer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Profile Card Header Banner */}
              <div className="bg-[#fcfcfb] border border-stone-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md border border-amber-400">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black font-display text-stone-900 tracking-tight leading-none">
                      {activeCustomer.name}
                    </h2>
                    <p className="text-stone-400 text-[10px] uppercase font-mono tracking-wider font-bold mt-1.5 flex items-center gap-1.5">
                      <Calendar size={11} /> Registered: {formatToDDMMYYYY(activeCustomer.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  {activeCustomer.phone && (
                    <a
                      href={`tel:${activeCustomer.phone}`}
                      className="inline-flex items-center gap-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-xs transition"
                    >
                      <Phone size={11} /> Call ({activeCustomer.phone})
                    </a>
                  )}
                  {activeCustomer.whatsapp_opt_in && (
                    <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-2.5 py-1.5 rounded-lg text-[10px] font-bold">
                      <MessageSquare size={11} /> WhatsApp Opt-In
                    </span>
                  )}
                  <button
                    onClick={() => {
                      const remainingCustomers = customers.filter(c => c.id !== activeCustomer.id);
                      onDeleteCustomer(activeCustomer.id);
                      if (remainingCustomers.length > 0) {
                        setSelectedCustomerId(remainingCustomers[0].id);
                      } else {
                        setSelectedCustomerId(null);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-xs transition cursor-pointer"
                  >
                    <Trash2 size={11} /> Delete Profile
                  </button>
                </div>
              </div>

              {/* Grid: Financial Stats Summary blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-mono font-bold text-stone-400">Total Invoiced</span>
                    <strong className="block text-lg font-black text-stone-800 mt-1">₹ {totalInvoiced.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="bg-stone-100 p-2 rounded-lg text-stone-600"><CreditCard size={15} /></div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-mono font-bold text-stone-400">Total Advance Paid</span>
                    <strong className="block text-lg font-black text-emerald-600 mt-1">₹ {totalPaid.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg"><CheckCircle size={15} /></div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex justify-between items-center">
                  <div>
                    <span className="text-[9px] uppercase font-mono font-bold text-stone-400">Outstanding Balance</span>
                    <strong className={`block text-lg font-black mt-1 ${outstandingDue > 0 ? 'text-rose-600' : 'text-stone-500'}`}>
                      ₹ {outstandingDue.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div className={`p-2 rounded-lg ${outstandingDue > 0 ? 'bg-rose-50 text-rose-600' : 'bg-stone-100 text-stone-400'}`}>
                    <Clock size={15} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Visual Section: Customer Contact info coordinates block */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3.5">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-stone-400">Information Sheet</h3>
                  <div className="space-y-3 text-xs leading-relaxed text-stone-600">
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold uppercase block">Shipping Address Coordinates</span>
                      <p className="text-stone-700 mt-1 bg-stone-50/70 p-2.5 rounded-lg border border-stone-100 text-[11px] font-medium leading-normal">
                        {activeCustomer.address || 'No registered delivery coordinates.'}
                      </p>
                    </div>
                    {activeCustomer.notes && (
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase block">Profile Notes</span>
                        <p className="text-stone-500 mt-1 italic">{activeCustomer.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual Section: Active Orders Pipeline List */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-3.5">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-stone-400">Order Pipeline ({customerOrders.length})</h3>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {customerOrders.length > 0 ? (
                      customerOrders.map((ord) => (
                        <div key={ord.id} className="p-2.5 bg-stone-50 rounded-xl border border-stone-150 flex items-center justify-between text-xs hover:border-stone-300 transition">
                          <div>
                            <span className="font-mono font-black text-stone-900 block">{ord.article_no}</span>
                            <span className="text-stone-500 text-[10px] block mt-0.5">{ord.sub_category}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[9.5px] bg-[#593622]/5 text-[#593622] font-black border border-[#593622]/10 capitalize">
                              {ord.current_status}
                            </span>
                            <button
                              onClick={() => onViewOrder(ord.id)}
                              className="text-stone-400 hover:text-stone-800 p-1.5 bg-white border border-stone-200 rounded-md shadow-xs transition"
                              title="Go to details"
                            >
                              <ArrowUpRight size={11} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-stone-400 italic py-4">No logged furniture orders for this client yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Section: Payment History log across orders */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
                <div className="pb-3 border-b border-stone-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-stone-500">Cross-Order Payment History Ledger</h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-mono font-bold px-2.5 py-0.5 border border-emerald-200 rounded-md block">
                    {customerPayments.length} Payments recorded
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-stone-600 border-collapse">
                    <thead>
                      <tr className="border-b border-stone-100 font-mono text-[10px] uppercase text-stone-405 font-bold">
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Order Ref</th>
                        <th className="py-2.5">Total Contract</th>
                        <th className="py-2.5">Advance Paid</th>
                        <th className="py-2.5">Balance Due</th>
                        <th className="py-2.5 font-bold font-sans">Payment Mode</th>
                        <th className="py-2.5 text-right">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {customerPayments.length > 0 ? (
                        customerPayments.map((p) => {
                          const orderRef = customerOrders.find((ord) => ord.id === p.order_id);
                          return (
                            <tr key={p.id} className="hover:bg-stone-50/50 transition">
                              <td className="py-3 font-mono font-semibold">{p.payment_date}</td>
                              <td className="py-3 font-mono font-bold text-stone-800">
                                {orderRef ? (
                                  <button
                                    onClick={() => onViewOrder(p.order_id)}
                                    className="hover:underline text-amber-800 font-black cursor-pointer"
                                  >
                                    {orderRef.article_no}
                                  </button>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="py-3 font-mono text-stone-900">₹ {p.total_amount.toLocaleString('en-IN')}</td>
                              <td className="py-3 font-mono text-emerald-600 font-bold">₹ {p.advance_paid.toLocaleString('en-IN')}</td>
                              <td className="py-3 font-mono font-bold text-rose-600">₹ {p.balance_due.toLocaleString('en-IN')}</td>
                              <td className="py-3 capitalize">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  p.payment_mode === 'cash'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : p.payment_mode === 'upi'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                }`}>
                                  {p.payment_mode}
                                </span>
                              </td>
                              <td className="py-3 text-right font-medium text-stone-550 max-w-[180px] truncate" title={p.notes}>
                                {p.notes || '—'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-stone-400 italic">
                            No payment ledger records registered for this client yet. Use "Payments Ledger" in active order details.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border border-stone-200">
              <UserIcon className="mx-auto text-stone-300 mb-2" size={28} />
              <p className="text-xs font-bold text-stone-550">Please select a customer profile to display.</p>
            </div>
          )}
        </div>
      </div>

      {/* ADD NEW CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-[#593622] text-white p-5 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-md">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-white">Add New Customer</h3>
                  <p className="text-xs text-stone-300">Create client profile & sync directly with CRM and Orders</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-white bg-stone-800/60 hover:bg-stone-800 p-2 rounded-xl transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddCustomerSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 text-xs flex items-center gap-1">
                    Customer Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 text-xs flex items-center gap-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-stone-400" size={14} />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="10-digit mobile number"
                      className="w-full pl-9 bg-stone-50 border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 text-xs flex items-center gap-1">
                    Company / Firm Name (Optional)
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 text-stone-400" size={14} />
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="e.g. Sharma Interiors"
                      className="w-full pl-9 bg-stone-50 border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 text-xs flex items-center gap-1">
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 text-stone-400" size={14} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. rajesh@example.com"
                      className="w-full pl-9 bg-stone-50 border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Opt-in */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-900">
                  <input
                    type="checkbox"
                    checked={formData.sameAsPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, sameAsPhone: e.target.checked }))}
                    className="accent-emerald-600 rounded w-4 h-4"
                  />
                  <span>WhatsApp number is same as primary phone</span>
                </label>

                {!formData.sameAsPhone && (
                  <div className="pt-1">
                    <input
                      type="tel"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                      placeholder="Enter WhatsApp mobile number"
                      className="w-full bg-white border border-emerald-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-900"
                    />
                  </div>
                )}
              </div>

              {/* Address / Location */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 text-xs flex items-center gap-1">
                  Delivery / Site Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 text-stone-400" size={14} />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Building, Flat, Street, Area coordinates"
                    className="w-full pl-9 bg-stone-50 border border-stone-200 focus:border-[#593622] focus:ring-1 focus:ring-[#593622] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 text-[11px]">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Mumbai / Pune"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 text-xs font-semibold text-stone-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 text-[11px]">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="Maharashtra"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 text-xs font-semibold text-stone-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 text-[11px]">PIN Code</label>
                  <input
                    type="text"
                    value={formData.pinCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, pinCode: e.target.value }))}
                    placeholder="400001"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3 py-2 text-xs font-semibold text-stone-900"
                  />
                </div>
              </div>

              {/* Requirement & Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 text-xs">Product Requirement</label>
                  <input
                    type="text"
                    value={formData.productRequirement}
                    onChange={(e) => setFormData(prev => ({ ...prev, productRequirement: e.target.value }))}
                    placeholder="e.g. 4-Door Wardrobe, Modular Kitchen"
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700 text-xs">Lead Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                    className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900"
                  >
                    <option value="Walkin">Walk-in Customer</option>
                    <option value="IndiaMART">IndiaMART</option>
                    <option value="Reference">Reference / Word of Mouth</option>
                    <option value="Website">Website</option>
                    <option value="Instagram">Social Media / Instagram</option>
                    <option value="Repeat Client">Repeat Client</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 text-xs">Additional Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special client preferences, delivery instructions, or notes..."
                  className="w-full bg-stone-50 border border-stone-200 focus:border-[#593622] rounded-xl px-3.5 py-2 text-xs font-semibold text-stone-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-150">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-100 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#593622] hover:bg-[#432818] text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Save Customer Profile
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
