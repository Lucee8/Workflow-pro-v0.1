/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Order,
  OrderStage,
  StatusLog,
  User,
  normalizeStage,
} from '../types';
import {
  PIPELINE_STAGES,
  ResolvedOrderDetailsContext,
  formatCurrencyINR,
  isOrderCompleted,
  isOrderDispatched,
  isOrderOverdue,
} from './orderHelpers';
import { formatToDDMMYYYY, parseToInputDate } from '../utils';
import { generateUUID } from '../db/store';
import {
  Printer,
  X,
  RefreshCw,
  UserCheck,
  ClipboardList,
  MapPin,
  FileText,
  ExternalLink,
  SlidersHorizontal,
  TrendingUp,
  CheckCircle2,
  CircleDot,
  Clock,
  ArrowRight,
  Phone,
  Mail,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';

interface OrderDetailsPanelProps {
  order: Order;
  context: ResolvedOrderDetailsContext;
  users: User[];
  currentUser?: User | null;
  canEdit: boolean;
  onClose: () => void;
  onUpdateOrder?: (updatedOrder: Order, newLog?: StatusLog) => void;
  onOpenFullView: (orderId: string) => void;
  onOpenJobCard: () => void;
  onOpenShippingLabel: () => void;
  onOpenQuotation: () => void;
  onNavigateTab: (tabId: string) => void;
}

const STAGE_SEQUENCE: OrderStage[] = [
  'Pending',
  'Designing',
  'Wood Procurement',
  'Making Started',
  'CNC Wood Carving',
  'Assembly',
  'QC 1',
  'Making Completed',
  'Polish',
  'QC 2',
  'Delivery',
  'Ready to Dispatch',
  'Dispatched',
];

export default function OrderDetailsPanel({
  order,
  context,
  users,
  currentUser,
  canEdit,
  onClose,
  onUpdateOrder,
  onOpenFullView,
  onOpenJobCard,
  onOpenShippingLabel,
  onOpenQuotation,
  onNavigateTab,
}: OrderDetailsPanelProps) {
  const [activeEditor, setActiveEditor] = React.useState<'none' | 'stage' | 'assign' | 'dispatch'>('none');
  const [selectedStage, setSelectedStage] = React.useState<OrderStage>(normalizeStage(order.current_status));
  const [stageNote, setStageNote] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Assignment form state
  const [carpenterId, setCarpenterId] = React.useState(order.carpenter_id || '');
  const [carpenterRate, setCarpenterRate] = React.useState<string>(
    order.carpenter_labour_rate !== undefined ? String(order.carpenter_labour_rate) : ''
  );
  const [carpenterDue, setCarpenterDue] = React.useState(parseToInputDate(order.carpenter_delivery_date) || '');
  const [polishId, setPolishId] = React.useState(order.polish_person_id || '');
  const [polishRate, setPolishRate] = React.useState<string>(
    order.polish_labour_rate !== undefined ? String(order.polish_labour_rate) : ''
  );
  const [polishDue, setPolishDue] = React.useState(parseToInputDate(order.polish_delivery_date) || '');

  // Dispatch modal form state
  const [dispatchForm, setDispatchForm] = React.useState({
    dispatchDate: order.dispatchDate || parseToInputDate(order.delivery_date) || new Date().toISOString().split('T')[0],
    deliveryPersonName: order.deliveryPersonName || '',
    deliveryPersonContact: order.deliveryPersonContact || '',
    vehicleNumber: order.vehicleNumber || '',
    dispatchNotes: order.dispatchNotes || '',
  });

  // Sync local form state when selected order changes
  React.useEffect(() => {
    setActiveEditor('none');
    setSelectedStage(normalizeStage(order.current_status));
    setStageNote('');
    setCarpenterId(order.carpenter_id || '');
    setCarpenterRate(order.carpenter_labour_rate !== undefined ? String(order.carpenter_labour_rate) : '');
    setCarpenterDue(parseToInputDate(order.carpenter_delivery_date) || '');
    setPolishId(order.polish_person_id || '');
    setPolishRate(order.polish_labour_rate !== undefined ? String(order.polish_labour_rate) : '');
    setPolishDue(parseToInputDate(order.polish_delivery_date) || '');
    setDispatchForm({
      dispatchDate: order.dispatchDate || parseToInputDate(order.delivery_date) || new Date().toISOString().split('T')[0],
      deliveryPersonName: order.deliveryPersonName || '',
      deliveryPersonContact: order.deliveryPersonContact || '',
      vehicleNumber: order.vehicleNumber || '',
      dispatchNotes: order.dispatchNotes || '',
    });
  }, [order.id, order.current_status, order.carpenter_id, order.polish_person_id]);

  const carpenters = users.filter((u) => u.is_active !== false && u.role === 'carpenter');
  const polishers = users.filter((u) => u.is_active !== false && u.role === 'polish_person');
  const otherLeads = users.filter(
    (u) => u.is_active !== false && !['carpenter', 'polish_person'].includes(u.role)
  );

  const normalizedCurrent = normalizeStage(order.current_status || order.stage);
  const overdue = isOrderOverdue(order);
  const completed = isOrderCompleted(order);
  const dispatched = isOrderDispatched(order);

  const statusBadge = dispatched
    ? { label: 'DISPATCHED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : completed
    ? { label: 'READY', cls: 'bg-teal-50 text-teal-700 border-teal-200' }
    : overdue
    ? { label: 'OVERDUE', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
    : { label: 'IN PROGRESS', cls: 'bg-orange-50 text-[#e05e00] border-orange-200' };

  const actorUser = currentUser || {
    id: 'admin',
    name: 'Workshop Admin',
    role: 'admin' as const,
  };

  const applyStageChange = (targetStage: OrderStage, customNote?: string) => {
    if (!onUpdateOrder || isSubmitting) return;
    const normTarget = normalizeStage(targetStage);

    if (normTarget === 'Making Started') {
      const isApproved =
        order.wood_schedule_status === 'Approved' || order.wood_schedule?.status === 'Approved';
      if (!isApproved) {
        alert(
          'Cannot move order to "Making Started". Admin approval for the Wood Schedule is required first (check Full Spec Sheet or Wood Management).'
        );
        return;
      }
    }

    if (normTarget === 'Dispatched') {
      setActiveEditor('dispatch');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 500);

    const log: StatusLog = {
      id: 'log_' + generateUUID().split('-')[0],
      order_id: order.id,
      stage: normTarget,
      changed_by: actorUser.id,
      changed_by_name: actorUser.name,
      changed_by_role: actorUser.role,
      timestamp: new Date().toISOString(),
      note: customNote?.trim() || `Stage updated from ${normalizedCurrent} to ${normTarget} in Orders Management.`,
      qc_passed: null,
    };

    const updatedOrder: Order = {
      ...order,
      current_status: normTarget,
      stage: normTarget,
      updated_at: new Date().toISOString(),
    };

    onUpdateOrder(updatedOrder, log);
    setActiveEditor('none');
    setStageNote('');
  };

  const handleConfirmDispatch = () => {
    if (!onUpdateOrder || isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 500);

    const updatedOrder: Order = {
      ...order,
      current_status: 'Dispatched',
      stage: 'Dispatched',
      dispatchDate: dispatchForm.dispatchDate || new Date().toISOString().split('T')[0],
      dispatchedAt: new Date().toISOString(),
      dispatchedBy: actorUser.name || actorUser.id,
      dispatchNotes: dispatchForm.dispatchNotes,
      deliveryPersonName: dispatchForm.deliveryPersonName,
      deliveryPersonContact: dispatchForm.deliveryPersonContact,
      vehicleNumber: dispatchForm.vehicleNumber,
      updated_at: new Date().toISOString(),
    };

    const log: StatusLog = {
      id: 'log_' + generateUUID().split('-')[0],
      order_id: order.id,
      stage: 'Dispatched',
      changed_by: actorUser.id,
      changed_by_name: actorUser.name,
      changed_by_role: actorUser.role,
      timestamp: new Date().toISOString(),
      note: `Order dispatched. Driver: ${dispatchForm.deliveryPersonName || 'N/A'}, Vehicle: ${dispatchForm.vehicleNumber || 'N/A'}. ${dispatchForm.dispatchNotes}`.trim(),
      qc_passed: true,
    };

    onUpdateOrder(updatedOrder, log);
    setActiveEditor('none');
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateOrder || isSubmitting) return;
    setIsSubmitting(true);
    setTimeout(() => setIsSubmitting(false), 500);

    const newCarp = users.find((u) => u.id === carpenterId);
    const newPol = users.find((u) => u.id === polishId);

    const updatedOrder: Order = {
      ...order,
      carpenter_id: carpenterId,
      carpenter_labour_rate: carpenterRate !== '' ? Number(carpenterRate) : order.carpenter_labour_rate,
      carpenter_delivery_date: carpenterDue || undefined,
      polish_person_id: polishId || '',
      polish_labour_rate: polishRate !== '' ? Number(polishRate) : order.polish_labour_rate,
      polish_delivery_date: polishDue || undefined,
      updated_at: new Date().toISOString(),
    };

    const log: StatusLog = {
      id: 'log_' + generateUUID().split('-')[0],
      order_id: order.id,
      stage: normalizedCurrent,
      changed_by: actorUser.id,
      changed_by_name: actorUser.name,
      changed_by_role: actorUser.role,
      timestamp: new Date().toISOString(),
      note: `Craftsman assignment updated: Carpenter → ${newCarp?.name || 'Unassigned'}, Polish → ${newPol?.name || 'Unassigned'}.`,
      qc_passed: null,
    };

    onUpdateOrder(updatedOrder, log);
    setActiveEditor('none');
  };

  const getNextStage = (): OrderStage | null => {
    if (normalizedCurrent === 'Dispatched') return null;
    if (normalizedCurrent === 'Delivery' || normalizedCurrent === 'Ready to Dispatch' || normalizedCurrent === 'Ready To Dispatch') {
      return 'Dispatched';
    }
    const idx = STAGE_SEQUENCE.indexOf(normalizedCurrent);
    if (idx === -1) return 'Designing';
    const candidate = STAGE_SEQUENCE[idx + 1];
    // Skip 'Ready to Dispatch' intermediate in quick advance so step 11 goes cleanly to Delivery -> Dispatched or Ready to Dispatch
    return candidate || null;
  };

  const nextStage = getNextStage();
  const woodStatus = order.wood_schedule_status || order.wood_schedule?.status || 'Pending';

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs flex flex-col overflow-hidden">
      {/* Sticky Top Header */}
      <div className="p-4 border-b border-stone-100 space-y-3 bg-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-black font-display text-stone-900 tracking-tight truncate">
                #{order.article_no}
              </h2>
              <span
                className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold uppercase tracking-wider ${statusBadge.cls}`}
              >
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5 truncate">
              {[order.category, order.sub_category, order.design_type].filter(Boolean).join(' • ')}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onOpenShippingLabel}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition cursor-pointer"
              title="Print Shipping Label"
              aria-label="Print Shipping Label"
            >
              <Printer size={14} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition cursor-pointer"
              title="Close details panel"
              aria-label="Close details panel"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Action Row: Update Stage / Re-assign / Job Card */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setActiveEditor(activeEditor === 'stage' ? 'none' : 'stage')}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
              activeEditor === 'stage'
                ? 'bg-[#4a2c1b] text-white border-[#4a2c1b]'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            <RefreshCw size={12} />
            <span>Update Stage</span>
          </button>

          <button
            type="button"
            disabled={!canEdit}
            onClick={() => setActiveEditor(activeEditor === 'assign' ? 'none' : 'assign')}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
              activeEditor === 'assign'
                ? 'bg-[#4a2c1b] text-white border-[#4a2c1b]'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            <UserCheck size={12} />
            <span>Re-assign</span>
          </button>

          <button
            type="button"
            onClick={onOpenJobCard}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#e05e00] hover:bg-[#c85200] text-white text-xs font-bold shadow-xs transition whitespace-nowrap cursor-pointer"
          >
            <ClipboardList size={12} />
            <span>Job Card</span>
          </button>
        </div>

        {/* Inline Editor: Stage Picker */}
        {activeEditor === 'stage' && canEdit && (
          <div className="p-3 rounded-xl bg-[#faf8f5] border border-amber-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold uppercase text-[10px] tracking-wider text-[#593622]">
                Select Production Stage
              </span>
              <button
                type="button"
                onClick={() => setActiveEditor('none')}
                className="text-stone-400 hover:text-stone-700 text-[11px] font-bold"
              >
                Cancel
              </button>
            </div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as OrderStage)}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-800 focus:outline-none focus:border-[#e05e00]"
            >
              {STAGE_SEQUENCE.map((st, idx) => (
                <option key={st} value={st}>
                  {idx < 11 ? `${idx + 1}. ` : ''}
                  {st}
                </option>
              ))}
            </select>
            {selectedStage === 'Making Started' && woodStatus !== 'Approved' && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
                <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Wood Schedule is currently <strong>{woodStatus}</strong>. Admin approval in Wood Management is required before starting Making.
                </span>
              </div>
            )}
            <input
              type="text"
              value={stageNote}
              onChange={(e) => setStageNote(e.target.value)}
              placeholder="Optional stage transition note..."
              className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 focus:outline-none focus:border-[#e05e00]"
            />
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => applyStageChange(selectedStage, stageNote)}
              className="w-full py-2 rounded-lg bg-[#4a2c1b] hover:bg-[#382013] text-white text-xs font-bold transition cursor-pointer"
            >
              Save Stage Update
            </button>
          </div>
        )}

        {/* Inline Editor: Craftsman Assignment */}
        {activeEditor === 'assign' && canEdit && (
          <form onSubmit={handleSaveAssignment} className="p-3 rounded-xl bg-[#faf8f5] border border-amber-200/80 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold uppercase text-[10px] tracking-wider text-[#593622]">
                Assign Workshop Craftsmen
              </span>
              <button
                type="button"
                onClick={() => setActiveEditor('none')}
                className="text-stone-400 hover:text-stone-700 text-[11px] font-bold"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-500 mb-1">
                  Carpenter Lead
                </label>
                <select
                  value={carpenterId}
                  onChange={(e) => setCarpenterId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#e05e00]"
                >
                  <option value="">-- Unassigned --</option>
                  {carpenters.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.initials})
                    </option>
                  ))}
                  {otherLeads.length > 0 && (
                    <optgroup label="Managers / Staff">
                      {otherLeads.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-500 mb-1">
                    Carpenter Rate (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={carpenterRate}
                    onChange={(e) => setCarpenterRate(e.target.value)}
                    placeholder="e.g. 4500"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-500 mb-1">
                    Carpentry Target
                  </label>
                  <input
                    type="date"
                    value={carpenterDue}
                    onChange={(e) => setCarpenterDue(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-500 mb-1">
                  Polish / Finish Lead
                </label>
                <select
                  value={polishId}
                  onChange={(e) => setPolishId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-none focus:border-[#e05e00]"
                >
                  <option value="">-- Unassigned --</option>
                  {polishers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.initials})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-500 mb-1">
                    Polish Rate (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={polishRate}
                    onChange={(e) => setPolishRate(e.target.value)}
                    placeholder="e.g. 2500"
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-stone-500 mb-1">
                    Polish Target
                  </label>
                  <input
                    type="date"
                    value={polishDue}
                    onChange={(e) => setPolishDue(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 rounded-lg bg-[#4a2c1b] hover:bg-[#382013] text-white text-xs font-bold transition cursor-pointer"
            >
              Save Craftsman Assignment
            </button>
          </form>
        )}

        {/* Inline Dispatch Manifest Confirmation */}
        {activeEditor === 'dispatch' && canEdit && (
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold uppercase text-[10px] tracking-wider text-emerald-800">
                Confirm Order Dispatch
              </span>
              <button
                type="button"
                onClick={() => setActiveEditor('none')}
                className="text-stone-400 hover:text-stone-700 text-[11px] font-bold"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-500 mb-0.5">Dispatch Date</label>
                <input
                  type="date"
                  value={dispatchForm.dispatchDate}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchDate: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-500 mb-0.5">Vehicle No</label>
                <input
                  type="text"
                  placeholder="MH 04 AB 1234"
                  value={dispatchForm.vehicleNumber}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNumber: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-500 mb-0.5">Driver Name</label>
                <input
                  type="text"
                  placeholder="Driver Name"
                  value={dispatchForm.deliveryPersonName}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, deliveryPersonName: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-stone-500 mb-0.5">Driver Phone</label>
                <input
                  type="text"
                  placeholder="+91 ..."
                  value={dispatchForm.deliveryPersonContact}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, deliveryPersonContact: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
            </div>
            <textarea
              rows={2}
              placeholder="Dispatch notes..."
              value={dispatchForm.dispatchNotes}
              onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchNotes: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
            />
            <button
              type="button"
              onClick={handleConfirmDispatch}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
            >
              Confirm &amp; Mark Dispatched
            </button>
          </div>
        )}
      </div>

      {/* Scrollable Inner Detail Cards */}
      <div className="p-4 space-y-3.5 bg-[#fcfcfb] overflow-y-auto max-h-[calc(100vh-280px)]">
        {/* Card 1: Customer Details */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
              <UserCheck size={12} className="text-stone-400" />
              Customer Details
            </span>
            <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-[10px] font-mono font-semibold text-stone-600">
              ID: {context.customerId}
            </span>
          </div>

          <div>
            <p className="text-sm font-bold text-stone-900">{context.customerName}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-stone-600">
              {context.customerPhone ? (
                <a
                  href={`tel:${context.customerPhone}`}
                  className="inline-flex items-center gap-1 font-mono hover:text-[#e05e00] transition"
                >
                  <Phone size={11} className="text-stone-400" />
                  {context.customerPhone}
                </a>
              ) : (
                <span className="text-stone-400 text-[11px]">No phone on file</span>
              )}
              {context.customerEmail && (
                <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 truncate">
                  <Mail size={11} className="text-stone-400" />
                  {context.customerEmail}
                </span>
              )}
            </div>
            {context.customerAddress && (
              <p className="mt-1.5 text-[11px] text-stone-500 flex items-start gap-1.5 leading-snug">
                <MapPin size={12} className="shrink-0 mt-0.5 text-stone-400" />
                <span>{context.customerAddress}</span>
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Quotation Context */}
        <div className="bg-[#fffaf5] rounded-xl border border-orange-200/70 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#9a4a18]">
              <FileText size={12} className="text-[#e05e00]" />
              Quotation Context
            </span>
            {context.quotationRef ? (
              <button
                type="button"
                onClick={() => {
                  if (context.quotation) onOpenQuotation();
                  else onNavigateTab('crm');
                }}
                className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#e05e00] hover:underline cursor-pointer"
              >
                View {context.quotationRef}
                <ExternalLink size={11} />
              </button>
            ) : (
              <span className="text-[10px] font-mono text-stone-400">Direct Work Order</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-lg border border-stone-200/80 p-2 text-center">
              <span className="block text-[9px] font-mono font-bold uppercase text-stone-400">
                Quote Total
              </span>
              <strong className="block text-xs sm:text-sm font-black font-mono text-stone-900 mt-0.5 tabular-nums">
                {formatCurrencyINR(context.quoteTotal)}
              </strong>
            </div>

            <div className="bg-white rounded-lg border border-stone-200/80 p-2 text-center">
              <span className="block text-[9px] font-mono font-bold uppercase text-stone-400">
                Line Items
              </span>
              <strong className="block text-xs sm:text-sm font-black text-stone-900 mt-0.5 tabular-nums">
                {context.siblingOrders.length}{' '}
                {context.siblingOrders.length === 1 ? 'Order' : 'Orders'}
              </strong>
            </div>

            <div className="bg-white rounded-lg border border-stone-200/80 p-2 text-center">
              <span className="block text-[9px] font-mono font-bold uppercase text-stone-400">
                Balance Due
              </span>
              <strong
                className={`block text-xs sm:text-sm font-black font-mono mt-0.5 tabular-nums ${
                  context.balanceDue > 0 ? 'text-[#e05e00]' : 'text-emerald-700'
                }`}
              >
                {formatCurrencyINR(context.balanceDue)}
              </strong>
            </div>
          </div>
        </div>

        {/* Card 3: Technical Specifications */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
              <SlidersHorizontal size={12} className="text-stone-400" />
              Technical Specifications
            </span>
            <button
              type="button"
              onClick={() => onOpenFullView(order.id)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#593622] hover:text-[#e05e00] transition cursor-pointer"
            >
              <Maximize2 size={10} />
              Full Spec
            </button>
          </div>

          <dl className="divide-y divide-stone-100 text-xs">
            <div className="py-1.5 flex items-center justify-between gap-3">
              <dt className="text-stone-500 shrink-0">Primary Article</dt>
              <dd className="font-bold text-stone-900 text-right truncate">
                {order.sub_category || order.category}
              </dd>
            </div>
            <div className="py-1.5 flex items-center justify-between gap-3">
              <dt className="text-stone-500 shrink-0">Timber Material</dt>
              <dd className="font-bold text-stone-900 text-right truncate">
                {order.material || '—'}
              </dd>
            </div>
            <div className="py-1.5 flex items-center justify-between gap-3">
              <dt className="text-stone-500 shrink-0">Dimensions</dt>
              <dd className="font-bold font-mono text-stone-900 text-right truncate">
                {order.custom_size || order.size || 'Custom'}
              </dd>
            </div>
            <div className="py-1.5 flex items-center justify-between gap-3">
              <dt className="text-stone-500 shrink-0">Quantity Booked</dt>
              <dd className="font-bold text-stone-900 text-right tabular-nums">
                {order.no_of_units || 1} {order.no_of_units === 1 ? 'Unit' : 'Units'} ({order.design_type})
              </dd>
            </div>
            <div className="py-1.5 flex items-center justify-between gap-3">
              <dt className="text-stone-500 shrink-0">Finishing Spec</dt>
              <dd className="font-bold text-stone-900 text-right truncate">
                {[order.finish, order.color_shade].filter(Boolean).join(' • ') || '—'}
              </dd>
            </div>
            <div className="py-1.5 flex items-center justify-between gap-3">
              <dt className="text-stone-500 shrink-0">Craftsman Lead</dt>
              <dd className="font-bold text-stone-900 text-right truncate">
                {context.carpenter?.name || 'Unassigned'}
                {context.polishPerson ? ` / ${context.polishPerson.name}` : ''}
              </dd>
            </div>
            <div className="py-1.5 flex items-center justify-between gap-3">
              <dt className="text-stone-500 shrink-0">Wood Schedule</dt>
              <dd>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    woodStatus === 'Approved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : woodStatus === 'Rejected'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {woodStatus}
                </span>
              </dd>
            </div>
            <div className="py-1.5 flex items-center justify-between gap-3">
              <dt className="text-stone-500 shrink-0">Target Delivery</dt>
              <dd className={`font-bold font-mono ${overdue ? 'text-rose-600' : 'text-stone-900'}`}>
                {formatToDDMMYYYY(order.delivery_date) || '—'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Card 4: Live Fabrication Stage */}
        <div className="bg-white rounded-xl border border-stone-200/80 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
              <TrendingUp size={12} className="text-[#e05e00]" />
              Live Fabrication Stage
            </span>
            <span className="px-2 py-0.5 rounded bg-[#4a2c1b] text-white text-[10px] font-mono font-bold tabular-nums">
              Stage {context.stageConfig.step} of {PIPELINE_STAGES.length}
            </span>
          </div>

          <div className="space-y-2.5 pl-1">
            {/* Current Active Stage Node */}
            <div className="flex items-start gap-2.5">
              <CircleDot size={15} className="text-[#e05e00] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#e05e00]">
                  {normalizedCurrent} ({context.stageConfig.subtitle})
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Stage {context.stageConfig.step} • {overdue ? 'Behind schedule' : 'Active workshop tracking'}
                </p>
              </div>
            </div>

            {/* Recorded Status Logs */}
            {context.logs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-start gap-2.5">
                <CheckCircle2
                  size={14}
                  className={`shrink-0 mt-0.5 ${
                    log.qc_passed === false ? 'text-rose-500' : 'text-[#593622]'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-stone-800 truncate">{log.stage}</p>
                    <span className="text-[10px] font-mono text-stone-400 shrink-0">
                      {formatToDDMMYYYY(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-snug line-clamp-2">
                    {log.note || `Updated by ${log.changed_by_name}`}
                  </p>
                </div>
              </div>
            ))}

            {/* Next Upcoming Stage Preview */}
            {nextStage && (
              <div className="flex items-start gap-2.5 opacity-60">
                <Clock size={14} className="text-stone-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-stone-600">Next: {nextStage}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sticky Panel Footer */}
      <div className="p-3.5 bg-white border-t border-stone-200 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onOpenShippingLabel}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-bold text-stone-800 transition whitespace-nowrap cursor-pointer"
        >
          <Printer size={13} />
          <span>Print Shipping Label</span>
        </button>

        {canEdit && nextStage ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => applyStageChange(nextStage)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#4a2c1b] hover:bg-[#382013] text-white text-xs font-bold shadow-xs transition whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <span>{nextStage === 'Dispatched' ? 'Mark Dispatched' : 'Advance Stage'}</span>
            <ArrowRight size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenFullView(order.id)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition whitespace-nowrap cursor-pointer"
          >
            <span>Open Full Details</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
