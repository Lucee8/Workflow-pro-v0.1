import React, { useState, useMemo } from 'react';
import { 
  Order, 
  Customer, 
  User, 
  CNCJob, 
  CNCTool, 
  StatusLog,
  CNCJobType,
  CNCJobStatus,
  CNCToolType,
  CNCToolCondition,
  CNCDurationUnit
} from '../types';

// Duration conversion and display helpers for CNC Jobs
const convertDurationToMinutes = (val: number, unit: CNCDurationUnit = 'Minutes'): number => {
  if (isNaN(val) || val <= 0) return 0;
  if (unit === 'Hours') return Math.round(val * 60 * 100) / 100;
  if (unit === 'Days') return Math.round(val * 24 * 60 * 100) / 100;
  return Math.round(val * 100) / 100;
};

const formatJobDurationDisplay = (
  val?: number,
  unit?: CNCDurationUnit | string,
  fallbackMinutes?: number
): string => {
  if (val !== undefined && val !== null && !isNaN(val) && val > 0 && unit) {
    return `${val} ${unit}`;
  }
  if (fallbackMinutes !== undefined && fallbackMinutes !== null && !isNaN(fallbackMinutes) && fallbackMinutes > 0) {
    return `${fallbackMinutes} mins`;
  }
  return '—';
};
import { 
  Cpu, 
  Layers, 
  Wrench, 
  Calendar, 
  Clock, 
  IndianRupee, 
  CheckCircle, 
  CheckCircle2,
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  Printer, 
  TrendingUp, 
  Check, 
  ShieldCheck, 
  Trash2, 
  Box, 
  Activity,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  FileCode,
  Info,
  Lock,
  Sliders,
  LayoutDashboard,
  TrendingDown,
  Gauge,
  Pencil,
  Menu
} from 'lucide-react';
import { generateUUID } from '../db/store';
import { formatToDDMMYYYY } from '../utils';

interface CNCWorkshopTabProps {
  orders: Order[];
  customers: Customer[];
  users: User[];
  currentUser: User;
  cncJobs: CNCJob[];
  cncTools: CNCTool[];
  statusLogs: StatusLog[];
  onSaveJob: (job: CNCJob) => Promise<void> | void;
  onDeleteJob: (jobId: string) => Promise<void> | void;
  onSaveTool: (tool: CNCTool) => Promise<void> | void;
  onDeleteTool: (toolId: string) => Promise<void> | void;
  onUpdateOrder: (order: Order, newLog?: StatusLog) => Promise<void> | void;
}

export interface WorkshopCostConfig {
  loanEmi: number;
  worker1Salary: number;
  worker2Salary: number;
  toolsConsumables: number;
  electricityMisc: number;
  workingDays: number;
}

const DEFAULT_COST_CONFIG: WorkshopCostConfig = {
  loanEmi: 30000,
  worker1Salary: 0,
  worker2Salary: 15000,
  toolsConsumables: 5000,
  electricityMisc: 5000,
  workingDays: 26,
};

const DEFAULT_MACHINES = [
  'CNC Router #1 (Heavy 8x4)',
  'CNC Router #2 (Precision 4x4)',
  '4-Axis Rotary Carver',
  'Vertical Spindle Router',
  'Manual Assist Carver',
];

// Approved Stitch Form Options
const FORM_JOB_TYPES: CNCJobType[] = ['Cutting', 'Carving', 'Turning', 'Pillar'];
const FORM_MACHINES = ['Machine 1', 'Machine 2'];
const FORM_TOOLS = [
  'mm',
  '1.5mm',
  '2mm',
  '2mm Taper',
  '3mm',
  '4mm',
  '5mm',
  '5mm Endmill',
  '6mm',
  'Turning',
];

const DEFAULT_JOB_TYPES: CNCJobType[] = [
  'Carving',
  'Jali Cutting',
  '3D Relief',
  'Grooving',
  'Engraving',
  'Profile Cutting',
  'Moulding',
  'Surfacing',
  'Other',
];

const DEFAULT_TOOL_TYPES: CNCToolType[] = [
  'End Mill',
  'Ball Nose',
  'V-Bit',
  'Tapered Ball',
  'Surfacing Bit',
  'Profile Bit',
  'Engraving Bit',
  'Other',
];

const DEFAULT_TOOL_CONDITIONS: CNCToolCondition[] = [
  'New',
  'Good',
  'Fair',
  'Dull',
  'Needs Resharpening',
  'Worn Out',
  'Broken/Retired',
];

