import React, { useState, useMemo } from 'react';
import {
  Trees,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  Phone,
  User,
  Calendar,
  HardHat,
  X,
  FileText,
  Info,
  Sparkles,
  Ruler,
  Trash2,
  Table as TableIcon,
  LayoutGrid,
  Eye,
  Check,
  Edit2,
  Plus,
  Save
} from 'lucide-react';
import { Order, Customer } from '../types';
import { formatToDDMMYYYY } from '../utils';
import { generateUUID } from '../db/store';

export interface WoodRequirementItem {
  id: string;
  sectionName: string;
  lengthInches: number;
  widthInches: number;
  thicknessInches: number;
  qty: number;
  calculatedCFT: number;
  notes?: string;
}

export interface WoodRequirementRequest {
  id: string;
  orderId?: string;
  workOrderNo: string;
  articleNo: string;
  productName: string;
  customerName: string;
  carpenterName: string;
  contactNumber: string;
  submissionDate: string;
  woodType: string;
  totalVolumeCFT: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  woodSchedule: WoodRequirementItem[];
}

export interface WoodManagementTabProps {
  orders?: Order[];
  customers?: Customer[];
  onOrderUpdate?: (updatedOrder: Order, log?: any) => void;
}

export default function WoodManagementTab({
  orders = [],
  customers = [],
  onOrderUpdate
}: WoodManagementTabProps) {
  // Saved statuses per order ID / request ID
  const [statusMap, setStatusMap] = useState<Record<string, 'Pending' | 'Approved' | 'Rejected'>>(() => {
    try {
      const saved = localStorage.getItem('bhisez_wood_request_statuses');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Deleted request IDs
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bhisez_wood_deleted_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Standalone requests created directly in Wood Management
  const [manualRequests, setManualRequests] = useState<WoodRequirementRequest[]>(() => {
    try {
      const saved = localStorage.getItem('bhisez_wood_manual_requests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [selectedRequest, setSelectedRequest] = useState<WoodRequirementRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditingModalTable, setIsEditingModalTable] = useState(false);
  const [modalParts, setModalParts] = useState<WoodRequirementItem[]>([]);
  const [printModalRequest, setPrintModalRequest] = useState<WoodRequirementRequest | null>(null);
  const [deleteConfirmReq, setDeleteConfirmReq] = useState<WoodRequirementRequest | null>(null);

  // Automatically derive & synchronize Wood Schedule records from Orders in real time
  const synchronizedRequests = useMemo(() => {
    const list: WoodRequirementRequest[] = [];
    const seenOrderIds = new Set<string>();

    // 1. Process Order wood schedules
    orders.forEach((ord) => {
      const orderKey = ord.id;
      if (deletedIds.includes(orderKey)) return;

      seenOrderIds.add(orderKey);

      const cust = customers.find((c) => c.id === ord.customer_id);
      const customerName = (ord as any).customer_name || cust?.name || 'Customer';
      const carpenterName = (ord as any).carpenter_name || 'Dinesh Mestry';

      // Map parts to standard WoodRequirementItem safely from WoodPart or WoodRequirementItem
      const rawParts = ord.wood_schedule?.parts || [];
      const woodScheduleItems: WoodRequirementItem[] = rawParts.map((p: any, idx: number) => {
        const name = p.part_name || p.partName || p.sectionName || `Component ${idx + 1}`;
        const w = Number(p.width ?? p.widthInches ?? 0);
        const b = Number(p.breadth ?? p.breadthInches ?? p.thicknessInches ?? 0);
        // length in WorkerDashboard is feet (p.length). Length in inches = length * 12 or p.lengthInches
        const lFt = p.length !== undefined ? Number(p.length) : (p.lengthFeet !== undefined ? Number(p.lengthFeet) : (p.lengthInches ? Number(p.lengthInches) / 12 : 0));
        const lIn = p.lengthInches !== undefined ? Number(p.lengthInches) : lFt * 12;
        const qty = Number(p.quantity ?? p.qty ?? 1);
        const cft = p.cftVol !== undefined
          ? Number(p.cftVol)
          : (p.calculatedCFT !== undefined ? Number(p.calculatedCFT) : ((w * b * lFt * qty) / 144));

        return {
          id: p.id || `part-${idx + 1}`,
          sectionName: name,
          lengthInches: lIn,
          widthInches: w,
          thicknessInches: b,
          qty: qty,
          calculatedCFT: Number(cft || 0)
        };
      });

      const totalCFT = woodScheduleItems.reduce((sum, item) => sum + (item.calculatedCFT || 0), 0);
      const currentStatus = statusMap[ord.id] || 'Pending';
      const catalogueName = ord.wood_schedule?.catalogue_name || ord.material || (ord.category ? `${ord.category} Catalogue` : 'Timber Catalogue');

      list.push({
        id: ord.id,
        orderId: ord.id,
        workOrderNo: ord.id,
        articleNo: ord.article_no || 'N/A',
        productName: `${ord.category || 'Furniture Item'}${ord.sub_category ? ` (${ord.sub_category})` : ''}`,
        customerName: customerName,
        carpenterName: carpenterName,
        contactNumber: cust?.phone || '+91 98765 43210',
        submissionDate: ord.updated_at ? formatToDDMMYYYY(ord.updated_at) : (ord.created_at ? formatToDDMMYYYY(ord.created_at) : formatToDDMMYYYY(new Date())),
        woodType: catalogueName,
        totalVolumeCFT: Number(totalCFT.toFixed(2)),
        status: currentStatus,
        notes: ord.wood_schedule?.model_name ? `Model: ${ord.wood_schedule.model_name} | Size: ${ord.wood_schedule.size_of_product || 'Standard'}` : undefined,
        woodSchedule: woodScheduleItems
      });
    });

    // 2. Include manual requests if not deleted or duplicated
    manualRequests.forEach((req) => {
      if (deletedIds.includes(req.id)) return;
      if (req.orderId && seenOrderIds.has(req.orderId)) return;

      const currentStatus = statusMap[req.id] || req.status || 'Pending';
      list.push({
        ...req,
        status: currentStatus
      });
    });

    return list;
  }, [orders, customers, statusMap, deletedIds, manualRequests]);

  // Persist status updates
  const handleUpdateStatus = (id: string, newStatus: 'Approved' | 'Rejected' | 'Pending') => {
    const req = synchronizedRequests.find((r) => r.id === id);
    const targetOrderId = req?.orderId || id;

    const updatedMap = { ...statusMap, [id]: newStatus };
    if (targetOrderId) {
      updatedMap[targetOrderId] = newStatus;
    }

    if (newStatus === 'Approved') {
      const targetOrder = orders.find((o) => o.id === targetOrderId);

      if (targetOrder && onOrderUpdate) {
        const updatedOrder: Order = {
          ...targetOrder,
          current_status: 'Making Started',
          carpenter_sub_status: 'under_carpentry',
          updated_at: new Date().toISOString()
        };

        const log = {
          id: 'log_' + generateUUID().split('-')[0],
          order_id: targetOrder.id,
          stage: 'Making Started',
          changed_by: 'admin',
          changed_by_name: 'Admin Manager',
          changed_by_role: 'admin',
          timestamp: new Date().toISOString(),
          note: `Wood sheet approved by Admin. Order moved into Under Carpentry.`
        };

        onOrderUpdate(updatedOrder, log);

        // Push notification for the carpenter
        try {
          const newNotif = {
            id: 'notif_wood_' + Date.now(),
            order_id: targetOrder.id,
            article_no: targetOrder.article_no || 'N/A',
            category: targetOrder.category || 'Furniture',
            sub_category: targetOrder.sub_category,
            old_stage: 'Wood Procurement',
            new_stage: 'Making Started',
            changed_by_name: 'Admin Manager',
            timestamp: new Date().toISOString(),
            is_read: false,
            title: '🪵 Wood Sheet Approved',
            message: `Wood calculation sheet for Article #${targetOrder.article_no} has been approved by Admin! Order is now under Carpentry.`
          };

          const existingNotifs = JSON.parse(localStorage.getItem('bhise_notifications_list_v1') || '[]');
          localStorage.setItem('bhise_notifications_list_v1', JSON.stringify([newNotif, ...existingNotifs]));
        } catch (e) {
          console.error('Error storing notification:', e);
        }

        alert(`Success: Wood sheet approved for Article #${targetOrder.article_no}! Carpenter notified and order moved into Under Carpentry.`);
      }
    } else if (newStatus === 'Rejected') {
      const req = synchronizedRequests.find((r) => r.id === id);
      const targetOrderId = req?.orderId || id;
      const targetOrder = orders.find((o) => o.id === targetOrderId);

      if (targetOrder) {
        try {
          const newNotif = {
            id: 'notif_wood_rej_' + Date.now(),
            order_id: targetOrder.id,
            article_no: targetOrder.article_no || 'N/A',
            category: targetOrder.category || 'Furniture',
            sub_category: targetOrder.sub_category,
            old_stage: 'Wood Procurement',
            new_stage: 'Wood Procurement',
            changed_by_name: 'Admin Manager',
            timestamp: new Date().toISOString(),
            is_read: false,
            title: '❌ Wood Sheet Rejected',
            message: `Wood calculation sheet for Article #${targetOrder.article_no} was rejected by Admin. Please update table and re-submit in Workbench.`
          };

          const existingNotifs = JSON.parse(localStorage.getItem('bhise_notifications_list_v1') || '[]');
          localStorage.setItem('bhise_notifications_list_v1', JSON.stringify([newNotif, ...existingNotifs]));
        } catch (e) {
          console.error('Error storing notification:', e);
        }

        alert(`Notice: Wood sheet for Article #${targetOrder.article_no} set to Rejected. Carpenter has been notified to revise and re-submit.`);
      }
    }
  };

  // Delete Request Handler
  const handleDeleteRequest = (id: string) => {
    const updatedDeleted = [...deletedIds, id];
    setDeletedIds(updatedDeleted);
    localStorage.setItem('bhisez_wood_deleted_ids', JSON.stringify(updatedDeleted));

    setManualRequests((prev) => prev.filter((r) => r.id !== id));

    if (selectedRequest && selectedRequest.id === id) {
      setSelectedRequest(null);
      setIsModalOpen(false);
    }
    setDeleteConfirmReq(null);
  };

  // Search & Status Filter
  const filteredRequests = useMemo(() => {
    return synchronizedRequests.filter((req) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        req.carpenterName.toLowerCase().includes(q) ||
        req.customerName.toLowerCase().includes(q) ||
        req.articleNo.toLowerCase().includes(q) ||
        req.workOrderNo.toLowerCase().includes(q) ||
        req.productName.toLowerCase().includes(q) ||
        req.woodType.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || req.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [synchronizedRequests, searchTerm, statusFilter]);

  // Summary Metrics
  const totalCount = synchronizedRequests.length;
  const pendingCount = synchronizedRequests.filter((r) => r.status === 'Pending').length;
  const approvedCount = synchronizedRequests.filter((r) => r.status === 'Approved').length;
  const totalApprovedCFT = synchronizedRequests
    .filter((r) => r.status === 'Approved')
    .reduce((sum, r) => sum + r.totalVolumeCFT, 0);
  const totalRequestedCFT = synchronizedRequests.reduce((sum, r) => sum + r.totalVolumeCFT, 0);

  const handleOpenSheetModal = (req: WoodRequirementRequest) => {
    setSelectedRequest(req);
    setModalParts(req.woodSchedule || []);
    setIsEditingModalTable(false);
    setIsModalOpen(true);
  };

  const handleAddModalRow = () => {
    const newPart: WoodRequirementItem = {
      id: `mpart-${Date.now()}-${Math.random()}`,
      sectionName: 'New Component Part',
      widthInches: 3,
      thicknessInches: 2,
      lengthInches: 72, // 6 feet
      qty: 1,
      calculatedCFT: (3 * 2 * 6 * 1) / 144
    };
    setModalParts((prev) => [...prev, newPart]);
  };

  const handleUpdateModalRow = (id: string, field: keyof WoodRequirementItem, value: any) => {
    setModalParts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        const w = Number(updated.widthInches) || 0;
        const b = Number(updated.thicknessInches) || 0;
        const lIn = Number(updated.lengthInches) || 0;
        const qty = Number(updated.qty) || 0;
        updated.calculatedCFT = Number(((w * b * (lIn / 12) * qty) / 144).toFixed(3));
        return updated;
      })
    );
  };

  const handleRemoveModalRow = (id: string) => {
    setModalParts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveModalTable = () => {
    if (!selectedRequest) return;

    if (selectedRequest.orderId && onOrderUpdate) {
      const targetOrder = orders.find((o) => o.id === selectedRequest.orderId);
      if (targetOrder) {
        const updatedWoodParts = modalParts.map((item) => ({
          id: item.id,
          part_name: item.sectionName,
          width: Number(item.widthInches) || 0,
          breadth: Number(item.thicknessInches) || 0,
          length: Number(((Number(item.lengthInches) || 0) / 12).toFixed(2)),
          quantity: Number(item.qty) || 1
        }));

        const updatedOrder: Order = {
          ...targetOrder,
          updated_at: new Date().toISOString(),
          wood_schedule: {
            ...(targetOrder.wood_schedule || { catalogue_name: selectedRequest.woodType, model_name: selectedRequest.articleNo, size_of_product: 'Standard', sqft: 0, image_link: '' }),
            parts: updatedWoodParts
          }
        };

        onOrderUpdate(updatedOrder);
      }
    }

    setIsEditingModalTable(false);
  };

  const handlePrintRequest = (req: WoodRequirementRequest) => {
    setPrintModalRequest(req);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Printable Area styling when window.print() is triggered */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-wood-sheet, #printable-wood-sheet * {
            visibility: visible;
          }
          #printable-wood-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            padding: 20px;
            color: black;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#593622] font-black uppercase tracking-wider text-xs mb-1">
            <Trees size={18} className="text-[#593622]" />
            <span>Carpentry Timber & Material Desk</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-stone-900 tracking-tight font-display">
            Wood Management
          </h1>
          <p className="text-stone-500 text-xs mt-0.5">
            Auto-synchronized wood schedule calculation tables submitted by carpenters across active work orders.
          </p>
        </div>

        {/* Quick Info Badge */}
        <div className="flex items-center gap-2 bg-[#593622]/5 border border-[#593622]/20 px-3.5 py-2 rounded-xl text-[#593622]">
          <Sparkles size={16} className="text-[#593622] shrink-0" />
          <div className="text-xs">
            <span className="font-extrabold block">Timber CFT Auditor</span>
            <span className="text-[10px] text-stone-600 block">
              Total Requested: <strong>{totalRequestedCFT.toFixed(2)} CFT</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 border border-stone-200">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">
              Total Requests
            </span>
            <span className="text-xl font-black text-stone-900 font-display">
              {totalCount} <span className="text-xs font-normal text-stone-400">sheets</span>
            </span>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200/90 shadow-xs flex items-center gap-3.5 bg-amber-50/20">
          <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
              Pending Review
            </span>
            <span className="text-xl font-black text-amber-900 font-display">
              {pendingCount} <span className="text-xs font-normal text-amber-600">awaiting</span>
            </span>
          </div>
        </div>

        {/* Approved CFT */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-xs flex items-center gap-3.5 bg-emerald-50/20">
          <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">
              Approved Timber
            </span>
            <span className="text-xl font-black text-emerald-950 font-display">
              {totalApprovedCFT.toFixed(2)}{' '}
              <span className="text-xs font-semibold text-emerald-700">CFT</span>
            </span>
          </div>
        </div>

        {/* Total Wood CFT Volume */}
        <div className="bg-white p-4 rounded-2xl border border-[#593622]/20 shadow-xs flex items-center gap-3.5 bg-[#593622]/5">
          <div className="h-11 w-11 rounded-xl bg-[#593622] text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
            <Ruler size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#593622] uppercase tracking-wider block">
              Approved Sheets
            </span>
            <span className="text-xl font-black text-stone-900 font-display">
              {approvedCount} <span className="text-xs font-normal text-stone-500">orders</span>
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & View Toggle */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search carpenter, customer, article, order..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#593622] focus:bg-white transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs & Layout Toggle */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl overflow-x-auto">
            {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((st) => {
              const isActive = statusFilter === st;
              let badgeCount = 0;
              if (st === 'All') badgeCount = synchronizedRequests.length;
              else if (st === 'Pending') badgeCount = pendingCount;
              else if (st === 'Approved') badgeCount = approvedCount;
              else badgeCount = synchronizedRequests.filter((r) => r.status === 'Rejected').length;

              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-extrabold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <span>{st === 'All' ? 'All Requests' : st}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                      isActive ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {badgeCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle Button (Table / Cards) */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-stone-900 shadow-xs font-black' : 'text-stone-500'
              }`}
              title="Table View"
            >
              <TableIcon size={15} />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-stone-900 shadow-xs font-black' : 'text-stone-500'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
            <Search size={22} />
          </div>
          <h3 className="text-base font-bold text-stone-800">No Wood Requests Found</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            No wood schedule calculation table submissions match your current search query or filter. When carpenters save wood calculation tables in an order, they will automatically appear here.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('All');
            }}
            className="px-4 py-2 bg-[#593622] text-white rounded-xl text-xs font-bold hover:bg-[#402414] transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (Highlighting 1. Article Number, 2. Order Number, 3. Customer Name, 4. Wood Schedule Calculation Table) */
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-stone-900 text-amber-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-800">
                  <th className="py-3.5 px-4 font-mono">Article Number</th>
                  <th className="py-3.5 px-4 font-mono">Order Number</th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Wood Species / Catalogue Name</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Wood Schedule Calculation Table</th>
                  <th className="py-3.5 px-4 text-right">Total Vol (CFT)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/80">
                {filteredRequests.map((req) => {
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';
                  const isRejected = req.status === 'Rejected';

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-amber-50/30 transition-colors duration-150 group"
                    >
                      {/* 1. Article Number */}
                      <td className="py-4 px-4 font-mono font-bold text-stone-800 whitespace-nowrap">
                        <span className="bg-stone-100 text-stone-800 border border-stone-300 px-2.5 py-1 rounded-lg text-xs">
                          {req.articleNo}
                        </span>
                      </td>

                      {/* 2. Order Number */}
                      <td className="py-4 px-4 font-mono font-black text-[#593622] whitespace-nowrap">
                        <span className="bg-[#593622]/10 text-[#593622] px-2.5 py-1 rounded-lg border border-[#593622]/20 text-xs">
                          {req.workOrderNo}
                        </span>
                      </td>

                      {/* 3. Customer Name */}
                      <td className="py-4 px-4 font-bold text-stone-900 whitespace-nowrap">
                        <div>{req.customerName}</div>
                        <div className="text-[10px] text-stone-500 font-normal mt-0.5">
                          {req.productName}
                        </div>
                      </td>

                      {/* 4. Wood Species / Catalogue Name */}
                      <td className="py-4 px-4 text-xs whitespace-nowrap">
                        <div className="font-extrabold text-[#593622]">
                          {req.woodType}
                        </div>
                        <div className="text-[11px] font-semibold text-stone-700 flex items-center gap-1 mt-0.5">
                          <HardHat size={12} className="text-[#593622]" /> {req.carpenterName}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          Date: {req.submissionDate}
                        </div>
                      </td>

                      {/* 5. Wood Schedule Calculation Table */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-[#593622] text-xs">
                              {req.woodSchedule.length} Component Part{req.woodSchedule.length === 1 ? '' : 's'}
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono">
                              ({req.totalVolumeCFT.toFixed(2)} CFT)
                            </span>
                          </div>

                          {/* Embedded Mini Cut-List Summary Table */}
                          {req.woodSchedule.length > 0 && (
                            <div className="bg-stone-50 p-2 rounded-lg border border-stone-200 max-w-sm space-y-1 text-[11px]">
                              {req.woodSchedule.slice(0, 2).map((part, pIdx) => (
                                <div
                                  key={part.id || pIdx}
                                  className="flex items-center justify-between font-mono text-[10px] text-stone-700 border-b border-stone-200/60 pb-0.5 last:border-b-0 last:pb-0"
                                >
                                  <span className="font-sans font-bold text-stone-900 truncate max-w-[140px]">
                                    {part.sectionName}
                                  </span>
                                  <span className="text-stone-500">
                                    {part.widthInches}"×{part.thicknessInches}"×{(part.lengthInches / 12).toFixed(1)}' (x{part.qty})
                                  </span>
                                  <span className="font-bold text-[#593622]">
                                    {part.calculatedCFT.toFixed(2)} CFT
                                  </span>
                                </div>
                              ))}
                              {req.woodSchedule.length > 2 && (
                                <div className="text-[9px] text-stone-400 font-sans italic text-right">
                                  + {req.woodSchedule.length - 2} more sections
                                </div>
                              )}
                            </div>
                          )}

                          {/* Primary Button to view complete calculation table in modal */}
                          <button
                            onClick={() => handleOpenSheetModal(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#593622] hover:bg-[#402414] text-amber-300 rounded-lg text-xs font-extrabold transition shadow-2xs cursor-pointer"
                          >
                            <FileSpreadsheet size={13} />
                            <span>View / Edit Complete Table ({req.woodSchedule.length} parts)</span>
                          </button>
                        </div>
                      </td>

                      {/* Total CFT Volume */}
                      <td className="py-4 px-4 text-right whitespace-nowrap font-display font-black text-sm text-[#593622]">
                        {req.totalVolumeCFT.toFixed(2)} <span className="text-[10px] font-bold">CFT</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                            isPending
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : isApproved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPending
                                ? 'bg-amber-500 animate-pulse'
                                : isApproved
                                ? 'bg-emerald-600'
                                : 'bg-rose-600'
                            }`}
                          />
                          {req.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenSheetModal(req)}
                            className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition border border-stone-300"
                            title="Inspect Wood Schedule Table"
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            disabled={!isPending}
                            onClick={() => handleUpdateStatus(req.id, 'Approved')}
                            className="p-1.5 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-40 disabled:hover:bg-emerald-100 disabled:cursor-not-allowed text-emerald-800 rounded-lg transition border border-emerald-300"
                            title="Approve Wood Request"
                          >
                            <CheckCircle2 size={15} />
                          </button>

                          <button
                            disabled={!isPending}
                            onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                            className="p-1.5 bg-rose-100 hover:bg-rose-200 disabled:opacity-40 disabled:hover:bg-rose-100 disabled:cursor-not-allowed text-rose-800 rounded-lg transition border border-rose-300"
                            title="Reject Wood Request"
                          >
                            <XCircle size={15} />
                          </button>

                          <button
                            onClick={() => handlePrintRequest(req)}
                            className="p-1.5 bg-white hover:bg-stone-100 text-stone-700 rounded-lg transition border border-stone-300"
                            title="Print Schedule"
                          >
                            <Printer size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmReq(req)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Request"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'Pending';
            const isApproved = req.status === 'Approved';

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-stone-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-[#593622]/40"
              >
                {/* Card Top Banner / Work Order & Status */}
                <div className="p-4 bg-stone-50/80 border-b border-stone-200/70 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-[#593622] text-amber-300 font-mono text-[10px] font-black rounded-lg uppercase tracking-wider shadow-2xs">
                      {req.workOrderNo}
                    </span>
                    <span className="text-stone-500 font-mono text-[11px] font-bold bg-stone-200/60 px-2 py-0.5 rounded border border-stone-300/60">
                      Article: {req.articleNo}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                        isPending
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : isApproved
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isPending
                            ? 'bg-amber-500 animate-pulse'
                            : isApproved
                            ? 'bg-emerald-600'
                            : 'bg-rose-600'
                        }`}
                      />
                      <span>{req.status}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmReq(req);
                      }}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-lg transition"
                      title="Delete Request"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Card Body Information */}
                <div className="p-5 space-y-4 flex-1">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2 group-hover:text-[#593622] transition-colors">
                      {req.productName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-stone-500 font-medium truncate">
                        Cust: <strong className="text-stone-800">{req.customerName}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Wood Volume CFT Box */}
                  <div className="bg-[#fcfaf7] border border-amber-900/10 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 block">
                        Total Wood Required
                      </span>
                      <span className="text-xs font-bold text-[#593622]">{req.woodType}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-[#593622] font-display block leading-none">
                        {req.totalVolumeCFT.toFixed(2)} <span className="text-xs font-bold">CFT</span>
                      </span>
                      <span className="text-[9px] text-stone-400 font-mono block mt-0.5">
                        {req.woodSchedule.length} cut sections
                      </span>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-stone-100 pt-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <HardHat size={11} className="text-[#593622]" /> Carpenter
                      </span>
                      <span className="font-bold text-stone-900 block truncate">
                        {req.carpenterName}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <Phone size={11} className="text-stone-500" /> Contact No.
                      </span>
                      <a
                        href={`tel:${req.contactNumber}`}
                        className="font-semibold text-stone-800 hover:text-[#593622] block truncate"
                      >
                        {req.contactNumber}
                      </a>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <Calendar size={11} className="text-stone-500" /> Submitted Date
                      </span>
                      <span className="font-semibold text-stone-800 block">
                        {req.submissionDate}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <User size={11} className="text-stone-500" /> Customer
                      </span>
                      <span className="font-semibold text-stone-800 block truncate">
                        {req.customerName}
                      </span>
                    </div>
                  </div>

                  {req.notes && (
                    <div className="text-[11px] text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200/60 italic">
                      <span className="font-bold not-italic text-stone-800">Note: </span>
                      "{req.notes}"
                    </div>
                  )}
                </div>

                {/* Card Action Buttons Bar */}
                <div className="p-3 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1">
                    <button
                      onClick={() => handleOpenSheetModal(req)}
                      className="flex-1 py-2 px-3 bg-[#593622] hover:bg-[#402414] active:scale-[0.98] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} className="text-amber-300" />
                      <span>View Wood Sheet</span>
                    </button>

                    <button
                      onClick={() => handlePrintRequest(req)}
                      className="py-2 px-3 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Print Wood Requirement Sheet"
                    >
                      <Printer size={14} className="text-stone-600" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={!isPending}
                      onClick={() => handleUpdateStatus(req.id, 'Approved')}
                      className="p-2 bg-emerald-100 hover:bg-emerald-200 disabled:opacity-40 disabled:hover:bg-emerald-100 disabled:cursor-not-allowed text-emerald-800 rounded-xl transition border border-emerald-300/60 cursor-pointer"
                      title="Approve Wood Request"
                    >
                      <CheckCircle2 size={16} />
                    </button>

                    <button
                      disabled={!isPending}
                      onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                      className="p-2 bg-rose-100 hover:bg-rose-200 disabled:opacity-40 disabled:hover:bg-rose-100 disabled:cursor-not-allowed text-rose-800 rounded-xl transition border border-rose-300/60 cursor-pointer"
                      title="Reject Wood Request"
                    >
                      <XCircle size={16} />
                    </button>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Wood Schedule Sheet Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-stone-900 text-white rounded-t-2xl flex items-center justify-between border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#593622] text-amber-300 flex items-center justify-center font-bold shadow-inner">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold font-display tracking-tight text-stone-100">
                    Carpenter Wood Schedule Sheet (लाकूड माप तक्ता)
                  </h2>
                  <p className="text-xs text-stone-400 font-mono">
                    Article #{selectedRequest.articleNo} | Order: {selectedRequest.workOrderNo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 font-sans">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2.5">
                <Info size={16} className="text-amber-700 shrink-0" />
                <span>
                  Showing itemized cut-list dimensions submitted by carpenter{' '}
                  <strong>{selectedRequest.carpenterName}</strong> for{' '}
                  <strong>{selectedRequest.productName}</strong>.
                </span>
              </div>

              {/* Order Context Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase block">
                    Article Number
                  </span>
                  <span className="font-bold text-stone-900 font-mono">{selectedRequest.articleNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase block">
                    Order Number
                  </span>
                  <span className="font-bold text-[#593622] font-mono">{selectedRequest.workOrderNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase block">
                    Customer Name
                  </span>
                  <span className="font-bold text-stone-900">{selectedRequest.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase block">
                    Wood Species
                  </span>
                  <span className="font-bold text-[#593622]">{selectedRequest.woodType}</span>
                </div>
              </div>

              {/* Itemized Wood Schedule Calculation Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <FileSpreadsheet size={14} className="text-[#593622]" />
                    <span>Wood Schedule Parts Table</span>
                  </h3>
                  {!isEditingModalTable ? (
                    <button
                      onClick={() => setIsEditingModalTable(true)}
                      className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-amber-300"
                    >
                      <Edit2 size={13} />
                      <span>Edit Table</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddModalRow}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-stone-300"
                      >
                        <Plus size={13} />
                        <span>Add Row</span>
                      </button>
                      <button
                        onClick={handleSaveModalTable}
                        className="px-3 py-1 bg-[#593622] hover:bg-[#402414] text-amber-300 rounded-lg text-xs font-extrabold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Save size={13} />
                        <span>Save & Sync</span>
                      </button>
                      <button
                        onClick={() => {
                          setModalParts(selectedRequest.woodSchedule || []);
                          setIsEditingModalTable(false);
                        }}
                        className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-stone-100 text-stone-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Part Name</th>
                        <th className="py-2.5 px-3 text-center min-w-[80px]">Width (in)</th>
                        <th className="py-2.5 px-3 text-center min-w-[80px]">Thick (in)</th>
                        <th className="py-2.5 px-3 text-center min-w-[80px]">Length (in)</th>
                        <th className="py-2.5 px-3 text-center min-w-[70px]">Qty</th>
                        <th className="py-2.5 px-3 text-right">Vol (CFT)</th>
                        {isEditingModalTable && <th className="py-2.5 px-2 text-center w-10">Action</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {!isEditingModalTable ? (
                        modalParts.length > 0 ? (
                          modalParts.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-stone-50">
                              <td className="py-2.5 px-3 font-mono text-stone-400">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-stone-900">{item.sectionName}</td>
                              <td className="py-2.5 px-3 text-center font-mono">{item.widthInches}"</td>
                              <td className="py-2.5 px-3 text-center font-mono">{item.thicknessInches}"</td>
                              <td className="py-2.5 px-3 text-center font-mono">{item.lengthInches}" ({(item.lengthInches / 12).toFixed(1)}')</td>
                              <td className="py-2.5 px-3 text-center font-extrabold text-stone-900">{item.qty}</td>
                              <td className="py-2.5 px-3 text-right font-black text-[#593622] font-mono">
                                {item.calculatedCFT.toFixed(2)} CFT
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-stone-400 italic">
                              No wood schedule rows entered yet. Click "Edit Table" to add parts manually.
                            </td>
                          </tr>
                        )
                      ) : (
                        modalParts.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-amber-50/50">
                            <td className="py-2 px-3 font-mono text-stone-400">{idx + 1}</td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={item.sectionName}
                                onChange={(e) => handleUpdateModalRow(item.id, 'sectionName', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-xs font-semibold focus:outline-hidden focus:border-[#593622]"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <input
                                type="number"
                                step="0.25"
                                value={item.widthInches || ''}
                                onChange={(e) => handleUpdateModalRow(item.id, 'widthInches', Number(e.target.value))}
                                className="w-16 px-1.5 py-1 text-center bg-white border border-stone-300 rounded text-xs font-mono focus:outline-hidden focus:border-[#593622]"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <input
                                type="number"
                                step="0.25"
                                value={item.thicknessInches || ''}
                                onChange={(e) => handleUpdateModalRow(item.id, 'thicknessInches', Number(e.target.value))}
                                className="w-16 px-1.5 py-1 text-center bg-white border border-stone-300 rounded text-xs font-mono focus:outline-hidden focus:border-[#593622]"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <input
                                type="number"
                                step="0.5"
                                value={item.lengthInches || ''}
                                onChange={(e) => handleUpdateModalRow(item.id, 'lengthInches', Number(e.target.value))}
                                className="w-20 px-1.5 py-1 text-center bg-white border border-stone-300 rounded text-xs font-mono focus:outline-hidden focus:border-[#593622]"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.qty || 1}
                                onChange={(e) => handleUpdateModalRow(item.id, 'qty', Number(e.target.value))}
                                className="w-14 px-1 py-1 text-center bg-white border border-stone-300 rounded text-xs font-mono focus:outline-hidden focus:border-[#593622]"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-[#593622] font-mono whitespace-nowrap">
                              {item.calculatedCFT.toFixed(2)} CFT
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                onClick={() => handleRemoveModalRow(item.id)}
                                className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 transition cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#593622]/10 border-t-2 border-[#593622] font-extrabold text-[#593622]">
                        <td colSpan={isEditingModalTable ? 6 : 6} className="py-3 px-3 text-right text-xs uppercase tracking-wider">
                          Total Volume:
                        </td>
                        <td className="py-3 px-3 text-right text-sm font-black font-display">
                          {modalParts.reduce((sum, p) => sum + (p.calculatedCFT || 0), 0).toFixed(2)} CFT
                        </td>
                        {isEditingModalTable && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {selectedRequest.notes && (
                <div className="text-xs text-stone-600 bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                  <strong className="text-amber-900">Carpenter Remarks: </strong>
                  {selectedRequest.notes}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-50 rounded-b-2xl border-t border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-500">Current Status:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    selectedRequest.status === 'Pending'
                      ? 'bg-amber-100 text-amber-800'
                      : selectedRequest.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {selectedRequest.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={selectedRequest.status !== 'Pending'}
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'Approved')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 size={15} />
                  Approve Wood Sheet
                </button>

                <button
                  disabled={selectedRequest.status !== 'Pending'}
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'Rejected')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:hover:bg-rose-600 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <XCircle size={15} />
                  Reject Sheet
                </button>

                <button
                  onClick={() => handlePrintRequest(selectedRequest)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={15} />
                  Print Schedule
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white border border-stone-300 text-stone-700 rounded-xl text-xs font-bold hover:bg-stone-100 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Sheet View (Hidden on screen, visible during print) */}
      {printModalRequest && (
        <div id="printable-wood-sheet" className="hidden">
          <div className="text-center border-b-2 border-stone-900 pb-4 mb-4">
            <h1 className="text-xl font-bold uppercase tracking-wider text-stone-900">
              Bhise'z Wood Workshop - Wood Requirement Sheet
            </h1>
            <p className="text-xs text-stone-600">
              Carpenter Timber Cut-List & Volume Breakdown (लाकूड मागणी पत्रक)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-4 border p-3 rounded">
            <div>
              <p>
                <strong>Article No:</strong> {printModalRequest.articleNo}
              </p>
              <p>
                <strong>Order No:</strong> {printModalRequest.workOrderNo}
              </p>
              <p>
                <strong>Product Name:</strong> {printModalRequest.productName}
              </p>
            </div>
            <div>
              <p>
                <strong>Carpenter Name:</strong> {printModalRequest.carpenterName} (
                {printModalRequest.contactNumber})
              </p>
              <p>
                <strong>Customer Name:</strong> {printModalRequest.customerName}
              </p>
              <p>
                <strong>Submission Date:</strong> {printModalRequest.submissionDate}
              </p>
              <p>
                <strong>Wood Type:</strong> {printModalRequest.woodType}
              </p>
            </div>
          </div>

          <table className="w-full border-collapse border border-stone-400 text-xs mb-4">
            <thead>
              <tr className="bg-stone-100">
                <th className="border border-stone-400 p-2">#</th>
                <th className="border border-stone-400 p-2 text-left">Section Name</th>
                <th className="border border-stone-400 p-2 text-center">Length (in)</th>
                <th className="border border-stone-400 p-2 text-center">Width (in)</th>
                <th className="border border-stone-400 p-2 text-center">Thick (in)</th>
                <th className="border border-stone-400 p-2 text-center">Qty</th>
                <th className="border border-stone-400 p-2 text-right">CFT</th>
              </tr>
            </thead>
            <tbody>
              {printModalRequest.woodSchedule.map((item, idx) => (
                <tr key={item.id}>
                  <td className="border border-stone-400 p-2 text-center">{idx + 1}</td>
                  <td className="border border-stone-400 p-2">{item.sectionName}</td>
                  <td className="border border-stone-400 p-2 text-center">{item.lengthInches}"</td>
                  <td className="border border-stone-400 p-2 text-center">{item.widthInches}"</td>
                  <td className="border border-stone-400 p-2 text-center">{item.thicknessInches}"</td>
                  <td className="border border-stone-400 p-2 text-center">{item.qty}</td>
                  <td className="border border-stone-400 p-2 text-right font-bold">
                    {item.calculatedCFT.toFixed(2)} CFT
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-stone-100">
                <td colSpan={6} className="border border-stone-400 p-2 text-right">
                  Total CFT Volume:
                </td>
                <td className="border border-stone-400 p-2 text-right">
                  {printModalRequest.totalVolumeCFT.toFixed(2)} CFT
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="flex justify-between items-end pt-12 text-xs">
            <div>
              <p className="border-t border-stone-800 pt-1 w-48 text-center">Carpenter Signature</p>
            </div>
            <div>
              <p className="border-t border-stone-800 pt-1 w-48 text-center">
                Supervisor / Manager Signature
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-base">Delete Wood Request?</h3>
                <p className="text-xs text-stone-500">This action will remove the record from Wood Management.</p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1 font-sans">
              <p>
                <strong>Article No:</strong> {deleteConfirmReq.articleNo}
              </p>
              <p>
                <strong>Order No:</strong> {deleteConfirmReq.workOrderNo}
              </p>
              <p>
                <strong>Product:</strong> {deleteConfirmReq.productName}
              </p>
              <p>
                <strong>Carpenter:</strong> {deleteConfirmReq.carpenterName}
              </p>
              <p>
                <strong>Volume:</strong> {deleteConfirmReq.totalVolumeCFT.toFixed(2)} CFT
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteConfirmReq(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRequest(deleteConfirmReq.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 size={14} />
                Delete Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
