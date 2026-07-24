import React, { useState } from 'react';
import {
  Trees,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  Phone,
  User,
  Calendar,
  Layers,
  HardHat,
  X,
  FileText,
  ChevronRight,
  Info,
  Sparkles,
  Ruler,
  Hash,
  Share2,
  Download,
  Trash2
} from 'lucide-react';

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

const INITIAL_WOOD_REQUESTS: WoodRequirementRequest[] = [
  {
    id: 'WR-2026-001',
    workOrderNo: 'WO-9082',
    articleNo: 'ART-2026-042',
    productName: 'Nagpur Teak Dining Table (6-Seater)',
    customerName: 'Rajesh Patil',
    carpenterName: 'Ramesh Sutar',
    contactNumber: '+91 98230 11223',
    submissionDate: '23/07/2026',
    woodType: 'Nagpur Teak Wood (Grade A)',
    totalVolumeCFT: 14.85,
    status: 'Pending',
    notes: 'Includes 10% allowance for curved corner legs & top frame beveling.',
    woodSchedule: [
      { id: 'ws-1', sectionName: 'Table Top Planks', lengthInches: 72, widthInches: 6, thicknessInches: 1.5, qty: 6, calculatedCFT: 2.7 },
      { id: 'ws-2', sectionName: 'Main Heavy Legs', lengthInches: 30, widthInches: 4, thicknessInches: 4, qty: 4, calculatedCFT: 1.33 },
      { id: 'ws-3', sectionName: 'Under Frame Apron', lengthInches: 66, widthInches: 4, thicknessInches: 1.25, qty: 2, calculatedCFT: 0.95 },
      { id: 'ws-4', sectionName: 'Cross Support Beams', lengthInches: 36, widthInches: 3, thicknessInches: 1.5, qty: 4, calculatedCFT: 0.56 },
    ],
  },
  {
    id: 'WR-2026-002',
    workOrderNo: 'WO-9104',
    articleNo: 'ART-2026-088',
    productName: 'Royal Teak King Size Bed with Hydraulic Storage',
    customerName: 'Aniket Deshmukh',
    carpenterName: 'Suresh Vishwakarma',
    contactNumber: '+91 98765 43210',
    submissionDate: '22/07/2026',
    woodType: 'Ghana Teak Wood (Grade-A)',
    totalVolumeCFT: 22.40,
    status: 'Approved',
    notes: 'Headboard carving borders pre-cut from 2" solid planks.',
    woodSchedule: [
      { id: 'ws-5', sectionName: 'Headboard Carving Pillars', lengthInches: 78, widthInches: 4, thicknessInches: 2, qty: 2, calculatedCFT: 2.89 },
      { id: 'ws-6', sectionName: 'Side Rails / Skirting', lengthInches: 80, widthInches: 10, thicknessInches: 1.25, qty: 2, calculatedCFT: 6.94 },
      { id: 'ws-7', sectionName: 'Footboard Main Panel', lengthInches: 74, widthInches: 18, thicknessInches: 1.5, qty: 1, calculatedCFT: 8.21 },
      { id: 'ws-8', sectionName: 'Internal Frame Posts', lengthInches: 72, widthInches: 3, thicknessInches: 2, qty: 6, calculatedCFT: 4.36 },
    ],
  },
  {
    id: 'WR-2026-003',
    workOrderNo: 'WO-9045',
    articleNo: 'ART-2026-015',
    productName: 'Custom Teak Wood Wardrobe (4-Door)',
    customerName: 'Sunita Sharma',
    carpenterName: 'Prakash Panchal',
    contactNumber: '+91 99221 88776',
    submissionDate: '21/07/2026',
    woodType: 'Sagwan Sawn Timber',
    totalVolumeCFT: 31.10,
    status: 'Pending',
    notes: 'Shutters frame requires defect-free seasoned teak.',
    woodSchedule: [
      { id: 'ws-9', sectionName: 'Door Shutter Outer Frame', lengthInches: 84, widthInches: 4, thicknessInches: 1.5, qty: 8, calculatedCFT: 11.67 },
      { id: 'ws-10', sectionName: 'Internal Shelves Border', lengthInches: 40, widthInches: 2, thicknessInches: 1, qty: 12, calculatedCFT: 6.67 },
      { id: 'ws-11', sectionName: 'Drawer Face Beaded Trim', lengthInches: 36, widthInches: 8, thicknessInches: 1.25, qty: 6, calculatedCFT: 12.76 },
    ],
  },
  {
    id: 'WR-2026-004',
    workOrderNo: 'WO-9120',
    articleNo: 'ART-2026-104',
    productName: 'Traditional Wooden Mandir with Dome Carving',
    customerName: 'Mahesh Kulkarni',
    carpenterName: 'Dinesh Sutar',
    contactNumber: '+91 98210 55443',
    submissionDate: '20/07/2026',
    woodType: 'C.P. Teak Wood (1st Class)',
    totalVolumeCFT: 8.75,
    status: 'Approved',
    notes: 'Special dome pieces turned on workshop lathe machine.',
    woodSchedule: [
      { id: 'ws-12', sectionName: 'Main Pillar Pillars (Gabhara)', lengthInches: 36, widthInches: 3, thicknessInches: 3, qty: 4, calculatedCFT: 2.25 },
      { id: 'ws-13', sectionName: 'Shikhar / Dome Block', lengthInches: 18, widthInches: 12, thicknessInches: 4, qty: 1, calculatedCFT: 3.00 },
      { id: 'ws-14', sectionName: 'Base Plinth Box Frame', lengthInches: 30, widthInches: 18, thicknessInches: 1.5, qty: 2, calculatedCFT: 3.50 },
    ],
  },
  {
    id: 'WR-2026-005',
    workOrderNo: 'WO-9011',
    articleNo: 'ART-2026-056',
    productName: 'Sofa Structure Frame & Armrest (3+1+1)',
    customerName: 'Prashant Joshi',
    carpenterName: 'Vijay Suthar',
    contactNumber: '+91 97654 32109',
    submissionDate: '18/07/2026',
    woodType: 'Steam Beech Wood Timber',
    totalVolumeCFT: 18.20,
    status: 'Rejected',
    notes: 'Exceeds standard 15 CFT limit for 3-seater frame. Recalculation required.',
    woodSchedule: [
      { id: 'ws-15', sectionName: '3-Seater Back Rest Structure', lengthInches: 76, widthInches: 3, thicknessInches: 2, qty: 4, calculatedCFT: 6.33 },
      { id: 'ws-16', sectionName: 'Armrest Top Curved Cap', lengthInches: 32, widthInches: 5, thicknessInches: 2.5, qty: 4, calculatedCFT: 5.92 },
      { id: 'ws-17', sectionName: 'Single Chair Frames (x2)', lengthInches: 30, widthInches: 3, thicknessInches: 2, qty: 8, calculatedCFT: 5.95 },
    ],
  },
  {
    id: 'WR-2026-006',
    workOrderNo: 'WO-9135',
    articleNo: 'ART-2026-112',
    productName: 'Executive Office Table with Drawer Pedestal',
    customerName: 'Vikram Mehta',
    carpenterName: 'Ramesh Sutar',
    contactNumber: '+91 98230 11223',
    submissionDate: '23/07/2026',
    woodType: 'Nagpur Teak Wood (Grade A)',
    totalVolumeCFT: 12.60,
    status: 'Pending',
    notes: 'Leatherette top inlay border in solid teak molding.',
    woodSchedule: [
      { id: 'ws-18', sectionName: 'Table Top Beaded Border', lengthInches: 60, widthInches: 3, thicknessInches: 1.5, qty: 4, calculatedCFT: 3.75 },
      { id: 'ws-19', sectionName: 'Leg Supports & modesty panel', lengthInches: 28, widthInches: 4, thicknessInches: 3, qty: 4, calculatedCFT: 4.66 },
      { id: 'ws-20', sectionName: 'Drawer Face Beading', lengthInches: 18, widthInches: 6, thicknessInches: 1, qty: 6, calculatedCFT: 4.19 },
    ],
  }
];