export default function CNCWorkshopTab({
  orders,
  customers,
  users,
  currentUser,
  cncJobs,
  cncTools,
  statusLogs,
  onSaveJob,
  onDeleteJob,
  onSaveTool,
  onDeleteTool,
  onUpdateOrder,
}: CNCWorkshopTabProps) {
  // Navigation Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'queue' | 'inventory' | 'reports'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const subTabLabels: Record<'dashboard' | 'queue' | 'inventory' | 'reports', string> = {
    dashboard: 'Dashboard',
    queue: 'Job Queue',
    inventory: 'Tool Inventory',
    reports: 'Monthly Report',
  };

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modals / Form Drawers
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CNCJob | null>(null);
  const [editingTool, setEditingTool] = useState<CNCTool | null>(null);

  // Quick Action on Order Queue
  const [selectedOrderForJob, setSelectedOrderForJob] = useState<Order | null>(null);

  // Form State for CNC Job Record
  const [jobFormData, setJobFormData] = useState<Partial<CNCJob>>({
    job_number: '',
    job_date: new Date().toISOString().split('T')[0],
    job_type: 'Carving',
    machine_name: 'Machine 1',
    tool_name: '2mm Taper',
    run_time_minutes: 90,
    design_time_minutes: 45,
    design_time_value: 45,
    design_time_unit: 'Minutes',
    completion_time_minutes: 90,
    completion_time_value: 90,
    completion_time_unit: 'Minutes',
    amount: 1850,
    status: 'In Progress',
    operator_name: currentUser.name || 'Lucee Admin',
    material: 'Teak Wood',
    dimensions: '',
    design_file: 'mandir_panel_relief_v2.nc',
    notes: '3D relief floral mandir jaali carving on 1.25" seasoned Teak wood. Feed rate 2800 mm/min, spindle 18000 RPM with 2mm taper bit.',
  });

  // Mobile expandable card state for Job Queue
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());

  const toggleExpandJob = (jobId: string) => {
    setExpandedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  // Mobile accordion states for the 4 large Dashboard sections
  const [expandedDashboardSections, setExpandedDashboardSections] = useState<{
    performance: boolean;
    costStructure: boolean;
    financialProgress: boolean;
    productionOverview: boolean;
  }>({
    performance: false,
    costStructure: false,
    financialProgress: false,
    productionOverview: false,
  });

  const toggleDashboardSection = (section: 'performance' | 'costStructure' | 'financialProgress' | 'productionOverview') => {
    setExpandedDashboardSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Tool Inventory Filters & Expansion State
  const [toolSearchTerm, setToolSearchTerm] = useState('');
  const [toolStatusFilter, setToolStatusFilter] = useState<string>('all');
  const [toolConditionFilter, setToolConditionFilter] = useState<string>('all');
  const [toolTypeFilter, setToolTypeFilter] = useState<string>('all');
  const [expandedToolIds, setExpandedToolIds] = useState<Set<string>>(new Set());

  const toggleExpandTool = (toolId: string) => {
    setExpandedToolIds(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  };

  // Stock status determination: Stock Qty = 0 -> Out of Stock, Stock Qty <= Min. Stock -> Low Stock
  const getToolStatus = (tool: { quantity_in_stock?: number; min_stock_level?: number; reorder_level?: number; status?: string }): 'In stock' | 'Low stock' | 'Out of stock' => {
    const qty = Number(tool.quantity_in_stock) ?? 0;
    const min = Number(tool.min_stock_level ?? tool.reorder_level ?? 1);
    if (qty <= 0) return 'Out of stock';
    if (qty <= min) return 'Low stock';
    if (tool.status === 'Low stock' || tool.status === 'Out of stock') {
      return tool.status;
    }
    return 'In stock';
  };

  // Form State for CNC Tool (Google Stitch design)
  const [toolFormData, setToolFormData] = useState<{
    name: string;
    tool_type: string;
    specification: string;
    quantity_in_stock: number;
    min_stock_level: number;
    condition: CNCToolCondition;
    total_run_hours: number;
    unit_cost: number;
    last_replaced_date: string;
    status: 'In stock' | 'Low stock' | 'Out of stock';
    notes: string;
    // Legacy fields preserved silently
    tool_code?: string;
    diameter_mm?: string;
    shank_mm?: string;
    reorder_level?: number;
  }>({
    name: '',
    tool_type: 'Ball Nose',
    specification: '',
    quantity_in_stock: 2,
    min_stock_level: 1,
    condition: 'Good',
    total_run_hours: 0,
    unit_cost: 650,
    last_replaced_date: new Date().toISOString().split('T')[0],
    status: 'In stock',
    notes: '',
  });

  // Customer map for quick lookup
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => map.set(c.id, c));
    return map;
  }, [customers]);

  // Only orders with requires_cnc === true and currently at CNC Wood Carving appear in the CNC queue
  const pendingQueueOrders = useMemo(() => {
    return orders.filter(o => o.requires_cnc === true && o.current_status === 'CNC Wood Carving');
  }, [orders]);

  // Unified Job Queue list (combines recorded CNC jobs and pending orders for CNC)
  const queueItems = useMemo(() => {
    // 1. All recorded CNC jobs
    const items: Array<{
      id: string;
      article_no: string;
      job_date: string;
      job_type: string;
      machine_name: string;
      tool_name: string;
      design_time: number;
      design_time_value?: number;
      design_time_unit?: CNCDurationUnit;
      completion_time: number;
      completion_time_value?: number;
      completion_time_unit?: CNCDurationUnit;
      amount: number;
      operator_name: string;
      status: CNCJobStatus;
      isOrderPendingOnly?: boolean;
      rawJob?: CNCJob;
      rawOrder?: Order;
    }> = cncJobs.map(job => ({
      id: job.id,
      article_no: job.article_no || job.job_number || 'CNC-JOB',
      job_date: job.job_date || '',
      job_type: job.job_type || 'Carving',
      machine_name: job.machine_name || 'Machine 1',
      tool_name: job.tool_name || '2mm Taper',
      design_time: job.design_time_minutes ?? 0,
      design_time_value: job.design_time_value,
      design_time_unit: job.design_time_unit,
      completion_time: job.completion_time_minutes ?? job.run_time_minutes ?? 0,
      completion_time_value: job.completion_time_value,
      completion_time_unit: job.completion_time_unit,
      amount: job.amount || 0,
      operator_name: job.operator_name || 'Lucee Admin',
      status: job.status || 'Queued',
      isOrderPendingOnly: false,
      rawJob: job,
      rawOrder: orders.find(o => o.id === job.order_id),
    }));

    // 2. Add pending queue orders that do not have a CNC job record yet
    pendingQueueOrders.forEach(ord => {
      const alreadyHasJob = cncJobs.some(j => j.order_id === ord.id);
      if (!alreadyHasJob) {
        items.push({
          id: `pending_ord_${ord.id}`,
          article_no: ord.article_no || 'ORD-CNC',
          job_date: ord.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          job_type: (ord.cnc_job_type as any) || 'Carving',
          machine_name: 'Machine 1',
          tool_name: ord.cnc_tool_used || '2mm Taper',
          design_time: 0,
          design_time_value: undefined,
          design_time_unit: undefined,
          completion_time: ord.cnc_duration_minutes || 60,
          completion_time_value: ord.cnc_duration_minutes || 60,
          completion_time_unit: 'Minutes',
          amount: ord.cnc_amount || 0,
          operator_name: 'Unassigned',
          status: ord.cnc_status === 'in_progress' ? 'In Progress' : ord.cnc_status === 'completed' ? 'Completed' : 'Queued',
          isOrderPendingOnly: true,
          rawOrder: ord,
        });
      }
    });

    return items;
  }, [cncJobs, pendingQueueOrders, orders]);

  // Filtered queue items based on search and statusFilter
  const filteredQueueItems = useMemo(() => {
    return queueItems.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        item.article_no.toLowerCase().includes(q) ||
        item.job_type.toLowerCase().includes(q) ||
        item.machine_name.toLowerCase().includes(q) ||
        item.tool_name.toLowerCase().includes(q) ||
        item.operator_name.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'Queued' && (item.status === 'Queued' || item.status === 'Pending')) ||
        (statusFilter === 'In Progress' && item.status === 'In Progress') ||
        (statusFilter === 'Completed' && item.status === 'Completed');

      return matchSearch && matchStatus;
    }).sort((a, b) => (b.job_date || '').localeCompare(a.job_date || ''));
  }, [queueItems, searchTerm, statusFilter]);

  // Orders that have CNC requirements or logs
  const cncEligibleOrders = useMemo(() => {
    return orders.filter(o => {
      return (
        o.requires_cnc === true || 
        o.current_status === 'CNC Wood Carving' || 
        o.carpenter_sub_status === 'cnc_wood_carving' ||
        cncJobs.some(j => j.order_id === o.id)
      );
    });
  }, [orders, cncJobs]);

  // Calculate high-level Workshop Metrics
  const metrics = useMemo(() => {
    const totalJobs = cncJobs.length;
    const queuedJobs = cncJobs.filter(j => j.status === 'Queued' || j.status === 'Pending').length;
    const inProgressJobs = cncJobs.filter(j => j.status === 'In Progress').length;
    const completedJobs = cncJobs.filter(j => j.status === 'Completed').length;

    // Filter current month for financial metrics
    const [yearStr, monthStr] = selectedMonth.split('-');
    const currentMonthJobs = cncJobs.filter(j => {
      if (!j.job_date) return false;
      const [y, m] = j.job_date.split('-');
      return y === yearStr && m === monthStr;
    });

    const monthRevenue = currentMonthJobs.reduce((sum, j) => sum + (Number(j.amount) || 0), 0);
    const monthMachiningMinutes = currentMonthJobs.reduce((sum, j) => sum + (Number(j.run_time_minutes) || 0), 0);
    const monthMachiningHours = (monthMachiningMinutes / 60).toFixed(1);

    // Tool health alerts
    const toolsNeedingAttention = cncTools.filter(t => 
      t.condition === 'Needs Resharpening' || 
      t.condition === 'Worn Out' || 
      t.condition === 'Dull' ||
      (t.quantity_in_stock <= (t.min_stock_level ?? t.reorder_level ?? 1))
    );

    return {
      totalJobs,
      queuedJobs,
      inProgressJobs,
      completedJobs,
      monthRevenue,
      monthMachiningHours,
      currentMonthJobsCount: currentMonthJobs.length,
      toolsNeedingAttentionCount: toolsNeedingAttention.length,
      activeQueueCount: pendingQueueOrders.length,
    };
  }, [cncJobs, cncTools, selectedMonth, pendingQueueOrders]);

  // Available unique tool types for inventory filter
  const availableToolTypes = useMemo(() => {
    const typesSet = new Set<string>(DEFAULT_TOOL_TYPES);
    cncTools.forEach(t => {
      if (t.tool_type && t.tool_type.trim()) typesSet.add(t.tool_type.trim());
    });
    return Array.from(typesSet);
  }, [cncTools]);

  // Filtered & Sorted Tools List for Tool Inventory
  const filteredTools = useMemo(() => {
    return cncTools
      .filter(tool => {
        // 1. Search Query
        const q = toolSearchTerm.toLowerCase().trim();
        if (q) {
          const matchesName = tool.name?.toLowerCase().includes(q);
          const matchesSpec = tool.specification?.toLowerCase().includes(q);
          const matchesType = tool.tool_type?.toLowerCase().includes(q);
          const matchesNotes = tool.notes?.toLowerCase().includes(q);
          const matchesSupplier = tool.supplier?.toLowerCase().includes(q);
          if (!matchesName && !matchesSpec && !matchesType && !matchesNotes && !matchesSupplier) {
            return false;
          }
        }

        // 2. Status filter
        const status = getToolStatus(tool);
        if (toolStatusFilter !== 'all' && status !== toolStatusFilter) {
          return false;
        }

        // 3. Condition filter
        if (toolConditionFilter !== 'all' && tool.condition !== toolConditionFilter) {
          return false;
        }

        // 4. Tool Type filter
        if (toolTypeFilter !== 'all' && tool.tool_type !== toolTypeFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort low/out-of-stock tools first
        const statusScore = (t: CNCTool) => {
          const s = getToolStatus(t);
          if (s === 'Out of stock') return 0;
          if (s === 'Low stock') return 1;
          return 2;
        };

        const diff = statusScore(a) - statusScore(b);
        if (diff !== 0) return diff;

        return (a.name || '').localeCompare(b.name || '');
      });
  }, [cncTools, toolSearchTerm, toolStatusFilter, toolConditionFilter, toolTypeFilter]);

  // Workshop Cost Structure Configuration (Admin-editable only)
  const [costConfig, setCostConfig] = useState<WorkshopCostConfig>(() => {
    try {
      const saved = localStorage.getItem('cnc_workshop_cost_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          loanEmi: Number(parsed.loanEmi) ?? 30000,
          worker1Salary: Number(parsed.worker1Salary) ?? 0,
          worker2Salary: Number(parsed.worker2Salary) ?? 15000,
          toolsConsumables: Number(parsed.toolsConsumables) ?? 5000,
          electricityMisc: Number(parsed.electricityMisc) ?? 5000,
          workingDays: Number(parsed.workingDays) || 26,
        };
      }
    } catch (err) {}
    return DEFAULT_COST_CONFIG;
  });

  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [tempCostConfig, setTempCostConfig] = useState<WorkshopCostConfig>(costConfig);
  const [calibrationFeedback, setCalibrationFeedback] = useState<string | null>(null);

  // Dynamic Financial Calculations (never hardcoded)
  const monthlyCostTarget = useMemo(() => {
    return (
      (Number(costConfig.loanEmi) || 0) +
      (Number(costConfig.worker1Salary) || 0) +
      (Number(costConfig.worker2Salary) || 0) +
      (Number(costConfig.toolsConsumables) || 0) +
      (Number(costConfig.electricityMisc) || 0)
    );
  }, [costConfig]);

  const dailyBreakEven = useMemo(() => {
    return costConfig.workingDays > 0 ? monthlyCostTarget / costConfig.workingDays : 0;
  }, [monthlyCostTarget, costConfig.workingDays]);

  const recommendedDailyTarget = useMemo(() => {
    return dailyBreakEven * 1.20;
  }, [dailyBreakEven]);

  // Today's Live Date & Real Job Metrics
  const todayDateObj = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => todayDateObj.toISOString().split('T')[0], [todayDateObj]);
  const formattedToday = useMemo(() => {
    return `${todayDateObj.getDate()} ${todayDateObj.toLocaleString('default', { month: 'short' })}`;
  }, [todayDateObj]);

  const todayJobs = useMemo(() => {
    return cncJobs.filter(j => j.job_date === todayStr);
  }, [cncJobs, todayStr]);

  const todayCompletedJobs = useMemo(() => {
    return todayJobs.filter(j => j.status === 'Completed');
  }, [todayJobs]);

  const todayInProgressJobs = useMemo(() => {
    return todayJobs.filter(j => j.status === 'In Progress');
  }, [todayJobs]);

  const todayQueuedJobs = useMemo(() => {
    return todayJobs.filter(j => j.status === 'Queued' || j.status === 'Pending');
  }, [todayJobs]);

  const todayRevenue = useMemo(() => {
    return todayCompletedJobs.reduce((sum, j) => sum + (Number(j.amount) || 0), 0);
  }, [todayCompletedJobs]);

  const todayNetSurplus = todayRevenue - dailyBreakEven;
  const isTodaySurplus = todayNetSurplus >= 0;
  const todayTargetAchievementPct = dailyBreakEven > 0 ? (todayRevenue / dailyBreakEven) * 100 : 0;
  const todaySurplusPct = dailyBreakEven > 0 ? ((todayRevenue - dailyBreakEven) / dailyBreakEven) * 100 : 0;

  // Month-to-date Calculations
  const currentMonthName = useMemo(() => todayDateObj.toLocaleString('default', { month: 'long' }), [todayDateObj]);
  const currentMonthAbbr = useMemo(() => todayDateObj.toLocaleString('default', { month: 'short' }), [todayDateObj]);

  const monthCompletedJobs = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    return cncJobs.filter(j => {
      if (!j.job_date || j.status !== 'Completed') return false;
      const [y, m] = j.job_date.split('-');
      return y === yearStr && m === monthStr;
    });
  }, [cncJobs, selectedMonth]);

  const monthProfitLoss = useMemo(() => {
    return metrics.monthRevenue - monthlyCostTarget;
  }, [metrics.monthRevenue, monthlyCostTarget]);

  const monthTargetCoveragePct = useMemo(() => {
    return monthlyCostTarget > 0 ? (metrics.monthRevenue / monthlyCostTarget) * 100 : 0;
  }, [metrics.monthRevenue, monthlyCostTarget]);

  const daysWorkedCount = useMemo(() => {
    const dates = new Set<string>();
    const [yearStr, monthStr] = selectedMonth.split('-');
    cncJobs.forEach(j => {
      if (j.job_date) {
        const [y, m] = j.job_date.split('-');
        if (y === yearStr && m === monthStr) {
          dates.add(j.job_date);
        }
      }
    });
    const currentDayCapped = Math.min(todayDateObj.getDate(), costConfig.workingDays);
    return Math.max(dates.size, currentDayCapped);
  }, [cncJobs, selectedMonth, todayDateObj, costConfig.workingDays]);

  const projectedMonthRevenue = useMemo(() => {
    if (daysWorkedCount <= 0) return metrics.monthRevenue;
    return Math.round((metrics.monthRevenue / daysWorkedCount) * costConfig.workingDays);
  }, [metrics.monthRevenue, daysWorkedCount, costConfig.workingDays]);

  const projectedProfit = projectedMonthRevenue - monthlyCostTarget;

  // Admin & CNC Workshop Cost Structure Handler
  const handleSaveCostConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'admin' && currentUser.role !== 'cnc_workshop' && currentUser.role !== 'cnc_manager') {
      alert('Security Policy: Only Workshop Admin or CNC Workshop role can edit operational cost parameters.');
      return;
    }
    setCostConfig(tempCostConfig);
    try {
      localStorage.setItem('cnc_workshop_cost_config', JSON.stringify(tempCostConfig));
    } catch (err) {}
    setIsCostModalOpen(false);
  };

  const handleCalibrateSpindles = () => {
    setCalibrationFeedback('Spindles Auto-Calibrated & Zero-Referenced (X:0, Y:0, Z:0) ✔');
    setTimeout(() => {
      setCalibrationFeedback(null);
    }, 4500);
  };

  // Open modal to create a new job, optionally linked to an order
  const handleOpenNewJobModal = (order?: Order) => {
    const nextJobNo = `CNC-${new Date().getFullYear()}-${String(cncJobs.length + 1).padStart(3, '0')}`;

    if (order) {
      const cust = customerMap.get(order.customer_id);
      setSelectedOrderForJob(order);
      setEditingJob(null);
      setJobFormData({
        job_number: nextJobNo,
        order_id: order.id,
        article_no: order.article_no || nextJobNo,
        customer_name: cust?.name || 'Walk-in Client',
        product_name: order.sub_category || order.category || 'Furniture Item',
        job_type: 'Carving',
        machine_name: 'Machine 1',
        tool_name: '2mm Taper',
        run_time_minutes: order.cnc_duration_minutes || 90,
        design_time_minutes: 45,
        design_time_value: 45,
        design_time_unit: 'Minutes',
        completion_time_minutes: order.cnc_duration_minutes || 90,
        completion_time_value: order.cnc_duration_minutes || 90,
        completion_time_unit: 'Minutes',
        amount: order.cnc_amount || 1850,
        status: 'In Progress',
        operator_name: currentUser.name || 'Lucee Admin',
        job_date: new Date().toISOString().split('T')[0],
        material: order.material || 'Teak Wood',
        dimensions: '',
        design_file: 'mandir_panel_relief_v2.nc',
        notes: order.cnc_notes || '3D relief floral mandir jaali carving on 1.25" seasoned Teak wood. Feed rate 2800 mm/min, spindle 18000 RPM with 2mm taper bit.',
      });
    } else {
      setSelectedOrderForJob(null);
      setEditingJob(null);
      setJobFormData({
        job_number: nextJobNo,
        article_no: nextJobNo,
        job_date: new Date().toISOString().split('T')[0],
        job_type: 'Carving',
        machine_name: 'Machine 1',
        tool_name: '2mm Taper',
        run_time_minutes: 90,
        design_time_minutes: 45,
        design_time_value: 45,
        design_time_unit: 'Minutes',
        completion_time_minutes: 90,
        completion_time_value: 90,
        completion_time_unit: 'Minutes',
        amount: 1850,
        status: 'In Progress',
        operator_name: currentUser.name || 'Lucee Admin',
        material: 'Teak Wood',
        dimensions: '',
        design_file: 'mandir_panel_relief_v2.nc',
        notes: '3D relief floral mandir jaali carving on 1.25" seasoned Teak wood. Feed rate 2800 mm/min, spindle 18000 RPM with 2mm taper bit.',
      });
    }
    setIsJobModalOpen(true);
  };

  // Edit existing CNC job
  const handleOpenEditJobModal = (job: CNCJob) => {
    setEditingJob(job);
    const linkedOrder = orders.find(o => o.id === job.order_id);
    setSelectedOrderForJob(linkedOrder || null);

    // Safely extract design time with backward compatibility
    let desVal: number | undefined = undefined;
    let desUnit: CNCDurationUnit = 'Minutes';
    if (job.design_time_value !== undefined && job.design_time_value !== null) {
      desVal = Number(job.design_time_value);
      desUnit = job.design_time_unit || 'Minutes';
    } else if (job.design_time_minutes !== undefined && job.design_time_minutes !== null) {
      desVal = Number(job.design_time_minutes);
      desUnit = 'Minutes';
    }

    // Safely extract completion time with backward compatibility
    let compVal: number | undefined = undefined;
    let compUnit: CNCDurationUnit = 'Minutes';
    if (job.completion_time_value !== undefined && job.completion_time_value !== null) {
      compVal = Number(job.completion_time_value);
      compUnit = job.completion_time_unit || 'Minutes';
    } else {
      const compMin = job.completion_time_minutes ?? job.run_time_minutes;
      if (compMin !== undefined && compMin !== null) {
        compVal = Number(compMin);
        compUnit = 'Minutes';
      }
    }

    setJobFormData({
      ...job,
      job_number: job.job_number || job.article_no || '',
      article_no: job.article_no || job.job_number || '',
      job_type: (job.job_type as CNCJobType) || 'Carving',
      machine_name: job.machine_name || 'Machine 1',
      tool_name: job.tool_name || '2mm Taper',
      design_time_minutes: job.design_time_minutes ?? (desVal !== undefined ? convertDurationToMinutes(desVal, desUnit) : 0),
      design_time_value: desVal,
      design_time_unit: desUnit,
      completion_time_minutes: job.completion_time_minutes ?? job.run_time_minutes ?? (compVal !== undefined ? convertDurationToMinutes(compVal, compUnit) : 0),
      completion_time_value: compVal,
      completion_time_unit: compUnit,
      material: job.material || 'Teak Wood',
      amount: job.amount || 0,
      operator_name: job.operator_name || currentUser.name || 'Lucee Admin',
      design_file: job.design_file || '',
      notes: job.notes || '',
    });
    setIsJobModalOpen(true);
  };

  // Start job in queue
  const handleStartJob = async (job: CNCJob) => {
    const inProgressJob: CNCJob = {
      ...job,
      status: 'In Progress',
    };
    await onSaveJob(inProgressJob);
    if (job.order_id) {
      const targetOrder = orders.find(o => o.id === job.order_id);
      if (targetOrder) {
        await handleStartCNCWorking(targetOrder);
      }
    }
  };

  // Submit CNC Job Form
  const handleSubmitJobForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const jobId = editingJob ? editingJob.id : `cnc_job_${generateUUID().split('-')[0]}`;
    const autoJobNo = jobFormData.article_no || jobFormData.job_number || `CNC-${new Date().getFullYear()}-${String(cncJobs.length + 1).padStart(3, '0')}`;

    // Safely calculate minutes and preserve values/units
    const desVal = jobFormData.design_time_value !== undefined && jobFormData.design_time_value !== null && String(jobFormData.design_time_value) !== ''
      ? Number(jobFormData.design_time_value)
      : undefined;
    const desUnit: CNCDurationUnit = (jobFormData.design_time_unit as CNCDurationUnit) || 'Minutes';
    const desMinutes = desVal !== undefined && !isNaN(desVal)
      ? convertDurationToMinutes(desVal, desUnit)
      : (Number(jobFormData.design_time_minutes) || 0);

    const compVal = jobFormData.completion_time_value !== undefined && jobFormData.completion_time_value !== null && String(jobFormData.completion_time_value) !== ''
      ? Number(jobFormData.completion_time_value)
      : undefined;
    const compUnit: CNCDurationUnit = (jobFormData.completion_time_unit as CNCDurationUnit) || 'Minutes';
    const compMinutes = compVal !== undefined && !isNaN(compVal)
      ? convertDurationToMinutes(compVal, compUnit)
      : (Number(jobFormData.completion_time_minutes) || Number(jobFormData.run_time_minutes) || 0);

    const jobToSave: CNCJob = {
      id: jobId,
      job_number: autoJobNo,
      order_id: jobFormData.order_id || selectedOrderForJob?.id || undefined,
      article_no: autoJobNo,
      customer_name: editingJob?.customer_name || 'Walk-in Client',
      product_name: editingJob?.product_name || 'CNC Component',
      job_type: (jobFormData.job_type as CNCJobType) || 'Carving',
      machine_name: jobFormData.machine_name || 'Machine 1',
      tool_name: jobFormData.tool_name || '2mm Taper',
      tool_id: jobFormData.tool_id,
      run_time_minutes: compMinutes,
      design_time_minutes: desMinutes,
      design_time_value: desVal,
      design_time_unit: desUnit,
      completion_time_minutes: compMinutes,
      completion_time_value: compVal,
      completion_time_unit: compUnit,
      amount: Number(jobFormData.amount) || 0,
      status: (editingJob?.status) || (jobFormData.status as CNCJobStatus) || 'In Progress',
      operator_name: jobFormData.operator_name || currentUser.name || 'Lucee Admin',
      job_date: jobFormData.job_date || new Date().toISOString().split('T')[0],
      material: jobFormData.material || 'Teak Wood',
      dimensions: editingJob?.dimensions || '',
      design_file: jobFormData.design_file || '',
      notes: jobFormData.notes || '',
      created_at: editingJob?.created_at || new Date().toISOString(),
      created_by: editingJob?.created_by || currentUser.id,
      completed_at: editingJob?.status === 'Completed' ? (editingJob?.completed_at || new Date().toISOString()) : undefined,
    };

    await onSaveJob(jobToSave);

    // Synchronize back to linked order if present
    if (jobToSave.order_id) {
      const targetOrder = orders.find(o => o.id === jobToSave.order_id);
      if (targetOrder) {
        let updatedOrder: Order = {
          ...targetOrder,
          requires_cnc: true,
          cnc_job_id: jobToSave.id,
          cnc_job_type: jobToSave.job_type,
          cnc_tool_used: jobToSave.tool_name,
          cnc_amount: jobToSave.amount,
          cnc_duration_minutes: jobToSave.run_time_minutes,
          cnc_notes: jobToSave.notes,
        };

        if (jobToSave.status === 'Completed') {
          updatedOrder.cnc_status = 'completed';
        } else if (jobToSave.status === 'In Progress') {
          updatedOrder.cnc_status = 'in_progress';
        } else {
          updatedOrder.cnc_status = 'pending';
        }

        const log: StatusLog = {
          id: 'log_' + generateUUID().split('-')[0],
          order_id: targetOrder.id,
          stage: targetOrder.current_status,
          changed_by: currentUser.id,
          changed_by_name: currentUser.name || 'CNC Workshop Manager',
          changed_by_role: currentUser.role,
          timestamp: new Date().toISOString(),
          note: `CNC Workshop log recorded: [${jobToSave.job_type}] on ${jobToSave.machine_name}. Status: ${jobToSave.status}. Operator: ${jobToSave.operator_name}. Amount: ₹${jobToSave.amount}.`,
        };

        await onUpdateOrder(updatedOrder, log);
      }
    }

    setIsJobModalOpen(false);
  };

  // Start CNC Working on an order
  const handleStartCNCWorking = async (ord: Order) => {
    let existingJob = cncJobs.find(j => j.order_id === ord.id);
    if (!existingJob) {
      const autoJobNo = `CNC-${new Date().getFullYear()}-${String(cncJobs.length + 1).padStart(3, '0')}`;
      const newJob: CNCJob = {
        id: `cnc_job_${generateUUID().split('-')[0]}`,
        job_number: autoJobNo,
        order_id: ord.id,
        article_no: ord.article_no,
        customer_name: customerMap.get(ord.customer_id)?.name || 'Client',
        product_name: `${ord.category} - ${ord.sub_category || ord.design_type || ''}`,
        job_type: ord.cnc_job_type || '3D Relief',
        machine_name: 'CNC Router #1 (Heavy 8x4)',
        tool_name: ord.cnc_tool_used || (cncTools[0]?.name || '6mm Ball Nose Bit'),
        run_time_minutes: ord.cnc_duration_minutes || 60,
        amount: ord.cnc_amount || 1200,
        status: 'In Progress',
        operator_name: currentUser.name || 'CNC Supervisor',
        job_date: new Date().toISOString().split('T')[0],
        material: ord.material || 'Teak Wood',
        dimensions: ord.size === 'Custom' ? (ord.custom_size || 'Custom Size') : (ord.size || 'Standard'),
        design_file: '',
        notes: ord.cnc_notes || ord.special_notes || '',
        created_at: new Date().toISOString(),
        created_by: currentUser.id,
      };
      await onSaveJob(newJob);
      existingJob = newJob;
    } else {
      await onSaveJob({
        ...existingJob,
        status: 'In Progress',
      });
    }

    const updatedOrder: Order = {
      ...ord,
      requires_cnc: true,
      cnc_status: 'in_progress',
      current_status: 'CNC Wood Carving',
      cnc_job_id: existingJob.id,
      updated_at: new Date().toISOString(),
    };

    const log: StatusLog = {
      id: 'log_' + generateUUID().split('-')[0],
      order_id: ord.id,
      stage: 'CNC Wood Carving',
      changed_by: currentUser.id,
      changed_by_name: currentUser.name || 'CNC Supervisor',
      changed_by_role: currentUser.role,
      timestamp: new Date().toISOString(),
      note: `CNC carving started by ${currentUser.name}. Status: CNC working.`,
    };

    await onUpdateOrder(updatedOrder, log);
  };

  // Complete CNC and hand off to QC 1
  const handleCompleteOrderAndMoveToQC1 = async (ord: Order) => {
    if (!window.confirm(`Mark CNC carving complete for "${ord.article_no}" and advance order to QC 1?`)) {
      return;
    }

    const existingJob = cncJobs.find(j => j.order_id === ord.id);
    if (existingJob) {
      await onSaveJob({
        ...existingJob,
        status: 'Completed',
        completed_at: new Date().toISOString(),
      });
    }

    const updatedOrder: Order = {
      ...ord,
      requires_cnc: true,
      cnc_status: 'completed',
      current_status: 'QC 1',
      carpenter_sub_status: 'qc_check_1',
      qc_1_status: 'pending_admin_approval',
      updated_at: new Date().toISOString(),
    };

    const log: StatusLog = {
      id: 'log_' + generateUUID().split('-')[0],
      order_id: ord.id,
      stage: 'QC 1',
      changed_by: currentUser.id,
      changed_by_name: currentUser.name || 'CNC Supervisor',
      changed_by_role: currentUser.role,
      timestamp: new Date().toISOString(),
      note: `CNC Wood Carving completed by ${currentUser.name}. Order successfully forwarded to QC 1 verification.`,
    };

    await onUpdateOrder(updatedOrder, log);
  };

  // Tool Inventory Handlers
  const handleOpenNewToolModal = () => {
    const nextCode = `BIT-${String(cncTools.length + 1).padStart(2, '0')}`;
    setEditingTool(null);
    setToolFormData({
      name: '',
      tool_type: 'Ball Nose',
      specification: '',
      quantity_in_stock: 2,
      min_stock_level: 1,
      condition: 'Good',
      total_run_hours: 0,
      unit_cost: 650,
      last_replaced_date: new Date().toISOString().split('T')[0],
      status: 'In stock',
      notes: '',
      tool_code: nextCode,
      diameter_mm: '6mm',
      shank_mm: '1/2"',
      reorder_level: 1,
    });
    setIsToolModalOpen(true);
  };

  const handleOpenEditToolModal = (tool: CNCTool) => {
    setEditingTool(tool);
    const calculatedStatus = getToolStatus(tool);
    setToolFormData({
      name: tool.name || '',
      tool_type: tool.tool_type || 'Ball Nose',
      specification: tool.specification || '',
      quantity_in_stock: tool.quantity_in_stock ?? 0,
      min_stock_level: tool.min_stock_level ?? tool.reorder_level ?? 1,
      condition: tool.condition || 'Good',
      total_run_hours: tool.total_run_hours ?? 0,
      unit_cost: tool.unit_cost ?? 0,
      last_replaced_date: tool.last_replaced_date || (tool.updated_at ? tool.updated_at.split('T')[0] : ''),
      status: (tool.status === 'In stock' || tool.status === 'Low stock' || tool.status === 'Out of stock')
        ? (tool.status as 'In stock' | 'Low stock' | 'Out of stock')
        : calculatedStatus,
      notes: tool.notes || tool.supplier || '',
      tool_code: tool.tool_code,
      diameter_mm: tool.diameter_mm,
      shank_mm: tool.shank_mm,
      reorder_level: tool.min_stock_level ?? tool.reorder_level ?? 1,
    });
    setIsToolModalOpen(true);
  };

  const handleSubmitToolForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolFormData.name?.trim()) {
      alert('Tool Name is required.');
      return;
    }
    if (!toolFormData.tool_type?.trim()) {
      alert('Tool Type is required.');
      return;
    }

    const toolId = editingTool ? editingTool.id : `cnc_tool_${generateUUID().split('-')[0]}`;
    const stockQty = Number(toolFormData.quantity_in_stock) ?? 0;
    const minStock = Number(toolFormData.min_stock_level) ?? 1;

    // Status logic: Stock Qty = 0 -> Out of Stock, Stock Qty <= Min. Stock -> Low Stock
    let finalStatus: 'In stock' | 'Low stock' | 'Out of stock' = toolFormData.status || 'In stock';
    if (stockQty === 0) {
      finalStatus = 'Out of stock';
    } else if (stockQty <= minStock && finalStatus === 'In stock') {
      finalStatus = 'Low stock';
    }

    const toolToSave: CNCTool = {
      id: toolId,
      tool_code: editingTool?.tool_code || toolFormData.tool_code || `BIT-${String(cncTools.length + 1).padStart(2, '0')}`,
      diameter_mm: editingTool?.diameter_mm || toolFormData.diameter_mm || '',
      shank_mm: editingTool?.shank_mm || toolFormData.shank_mm || '',
      reorder_level: minStock,
      min_stock_level: minStock,
      name: toolFormData.name.trim(),
      tool_type: toolFormData.tool_type.trim(),
      specification: toolFormData.specification?.trim() || '',
      quantity_in_stock: stockQty,
      condition: (toolFormData.condition as CNCToolCondition) || 'Good',
      total_run_hours: Number(toolFormData.total_run_hours) || 0,
      unit_cost: Number(toolFormData.unit_cost) || 0,
      last_replaced_date: toolFormData.last_replaced_date || new Date().toISOString().split('T')[0],
      status: finalStatus,
      notes: toolFormData.notes?.trim() || '',
      updated_at: new Date().toISOString(),
    };

    await onSaveTool(toolToSave);
    setIsToolModalOpen(false);
  };

  return (
    <div className="space-y-3 sm:space-y-6 font-sans">
      {/* DESKTOP & TABLET Module Header & Sub-Navigation (Unchanged) */}
      <div className="hidden md:flex bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#115e59] text-white flex items-center justify-center shadow-xs shrink-0">
            <Cpu size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-display">
              CNC Wood Workshop Manager
            </h1>
          </div>
        </div>

        {/* Center Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-[#115e59] text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveSubTab('queue')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer relative ${
              activeSubTab === 'queue'
                ? 'bg-[#115e59] text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700'
            }`}
          >
            <Layers size={14} />
            <span>Job Queue</span>
            {pendingQueueOrders.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-extrabold rounded-full">
                {pendingQueueOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer relative ${
              activeSubTab === 'inventory'
                ? 'bg-[#115e59] text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700'
            }`}
          >
            <Wrench size={14} />
            <span>Tool Inventory</span>
            {metrics.toolsNeedingAttentionCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-extrabold rounded-full">
                {metrics.toolsNeedingAttentionCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-[#115e59] text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700'
            }`}
          >
            <TrendingUp size={14} />
            <span>Monthly Report</span>
          </button>
        </div>

        {/* Right Primary Action */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
          <button
            onClick={() => handleOpenNewJobModal()}
            className="px-3.5 py-2 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Record New CNC Job</span>
          </button>
        </div>
      </div>

      {/* MOBILE Compact Header & Navigation Menu */}
      <div className="md:hidden bg-white rounded-xl border border-stone-200/90 shadow-2xs overflow-hidden">
        <div className="p-2.5 flex items-center justify-between gap-2">
          {/* Left: Compact brand & active view label */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#115e59] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Cpu size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-900 tracking-tight leading-tight truncate">
                CNC Workshop
              </div>
              <div className="text-[10px] text-teal-800 font-bold flex items-center gap-1 truncate">
                <span>{subTabLabels[activeSubTab]}</span>
                {activeSubTab === 'queue' && pendingQueueOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-extrabold rounded-full">
                    {pendingQueueOrders.length}
                  </span>
                )}
                {activeSubTab === 'inventory' && metrics.toolsNeedingAttentionCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-extrabold rounded-full">
                    {metrics.toolsNeedingAttentionCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Primary "Record New CNC Job" Action + Menu Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenNewJobModal()}
              className="px-2.5 py-1.5 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Record New CNC Job"
            >
              <Plus size={13} />
              <span className="whitespace-nowrap">Record Job</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center justify-center ${
                isMobileMenuOpen
                  ? 'bg-stone-200 text-stone-900 border-stone-300'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
              }`}
              aria-label="Toggle CNC navigation menu"
            >
              {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu: Dashboard, Job Queue, Tool Inventory, Monthly Report */}
        {isMobileMenuOpen && (
          <div className="border-t border-stone-100 bg-stone-50/70 p-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('dashboard');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeSubTab === 'dashboard'
                  ? 'bg-[#115e59] text-white shadow-2xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </div>
              {activeSubTab === 'dashboard' && <Check size={14} />}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('queue');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeSubTab === 'queue'
                  ? 'bg-[#115e59] text-white shadow-2xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers size={14} />
                <span>Job Queue</span>
              </div>
              <div className="flex items-center gap-1.5">
                {pendingQueueOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-extrabold rounded-full">
                    {pendingQueueOrders.length}
                  </span>
                )}
                {activeSubTab === 'queue' && <Check size={14} />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('inventory');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeSubTab === 'inventory'
                  ? 'bg-[#115e59] text-white shadow-2xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wrench size={14} />
                <span>Tool Inventory</span>
              </div>
              <div className="flex items-center gap-1.5">
                {metrics.toolsNeedingAttentionCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-extrabold rounded-full">
                    {metrics.toolsNeedingAttentionCount}
                  </span>
                )}
                {activeSubTab === 'inventory' && <Check size={14} />}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('reports');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                activeSubTab === 'reports'
                  ? 'bg-[#115e59] text-white shadow-2xs'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={14} />
                <span>Monthly Report</span>
              </div>
              {activeSubTab === 'reports' && <Check size={14} />}
            </button>
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: REDESIGNED CNC DASHBOARD (GOOGLE STITCH DESKTOP + MOBILE) */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 4 Top KPI Cards (Desktop 4 cols, Mobile 2×2 grid) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Card 1: Today's Revenue */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Today's Revenue
                </span>
                <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                  <IndianRupee size={15} />
                </div>
              </div>
              <div className="my-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                    ₹{todayRevenue.toLocaleString('en-IN')}
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                    isTodaySurplus
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isTodaySurplus ? `+${Math.abs(todaySurplusPct).toFixed(1)}% surplus` : `-${Math.abs(todaySurplusPct).toFixed(1)}% shortfall`}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                vs ₹{Math.round(dailyBreakEven).toLocaleString('en-IN')} break-even target
              </div>
            </div>

            {/* Card 2: Target Achievement */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Target Achievement
                </span>
                <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center">
                  <CheckCircle2 size={15} />
                </div>
              </div>
              <div className="my-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                    {todayTargetAchievementPct.toFixed(1)}%
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                    todayTargetAchievementPct >= 100
                      ? 'bg-emerald-100 text-emerald-800'
                      : todayTargetAchievementPct >= 80
                      ? 'bg-teal-100 text-teal-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {todayTargetAchievementPct >= 100 ? 'Exceeded' : todayTargetAchievementPct >= 80 ? 'On Track' : 'In Progress'}
                  </span>
                </div>
              </div>
              <div className="text-[11px] font-medium text-slate-500">
                {todayTargetAchievementPct >= 100 ? (
                  <span className="text-emerald-700 font-bold">✓ Daily break-even reached</span>
                ) : (
                  <span>₹{Math.max(0, Math.round(dailyBreakEven - todayRevenue)).toLocaleString('en-IN')} to break-even</span>
                )}
              </div>
            </div>

            {/* Card 3: Active Daily Jobs */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Active Daily Jobs
                </span>
                <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
                  <Box size={15} />
                </div>
              </div>
              <div className="my-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
                    {todayCompletedJobs.length}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-500">completed</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {todayInProgressJobs.length} in progress
                </span>
                <span>•</span>
                <span className="text-slate-500">{todayQueuedJobs.length} queued</span>
              </div>
            </div>

            {/* Card 4: Today's Net Status */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Today's Net Status
                </span>
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                  isTodaySurplus
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                }`}>
                  {isTodaySurplus ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                </div>
              </div>
              <div className="my-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`text-2xl sm:text-3xl font-black font-display tracking-tight ${
                    isTodaySurplus ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {isTodaySurplus ? '+' : '-'}₹{Math.abs(Math.round(todayNetSurplus)).toLocaleString('en-IN')}
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                    isTodaySurplus ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isTodaySurplus ? 'SURPLUS' : 'SHORTFALL'}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {isTodaySurplus ? 'Exceeded' : 'Short of'} break-even (₹{Math.round(dailyBreakEven).toLocaleString('en-IN')})
              </div>
            </div>
          </div>

          {/* Performance & Structure Grid (Desktop 2-col, Mobile expandable accordions) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {/* 1. Today's Performance Summary */}
            <div className="order-1 bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
              {/* Mobile Accordion Header Button (< md) */}
              <button
                type="button"
                onClick={() => toggleDashboardSection('performance')}
                className="w-full p-4 md:hidden flex items-center justify-between text-left cursor-pointer transition select-none hover:bg-stone-50/70"
                aria-expanded={expandedDashboardSections.performance}
              >
                <span className="text-sm font-bold text-slate-900 tracking-tight">
                  Today's Performance Summary
                </span>
                <span className="text-slate-400 shrink-0 ml-2">
                  {expandedDashboardSections.performance ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              {/* Full Section Content: Always visible on desktop/tablet (md:block), expandable on mobile */}
              <div className={`${expandedDashboardSections.performance ? 'block' : 'hidden'} md:block p-4 md:p-5 pt-0 md:pt-5 space-y-4 border-t md:border-t-0 border-stone-100 transition-all duration-200`}>
                {/* Desktop Header */}
                <div className="hidden md:flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      Today's Performance Summary
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Real-time daily milling billing against fixed overhead targets
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-[#115e59] border border-teal-200 shrink-0 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#115e59]" />
                    Today • {formattedToday}
                  </span>
                </div>

                {/* Mobile Sub-header (when expanded) */}
                <div className="flex md:hidden items-center justify-between gap-2 pt-3">
                  <p className="text-xs text-slate-500 font-medium leading-tight">
                    Real-time daily milling billing against fixed overhead targets
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-[#115e59] border border-teal-200 shrink-0 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#115e59]" />
                    {formattedToday}
                  </span>
                </div>

                {/* 6 Sub-metric Cards (2 cols on small mobile, 3 cols on sm+) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jobs Completed</div>
                    <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 font-display">
                      {todayCompletedJobs.length}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">({todayInProgressJobs.length} active)</div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Revenue Earned</div>
                    <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 font-display">
                      ₹{todayRevenue.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Billed today</div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target (Break-even)</div>
                    <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 font-display">
                      ₹{Math.round(dailyBreakEven).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Daily base</div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rec. Target (+20%)</div>
                    <div className="text-lg sm:text-xl font-black text-slate-900 mt-1 font-display">
                      ₹{Math.round(recommendedDailyTarget).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-teal-800 font-semibold mt-0.5">Profit margin</div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Day Surplus</div>
                    <div className={`text-lg sm:text-xl font-black mt-1 font-display ${
                      isTodaySurplus ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {isTodaySurplus ? '+' : '-'}₹{Math.abs(Math.round(todayNetSurplus)).toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{isTodaySurplus ? 'Profit margin' : 'Shortfall'}</div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">% Target Achieved</div>
                    <div className={`text-lg sm:text-xl font-black mt-1 font-display ${
                      todayTargetAchievementPct >= 100 ? 'text-emerald-700' : 'text-slate-900'
                    }`}>
                      {todayTargetAchievementPct.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{todayTargetAchievementPct >= 100 ? 'Goal passed' : 'In progress'}</div>
                  </div>
                </div>

                {/* Daily Target Milestones Progress */}
                <div className="space-y-2 pt-1 border-t border-stone-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Daily Target Milestones Progress</span>
                    <span className="font-bold text-emerald-700">{todayTargetAchievementPct.toFixed(1)}% of Base Target</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#115e59] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, todayTargetAchievementPct))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
                      todayRevenue >= dailyBreakEven
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <CheckCircle2 size={14} className={todayRevenue >= dailyBreakEven ? 'text-emerald-600' : 'text-slate-400'} />
                      <span>Break-even target (₹{Math.round(dailyBreakEven).toLocaleString('en-IN')}) {todayRevenue >= dailyBreakEven ? 'passed' : 'pending'}</span>
                    </div>

                    <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
                      todayRevenue >= recommendedDailyTarget
                        ? 'bg-teal-50/80 border-teal-200 text-teal-800'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <CheckCircle2 size={14} className={todayRevenue >= recommendedDailyTarget ? 'text-[#115e59]' : 'text-slate-400'} />
                      <span>Recommended target (₹{Math.round(recommendedDailyTarget).toLocaleString('en-IN')}) {todayRevenue >= recommendedDailyTarget ? 'passed!' : 'pending'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 pt-1">
                  <span>Formula: Daily Target = Total Monthly Overhead (₹{monthlyCostTarget.toLocaleString('en-IN')}) ÷ {costConfig.workingDays} Days</span>
                  <span className="font-medium text-slate-400">Auto-updated</span>
                </div>
              </div>
            </div>

            {/* 2. Workshop Cost Structure */}
            <div className="order-2 lg:order-2 bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
              {/* Mobile Accordion Header Button (< md) */}
              <button
                type="button"
                onClick={() => toggleDashboardSection('costStructure')}
                className="w-full p-4 md:hidden flex items-center justify-between text-left cursor-pointer transition select-none hover:bg-stone-50/70"
                aria-expanded={expandedDashboardSections.costStructure}
              >
                <span className="text-sm font-bold text-slate-900 tracking-tight">
                  Workshop Cost Structure
                </span>
                <span className="text-slate-400 shrink-0 ml-2">
                  {expandedDashboardSections.costStructure ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              {/* Full Section Content: Always visible on desktop/tablet (md:block), expandable on mobile */}
              <div className={`${expandedDashboardSections.costStructure ? 'block' : 'hidden'} md:block p-4 md:p-5 pt-0 md:pt-5 space-y-4 border-t md:border-t-0 border-stone-100 transition-all duration-200`}>
                {/* Desktop Header */}
                <div className="hidden md:flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      Workshop Cost Structure
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Fixed administrative operational parameters
                    </p>
                  </div>

                  {currentUser?.role === 'admin' || currentUser?.role === 'cnc_workshop' || currentUser?.role === 'cnc_manager' ? (
                    <button
                      onClick={() => {
                        setTempCostConfig(costConfig);
                        setIsCostModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg border border-stone-200 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Sliders size={12} />
                      <span>Edit Parameters</span>
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 bg-stone-100 text-stone-600 text-xs font-semibold rounded-lg border border-stone-200 flex items-center gap-1">
                      <Lock size={12} />
                      <span>Admin Fixed</span>
                    </span>
                  )}
                </div>

                {/* Mobile Sub-header (when expanded) */}
                <div className="flex md:hidden items-center justify-between gap-2 pt-3">
                  <p className="text-xs text-slate-500 font-medium leading-tight">
                    Fixed administrative operational parameters
                  </p>
                  {currentUser?.role === 'admin' || currentUser?.role === 'cnc_workshop' || currentUser?.role === 'cnc_manager' ? (
                    <button
                      onClick={() => {
                        setTempCostConfig(costConfig);
                        setIsCostModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-lg border border-stone-200 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Sliders size={12} />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[11px] font-semibold rounded-lg border border-stone-200 flex items-center gap-1 shrink-0">
                      <Lock size={11} />
                      <span>Fixed</span>
                    </span>
                  )}
                </div>

                {/* List of cost parameters */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-stone-100">
                    <span className="text-slate-600 font-medium">Loan EMI:</span>
                    <span className="font-bold text-slate-900">₹{costConfig.loanEmi.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stone-100">
                    <span className="text-slate-600 font-medium">Worker 1 Salary:</span>
                    <span className="font-bold text-slate-900">₹{costConfig.worker1Salary.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stone-100">
                    <span className="text-slate-600 font-medium">Worker 2 Salary:</span>
                    <span className="font-bold text-slate-900">₹{costConfig.worker2Salary.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stone-100">
                    <span className="text-slate-600 font-medium">Tools & Consumables:</span>
                    <span className="font-bold text-slate-900">₹{costConfig.toolsConsumables.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stone-100">
                    <span className="text-slate-600 font-medium">Electricity & Misc:</span>
                    <span className="font-bold text-slate-900">₹{costConfig.electricityMisc.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-stone-100">
                    <span className="text-slate-600 font-medium">Working Days / Month:</span>
                    <span className="font-bold text-slate-900">{costConfig.workingDays} Days</span>
                  </div>
                </div>

                {/* Calculated Summary Box */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Monthly Cost Target:</span>
                    <span className="text-base font-black text-slate-900 font-display">
                      ₹{monthlyCostTarget.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Daily Break-even:</span>
                    <span className="font-bold text-slate-800">
                      ₹{Math.round(dailyBreakEven).toLocaleString('en-IN')} / day
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">Recommended Target (+20%):</span>
                    <span className="font-black text-emerald-700">
                      ₹{Math.round(recommendedDailyTarget).toLocaleString('en-IN')} / day
                    </span>
                  </div>
                </div>

                <div className="text-[11px] italic text-slate-400">
                  *Locked by Admin. Automatically syncs to daily logs & monthly projections.*
                </div>
              </div>
            </div>

            {/* 3. Current Month Financial Progress */}
            <div className="order-3 lg:order-3 bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
              {/* Mobile Accordion Header Button (< md) */}
              <button
                type="button"
                onClick={() => toggleDashboardSection('financialProgress')}
                className="w-full p-4 md:hidden flex items-center justify-between text-left cursor-pointer transition select-none hover:bg-stone-50/70"
                aria-expanded={expandedDashboardSections.financialProgress}
              >
                <span className="text-sm font-bold text-slate-900 tracking-tight">
                  Current Month Financial Progress
                </span>
                <span className="text-slate-400 shrink-0 ml-2">
                  {expandedDashboardSections.financialProgress ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              {/* Full Section Content: Always visible on desktop/tablet (md:block), expandable on mobile */}
              <div className={`${expandedDashboardSections.financialProgress ? 'block' : 'hidden'} md:block p-4 md:p-5 pt-0 md:pt-5 space-y-4 border-t md:border-t-0 border-stone-100 transition-all duration-200`}>
                {/* Desktop Header */}
                <div className="hidden md:flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      Current Month Financial Progress
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {currentMonthName} Billing vs ₹{monthlyCostTarget.toLocaleString('en-IN')} Monthly Fixed Target
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200 shrink-0">
                    Day {daysWorkedCount} of {costConfig.workingDays}
                  </span>
                </div>

                {/* Mobile Sub-header (when expanded) */}
                <div className="flex md:hidden items-center justify-between gap-2 pt-3">
                  <p className="text-xs text-slate-500 font-medium leading-tight">
                    {currentMonthName} Billing vs ₹{monthlyCostTarget.toLocaleString('en-IN')}
                  </p>
                  <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200 shrink-0">
                    Day {daysWorkedCount} of {costConfig.workingDays}
                  </span>
                </div>

                {/* 4 Stat Boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue</div>
                    <div className="text-base font-black text-slate-900 mt-1 font-display">
                      ₹{metrics.monthRevenue.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fixed Target</div>
                    <div className="text-base font-black text-slate-900 mt-1 font-display">
                      ₹{monthlyCostTarget.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To Break-even</div>
                    <div className={`text-base font-black mt-1 font-display ${
                      monthProfitLoss >= 0 ? 'text-emerald-700' : 'text-slate-800'
                    }`}>
                      {monthProfitLoss >= 0 ? '+' : '-'}₹{Math.abs(Math.round(monthProfitLoss)).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jobs Billed</div>
                    <div className="text-base font-black text-slate-900 mt-1 font-display">
                      {metrics.currentMonthJobsCount} jobs
                    </div>
                  </div>
                </div>

                {/* Monthly Target Coverage Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      Overall Monthly Target Coverage ({monthTargetCoveragePct.toFixed(1)}%)
                    </span>
                    <span className="font-semibold text-slate-500">
                      ₹{metrics.monthRevenue.toLocaleString('en-IN')} / ₹{monthlyCostTarget.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#115e59] rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, monthTargetCoveragePct))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>₹0 (Day 1)</span>
                    <span>Break-even: ₹{monthlyCostTarget.toLocaleString('en-IN')}</span>
                    <span>
                      Proj: ₹{projectedMonthRevenue.toLocaleString('en-IN')} ({projectedProfit >= 0 ? `+₹${(projectedProfit/1000).toFixed(1)}k profit` : `-₹${(Math.abs(projectedProfit)/1000).toFixed(1)}k`})
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                  <span className="text-[11px] text-slate-600 max-w-sm truncate">
                    <span className="font-bold text-slate-800">Run-rate: </span>
                    {metrics.monthRevenue >= monthlyCostTarget 
                      ? 'Monthly break-even target achieved!' 
                      : projectedMonthRevenue >= monthlyCostTarget 
                      ? 'On schedule to surpass recommended monthly safe profit target.' 
                      : 'Pacing behind monthly overhead break-even; queue acceleration advised.'}
                  </span>
                  <button
                    onClick={() => setActiveSubTab('reports')}
                    className="text-xs font-bold text-[#115e59] hover:text-[#0f4c4a] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>View Month Breakdown</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* 4. CNC Production Overview */}
            <div className="order-4 lg:order-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
              {/* Mobile Accordion Header Button (< md) */}
              <button
                type="button"
                onClick={() => toggleDashboardSection('productionOverview')}
                className="w-full p-4 md:hidden flex items-center justify-between text-left cursor-pointer transition select-none hover:bg-stone-50/70"
                aria-expanded={expandedDashboardSections.productionOverview}
              >
                <span className="text-sm font-bold text-slate-900 tracking-tight">
                  CNC Production Overview
                </span>
                <span className="text-slate-400 shrink-0 ml-2">
                  {expandedDashboardSections.productionOverview ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </span>
              </button>

              {/* Full Section Content: Always visible on desktop/tablet (md:block), expandable on mobile */}
              <div className={`${expandedDashboardSections.productionOverview ? 'block' : 'hidden'} md:block p-4 md:p-5 pt-0 md:pt-5 space-y-4 border-t md:border-t-0 border-stone-100 transition-all duration-200`}>
                {/* Desktop Header */}
                <div className="hidden md:flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      CNC Production Overview
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Spindle telemetry & cutting operational load
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSubTab('queue')}
                    className="text-xs font-bold text-[#115e59] hover:text-[#0f4c4a] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Queue Details</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* Mobile Sub-header (when expanded) */}
                <div className="flex md:hidden items-center justify-between gap-2 pt-3">
                  <p className="text-xs text-slate-500 font-medium leading-tight">
                    Spindle telemetry & cutting operational load
                  </p>
                  <button
                    onClick={() => setActiveSubTab('queue')}
                    className="text-xs font-bold text-[#115e59] hover:text-[#0f4c4a] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Queue Details</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* 4 Cards (2x2 Grid) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Active Queue</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1 font-display">
                      {metrics.activeQueueCount} <span className="text-xs text-slate-500 font-normal">jobs</span>
                    </div>
                    <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                      {metrics.inProgressJobs} currently carving
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Completed ({currentMonthAbbr})</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1 font-display">
                      {metrics.completedJobs}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                      100% QA pass rate
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Clock size={13} className="text-teal-600" />
                      <span>Machining Hours</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1 font-display">
                      {metrics.monthMachiningHours} <span className="text-xs text-slate-500 font-normal">hrs</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Logged this month
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-3.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <AlertTriangle size={13} className={metrics.toolsNeedingAttentionCount > 0 ? 'text-rose-500' : 'text-emerald-600'} />
                      <span>Tool Health</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1 font-display">
                      {metrics.toolsNeedingAttentionCount} <span className="text-xs text-slate-500 font-normal">Alert{metrics.toolsNeedingAttentionCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-[11px] font-medium mt-0.5 truncate text-slate-500">
                      {metrics.toolsNeedingAttentionCount > 0 ? 'Bit wear threshold reached' : 'All tools within safe tolerances'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 pt-1 border-t border-stone-100">
                  <span>Fleet Efficiency: {((Math.max(1, metrics.inProgressJobs) / DEFAULT_MACHINES.length) * 100).toFixed(1)}% operational</span>
                  <span className="font-semibold text-emerald-700">All dust collectors active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Machine Fleet Section (Full Width, 4 Machines) */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Workshop CNC Machines Fleet
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    4 Units Online
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Live routing, spindle load and availability status
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCalibrateSpindles}
                  className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-bold border border-stone-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw size={13} className="text-[#115e59]" />
                  <span>Calibrate Spindles</span>
                </button>

                <button
                  onClick={() => setActiveSubTab('queue')}
                  className="px-3.5 py-1.5 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus size={13} />
                  <span>+ Assign Queue</span>
                </button>
              </div>
            </div>

            {/* Calibration Feedback Notice */}
            {calibrationFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>{calibrationFeedback}</span>
              </div>
            )}

            {/* 4 Machine Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Machine 1: CNC Router #1 (8x4) */}
              {(() => {
                const activeJob = cncJobs.find(j => (j.machine_name?.includes('Router #1') || j.machine_name?.includes('8x4')) && j.status === 'In Progress');
                return (
                  <div className="p-4 rounded-xl border bg-slate-50/70 border-slate-200/80 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">CNC Router #1 (8×4)</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Running
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-900 truncate">
                        {activeJob ? `${activeJob.article_no} — ${activeJob.product_name}` : 'Teak Door Panels (J-104)'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Spindle: <span className="font-semibold text-slate-800">18,000 RPM</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tool Bit: <span className="font-semibold text-slate-800">{activeJob?.tool_name || '6mm Ballnose'}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          {activeJob?.run_time_minutes ? `${activeJob.run_time_minutes} mins left` : '42 mins left'}
                        </span>
                        <span className="font-bold text-emerald-700">68% completed</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full w-[68%]" />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Machine 2: CNC Router #2 (4x4) */}
              <div className="p-4 rounded-xl border bg-slate-50/70 border-slate-200/80 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">CNC Router #2 (4×4)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Ready / Idle
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900">Precision Milling Unit</div>
                  <p className="text-[11px] text-slate-500">
                    Spindle calibrated • Bed vacuum table ready for next sheet.
                  </p>
                </div>

                <button
                  onClick={() => handleOpenNewJobModal()}
                  className="w-full py-1.5 px-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-lg text-xs font-bold transition cursor-pointer text-center"
                >
                  Load G-Code File
                </button>
              </div>

              {/* Machine 3: 4-Axis Rotary Carver */}
              {(() => {
                const activeJob = cncJobs.find(j => j.machine_name?.includes('4-Axis') && j.status === 'In Progress');
                return (
                  <div className="p-4 rounded-xl border bg-slate-50/70 border-slate-200/80 flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">4-Axis Rotary Carver</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        Running
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-900 truncate">
                        {activeJob ? `${activeJob.article_no} — ${activeJob.product_name}` : 'Classical Chair Legs (J-108)'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Spindle: <span className="font-semibold text-slate-800">14,000 RPM</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tool Bit: <span className="font-semibold text-slate-800">{activeJob?.tool_name || 'V-Carve 90° Engraver'}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          {activeJob?.run_time_minutes ? `${activeJob.run_time_minutes} mins left` : '1h 15m left'}
                        </span>
                        <span className="font-bold text-emerald-700">35% completed</span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full w-[35%]" />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Machine 4: Vertical Spindle Router */}
              <div className="p-4 rounded-xl border bg-rose-50/40 border-rose-200/70 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">Vertical Spindle Router</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    Tool Alert
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="font-bold text-rose-900">Bit wear threshold reached</div>
                  <p className="text-[11px] text-slate-600">
                    1/2" Surfacing bit requires replacement or sharpening before next run.
                  </p>
                </div>

                <button
                  onClick={() => setActiveSubTab('inventory')}
                  className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer text-center shadow-xs"
                >
                  Clear & Replace Bit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: JOB QUEUE */}
      {activeSubTab === 'queue' && (
        <div className="space-y-3 sm:space-y-4">
          {/* Desktop Filter & Action Bar (Unchanged) */}
          <div className="hidden md:flex bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input
                  type="text"
                  placeholder="Search Article/Job No, Machine, Tool, Operator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs w-64 md:w-72 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Queued">Queued</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <div className="text-xs font-medium text-stone-500">
                Total in Queue: <span className="font-bold text-teal-800">{filteredQueueItems.length}</span>
              </div>
            </div>

            <button
              onClick={() => handleOpenNewJobModal()}
              className="px-4 py-2 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              <Plus size={14} />
              <span>Record New CNC Job</span>
            </button>
          </div>

          {/* Mobile Compact Search & Filter Strip */}
          <div className="md:hidden bg-white p-2.5 rounded-xl border border-stone-200/90 shadow-2xs space-y-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
              <input
                type="text"
                placeholder="Search jobs, machines, operators..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter & Count Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 py-1 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 focus:bg-white focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="Queued">Queued</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>

                {(searchTerm || statusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                    className="px-2 py-1 text-[11px] font-bold text-stone-500 hover:text-stone-800 bg-stone-100 rounded-lg shrink-0"
                  >
                    Reset
                  </button>
                )}
              </div>

              <span className="text-[11px] font-medium text-stone-500 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200/70 shrink-0">
                Queue: <strong className="text-teal-800 font-bold">{filteredQueueItems.length}</strong>
              </span>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#115e59]/5 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3.5">Article / Job No.</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Job Type</th>
                    <th className="py-3 px-3">Machine</th>
                    <th className="py-3 px-3">Tool Used</th>
                    <th className="py-3 px-3">Design Time</th>
                    <th className="py-3 px-3">Completion Time</th>
                    <th className="py-3 px-3 text-right">Amount (₹)</th>
                    <th className="py-3 px-3">Operator</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredQueueItems.map(item => (
                    <tr key={item.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-3 px-3.5 font-bold text-stone-900 font-mono">
                        {item.article_no}
                      </td>
                      <td className="py-3 px-3 text-stone-600 whitespace-nowrap">
                        {formatToDDMMYYYY(item.job_date)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-stone-800">
                          {item.job_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        {item.machine_name}
                      </td>
                      <td className="py-3 px-3 text-stone-600 font-mono text-[11px]">
                        {item.tool_name}
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        {formatJobDurationDisplay(item.design_time_value ?? item.rawJob?.design_time_value, item.design_time_unit ?? item.rawJob?.design_time_unit, item.design_time)}
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        {formatJobDurationDisplay(item.completion_time_value ?? item.rawJob?.completion_time_value, item.completion_time_unit ?? item.rawJob?.completion_time_unit, item.completion_time)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900">
                        ₹{Number(item.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-stone-600">
                        {item.operator_name}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          item.status === 'In Progress'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : item.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {item.status === 'In Progress' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
                          )}
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap space-x-1.5">
                        {item.status !== 'In Progress' && item.status !== 'Completed' && (
                          <button
                            onClick={async () => {
                              if (item.rawJob) {
                                await handleStartJob(item.rawJob);
                              } else if (item.rawOrder) {
                                await handleStartCNCWorking(item.rawOrder);
                              }
                            }}
                            className="px-2.5 py-1 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          >
                            <Play size={12} />
                            <span>Start</span>
                          </button>
                        )}
                        {item.status === 'In Progress' && (
                          <button
                            onClick={async () => {
                              if (item.rawOrder) {
                                await handleCompleteOrderAndMoveToQC1(item.rawOrder);
                              }
                              if (item.rawJob) {
                                await onSaveJob({
                                  ...item.rawJob,
                                  status: 'Completed',
                                  completed_at: new Date().toISOString(),
                                });
                              }
                            }}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 size={12} />
                            <span>Complete</span>
                          </button>
                        )}
                        {item.rawJob ? (
                          <>
                            <button
                              onClick={() => handleOpenEditJobModal(item.rawJob!)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                const jobTitle = item.article_no || item.rawJob?.job_number || 'this CNC job';
                                if (window.confirm(`Are you sure you want to delete CNC job "${jobTitle}"?`)) {
                                  await onDeleteJob(item.rawJob!.id);
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                              title="Delete CNC Job"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </>
                        ) : item.rawOrder ? (
                          <button
                            onClick={() => handleOpenNewJobModal(item.rawOrder)}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Log Specs
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}

                  {filteredQueueItems.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-stone-400">
                        No CNC jobs match the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Compact Expandable Job Cards */}
          <div className="block md:hidden space-y-2">
            {filteredQueueItems.map(item => {
              const isExpanded = expandedJobIds.has(item.id);
              const job = item.rawJob;
              const order = item.rawOrder;

              const articleNo = job?.article_no || job?.job_number || item.article_no;
              const jobDate = job?.job_date || item.job_date;
              const jobType = job?.job_type || item.job_type;
              const machineName = job?.machine_name || item.machine_name;
              const toolName = job?.tool_name || item.tool_name;
              const material = job?.material || order?.material || order?.wood_type || '';
              const amount = job?.amount ?? item.amount ?? 0;
              const operatorName = job?.operator_name || item.operator_name;
              const designTime = job?.design_time_minutes ?? item.design_time ?? 0;
              const completionTime = job?.completion_time_minutes ?? job?.run_time_minutes ?? item.completion_time ?? 0;
              const programFile = job?.design_file || order?.cnc_file_url || order?.cad_file_url || '';
              const description = job?.notes || order?.cnc_notes || order?.remarks || '';
              const status = job?.status || item.status;

              // Additional Firestore job-specific fields
              const customerName = job?.customer_name || (order?.customer_id ? customerMap.get(order.customer_id)?.name : '') || '';
              const productName = job?.product_name || order?.sub_category || order?.category || '';
              const dimensions = job?.dimensions || order?.size_of_product || '';
              const createdAt = job?.created_at || order?.created_at || '';
              const completedAt = job?.completed_at || '';
              const createdBy = job?.created_by || '';
              const orderId = job?.order_id || order?.id || '';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-stone-200/90 shadow-2xs overflow-hidden transition-all"
                >
                  {/* Collapsed Card Header: Job No., date/type, machine, status, amount, and clear expand/collapse control */}
                  <div
                    onClick={() => toggleExpandJob(item.id)}
                    className="p-2.5 flex flex-col gap-1.5 cursor-pointer hover:bg-stone-50/60 transition select-none"
                  >
                    {/* Top line: Job No., Status, Amount, Expand/Collapse Control */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="font-bold text-xs text-stone-900 font-mono truncate min-w-0">
                        {articleNo}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold inline-flex items-center gap-1 ${
                          status === 'In Progress'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {status === 'In Progress' && (
                            <span className="w-1 h-1 rounded-full bg-teal-600 animate-pulse" />
                          )}
                          {status}
                        </span>

                        <span className="font-black text-xs text-stone-900 font-display">
                          ₹{Number(amount || 0).toLocaleString('en-IN')}
                        </span>

                        {/* Clear Expand / Collapse Control Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandJob(item.id);
                          }}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-0.5 transition ${
                            isExpanded
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                          }`}
                          aria-label={isExpanded ? "Collapse job details" : "Expand job details"}
                        >
                          <span>{isExpanded ? "Hide" : "Details"}</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* Second line: Date/Type & Machine */}
                    <div className="flex items-center justify-between text-[11px] text-stone-500 gap-2">
                      <span className="truncate min-w-0">
                        {formatToDDMMYYYY(jobDate)} • <span className="font-semibold text-stone-700">{jobType}</span>
                      </span>
                      <span className="font-medium text-stone-600 truncate text-right shrink-0">
                        {machineName}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Card: ALL job details organized into clean labeled rows/sections + Actions */}
                  {isExpanded && (
                    <div className="px-2.5 pb-2.5 pt-2 border-t border-stone-100 bg-stone-50/40 space-y-2.5 text-xs animate-in fade-in duration-100">
                      {/* Section 1: Specifications Grid (Date, Article No, Type, Machine, Tool, Material, Operator, Status) */}
                      <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 space-y-2">
                        <div className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider flex items-center justify-between border-b border-stone-100 pb-1">
                          <span>Job Specifications</span>
                          <span className="font-mono text-stone-400 font-normal">{articleNo}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                          <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Date</span>
                            <span className="font-medium text-stone-800 truncate block">{formatToDDMMYYYY(jobDate) || '—'}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Article / Job No.</span>
                            <span className="font-mono font-bold text-stone-900 truncate block">{articleNo || '—'}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Job Type</span>
                            <span className="font-semibold text-stone-800 truncate block">{jobType || '—'}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Machine Assigned</span>
                            <span className="font-medium text-stone-800 truncate block">{machineName || '—'}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Tool Used</span>
                            <span className="font-mono font-semibold text-stone-800 truncate block">{toolName || '—'}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Wood / Material</span>
                            <span className="font-medium text-stone-800 truncate block">{material || '—'}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Operator / CNC Manager</span>
                            <span className="font-medium text-stone-800 truncate block">{operatorName || '—'}</span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Status</span>
                            <span className="font-semibold text-stone-800 truncate block">{status || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Time & Billing */}
                      <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 space-y-2">
                        <div className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider border-b border-stone-100 pb-1">
                          Time & Billing
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                          <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Time For Designing</span>
                            <span className="font-medium text-stone-800 block">
                              {formatJobDurationDisplay(job?.design_time_value, job?.design_time_unit, designTime)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Job Completion Time</span>
                            <span className="font-medium text-stone-800 block">
                              {formatJobDurationDisplay(job?.completion_time_value, job?.completion_time_unit, completionTime)}
                            </span>
                          </div>

                          <div className="col-span-2 pt-1 border-t border-stone-100 flex items-center justify-between">
                            <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Amount / Billing</span>
                            <span className="font-black text-xs text-teal-900 font-display">
                              ₹{Number(amount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Program File Ref (.dxf / .nc) */}
                      <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-teal-800 uppercase tracking-wider">
                          <FileCode size={12} className="text-teal-700" />
                          <span>Program File Ref (.dxf / .nc)</span>
                        </div>
                        <div className="p-1.5 bg-stone-50 rounded border border-stone-200/60 font-mono text-[11px] text-stone-800 break-all">
                          {programFile || <span className="text-stone-400 italic">None recorded</span>}
                        </div>
                      </div>

                      {/* Section 4: Job Description */}
                      <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 space-y-1">
                        <div className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider">
                          Job Description
                        </div>
                        <div className="p-2 bg-stone-50 rounded border border-stone-200/60 text-[11px] text-stone-700 whitespace-pre-wrap break-words leading-relaxed">
                          {description || <span className="text-stone-400 italic">No description provided.</span>}
                        </div>
                      </div>

                      {/* Section 5: Additional Stored Fields (if available in Firestore) */}
                      {(customerName || productName || dimensions || createdAt || completedAt || orderId || createdBy) && (
                        <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 space-y-1.5">
                          <div className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider border-b border-stone-100 pb-1">
                            Additional Job Details
                          </div>

                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
                            {customerName && (
                              <div>
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Customer / Client</span>
                                <span className="font-medium text-stone-800 truncate block">{customerName}</span>
                              </div>
                            )}

                            {productName && (
                              <div>
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Product / Component</span>
                                <span className="font-medium text-stone-800 truncate block">{productName}</span>
                              </div>
                            )}

                            {dimensions && (
                              <div>
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Dimensions</span>
                                <span className="font-medium text-stone-800 truncate block">{dimensions}</span>
                              </div>
                            )}

                            {orderId && (
                              <div>
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Linked Order ID</span>
                                <span className="font-mono font-medium text-stone-800 truncate block">#{orderId.slice(-6)}</span>
                              </div>
                            )}

                            {createdAt && (
                              <div>
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Created Date</span>
                                <span className="font-medium text-stone-800 truncate block">{formatToDDMMYYYY(createdAt.split('T')[0])}</span>
                              </div>
                            )}

                            {completedAt && (
                              <div>
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Completed At</span>
                                <span className="font-medium text-emerald-800 truncate block">{formatToDDMMYYYY(completedAt.split('T')[0])}</span>
                              </div>
                            )}

                            {createdBy && (
                              <div>
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Created By</span>
                                <span className="font-medium text-stone-800 truncate block">{createdBy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions: Edit, Complete, Delete (and Start if Queued) */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {status !== 'In Progress' && status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (item.rawJob) {
                                await handleStartJob(item.rawJob);
                              } else if (item.rawOrder) {
                                await handleStartCNCWorking(item.rawOrder);
                              }
                            }}
                            className="flex-1 py-2 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs min-w-[70px]"
                          >
                            <Play size={12} />
                            <span>Start</span>
                          </button>
                        )}

                        {status === 'In Progress' ? (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (item.rawOrder) {
                                await handleCompleteOrderAndMoveToQC1(item.rawOrder);
                              }
                              if (item.rawJob) {
                                await onSaveJob({
                                  ...item.rawJob,
                                  status: 'Completed',
                                  completed_at: new Date().toISOString(),
                                });
                              }
                            }}
                            className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs min-w-[85px]"
                          >
                            <CheckCircle2 size={13} />
                            <span>Complete</span>
                          </button>
                        ) : status !== 'Completed' ? (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (item.rawJob) {
                                await onSaveJob({
                                  ...item.rawJob,
                                  status: 'Completed',
                                  completed_at: new Date().toISOString(),
                                });
                              }
                              if (item.rawOrder) {
                                await handleCompleteOrderAndMoveToQC1(item.rawOrder);
                              }
                            }}
                            className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer min-w-[85px]"
                          >
                            <CheckCircle2 size={13} />
                            <span>Complete</span>
                          </button>
                        ) : (
                          <div className="flex-1 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 select-none min-w-[85px]">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Completed</span>
                          </div>
                        )}

                        {item.rawJob ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditJobModal(item.rawJob!);
                              }}
                              className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer min-w-[65px]"
                            >
                              <Pencil size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const jobTitle = item.article_no || item.rawJob?.job_number || 'this CNC job';
                                if (window.confirm(`Are you sure you want to delete CNC job "${jobTitle}"?`)) {
                                  await onDeleteJob(item.rawJob!.id);
                                }
                              }}
                              className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer min-w-[70px]"
                              title="Delete CNC Job"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </>
                        ) : item.rawOrder ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenNewJobModal(item.rawOrder);
                            }}
                            className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-lg text-xs font-bold text-center transition cursor-pointer min-w-[80px]"
                          >
                            Log Specs
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredQueueItems.length === 0 && (
              <div className="p-6 text-center bg-white rounded-xl border border-stone-200 text-stone-400 text-xs">
                No CNC jobs match the filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: TOOL INVENTORY & BIT MANAGEMENT */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          {/* Header & Controls Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Toolroom & Bit Inventory
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-stone-200">
                  {cncTools.length} {cncTools.length === 1 ? 'tool' : 'tools'}
                </span>
                {filteredTools.length !== cncTools.length && (
                  <span className="text-[11px] font-medium text-slate-500">
                    ({filteredTools.length} filtered)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cutter inventory, wear condition, unit costs, and real-time stock alert thresholds.
              </p>
            </div>

            <button
              onClick={handleOpenNewToolModal}
              className="px-4 py-2 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Plus size={15} />
              <span>Add New Bit / Cutter</span>
            </button>
          </div>

          {/* Search and Filters Strip */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={toolSearchTerm}
                onChange={(e) => setToolSearchTerm(e.target.value)}
                placeholder="Search tool name, type, specification, notes..."
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
              />
              {toolSearchTerm && (
                <button
                  onClick={() => setToolSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Status Filter */}
              <div className="w-full sm:w-auto">
                <select
                  value={toolStatusFilter}
                  onChange={(e) => setToolStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59]"
                >
                  <option value="all">All Statuses</option>
                  <option value="In stock">In stock</option>
                  <option value="Low stock">Low stock</option>
                  <option value="Out of stock">Out of stock</option>
                </select>
              </div>

              {/* Condition Filter */}
              <div className="w-full sm:w-auto">
                <select
                  value={toolConditionFilter}
                  onChange={(e) => setToolConditionFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59]"
                >
                  <option value="all">All Conditions</option>
                  {DEFAULT_TOOL_CONDITIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Tool Type Filter */}
              <div className="w-full sm:w-auto">
                <select
                  value={toolTypeFilter}
                  onChange={(e) => setToolTypeFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59]"
                >
                  <option value="all">All Tool Types</option>
                  {availableToolTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {(toolSearchTerm || toolStatusFilter !== 'all' || toolConditionFilter !== 'all' || toolTypeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setToolSearchTerm('');
                    setToolStatusFilter('all');
                    setToolConditionFilter('all');
                    setToolTypeFilter('all');
                  }}
                  className="px-2.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer hover:bg-stone-100 rounded-xl whitespace-nowrap"
                  title="Reset all filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP: Clean Compact List View Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-4">Tool Name</th>
                    <th className="py-3 px-3">Tool Type</th>
                    <th className="py-3 px-3 text-center">Stock</th>
                    <th className="py-3 px-3 text-center">Min. Stock</th>
                    <th className="py-3 px-3">Condition</th>
                    <th className="py-3 px-3">Hours Used</th>
                    <th className="py-3 px-3">Unit Cost</th>
                    <th className="py-3 px-3">Last Replaced</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredTools.map(tool => {
                    const status = getToolStatus(tool);
                    const minStock = tool.min_stock_level ?? tool.reorder_level ?? 1;

                    return (
                      <tr key={tool.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. Tool Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-xs">{tool.name}</div>
                          {tool.specification ? (
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5">{tool.specification}</div>
                          ) : null}
                        </td>

                        {/* 2. Tool Type */}
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-700">{tool.tool_type}</span>
                        </td>

                        {/* 3. Stock */}
                        <td className="py-3 px-3 text-center">
                          <span className={`font-black text-xs ${
                            status === 'Out of stock'
                              ? 'text-rose-600'
                              : status === 'Low stock'
                              ? 'text-amber-700'
                              : 'text-slate-900'
                          }`}>
                            {tool.quantity_in_stock}
                          </span>
                        </td>

                        {/* 4. Min. Stock */}
                        <td className="py-3 px-3 text-center font-medium text-slate-600">
                          {minStock}
                        </td>

                        {/* 5. Condition */}
                        <td className="py-3 px-3">
                          {(() => {
                            switch (tool.condition) {
                              case 'New':
                              case 'Good':
                                return (
                                  <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap">
                                    {tool.condition}
                                  </span>
                                );
                              case 'Fair':
                                return (
                                  <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                                    {tool.condition}
                                  </span>
                                );
                              case 'Dull':
                              case 'Needs Resharpening':
                                return (
                                  <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap">
                                    {tool.condition}
                                  </span>
                                );
                              case 'Worn Out':
                              case 'Broken/Retired':
                                return (
                                  <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
                                    {tool.condition}
                                  </span>
                                );
                              default:
                                return (
                                  <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-stone-200 whitespace-nowrap">
                                    {tool.condition || 'Good'}
                                  </span>
                                );
                            }
                          })()}
                        </td>

                        {/* 6. Hours Used */}
                        <td className="py-3 px-3 font-medium text-slate-700">
                          {tool.total_run_hours ?? 0} hrs
                        </td>

                        {/* 7. Unit Cost */}
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          ₹{(tool.unit_cost || 0).toLocaleString('en-IN')}
                        </td>

                        {/* 8. Last Replaced */}
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {tool.last_replaced_date
                            ? formatToDDMMYYYY(tool.last_replaced_date)
                            : (tool.updated_at ? formatToDDMMYYYY(tool.updated_at.split('T')[0]) : '—')}
                        </td>

                        {/* 9. Status */}
                        <td className="py-3 px-3">
                          {status === 'Out of stock' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                              Out of stock
                            </span>
                          ) : status === 'Low stock' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                              Low stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                              In stock
                            </span>
                          )}
                        </td>

                        {/* 10. Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditToolModal(tool)}
                              className="p-1.5 text-stone-600 hover:text-[#115e59] hover:bg-stone-100 rounded-lg transition cursor-pointer"
                              title="Edit Tool"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete tool "${tool.name}"?`)) {
                                  onDeleteTool(tool.id);
                                }
                              }}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Delete Tool"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTools.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-stone-400 bg-white">
                        {cncTools.length === 0
                          ? 'No tools or bits cataloged in inventory. Click "Add New Bit / Cutter" to populate workshop tooling.'
                          : 'No tools match the selected filters or search keyword.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE: Compact Expandable Tool Rows (No horizontal overflow) */}
          <div className="block md:hidden space-y-2.5">
            {filteredTools.map(tool => {
              const status = getToolStatus(tool);
              const isExpanded = expandedToolIds.has(tool.id);
              const minStock = tool.min_stock_level ?? tool.reorder_level ?? 1;

              return (
                <div
                  key={tool.id}
                  className="bg-white rounded-xl border border-stone-200/80 shadow-2xs overflow-hidden transition"
                >
                  {/* Compact Header Row */}
                  <div
                    onClick={() => toggleExpandTool(tool.id)}
                    className="p-3.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-stone-50/60 transition select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="text-slate-400 shrink-0">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-xs truncate">{tool.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium truncate">{tool.tool_type}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Stock</div>
                        <div className={`text-xs font-black ${
                          status === 'Out of stock'
                            ? 'text-rose-600'
                            : status === 'Low stock'
                            ? 'text-amber-700'
                            : 'text-slate-900'
                        }`}>
                          {tool.quantity_in_stock}
                        </div>
                      </div>

                      {status === 'Out of stock' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Out
                        </span>
                      ) : status === 'Low stock' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Low
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          In stock
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditToolModal(tool);
                        }}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-2.5 border-t border-stone-100 bg-slate-50/50 space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tool Specification
                          </span>
                          <span className="font-semibold text-slate-800 break-words">
                            {tool.specification || '—'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Min. Stock Level
                          </span>
                          <span className="font-semibold text-slate-800">
                            {minStock} units
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Condition
                          </span>
                          <div className="mt-0.5">
                            {(() => {
                              switch (tool.condition) {
                                case 'New':
                                case 'Good':
                                  return (
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                      {tool.condition}
                                    </span>
                                  );
                                case 'Fair':
                                  return (
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                      {tool.condition}
                                    </span>
                                  );
                                case 'Dull':
                                case 'Needs Resharpening':
                                  return (
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                                      {tool.condition}
                                    </span>
                                  );
                                case 'Worn Out':
                                case 'Broken/Retired':
                                  return (
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                                      {tool.condition}
                                    </span>
                                  );
                                default:
                                  return (
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-stone-200">
                                      {tool.condition || 'Good'}
                                    </span>
                                  );
                              }
                            })()}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Hours Used
                          </span>
                          <span className="font-semibold text-slate-800">
                            {tool.total_run_hours ?? 0} hrs
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Unit Cost
                          </span>
                          <span className="font-bold text-slate-900">
                            ₹{(tool.unit_cost || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Last Replaced
                          </span>
                          <span className="font-semibold text-slate-800">
                            {tool.last_replaced_date
                              ? formatToDDMMYYYY(tool.last_replaced_date)
                              : (tool.updated_at ? formatToDDMMYYYY(tool.updated_at.split('T')[0]) : '—')}
                          </span>
                        </div>
                      </div>

                      {/* Notes / Supplier */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Notes / Supplier
                        </span>
                        <div className="bg-white p-2.5 rounded-lg border border-stone-200/80 text-slate-700 text-[11px]">
                          {tool.notes || tool.supplier || 'No notes or supplier info logged.'}
                        </div>
                      </div>

                      {/* Expanded Row Action Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete tool "${tool.name}"?`)) {
                              onDeleteTool(tool.id);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-700 font-semibold text-xs flex items-center gap-1 cursor-pointer py-1"
                        >
                          <Trash2 size={13} />
                          <span>Delete Tool</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditToolModal(tool)}
                          className="text-[#115e59] hover:text-[#0f4c4a] font-bold text-xs flex items-center gap-1 cursor-pointer py-1"
                        >
                          <Pencil size={13} />
                          <span>Edit Details</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredTools.length === 0 && (
              <div className="p-8 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
                {cncTools.length === 0
                  ? 'No tools or bits cataloged in inventory. Click "Add New Bit / Cutter" to populate workshop tooling.'
                  : 'No tools match the selected filters or search keyword.'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: MONTHLY REPORT */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                Monthly CNC Workshop Performance & Financial Report
              </h2>
              <p className="text-xs text-stone-500">
                Aggregated revenue, spindle utilization hours, and carving job throughput.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700">Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:bg-white focus:outline-none"
                />
              </div>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={13} />
                <span>Print Report</span>
              </button>
            </div>
          </div>

          {/* Month Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs text-stone-500 font-semibold block">Total Jobs Completed</span>
              <div className="text-3xl font-black text-stone-900 mt-2 font-display">
                {metrics.currentMonthJobsCount}
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">In month {selectedMonth}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs text-stone-500 font-semibold block">Total Workshop Revenue</span>
              <div className="text-3xl font-black text-emerald-700 mt-2 font-display">
                ₹{metrics.monthRevenue.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">Separate CNC workshop financial balance</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-xs text-stone-500 font-semibold block">Total Machine Runtime</span>
              <div className="text-3xl font-black text-cyan-800 mt-2 font-display">
                {metrics.monthMachiningHours} <span className="text-sm font-normal text-stone-500">hours</span>
              </div>
              <span className="text-[11px] text-stone-400 mt-1 block">Spindle operational runtime</span>
            </div>
          </div>

          {/* Jobs Detail for Selected Month */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 font-bold text-xs text-stone-800 flex items-center justify-between">
              <span>Itemized CNC Carving Billing Log for {selectedMonth}</span>
              <span className="text-[11px] text-stone-500 font-normal">
                {metrics.currentMonthJobsCount} entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Article No</th>
                    <th className="p-3">Client & Furniture</th>
                    <th className="p-3">Job Type</th>
                    <th className="p-3">Machine</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {cncJobs
                    .filter(j => {
                      if (!j.job_date) return false;
                      const [y, m] = j.job_date.split('-');
                      const [selY, selM] = selectedMonth.split('-');
                      return y === selY && m === selM;
                    })
                    .map(j => (
                      <tr key={j.id} className="hover:bg-stone-50">
                        <td className="p-3 font-semibold text-stone-700">{formatToDDMMYYYY(j.job_date)}</td>
                        <td className="p-3 font-bold text-cyan-900">{j.article_no || j.job_number}</td>
                        <td className="p-3">
                          <div className="font-semibold text-stone-800">{j.product_name}</div>
                          <div className="text-[10px] text-stone-400">{j.customer_name}</div>
                        </td>
                        <td className="p-3 text-stone-600">{j.job_type}</td>
                        <td className="p-3 text-stone-600">{j.machine_name}</td>
                        <td className="p-3 text-stone-600">{j.run_time_minutes} mins</td>
                        <td className="p-3 text-right font-bold text-stone-900">
                          ₹{Number(j.amount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}

                  {metrics.currentMonthJobsCount === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-stone-400">
                        No CNC machining jobs recorded for {selectedMonth}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CNC JOB RECORD / EDIT */}
      {isJobModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 md:p-5 bg-[#115e59] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-800/80 border border-teal-600/50 flex items-center justify-center text-teal-100 shadow-inner">
                  <Cpu size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm md:text-base leading-tight text-white">
                    {editingJob ? `Edit CNC Job: ${editingJob.article_no || editingJob.job_number}` : 'Record CNC Workshop Job'}
                  </h3>
                  <p className="text-[11px] text-teal-100/70 font-medium">
                    Workshop Floor Entry Log
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJobModalOpen(false)}
                className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-800/50 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitJobForm} className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-4">
                {/* Field 1: Date */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    <span className="md:hidden font-bold">1. </span>Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={jobFormData.job_date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setJobFormData({ ...jobFormData, job_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs"
                  />
                </div>

                {/* Field 2: Article / Job No. */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    <span className="md:hidden font-bold">2. </span>Article / Job No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={jobFormData.article_no || jobFormData.job_number || ''}
                    onChange={(e) => setJobFormData({ ...jobFormData, article_no: e.target.value, job_number: e.target.value })}
                    placeholder="e.g. CNC-2026-084"
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs font-mono"
                  />
                </div>

                {/* Field 3: Job Type */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    <span className="md:hidden font-bold">3. </span>Job Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={jobFormData.job_type}
                      onChange={(e) => setJobFormData({ ...jobFormData, job_type: e.target.value as any })}
                      className="w-full appearance-none px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs pr-8"
                    >
                      {FORM_JOB_TYPES.map(jt => (
                        <option key={jt} value={jt}>{jt}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                {/* Field 4: Machine Assigned */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    <span className="md:hidden font-bold">4. </span>Machine Assigned <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={jobFormData.machine_name}
                      onChange={(e) => setJobFormData({ ...jobFormData, machine_name: e.target.value })}
                      className="w-full appearance-none px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs pr-8"
                    >
                      {FORM_MACHINES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                {/* Field 5: Tool Used */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    <span className="md:hidden font-bold">5. </span>Tool Used <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={jobFormData.tool_name}
                      onChange={(e) => setJobFormData({ ...jobFormData, tool_name: e.target.value })}
                      className="w-full appearance-none px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs pr-8 font-mono"
                    >
                      {FORM_TOOLS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  </div>
                </div>

                {/* Field 6: Wood / Material */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    <span className="md:hidden font-bold">6. </span>Wood / Material
                  </label>
                  <input
                    type="text"
                    value={jobFormData.material || ''}
                    onChange={(e) => setJobFormData({ ...jobFormData, material: e.target.value })}
                    placeholder="e.g. Teak Wood"
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs"
                  />
                </div>

                {/* Field 7: Amount / Billing (₹) */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    <span className="md:hidden font-bold">7. </span>Amount / Billing (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={jobFormData.amount ?? ''}
                      onChange={(e) => setJobFormData({ ...jobFormData, amount: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Field 8: Operator / CNC Manager */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    <span className="md:hidden font-bold">8. </span>Operator / CNC Manager
                  </label>
                  <input
                    type="text"
                    value={jobFormData.operator_name || ''}
                    onChange={(e) => setJobFormData({ ...jobFormData, operator_name: e.target.value })}
                    placeholder="e.g. Lucee Admin"
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs"
                  />
                </div>

                {/* Field 9: Time For Designing */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Time For Designing
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={jobFormData.design_time_value ?? ''}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        const numVal = valStr === '' ? undefined : Number(valStr);
                        const unit = (jobFormData.design_time_unit as CNCDurationUnit) || 'Minutes';
                        setJobFormData({
                          ...jobFormData,
                          design_time_value: numVal,
                          design_time_minutes: numVal !== undefined && !isNaN(numVal) ? convertDurationToMinutes(numVal, unit) : 0,
                        });
                      }}
                      placeholder="e.g. 1.5"
                      className="flex-1 min-w-0 px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs"
                    />
                    <select
                      value={jobFormData.design_time_unit || 'Minutes'}
                      onChange={(e) => {
                        const newUnit = e.target.value as CNCDurationUnit;
                        const numVal = jobFormData.design_time_value !== undefined ? Number(jobFormData.design_time_value) : undefined;
                        setJobFormData({
                          ...jobFormData,
                          design_time_unit: newUnit,
                          design_time_minutes: numVal !== undefined && !isNaN(numVal) ? convertDurationToMinutes(numVal, newUnit) : 0,
                        });
                      }}
                      className="w-28 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs shrink-0 cursor-pointer"
                    >
                      <option value="Minutes">Minutes</option>
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                    </select>
                  </div>
                </div>

                {/* Field 10: Job Completion Time */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Job Completion Time
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={jobFormData.completion_time_value ?? ''}
                      onChange={(e) => {
                        const valStr = e.target.value;
                        const numVal = valStr === '' ? undefined : Number(valStr);
                        const unit = (jobFormData.completion_time_unit as CNCDurationUnit) || 'Minutes';
                        const minutes = numVal !== undefined && !isNaN(numVal) ? convertDurationToMinutes(numVal, unit) : 0;
                        setJobFormData({
                          ...jobFormData,
                          completion_time_value: numVal,
                          completion_time_minutes: minutes,
                          run_time_minutes: minutes,
                        });
                      }}
                      placeholder="e.g. 1.5"
                      className="flex-1 min-w-0 px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs"
                    />
                    <select
                      value={jobFormData.completion_time_unit || 'Minutes'}
                      onChange={(e) => {
                        const newUnit = e.target.value as CNCDurationUnit;
                        const numVal = jobFormData.completion_time_value !== undefined ? Number(jobFormData.completion_time_value) : undefined;
                        const minutes = numVal !== undefined && !isNaN(numVal) ? convertDurationToMinutes(numVal, newUnit) : 0;
                        setJobFormData({
                          ...jobFormData,
                          completion_time_unit: newUnit,
                          completion_time_minutes: minutes,
                          run_time_minutes: minutes,
                        });
                      }}
                      className="w-28 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs shrink-0 cursor-pointer"
                    >
                      <option value="Minutes">Minutes</option>
                      <option value="Hours">Hours</option>
                      <option value="Days">Days</option>
                    </select>
                  </div>
                </div>

                {/* Field 11: Program File Ref (.dxf / .nc) */}
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Program File Ref (.dxf / .nc)
                  </label>
                  <div className="relative">
                    <FileCode size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={jobFormData.design_file || ''}
                      onChange={(e) => setJobFormData({ ...jobFormData, design_file: e.target.value })}
                      placeholder="e.g. mandir_panel_relief_v2.nc"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-mono text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Telemetry status badge */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs self-end h-[42px]">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Ready for Spindle</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500 bg-white/80 px-2 py-0.5 rounded border border-emerald-100">
                    Post-P: Syntec G-Code
                  </span>
                </div>

                {/* Field 12: Job Description */}
                <div className="col-span-1 md:col-span-2">
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Job Description
                  </label>
                  <textarea
                    rows={3}
                    value={jobFormData.notes || ''}
                    onChange={(e) => setJobFormData({ ...jobFormData, notes: e.target.value })}
                    placeholder="3D relief floral mandir jaali carving on 1.25&quot; seasoned Teak wood. Feed rate 2800 mm/min, spindle 18000 RPM with 2mm taper bit."
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-teal-700 focus:border-teal-700 shadow-2xs resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between md:justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save size={14} />
                  <span>Save CNC Entry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TOOL & BIT ENTRY / EDIT (Google Stitch Design) */}
      {isToolModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#115e59] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-700/60 text-teal-100 flex items-center justify-center shrink-0">
                  <Wrench size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white tracking-tight">
                    {editingTool ? `Edit Tool / Cutter Bit` : 'Add New Bit / Cutter'}
                  </h3>
                  <p className="text-[11px] text-teal-100/80 font-medium">
                    {editingTool ? editingTool.name : 'Toolroom Bit & Cutter Specification'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsToolModalOpen(false)}
                className="text-teal-200 hover:text-white hover:bg-teal-700/50 p-1.5 rounded-lg transition text-base font-bold cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitToolForm} className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Responsive Form Grid: Desktop 2-column, Mobile single-column */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Tool Name */}
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Tool Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={toolFormData.name}
                    onChange={(e) => setToolFormData({ ...toolFormData, name: e.target.value })}
                    placeholder="e.g. 6mm 2-Flute Spiral Ballnose"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
                  />
                </div>

                {/* 2. Tool Type */}
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Tool Type <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="tool-types-list"
                    required
                    value={toolFormData.tool_type}
                    onChange={(e) => setToolFormData({ ...toolFormData, tool_type: e.target.value })}
                    placeholder="e.g. Ball Nose, End Mill, V-Bit"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
                  />
                  <datalist id="tool-types-list">
                    {DEFAULT_TOOL_TYPES.map(tt => (
                      <option key={tt} value={tt} />
                    ))}
                  </datalist>
                </div>

                {/* 3. Tool Specification */}
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Tool Specification
                  </label>
                  <input
                    type="text"
                    value={toolFormData.specification}
                    onChange={(e) => setToolFormData({ ...toolFormData, specification: e.target.value })}
                    placeholder="e.g. 6mm Solid Carbide / TiAlN Coated"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
                  />
                </div>

                {/* 4. Stock Qty & 5. Min. Stock Level */}
                <div className="sm:col-span-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Stock Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={toolFormData.quantity_in_stock}
                      onChange={(e) => setToolFormData({ ...toolFormData, quantity_in_stock: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Min. Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={toolFormData.min_stock_level}
                      onChange={(e) => setToolFormData({ ...toolFormData, min_stock_level: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
                    />
                  </div>
                </div>

                {/* 6. Condition */}
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Condition
                  </label>
                  <select
                    value={toolFormData.condition}
                    onChange={(e) => setToolFormData({ ...toolFormData, condition: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
                  >
                    {DEFAULT_TOOL_CONDITIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* 7. Hours Logged & 8. Unit Cost (₹) */}
                <div className="sm:col-span-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Hours Logged
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={toolFormData.total_run_hours}
                        onChange={(e) => setToolFormData({ ...toolFormData, total_run_hours: Number(e.target.value) })}
                        className="w-full pl-3.5 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                        hrs
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Unit Cost (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={toolFormData.unit_cost}
                        onChange={(e) => setToolFormData({ ...toolFormData, unit_cost: Number(e.target.value) })}
                        className="w-full pl-7 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 9. Last Replaced */}
                <div className="sm:col-span-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Last Replaced
                  </label>
                  <input
                    type="date"
                    value={toolFormData.last_replaced_date}
                    onChange={(e) => setToolFormData({ ...toolFormData, last_replaced_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
                  />
                </div>

                {/* 10. Status (ONLY In stock, Low stock, Out of stock) */}
                <div className="sm:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Status <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">
                      Auto-adjusted if stock is zero
                    </span>
                  </div>
                  <select
                    value={toolFormData.status}
                    onChange={(e) => setToolFormData({ ...toolFormData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition"
                  >
                    <option value="In stock">In stock</option>
                    <option value="Low stock">Low stock</option>
                    <option value="Out of stock">Out of stock</option>
                  </select>
                </div>

                {/* 11. Notes / Supplier (Full-width spanning both columns) */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Notes / Supplier
                  </label>
                  <textarea
                    rows={2}
                    value={toolFormData.notes}
                    onChange={(e) => setToolFormData({ ...toolFormData, notes: e.target.value })}
                    placeholder="e.g. Amana Tool solid carbide, supplier: Industrial Tooling Corp. Resharpened 12-Aug."
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#115e59] transition resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsToolModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-stone-50 text-slate-700 font-bold border border-stone-200 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#115e59] hover:bg-[#0f4c4a] text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Check size={14} />
                  <span>Save Tool</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workshop Cost Structure Configuration Modal (Admin Only) */}
      {isCostModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders size={18} className="text-[#115e59]" />
                  Workshop Cost Structure (Admin Only)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Set fixed monthly operational overheads. Break-even & targets calculate automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCostModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCostConfig} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-stone-600 font-bold mb-1">Loan EMI (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempCostConfig.loanEmi}
                    onChange={(e) => setTempCostConfig({ ...tempCostConfig, loanEmi: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-bold mb-1">Worker 1 Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempCostConfig.worker1Salary}
                    onChange={(e) => setTempCostConfig({ ...tempCostConfig, worker1Salary: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-bold mb-1">Worker 2 Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempCostConfig.worker2Salary}
                    onChange={(e) => setTempCostConfig({ ...tempCostConfig, worker2Salary: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-bold mb-1">Tools & Consumables (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempCostConfig.toolsConsumables}
                    onChange={(e) => setTempCostConfig({ ...tempCostConfig, toolsConsumables: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-bold mb-1">Electricity & Misc (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={tempCostConfig.electricityMisc}
                    onChange={(e) => setTempCostConfig({ ...tempCostConfig, electricityMisc: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-bold mb-1">Working Days / Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={tempCostConfig.workingDays}
                    onChange={(e) => setTempCostConfig({ ...tempCostConfig, workingDays: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#115e59]/30"
                    required
                  />
                </div>
              </div>

              {/* Live Dynamic Calculation Preview */}
              <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-200/60 space-y-1.5">
                <div className="text-[11px] font-bold text-teal-900 uppercase tracking-wider">Dynamic Calculation Preview:</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-teal-800">Monthly Cost Target:</span>
                  <span className="font-black text-slate-900">
                    ₹{(tempCostConfig.loanEmi + tempCostConfig.worker1Salary + tempCostConfig.worker2Salary + tempCostConfig.toolsConsumables + tempCostConfig.electricityMisc).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-teal-800">Daily Break-even:</span>
                  <span className="font-bold text-slate-900">
                    ₹{Math.round((tempCostConfig.loanEmi + tempCostConfig.worker1Salary + tempCostConfig.worker2Salary + tempCostConfig.toolsConsumables + tempCostConfig.electricityMisc) / (tempCostConfig.workingDays || 1)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-teal-800">Recommended Daily (+20%):</span>
                  <span className="font-black text-emerald-700">
                    ₹{Math.round(((tempCostConfig.loanEmi + tempCostConfig.worker1Salary + tempCostConfig.worker2Salary + tempCostConfig.toolsConsumables + tempCostConfig.electricityMisc) / (tempCostConfig.workingDays || 1)) * 1.20).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCostModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#115e59] hover:bg-[#0f4c4a] text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Save Parameters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
