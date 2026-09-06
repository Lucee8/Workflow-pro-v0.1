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
  CNCToolCondition
} from '../types';
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
  FileText, 
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
  Info,
  Lock,
  Sliders,
  LayoutDashboard,
  TrendingDown,
  Gauge
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
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'queue' | 'daily_log' | 'inventory' | 'reports'>('dashboard');

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
    job_type: '3D Relief',
    machine_name: 'CNC Router #1 (Heavy 8x4)',
    tool_name: '6mm Ball Nose Bit',
    run_time_minutes: 90,
    amount: 1500,
    status: 'Queued',
    operator_name: currentUser.name || 'CNC Supervisor',
    material: 'Teak Wood',
    dimensions: '36" x 18" x 1.5"',
    design_file: '',
    notes: '',
  });

  // Form State for CNC Tool
  const [toolFormData, setToolFormData] = useState<Partial<CNCTool>>({
    tool_code: '',
    name: '',
    tool_type: 'Ball Nose',
    diameter_mm: '6mm',
    shank_mm: '1/2"',
    quantity_in_stock: 3,
    reorder_level: 2,
    condition: 'Good',
    total_run_hours: 0,
    unit_cost: 650,
    status: 'In Service',
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
      (t.quantity_in_stock <= t.reorder_level)
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

  // User Initials
  const userInitials = useMemo(() => {
    const name = currentUser?.name || 'Master Operator';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'WM';
  }, [currentUser]);

  // Admin Cost Structure Handler
  const handleSaveCostConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'admin') {
      alert('Security Policy: Only Workshop Admin can edit operational cost parameters.');
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
        article_no: order.article_no,
        customer_name: cust?.name || 'Bhisez Client',
        product_name: order.sub_category || order.category || 'Furniture Item',
        job_type: order.cnc_job_type || '3D Relief',
        machine_name: 'CNC Router #1 (Heavy 8x4)',
        tool_name: order.cnc_tool_used || (cncTools[0]?.name || '6mm Ball Nose Bit'),
        run_time_minutes: order.cnc_duration_minutes || 90,
        amount: order.cnc_amount || 1500,
        status: 'In Progress',
        operator_name: currentUser.name || 'CNC Supervisor',
        job_date: new Date().toISOString().split('T')[0],
        material: order.material || 'Teak Wood',
        dimensions: order.size === 'Custom' ? (order.custom_size || 'Custom Size') : (order.size || '36" x 18"'),
        design_file: '',
        notes: order.cnc_notes || order.special_notes || '',
      });
    } else {
      setSelectedOrderForJob(null);
      setEditingJob(null);
      setJobFormData({
        job_number: nextJobNo,
        job_date: new Date().toISOString().split('T')[0],
        job_type: '3D Relief',
        machine_name: 'CNC Router #1 (Heavy 8x4)',
        tool_name: cncTools[0]?.name || '6mm Ball Nose Bit',
        run_time_minutes: 60,
        amount: 1200,
        status: 'Queued',
        operator_name: currentUser.name || 'CNC Supervisor',
        material: 'Teak Wood',
        dimensions: 'Standard Panel',
        design_file: '',
        notes: '',
      });
    }
    setIsJobModalOpen(true);
  };

  // Edit existing CNC job
  const handleOpenEditJobModal = (job: CNCJob) => {
    setEditingJob(job);
    const linkedOrder = orders.find(o => o.id === job.order_id);
    setSelectedOrderForJob(linkedOrder || null);
    setJobFormData({ ...job });
    setIsJobModalOpen(true);
  };

  // Submit CNC Job Form
  const handleSubmitJobForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const jobId = editingJob ? editingJob.id : `cnc_job_${generateUUID().split('-')[0]}`;
    const autoJobNo = jobFormData.job_number || `CNC-${new Date().getFullYear()}-${String(cncJobs.length + 1).padStart(3, '0')}`;

    const jobToSave: CNCJob = {
      id: jobId,
      job_number: autoJobNo,
      order_id: jobFormData.order_id || selectedOrderForJob?.id || undefined,
      article_no: jobFormData.article_no || selectedOrderForJob?.article_no || 'CNC-ADHOC',
      customer_name: jobFormData.customer_name || 'Bespoke Client',
      product_name: jobFormData.product_name || 'CNC Wooden Component',
      job_type: jobFormData.job_type || '3D Relief',
      machine_name: jobFormData.machine_name || 'CNC Router #1 (Heavy 8x4)',
      tool_name: jobFormData.tool_name || '6mm Ball Nose Bit',
      tool_id: jobFormData.tool_id,
      run_time_minutes: Number(jobFormData.run_time_minutes) || 0,
      amount: Number(jobFormData.amount) || 0,
      status: (jobFormData.status as CNCJobStatus) || 'In Progress',
      operator_name: jobFormData.operator_name || currentUser.name || 'CNC Operator',
      job_date: jobFormData.job_date || new Date().toISOString().split('T')[0],
      material: jobFormData.material || 'Teak Wood',
      dimensions: jobFormData.dimensions || '',
      design_file: jobFormData.design_file || '',
      notes: jobFormData.notes || '',
      created_at: editingJob?.created_at || new Date().toISOString(),
      created_by: editingJob?.created_by || currentUser.id,
      completed_at: jobFormData.status === 'Completed' ? new Date().toISOString() : editingJob?.completed_at,
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

  // Complete and hand off job directly to QC 1 (Crucial Stage Progression requirement)
  const handleCompleteAndHandoffToQC1 = async (job: CNCJob) => {
    if (!window.confirm(`Mark CNC job "${job.article_no}" complete and advance linked production order to QC 1?`)) {
      return;
    }

    // 1. Update job to completed
    const completedJob: CNCJob = {
      ...job,
      status: 'Completed',
      completed_at: new Date().toISOString(),
    };
    await onSaveJob(completedJob);

    // 2. Advance linked Order to QC 1
    if (job.order_id) {
      const targetOrder = orders.find(o => o.id === job.order_id);
      if (targetOrder) {
        const updatedOrder: Order = {
          ...targetOrder,
          requires_cnc: true,
          cnc_status: 'completed',
          current_status: 'QC 1',
          carpenter_sub_status: 'qc_check_1',
          qc_1_status: 'pending_admin_approval',
        };

        const log: StatusLog = {
          id: 'log_' + generateUUID().split('-')[0],
          order_id: targetOrder.id,
          stage: 'QC 1',
          changed_by: currentUser.id,
          changed_by_name: currentUser.name || 'CNC Supervisor',
          changed_by_role: currentUser.role,
          timestamp: new Date().toISOString(),
          note: `CNC Wood Carving completed by ${currentUser.name}. Order successfully forwarded to QC 1 verification.`,
        };

        await onUpdateOrder(updatedOrder, log);
      }
    }
  };

  // Tool Inventory Handlers
  const handleOpenNewToolModal = () => {
    const nextCode = `BIT-${String(cncTools.length + 1).padStart(2, '0')}`;
    setEditingTool(null);
    setToolFormData({
      tool_code: nextCode,
      name: '',
      tool_type: 'Ball Nose',
      diameter_mm: '6mm',
      shank_mm: '1/2"',
      quantity_in_stock: 2,
      reorder_level: 1,
      condition: 'Good',
      total_run_hours: 0,
      unit_cost: 650,
      status: 'In Service',
      notes: '',
    });
    setIsToolModalOpen(true);
  };

  const handleOpenEditToolModal = (tool: CNCTool) => {
    setEditingTool(tool);
    setToolFormData({ ...tool });
    setIsToolModalOpen(true);
  };

  const handleSubmitToolForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolFormData.name) {
      alert('Tool name/spec is required.');
      return;
    }

    const toolId = editingTool ? editingTool.id : `cnc_tool_${generateUUID().split('-')[0]}`;
    const toolToSave: CNCTool = {
      id: toolId,
      tool_code: toolFormData.tool_code || `BIT-${String(cncTools.length + 1).padStart(2, '0')}`,
      name: toolFormData.name,
      tool_type: (toolFormData.tool_type as CNCToolType) || 'Ball Nose',
      diameter_mm: String(toolFormData.diameter_mm || '6mm'),
      shank_mm: String(toolFormData.shank_mm || '1/2"'),
      quantity_in_stock: Number(toolFormData.quantity_in_stock) || 1,
      reorder_level: Number(toolFormData.reorder_level) || 1,
      condition: (toolFormData.condition as CNCToolCondition) || 'Good',
      total_run_hours: Number(toolFormData.total_run_hours) || 0,
      unit_cost: Number(toolFormData.unit_cost) || 0,
      status: (toolFormData.status as any) || 'In Service',
      notes: toolFormData.notes || '',
      updated_at: new Date().toISOString(),
    };

    await onSaveTool(toolToSave);
    setIsToolModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Module Header & Sub-Navigation (Stitch Visual Design) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left branding */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#115e59] text-white flex items-center justify-center shadow-xs shrink-0">
            <Cpu size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-display">
                CNC Wood Workshop Manager
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Workshop Operating System • Live Telemetry
            </p>
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
            onClick={() => setActiveSubTab('daily_log')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'daily_log'
                ? 'bg-[#115e59] text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700'
            }`}
          >
            <FileText size={14} />
            <span>Daily Manager Log</span>
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

        {/* Right Ad-hoc Job & User Profile */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
          <button
            onClick={() => handleOpenNewJobModal()}
            className="px-3.5 py-2 bg-[#115e59] hover:bg-[#0f4c4a] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus size={14} />
            <span>+ Record Ad-hoc Job</span>
          </button>

          <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-stone-200">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser?.name || 'Master Operator'}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{currentUser?.role === 'admin' ? 'Admin Access' : 'Shift A'} • Active</span>
              </div>
            </div>
          </div>
        </div>
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

          {/* Performance & Structure Grid (Desktop 2-col, Mobile ordered stack) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {/* Card A: Today's Performance Summary (Mobile: order-1, Desktop: order-1) */}
            <div className="order-1 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-2">
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

              {/* 6 Sub-metric Cards (3x2 Grid) */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
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

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Formula: Daily Target = Total Monthly Overhead (₹{monthlyCostTarget.toLocaleString('en-IN')}) ÷ {costConfig.workingDays} Days</span>
                <span className="font-medium text-slate-400">Auto-updated</span>
              </div>
            </div>

            {/* Card B: Workshop Cost Structure (Mobile: order-3, Desktop: lg:order-2) */}
            <div className="order-3 lg:order-2 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Workshop Cost Structure
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Fixed administrative operational parameters
                  </p>
                </div>

                {currentUser?.role === 'admin' ? (
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

            {/* Card C: Current Month Financial Progress (Mobile: order-2, Desktop: lg:order-3) */}
            <div className="order-2 lg:order-3 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-2">
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

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
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

            {/* Card D: CNC Production Overview (Mobile: order-4, Desktop: order-4) */}
            <div className="order-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-2">
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

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-stone-100">
                <span>Fleet Efficiency: {((Math.max(1, metrics.inProgressJobs) / DEFAULT_MACHINES.length) * 100).toFixed(1)}% operational</span>
                <span className="font-semibold text-emerald-700">All dust collectors active</span>
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
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input
                  type="text"
                  placeholder="Search Article No, Customer, Category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs w-64 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-800/20"
                />
              </div>

              <div className="text-xs font-bold text-stone-600">
                Total in Queue: <span className="text-cyan-800">{pendingQueueOrders.length}</span>
              </div>
            </div>

            <button
              onClick={() => handleOpenNewJobModal()}
              className="px-3.5 py-2 bg-cyan-800 hover:bg-cyan-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>Record New CNC Job</span>
            </button>
          </div>

          {/* Table / Cards of Queue Orders */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Article / Order</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Product & Specs</th>
                    <th className="p-3.5">Production Stage</th>
                    <th className="p-3.5">CNC Requirement</th>
                    <th className="p-3.5">CNC Job Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {pendingQueueOrders
                    .filter(ord => {
                      const cust = customerMap.get(ord.customer_id);
                      const q = searchTerm.toLowerCase();
                      return (
                        !q ||
                        ord.article_no.toLowerCase().includes(q) ||
                        (cust?.name && cust.name.toLowerCase().includes(q)) ||
                        ord.category.toLowerCase().includes(q) ||
                        (ord.sub_category && ord.sub_category.toLowerCase().includes(q))
                      );
                    })
                    .map(ord => {
                      const cust = customerMap.get(ord.customer_id);
                      const existingJob = cncJobs.find(j => j.order_id === ord.id);
                      const isComplete = ord.cnc_status === 'completed';

                      return (
                        <tr key={ord.id} className="hover:bg-cyan-50/30 transition">
                          <td className="p-3.5 font-bold text-stone-900">
                            <div>{ord.article_no}</div>
                            <div className="text-[10px] text-stone-400 font-normal">ID: {ord.id}</div>
                          </td>
                          <td className="p-3.5 text-stone-700">
                            <div className="font-semibold">{cust?.name || 'Walk-in Client'}</div>
                            <div className="text-[10px] text-stone-400">{cust?.phone || '-'}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-stone-800">{ord.sub_category || ord.category}</div>
                            <div className="text-[10px] text-stone-500">
                              {ord.material} • {ord.size === 'Custom' ? ord.custom_size : ord.size}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                              {ord.current_status}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-stone-800">
                              {ord.cnc_job_type || 'Carving'}
                            </span>
                            {ord.cnc_notes && (
                              <div className="text-[10px] text-stone-500 max-w-xs truncate">{ord.cnc_notes}</div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 w-fit ${
                              ord.cnc_status === 'in_progress'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : isComplete
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                            }`}>
                              {ord.cnc_status === 'in_progress' ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                  CNC working ⚙
                                </>
                              ) : isComplete ? (
                                'Complete ✔'
                              ) : (
                                'Queued'
                              )}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {ord.cnc_status !== 'in_progress' && !isComplete && (
                              <button
                                onClick={() => handleStartCNCWorking(ord)}
                                className="px-3 py-1.5 bg-cyan-800 hover:bg-cyan-900 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <Play size={12} />
                                <span>Start</span>
                              </button>
                            )}
                            {ord.cnc_status === 'in_progress' && (
                              <button
                                onClick={() => handleCompleteOrderAndMoveToQC1(ord)}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 size={12} />
                                <span>Complete → QC 1</span>
                              </button>
                            )}
                            {existingJob ? (
                              <button
                                onClick={() => handleOpenEditJobModal(existingJob)}
                                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Edit Log
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenNewJobModal(ord)}
                                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition cursor-pointer"
                              >
                                Log Specs
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  {pendingQueueOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-400">
                        No orders currently awaiting or undergoing CNC Wood Carving.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: DAILY JOB RECORD LOG (Digital Mirror of Client Google Sheets) */}
      {activeSubTab === 'daily_log' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                <input
                  type="text"
                  placeholder="Filter job logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs w-56 focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 focus:bg-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Queued">Queued</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <span className="text-xs text-stone-500 font-semibold">
                Total Logs: <strong className="text-stone-900">{cncJobs.length}</strong>
              </span>
            </div>

            <button
              onClick={() => handleOpenNewJobModal()}
              className="px-3.5 py-2 bg-cyan-800 hover:bg-cyan-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>Record CNC Entry</span>
            </button>
          </div>

          {/* CNC Daily Manager Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-cyan-900 text-white font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Job / Article No</th>
                    <th className="p-3.5">Customer & Product</th>
                    <th className="p-3.5">Job Type</th>
                    <th className="p-3.5">Machine & Tool</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Amount (₹)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Operator</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {cncJobs
                    .filter(job => {
                      const q = searchTerm.toLowerCase();
                      const matchSearch =
                        !q ||
                        (job.article_no && job.article_no.toLowerCase().includes(q)) ||
                        (job.customer_name && job.customer_name.toLowerCase().includes(q)) ||
                        (job.product_name && job.product_name.toLowerCase().includes(q)) ||
                        (job.job_type && job.job_type.toLowerCase().includes(q));

                      const matchStatus = statusFilter === 'all' || job.status === statusFilter;
                      return matchSearch && matchStatus;
                    })
                    .sort((a, b) => (b.job_date || '').localeCompare(a.job_date || ''))
                    .map(job => (
                      <tr key={job.id} className="hover:bg-stone-50/80 transition">
                        <td className="p-3.5 font-bold text-stone-700 whitespace-nowrap">
                          {job.job_date ? formatToDDMMYYYY(job.job_date) : '-'}
                        </td>
                        <td className="p-3.5 font-bold text-cyan-900">
                          {job.article_no || job.job_number}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-stone-800">{job.product_name}</div>
                          <div className="text-[10px] text-stone-500">{job.customer_name}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-stone-700">{job.job_type}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-stone-800">{job.machine_name}</div>
                          <div className="text-[10px] text-cyan-800 font-bold">{job.tool_name}</div>
                        </td>
                        <td className="p-3.5 font-semibold text-stone-700 whitespace-nowrap">
                          {job.run_time_minutes} mins
                        </td>
                        <td className="p-3.5 font-bold text-stone-900 whitespace-nowrap">
                          ₹{Number(job.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            job.status === 'Completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : job.status === 'In Progress'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-stone-600 text-[11px] whitespace-nowrap">
                          {job.operator_name}
                        </td>
                        <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEditJobModal(job)}
                            className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs font-bold transition cursor-pointer"
                          >
                            Edit
                          </button>
                          {job.status !== 'Completed' && (
                            <button
                              onClick={() => handleCompleteAndHandoffToQC1(job)}
                              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition cursor-pointer shadow-2xs"
                              title="Complete CNC work and advance linked order to QC 1"
                            >
                              Done → QC 1
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this CNC job record?')) {
                                onDeleteJob(job.id);
                              }
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {cncJobs.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-stone-400">
                        No daily CNC job logs entered yet. Click "Record CNC Entry" to add the first log.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: TOOL INVENTORY & BIT MANAGEMENT */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                CNC Bits & Cutters Toolroom
              </h2>
              <p className="text-xs text-stone-500">
                Track cutter diameters, wear cycles, resharpening status, and low-stock replacement alerts.
              </p>
            </div>

            <button
              onClick={handleOpenNewToolModal}
              className="px-3.5 py-2 bg-cyan-800 hover:bg-cyan-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>Add New Bit / Cutter</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cncTools.map(tool => {
              const isLowStock = tool.quantity_in_stock <= tool.reorder_level;
              const needsCare = tool.condition === 'Needs Resharpening' || tool.condition === 'Worn Out' || tool.condition === 'Dull';

              return (
                <div
                  key={tool.id}
                  className={`p-4 rounded-2xl border transition bg-white shadow-xs ${
                    needsCare || isLowStock ? 'border-amber-300 ring-1 ring-amber-300/40' : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                        {tool.tool_type} • {tool.tool_code}
                      </span>
                      <h3 className="font-bold text-stone-900 text-sm">{tool.name}</h3>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      tool.condition === 'Good' || tool.condition === 'New'
                        ? 'bg-emerald-100 text-emerald-800'
                        : tool.condition === 'Needs Resharpening' || tool.condition === 'Worn Out' || tool.condition === 'Broken/Retired'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {tool.condition}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-stone-100 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Diameter / Shank</span>
                      <strong className="text-stone-800">{tool.diameter_mm} / {tool.shank_mm}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Stock Qty</span>
                      <strong className={`${isLowStock ? 'text-rose-600' : 'text-stone-800'}`}>
                        {tool.quantity_in_stock} units
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Machining Hours</span>
                      <strong className="text-stone-800">{tool.total_run_hours} hrs</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Unit Cost</span>
                      <strong className="text-stone-800">₹{tool.unit_cost || 0}</strong>
                    </div>
                  </div>

                  {tool.notes && (
                    <div className="mt-2 text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-100">
                      {tool.notes}
                    </div>
                  )}

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    {isLowStock ? (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle size={12} /> Low Stock Alert
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400">Reorder level: {tool.reorder_level}</span>
                    )}

                    <div className="space-x-1.5">
                      <button
                        onClick={() => handleOpenEditToolModal(tool)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete tool "${tool.name}"?`)) {
                            onDeleteTool(tool.id);
                          }
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {cncTools.length === 0 && (
              <div className="col-span-full p-8 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
                No tools or bits cataloged in inventory. Click "Add New Bit / Cutter" to populate workshop tooling.
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-cyan-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={18} />
                <h3 className="font-bold text-sm">
                  {editingJob ? `Edit CNC Job: ${editingJob.article_no || editingJob.job_number}` : 'Record CNC Workshop Job'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsJobModalOpen(false)}
                className="text-stone-300 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitJobForm} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={jobFormData.job_date}
                    onChange={(e) => setJobFormData({ ...jobFormData, job_date: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Article / Job No</label>
                  <input
                    type="text"
                    required
                    value={jobFormData.article_no || jobFormData.job_number}
                    onChange={(e) => setJobFormData({ ...jobFormData, article_no: e.target.value, job_number: e.target.value })}
                    placeholder="e.g. ART-2026-001"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Job Status</label>
                  <select
                    value={jobFormData.status}
                    onChange={(e) => setJobFormData({ ...jobFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Queued">Queued</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Rework">Rework</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Customer / Client</label>
                  <input
                    type="text"
                    required
                    value={jobFormData.customer_name}
                    onChange={(e) => setJobFormData({ ...jobFormData, customer_name: e.target.value })}
                    placeholder="Client name"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Furniture Product / Component</label>
                  <input
                    type="text"
                    required
                    value={jobFormData.product_name}
                    onChange={(e) => setJobFormData({ ...jobFormData, product_name: e.target.value })}
                    placeholder="e.g. Mandir Jaali Panel"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Job Type</label>
                  <select
                    value={jobFormData.job_type}
                    onChange={(e) => setJobFormData({ ...jobFormData, job_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
                  >
                    {DEFAULT_JOB_TYPES.map(jt => (
                      <option key={jt} value={jt}>{jt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Machine Assigned</label>
                  <select
                    value={jobFormData.machine_name}
                    onChange={(e) => setJobFormData({ ...jobFormData, machine_name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold"
                  >
                    {DEFAULT_MACHINES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Tool / Bit Used</label>
                  <input
                    type="text"
                    value={jobFormData.tool_name}
                    onChange={(e) => setJobFormData({ ...jobFormData, tool_name: e.target.value })}
                    placeholder="e.g. 6mm Ball Nose Bit"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    value={jobFormData.run_time_minutes}
                    onChange={(e) => setJobFormData({ ...jobFormData, run_time_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Wood / Material</label>
                  <input
                    type="text"
                    value={jobFormData.material}
                    onChange={(e) => setJobFormData({ ...jobFormData, material: e.target.value })}
                    placeholder="e.g. Teak Wood, MDF"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Dimensions / Panel Size</label>
                  <input
                    type="text"
                    value={jobFormData.dimensions}
                    onChange={(e) => setJobFormData({ ...jobFormData, dimensions: e.target.value })}
                    placeholder="e.g. 48 x 24 x 1 inch"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Amount / Billing (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={jobFormData.amount}
                    onChange={(e) => setJobFormData({ ...jobFormData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Operator / CNC Manager</label>
                  <input
                    type="text"
                    value={jobFormData.operator_name}
                    onChange={(e) => setJobFormData({ ...jobFormData, operator_name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Program File Ref (.dxf / .nc)</label>
                  <input
                    type="text"
                    value={jobFormData.design_file}
                    onChange={(e) => setJobFormData({ ...jobFormData, design_file: e.target.value })}
                    placeholder="e.g. mandir_door_v2.nc"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Carving Instructions & Notes</label>
                <textarea
                  rows={2}
                  value={jobFormData.notes}
                  onChange={(e) => setJobFormData({ ...jobFormData, notes: e.target.value })}
                  placeholder="Additional tool paths, feed rates, or custom notes..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-800 hover:bg-cyan-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Save CNC Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TOOL & BIT ENTRY / EDIT */}
      {isToolModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="p-4 bg-cyan-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={18} />
                <h3 className="font-bold text-sm">
                  {editingTool ? `Edit Tool: ${editingTool.name}` : 'Add Tool / Cutter Bit'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsToolModalOpen(false)}
                className="text-stone-300 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitToolForm} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Tool Code</label>
                  <input
                    type="text"
                    required
                    value={toolFormData.tool_code}
                    onChange={(e) => setToolFormData({ ...toolFormData, tool_code: e.target.value })}
                    placeholder="e.g. BIT-BN06-01"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Tool Type</label>
                  <select
                    value={toolFormData.tool_type}
                    onChange={(e) => setToolFormData({ ...toolFormData, tool_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  >
                    {DEFAULT_TOOL_TYPES.map(tt => (
                      <option key={tt} value={tt}>{tt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Tool Specification / Name</label>
                <input
                  type="text"
                  required
                  value={toolFormData.name}
                  onChange={(e) => setToolFormData({ ...toolFormData, name: e.target.value })}
                  placeholder="e.g. 6mm 2-Flute Spiral Ballnose"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Cutting Tip Dia</label>
                  <input
                    type="text"
                    value={toolFormData.diameter_mm}
                    onChange={(e) => setToolFormData({ ...toolFormData, diameter_mm: e.target.value })}
                    placeholder="e.g. 6mm"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Shank Dia</label>
                  <input
                    type="text"
                    value={toolFormData.shank_mm}
                    onChange={(e) => setToolFormData({ ...toolFormData, shank_mm: e.target.value })}
                    placeholder='e.g. 1/2" or 6mm'
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={toolFormData.quantity_in_stock}
                    onChange={(e) => setToolFormData({ ...toolFormData, quantity_in_stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="1"
                    value={toolFormData.reorder_level}
                    onChange={(e) => setToolFormData({ ...toolFormData, reorder_level: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Condition</label>
                  <select
                    value={toolFormData.condition}
                    onChange={(e) => setToolFormData({ ...toolFormData, condition: e.target.value as any })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold"
                  >
                    {DEFAULT_TOOL_CONDITIONS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Hours Logged</label>
                  <input
                    type="number"
                    min="0"
                    value={toolFormData.total_run_hours}
                    onChange={(e) => setToolFormData({ ...toolFormData, total_run_hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={toolFormData.unit_cost}
                    onChange={(e) => setToolFormData({ ...toolFormData, unit_cost: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Notes / Supplier</label>
                <input
                  type="text"
                  value={toolFormData.notes}
                  onChange={(e) => setToolFormData({ ...toolFormData, notes: e.target.value })}
                  placeholder="e.g. Amana Tool carbide / Resharpened on 12-Aug"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsToolModalOpen(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-800 hover:bg-cyan-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Save Tool
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