export default function WoodManagementTab() {
  const [requests, setRequests] = useState<WoodRequirementRequest[]>(INITIAL_WOOD_REQUESTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [selectedRequest, setSelectedRequest] = useState<WoodRequirementRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printModalRequest, setPrintModalRequest] = useState<WoodRequirementRequest | null>(null);
  const [deleteConfirmReq, setDeleteConfirmReq] = useState<WoodRequirementRequest | null>(null);

  // Delete Request Handler
  const handleDeleteRequest = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (selectedRequest && selectedRequest.id === id) {
      setSelectedRequest(null);
      setIsModalOpen(false);
    }
    setDeleteConfirmReq(null);
  };

  // Filtered requests based on search and status tabs
  const filteredRequests = requests.filter((req) => {
    const matchesSearch =
      req.carpenterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.articleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.workOrderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.contactNumber.includes(searchTerm);

    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate summary stats
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'Pending').length;
  const approvedCount = requests.filter((r) => r.status === 'Approved').length;
  const totalApprovedCFT = requests
    .filter((r) => r.status === 'Approved')
    .reduce((sum, r) => sum + r.totalVolumeCFT, 0);
  const totalRequestedCFT = requests.reduce((sum, r) => sum + r.totalVolumeCFT, 0);

  // Status Change Handler (Local State)
  const handleUpdateStatus = (id: string, newStatus: 'Approved' | 'Rejected' | 'Pending') => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    if (selectedRequest && selectedRequest.id === id) {
      setSelectedRequest((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Open Sheet Modal
  const handleOpenSheetModal = (req: WoodRequirementRequest) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  // Print Handler
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
            Review, audit, and approve timber CFT volume requirements submitted by carpenters for active work orders.
          </p>
        </div>

        {/* Quick Info Badge */}
        <div className="flex items-center gap-2 bg-[#593622]/5 border border-[#593622]/20 px-3.5 py-2 rounded-xl text-[#593622]">
          <Sparkles size={16} className="text-[#593622] shrink-0" />
          <div className="text-xs">
            <span className="font-extrabold block">Timber CFT Auditor</span>
            <span className="text-[10px] text-stone-600 block">Total Requested: <strong>{totalRequestedCFT.toFixed(2)} CFT</strong></span>
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
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider block">Total Requests</span>
            <span className="text-xl font-black text-stone-900 font-display">{totalCount} <span className="text-xs font-normal text-stone-400">sheets</span></span>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200/90 shadow-xs flex items-center gap-3.5 bg-amber-50/20">
          <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">Pending Review</span>
            <span className="text-xl font-black text-amber-900 font-display">{pendingCount} <span className="text-xs font-normal text-amber-600">awaiting</span></span>
          </div>
        </div>

        {/* Approved CFT */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-xs flex items-center gap-3.5 bg-emerald-50/20">
          <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">Approved Timber</span>
            <span className="text-xl font-black text-emerald-950 font-display">{totalApprovedCFT.toFixed(2)} <span className="text-xs font-semibold text-emerald-700">CFT</span></span>
          </div>
        </div>

        {/* Total Wood CFT Volume */}
        <div className="bg-white p-4 rounded-2xl border border-[#593622]/20 shadow-xs flex items-center gap-3.5 bg-[#593622]/5">
          <div className="h-11 w-11 rounded-xl bg-[#593622] text-amber-300 flex items-center justify-center shrink-0 shadow-xs">
            <Ruler size={20} />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#593622] uppercase tracking-wider block">Approved Sheets</span>
            <span className="text-xl font-black text-stone-900 font-display">{approvedCount} <span className="text-xs font-normal text-stone-500">orders</span></span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
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

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          {(['All', 'Pending', 'Approved', 'Rejected'] as const).map((st) => {
            const isActive = statusFilter === st;
            let badgeCount = 0;
            if (st === 'All') badgeCount = requests.length;
            else if (st === 'Pending') badgeCount = pendingCount;
            else if (st === 'Approved') badgeCount = approvedCount;
            else badgeCount = requests.filter((r) => r.status === 'Rejected').length;

            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80 font-extrabold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <span>{st === 'All' ? 'All Requests' : st}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${
                    isActive
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {badgeCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Request Cards Grid */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
            <Search size={22} />
          </div>
          <h3 className="text-base font-bold text-stone-800">No Wood Requests Found</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            No wood requirement requests match your current search query or status filter. Try clearing filters.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('All');
            }}
            className="px-4 py-2 bg-[#593622] text-white rounded-xl text-xs font-bold hover:bg-[#402414] transition inline-flex items-center gap-1.5"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredRequests.map((req) => {
            const isPending = req.status === 'Pending';
            const isApproved = req.status === 'Approved';
            const isRejected = req.status === 'Rejected';

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
                    <span className="text-stone-400 font-mono text-[11px] font-semibold">
                      #{req.id}
                    </span>
                  </div>

                  {/* Right side: Status Badge + Delete Button */}
                  <div className="flex items-center gap-2">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${
                        isPending
                          ? 'bg-amber-50 text-amber-800 border-amber-300/80'
                          : isApproved
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300/80'
                          : 'bg-rose-50 text-rose-800 border-rose-300/80'
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
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-lg transition border border-transparent hover:border-rose-200"
                      title="Delete Request"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Card Body Information */}
                <div className="p-5 space-y-4 flex-1">
                  {/* Product Title & Article Number */}
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2 group-hover:text-[#593622] transition-colors">
                      {req.productName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        Article: {req.articleNo}
                      </span>
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
                      <span className="text-xs font-bold text-[#593622]">
                        {req.woodType}
                      </span>
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
                    {/* Carpenter */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <HardHat size={11} className="text-[#593622]" /> Carpenter
                      </span>
                      <span className="font-bold text-stone-900 block truncate">
                        {req.carpenterName}
                      </span>
                    </div>

                    {/* Contact Number */}
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

                    {/* Submission Date */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <Calendar size={11} className="text-stone-500" /> Submitted Date
                      </span>
                      <span className="font-semibold text-stone-800 block">
                        {req.submissionDate}
                      </span>
                    </div>

                    {/* Customer Name */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-stone-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <User size={11} className="text-stone-500" /> Customer
                      </span>
                      <span className="font-semibold text-stone-800 block truncate">
                        {req.customerName}
                      </span>
                    </div>
                  </div>

                  {/* Optional Carpenter Notes */}
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
                    {/* View Wood Sheet Button */}
                    <button
                      onClick={() => handleOpenSheetModal(req)}
                      className="flex-1 py-2 px-3 bg-[#593622] hover:bg-[#402414] active:scale-[0.98] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} className="text-amber-300" />
                      <span>View Wood Sheet</span>
                    </button>

                    {/* Print Button */}
                    <button
                      onClick={() => handlePrintRequest(req)}
                      className="py-2 px-3 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Print Wood Requirement Sheet"
                    >
                      <Printer size={14} className="text-stone-600" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                  </div>

                  {/* Quick Status Action Toggle Dropdown */}
                  <div className="flex items-center gap-1">
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'Approved')}
                        className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition border border-emerald-300/60"
                        title="Approve Wood Request"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                        className="p-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl transition border border-rose-300/60"
                        title="Reject Wood Request"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
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
                    Req ID: {selectedRequest.id} | Work Order: {selectedRequest.workOrderNo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 font-sans">
              {/* Informational banner */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2.5">
                <Info size={16} className="text-amber-700 shrink-0" />
                <span>
                  Showing itemized cut-list dimensions submitted by carpenter <strong>{selectedRequest.carpenterName}</strong> for <strong>{selectedRequest.productName}</strong>.
                </span>
              </div>

              {/* Order Context Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 text-xs">
                <div>
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase block">Carpenter Name</span>
                  <span className="font-bold text-stone-900">{selectedRequest.carpenterName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase block">Customer Name</span>
                  <span className="font-bold text-stone-900">{selectedRequest.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase block">Article Number</span>
                  <span className="font-bold text-stone-900">{selectedRequest.articleNo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-extrabold uppercase block">Wood Species</span>
                  <span className="font-bold text-[#593622]">{selectedRequest.woodType}</span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100 text-stone-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-stone-200">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Section / Part Name</th>
                      <th className="py-2.5 px-3 text-center">Length (in)</th>
                      <th className="py-2.5 px-3 text-center">Width (in)</th>
                      <th className="py-2.5 px-3 text-center">Thick (in)</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Volume (CFT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {selectedRequest.woodSchedule.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-mono text-stone-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-stone-900">{item.sectionName}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.lengthInches}"</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.widthInches}"</td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.thicknessInches}"</td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-stone-900">{item.qty}</td>
                        <td className="py-2.5 px-3 text-right font-black text-[#593622] font-mono">
                          {item.calculatedCFT.toFixed(2)} CFT
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#593622]/10 border-t-2 border-[#593622] font-extrabold text-[#593622]">
                      <td colSpan={6} className="py-3 px-3 text-right text-xs uppercase tracking-wider">
                        Total Wood Requirement Volume:
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-black font-display">
                        {selectedRequest.totalVolumeCFT.toFixed(2)} CFT
                      </td>
                    </tr>
                  </tfoot>
                </table>
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
                {selectedRequest.status === 'Pending' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'Approved')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 size={15} />
                    Approve Wood Sheet
                  </button>
                )}
                {selectedRequest.status === 'Pending' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'Rejected')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <XCircle size={15} />
                    Reject Sheet
                  </button>
                )}
                <button
                  onClick={() => handlePrintRequest(selectedRequest)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={15} />
                  Print Schedule
                </button>
                <button
                  onClick={() => setDeleteConfirmReq(selectedRequest)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Delete Wood Request"
                >
                  <Trash2 size={15} />
                  <span className="hidden sm:inline">Delete</span>
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
              <p><strong>Req ID:</strong> {printModalRequest.id}</p>
              <p><strong>Work Order No:</strong> {printModalRequest.workOrderNo}</p>
              <p><strong>Article No:</strong> {printModalRequest.articleNo}</p>
              <p><strong>Product Name:</strong> {printModalRequest.productName}</p>
            </div>
            <div>
              <p><strong>Carpenter Name:</strong> {printModalRequest.carpenterName} ({printModalRequest.contactNumber})</p>
              <p><strong>Customer Name:</strong> {printModalRequest.customerName}</p>
              <p><strong>Submission Date:</strong> {printModalRequest.submissionDate}</p>
              <p><strong>Wood Type:</strong> {printModalRequest.woodType}</p>
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
                  <td className="border border-stone-400 p-2 text-right font-bold">{item.calculatedCFT.toFixed(2)} CFT</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-stone-100">
                <td colSpan={6} className="border border-stone-400 p-2 text-right">Total CFT Volume:</td>
                <td className="border border-stone-400 p-2 text-right">{printModalRequest.totalVolumeCFT.toFixed(2)} CFT</td>
              </tr>
            </tfoot>
          </table>

          <div className="flex justify-between items-end pt-12 text-xs">
            <div>
              <p className="border-t border-stone-800 pt-1 w-48 text-center">Carpenter Signature</p>
            </div>
            <div>
              <p className="border-t border-stone-800 pt-1 w-48 text-center">Supervisor / Manager Signature</p>
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
                <p className="text-xs text-stone-500">This action will remove the request card.</p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1 font-sans">
              <p><strong>Req ID:</strong> {deleteConfirmReq.id}</p>
              <p><strong>Work Order:</strong> {deleteConfirmReq.workOrderNo}</p>
              <p><strong>Product:</strong> {deleteConfirmReq.productName}</p>
              <p><strong>Carpenter:</strong> {deleteConfirmReq.carpenterName}</p>
              <p><strong>Volume:</strong> {deleteConfirmReq.totalVolumeCFT.toFixed(2)} CFT</p>
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
