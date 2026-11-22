/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Order, CRMQuotation } from '../types';
import { ResolvedOrderDetailsContext, formatCurrencyINR } from './orderHelpers';
import { formatToDDMMYYYY } from '../utils';
import {
  Printer,
  X,
  Hammer,
  Package,
  MapPin,
  Phone,
  CheckSquare,
  FileText,
  ExternalLink,
  Truck,
  Sparkles,
} from 'lucide-react';

interface JobCardModalProps {
  order: Order;
  context: ResolvedOrderDetailsContext;
  onClose: () => void;
}

export function OrderJobCardModal({ order, context, onClose }: JobCardModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const parts = order.wood_schedule?.parts || [];
  const refImage = order.images?.[0]?.url;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:block">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto print:shadow-none print:border-0 print:rounded-none print:max-w-none print-wrapper-flow">
        {/* Modal Header (Hidden on print) */}
        <div className="px-5 py-3.5 bg-[#4a2c1b] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <Hammer size={18} className="text-amber-300" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">Workshop Production Job Card</h3>
              <p className="text-[11px] text-amber-200/80 font-mono">Article #{order.article_no}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#e05e00] hover:bg-[#c85200] text-white text-xs font-bold transition cursor-pointer"
            >
              <Printer size={14} />
              Print Job Card
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close Job Card modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Sheet Content */}
        <div className="p-6 sm:p-8 space-y-5 text-stone-900 bg-white">
          {/* Top Document Title & Metadata */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-stone-900 pb-4">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-500">
                Bhise&apos;z Furniture ERP Studio • Workshop Traveler
              </p>
              <h2 className="text-2xl font-black font-display tracking-tight text-stone-950 mt-0.5">
                JOB CARD #{order.article_no}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-stone-100 border border-stone-300 font-bold">
                  Order ID: {order.id}
                </span>
                {context.quotationRef && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-900 font-bold">
                    Quote Ref: {context.quotationRef}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded border font-bold uppercase ${
                    order.priority === 'urgent'
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : 'bg-stone-50 border-stone-300 text-stone-700'
                  }`}
                >
                  Priority: {order.priority === 'urgent' ? 'RUSH / URGENT' : 'NORMAL'}
                </span>
              </div>
            </div>

            <div className="text-right font-mono text-xs space-y-1">
              <div>
                <span className="text-stone-500">Order Date:</span>{' '}
                <strong className="text-stone-900">{formatToDDMMYYYY(order.order_date) || '—'}</strong>
              </div>
              <div>
                <span className="text-stone-500">Delivery Target:</span>{' '}
                <strong className="text-stone-900">{formatToDDMMYYYY(order.delivery_date) || '—'}</strong>
              </div>
              <div>
                <span className="text-stone-500">Current Stage:</span>{' '}
                <strong className="text-[#e05e00]">{context.stageConfig.step}/11 • {order.current_status}</strong>
              </div>
            </div>
          </div>

          {/* Customer + Product Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-5 border border-stone-300 rounded-xl p-3.5 space-y-1.5 bg-stone-50/50">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                Customer &amp; Site Information
              </p>
              <p className="text-sm font-bold text-stone-950">{context.customerName}</p>
              {context.customerPhone && (
                <p className="text-xs font-mono text-stone-700 flex items-center gap-1.5">
                  <Phone size={12} /> {context.customerPhone}
                </p>
              )}
              {context.customerAddress && (
                <p className="text-xs text-stone-600 flex items-start gap-1.5">
                  <MapPin size={12} className="shrink-0 mt-0.5" />
                  <span>{context.customerAddress}</span>
                </p>
              )}
            </div>

            <div className="sm:col-span-7 border border-stone-300 rounded-xl p-3.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Primary Article</span>
                <strong className="text-stone-900">{order.sub_category || order.category}</strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Quantity Booked</span>
                <strong className="text-stone-900 font-mono tabular-nums">{order.no_of_units || 1} Unit(s)</strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Timber / Material</span>
                <strong className="text-stone-900">{order.material || '—'}</strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Dimensions</span>
                <strong className="text-stone-900 font-mono">{order.custom_size || order.size || 'Custom'}</strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Finishing &amp; Shade</span>
                <strong className="text-stone-900">
                  {[order.finish, order.color_shade].filter(Boolean).join(' • ') || '—'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Design Type</span>
                <strong className="text-stone-900">{order.design_type || 'Custom'}</strong>
              </div>
            </div>
          </div>

          {/* Craftsmanship Team & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-stone-300 rounded-xl p-3.5 text-xs space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 block">
                Carpentry Lead Assignment
              </span>
              <p className="text-sm font-bold text-stone-900">
                {context.carpenter?.name || 'Unassigned'}
              </p>
              <div className="flex flex-wrap gap-3 text-[11px] font-mono text-stone-600">
                <span>Target: {order.carpenter_delivery_date ? formatToDDMMYYYY(order.carpenter_delivery_date) : '—'}</span>
                {order.carpenter_labour_rate !== undefined && (
                  <span>Rate: {formatCurrencyINR(order.carpenter_labour_rate)}</span>
                )}
              </div>
            </div>

            <div className="border border-stone-300 rounded-xl p-3.5 text-xs space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 block">
                Polish / Finishing Lead Assignment
              </span>
              <p className="text-sm font-bold text-stone-900">
                {context.polishPerson?.name || 'Unassigned'}
              </p>
              <div className="flex flex-wrap gap-3 text-[11px] font-mono text-stone-600">
                <span>Target: {order.polish_delivery_date ? formatToDDMMYYYY(order.polish_delivery_date) : '—'}</span>
                {order.polish_labour_rate !== undefined && (
                  <span>Rate: {formatCurrencyINR(order.polish_labour_rate)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Reference Image + Special Workshop Notes */}
          {(order.special_notes || order.internal_notes || refImage) && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              {refImage && (
                <div className="sm:col-span-4 border border-stone-300 rounded-xl p-2 bg-stone-50">
                  <img
                    src={refImage}
                    alt={order.sub_category}
                    referrerPolicy="no-referrer"
                    className="w-full h-32 object-cover rounded-lg border border-stone-200"
                  />
                  <p className="text-[10px] font-mono text-stone-500 text-center mt-1 uppercase">
                    Design Reference
                  </p>
                </div>
              )}
              <div className={`${refImage ? 'sm:col-span-8' : 'sm:col-span-12'} border border-stone-300 rounded-xl p-3.5 text-xs space-y-2`}>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                  Workshop Notes &amp; Fabrication Instructions
                </p>
                {order.special_notes && <p className="text-stone-800 leading-relaxed">{order.special_notes}</p>}
                {order.internal_notes && (
                  <p className="text-stone-600 italic border-t border-stone-200 pt-1.5">{order.internal_notes}</p>
                )}
              </div>
            </div>
          )}

          {/* Wood Schedule Parts Breakdown */}
          {parts.length > 0 && (
            <div className="border border-stone-300 rounded-xl overflow-hidden">
              <div className="px-3.5 py-2 bg-stone-100 border-b border-stone-300 flex items-center justify-between text-xs">
                <span className="font-mono font-bold uppercase tracking-wider text-stone-700">
                  Wood Schedule Cutlist ({parts.length} parts • {order.wood_schedule?.sqft || 0} sq.ft)
                </span>
                <span className="font-mono font-bold text-stone-700">
                  Status: {order.wood_schedule_status || order.wood_schedule?.status || 'Pending'}
                </span>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 font-mono text-[10px] uppercase text-stone-500">
                    <th className="py-1.5 px-3">Part Name</th>
                    <th className="py-1.5 px-3">Width (in)</th>
                    <th className="py-1.5 px-3">Thickness/Breadth (in)</th>
                    <th className="py-1.5 px-3">Length (ft)</th>
                    <th className="py-1.5 px-3 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {parts.map((p) => (
                    <tr key={p.id}>
                      <td className="py-1.5 px-3 font-medium text-stone-900">{p.part_name}</td>
                      <td className="py-1.5 px-3 font-mono tabular-nums">{p.width}</td>
                      <td className="py-1.5 px-3 font-mono tabular-nums">{p.breadth}</td>
                      <td className="py-1.5 px-3 font-mono tabular-nums">{p.length}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold tabular-nums">{p.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Stage Sign-off Matrix */}
          <div className="border border-stone-300 rounded-xl p-3.5">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 mb-2.5 flex items-center gap-1.5">
              <CheckSquare size={12} /> Floor Stage Sign-Off Checklist
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {[
                'Wood Sizing',
                'Joinery / Making',
                'CNC Carving',
                'Assembly Fit',
                'QC 1 Verified',
                'Polish / PU Coat',
                'QC 2 Approved',
                'Dispatch Ready',
              ].map((step) => (
                <div key={step} className="border border-stone-300 rounded-lg p-2 flex items-center justify-between">
                  <span className="font-semibold text-stone-800">{step}</span>
                  <span className="h-3.5 w-3.5 border border-stone-500 rounded-xs inline-block shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ShippingLabelModalProps {
  order: Order;
  context: ResolvedOrderDetailsContext;
  onClose: () => void;
}

export function OrderShippingLabelModal({ order, context, onClose }: ShippingLabelModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:block">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden my-auto print:shadow-none print:border-0 print:rounded-none print-wrapper-flow">
        {/* Modal Header (Hidden on print) */}
        <div className="px-5 py-3.5 bg-[#4a2c1b] text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-amber-300" />
            <div>
              <h3 className="text-sm font-bold">Workshop Dispatch Shipping Label</h3>
              <p className="text-[11px] text-amber-200/80 font-mono">Article #{order.article_no}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#e05e00] hover:bg-[#c85200] text-white text-xs font-bold transition cursor-pointer"
            >
              <Printer size={14} />
              Print Label
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Close Shipping Label modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* High-Contrast Printable Label */}
        <div className="p-6 bg-white">
          <div className="border-2 border-stone-950 rounded-xl p-5 space-y-4 text-stone-950">
            {/* Top Banner */}
            <div className="flex items-start justify-between border-b-2 border-stone-950 pb-3">
              <div>
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-stone-600">
                  DISPATCH MANIFEST • FROM
                </p>
                <p className="text-sm font-black uppercase">Bhise&apos;z Furniture Workshop</p>
                <p className="text-[11px] text-stone-600">Bespoke Woodworks &amp; Finishing Studio</p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-2.5 py-1 text-xs font-mono font-black uppercase border-2 ${
                    order.priority === 'urgent'
                      ? 'border-stone-950 bg-stone-950 text-white'
                      : 'border-stone-950 text-stone-950'
                  }`}
                >
                  {order.priority === 'urgent' ? 'RUSH DISPATCH' : 'STANDARD'}
                </span>
              </div>
            </div>

            {/* Ship To Section */}
            <div className="border-b-2 border-stone-950 pb-3.5 space-y-1">
              <p className="text-[10px] font-mono font-black uppercase tracking-widest text-stone-500">
                SHIP TO / CONSIGNEE
              </p>
              <p className="text-xl font-black tracking-tight text-stone-950">{context.customerName}</p>
              {context.customerPhone && (
                <p className="text-sm font-mono font-bold text-stone-900">Tel: {context.customerPhone}</p>
              )}
              <p className="text-xs text-stone-800 leading-relaxed">
                {context.customerAddress || 'Customer Workshop Pickup / Address on File'}
              </p>
            </div>

            {/* Shipment Contents */}
            <div className="grid grid-cols-2 gap-3 border-b border-stone-300 pb-3 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Article No.</span>
                <strong className="text-base font-mono font-black">{order.article_no}</strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Quotation / Parent</span>
                <strong className="text-sm font-mono font-bold">{context.quotationRef || order.id}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Product Description</span>
                <strong className="text-sm font-bold">
                  {order.sub_category || order.category}
                </strong>
                <p className="text-xs text-stone-700 mt-0.5">
                  {[order.material, order.custom_size || order.size, order.finish].filter(Boolean).join(' • ')}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Packages / Qty</span>
                <strong className="text-sm font-mono font-black tabular-nums">
                  {order.no_of_units || 1} Unit(s)
                </strong>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-500 block">Target / Dispatch Date</span>
                <strong className="text-sm font-mono font-bold">
                  {formatToDDMMYYYY(order.dispatchDate || order.delivery_date) || '—'}
                </strong>
              </div>
            </div>

            {/* Dispatch Driver Details (if available) */}
            {(order.deliveryPersonName || order.vehicleNumber) && (
              <div className="bg-stone-100 rounded-lg p-2.5 text-xs font-mono space-y-0.5 border border-stone-300">
                <p className="text-[10px] font-bold uppercase text-stone-600">Carrier / Vehicle</p>
                <p className="font-bold text-stone-900">
                  {order.deliveryPersonName || 'Workshop Carrier'}
                  {order.deliveryPersonContact ? ` (${order.deliveryPersonContact})` : ''}
                </p>
                {order.vehicleNumber && <p>Vehicle No: {order.vehicleNumber}</p>}
              </div>
            )}

            {/* Barcode-style Reference Strip */}
            <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-1.5">
                <Package size={14} />
                <span className="font-bold">{order.id}</span>
              </div>
              <span className="px-2 py-0.5 border border-stone-900 font-bold uppercase text-[10px]">
                {context.balanceDue > 0 ? `COD/DUE: ${formatCurrencyINR(context.balanceDue)}` : 'PREPAID / CLEARED'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QuotationContextModalProps {
  quotation: CRMQuotation;
  context: ResolvedOrderDetailsContext;
  onClose: () => void;
  onGoToCRM: () => void;
}

export function QuotationContextModal({
  quotation,
  context,
  onClose,
  onGoToCRM,
}: QuotationContextModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-stone-200 overflow-hidden">
        <div className="px-5 py-4 bg-[#4a2c1b] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText size={18} className="text-amber-300" />
            <div>
              <h3 className="text-sm font-bold">Quotation Reference: {quotation.id}</h3>
              <p className="text-[11px] text-amber-200/80">
                {quotation.customer_name} • Status: {quotation.status}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close Quotation modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Quote Total</span>
              <strong className="text-base font-black text-stone-900 font-mono tabular-nums">
                {formatCurrencyINR(context.quoteTotal)}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Advance Logged</span>
              <strong className="text-base font-black text-emerald-700 font-mono tabular-nums">
                {formatCurrencyINR(context.advancePaid)}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] font-mono uppercase text-stone-500 block">Balance Due</span>
              <strong className="text-base font-black text-[#e05e00] font-mono tabular-nums">
                {formatCurrencyINR(context.balanceDue)}
              </strong>
            </div>
          </div>

          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <div className="px-3.5 py-2 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-700 flex justify-between">
              <span>Quotation Line Items ({quotation.items?.length || 0})</span>
              <span className="font-mono text-stone-500">
                Valid Until: {formatToDDMMYYYY(quotation.validUntil) || '—'}
              </span>
            </div>
            <div className="divide-y divide-stone-100">
              {(quotation.items || []).map((item, idx) => (
                <div key={item.id || idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-stone-900 truncate">{item.furnitureItem}</p>
                    <p className="text-[11px] text-stone-500">
                      {[item.material, item.dimensions, `Qty: ${item.quantity}`].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <div className="text-right font-mono font-bold text-stone-900 shrink-0 tabular-nums">
                    {formatCurrencyINR(
                      Number(item.totalAmount) || (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {quotation.notes && (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-stone-700">
              <strong className="block text-[10px] font-mono uppercase text-amber-900 mb-0.5">
                Quotation Notes
              </strong>
              {quotation.notes}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToCRM();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#593622] hover:bg-[#402414] text-white text-xs font-bold transition cursor-pointer"
          >
            <ExternalLink size={13} />
            Open CRM Quotations
          </button>
        </div>
      </div>
    </div>
  );
}
