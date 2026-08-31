/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Order,
  Customer,
  User,
  StatusLog,
  OrderStage,
  WoodSchedule,
  WoodPart,
  normalizeStage,
  QCFailureInfo,
  OrderPriority,
} from '../types';
import { generateUUID } from '../db/store';
import { compareOrdersByArticleSerialDesc, compressImage } from '../utils';
import {
  Clock,
  Eye,
  AlertCircle,
  CheckCircle,
  Upload,
  ArrowLeft,
  Image as ImageIcon,
  Camera,
  Trash2,
  Plus,
  Hammer,
  ExternalLink,
  UploadCloud,
  Video,
  X,
  CheckSquare,
  ShieldCheck,
  CheckCircle2,
  Lock,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Layers,
  User as UserIcon,
  Check,
  DollarSign,
  FileText,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  TreePine,
} from 'lucide-react';

function getQCFailureInfo(ord: Order | null): QCFailureInfo | null {
  if (!ord) return null;

  if (ord.last_qc_failure && !ord.last_qc_failure.resolved) {
    return ord.last_qc_failure;
  }

  if (ord.qc_1_status === 'failed' && ord.qc_1_fail_notes) {
    return {
      stage: 'QC 1',
      failed_by: ord.qc_1_failed_by || 'Admin / Inspector',
      failed_at: ord.qc_1_failed_at || ord.updated_at || '',
      notes: ord.qc_1_fail_notes,
      acknowledged: false,
      resolved: false,
    };
  }

  if (ord.qc_2_status === 'failed' && ord.qc_2_fail_notes) {
    return {
      stage: 'QC 2',
      failed_by: ord.qc_2_failed_by || 'Admin / Inspector',
      failed_at: ord.qc_2_failed_at || ord.updated_at || '',
      notes: ord.qc_2_fail_notes,
      acknowledged: false,
      resolved: false,
    };
  }

  return null;
}

function getDefaultWoodSchedule(order: Partial<Order>): WoodSchedule {
  const sub = (order.sub_category || '').toLowerCase();
  const cat = (order.category || '').toLowerCase();

  let parts: WoodPart[] = [];
  let modelName = order.article_no ? order.article_no.split('/').pop() || 'BED-01' : 'BED-01';
  let sizeOfProduct = order.size === 'Custom' ? (order.custom_size || '5FT X 6.5FT') : (order.size || '5FT X 6.5FT');
  let catalogueName = order.category ? `${order.category} Catalogue` : 'Beds Catalogue';

  const designRefImg = order.images?.find((img) => img.type === 'Design Reference')?.url;
  let defaultImage = designRefImg || 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=650&auto=format&fit=crop';
  let sqft = 32.5;

  if (sub.includes('bed') || cat.includes('bed')) {
    catalogueName = 'Beds Catalogue';
    modelName = 'BED-01';
    sizeOfProduct = '5FT X 6.5FT';
    sqft = 32.5;
    if (!designRefImg) {
      defaultImage = 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=650&auto=format&fit=crop';
    }
  } else if (sub.includes('wardrobe') || sub.includes('cabinet') || sub.includes('almirah') || cat.includes('kitchen')) {
    catalogueName = 'Wardrobes & Cabinets';
    modelName = 'CAB-02';
    sizeOfProduct = '4FT X 7FT';
    sqft = 28;
    if (!designRefImg) {
      defaultImage = 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=650&auto=format&fit=crop';
    }
  } else if (sub.includes('table') || sub.includes('desk') || cat.includes('living')) {
    catalogueName = 'Tables Catalogue';
    modelName = 'TAB-15';
    sizeOfProduct = '5FT X 2.5FT';
    sqft = 12.5;
    if (!designRefImg) {
      defaultImage = 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=650&auto=format&fit=crop';
    }
  } else if (sub.includes('sofa') || sub.includes('chair') || sub.includes('couch')) {
    catalogueName = 'Sofa Collections';
    modelName = 'SOF-03';
    sizeOfProduct = '6.5FT X 3FT';
    sqft = 19.5;
    if (!designRefImg) {
      defaultImage = 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=650&auto=format&fit=crop';
    }
  } else {
    catalogueName = 'General Timber Catalogue';
    modelName = 'MODEL-X';
    sizeOfProduct = 'Custom Size';
    sqft = 12.0;
  }

  return {
    catalogue_name: catalogueName,
    model_name: modelName,
    size_of_product: sizeOfProduct,
    sqft: sqft,
    image_link: defaultImage,
    parts,
  };
}

interface WorkerDashboardProps {
  currentUser: User;
  users?: User[];
  orders: Order[];
  customers: Customer[];
  statusLogs: StatusLog[];
  onUpdateOrder: (updatedOrder: Order, newLog?: StatusLog) => void;
  onDeleteOrder?: (orderId: string) => void;
  onAddOrder?: (newOrder: Order, newCust?: Customer) => void;
}

export default function WorkerDashboard({
  currentUser,
  users = [],
  orders,
  customers,
  statusLogs,
  onUpdateOrder,
  onDeleteOrder,
  onAddOrder,
}: WorkerDashboardProps) {
  // Determine if viewing as admin/supervisor or specific worker
  const isUserCarpenter = currentUser.role === 'carpenter';
  const isUserPolish = currentUser.role === 'polish_person';
  const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'manager';

  // Worker switcher for Admin/Manager view
  const carpentersList = useMemo(() => users.filter((u) => u.role === 'carpenter'), [users]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(() => {
    if (isUserCarpenter || isUserPolish) return currentUser.id;
    if (carpentersList.length > 0) return carpentersList[0].id;
    return 'all';
  });

  const activeWorkerUser = useMemo(() => {
    if (selectedWorkerId === 'all') return null;
    return users.find((u) => u.id === selectedWorkerId) || (currentUser.id === selectedWorkerId ? currentUser : null);
  }, [selectedWorkerId, users, currentUser]);

  const isCarpenter = activeWorkerUser ? activeWorkerUser.role === 'carpenter' : isUserCarpenter || isAdminOrManager;

  // Filter criteria helper for orders
  const matchesWorker = (ord: Order) => {
    if (selectedWorkerId === 'all') {
      return true;
    }
    const targetWorker = activeWorkerUser || currentUser;
    const workerId = targetWorker.id;
    const workerName = (targetWorker.name || '').trim().toLowerCase();

    if (isCarpenter) {
      if (!ord.carpenter_id) return false;
      const cId = ord.carpenter_id.trim();
      return cId === workerId || (workerName && cId.toLowerCase() === workerName);
    } else {
      if (!ord.polish_person_id) return false;
      const pId = ord.polish_person_id.trim();
      const isAssigned = pId === workerId || (workerName && pId.toLowerCase() === workerName);
      const stage = normalizeStage(ord.current_status);
      return isAssigned && ['Polish', 'QC 2', 'Ready to Dispatch', 'Dispatched'].includes(stage);
    }
  };

  const isOrderInMyStage = (ordStage: OrderStage) => {
    const normalized = normalizeStage(ordStage);
    if (isCarpenter) {
      return (
        normalized === 'Wood Procurement' ||
        normalized === 'Making Started' ||
        normalized === 'Carpentry' ||
        normalized === 'Pending' ||
        normalized === 'Designing' ||
        normalized === 'QC 1' ||
        normalized === 'QC Check 1'
      );
    } else {
      return normalized === 'Polish' || normalized === 'QC 2';
    }
  };

  // Search, Filter & Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_update' | 'wood_procurement' | 'under_carpentry' | 'qc_1' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'deadline' | 'priority' | 'article'>('newest');

  // Selected order for active edit / staging
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isMobileSpecsExpanded, setIsMobileSpecsExpanded] = useState(false);

  // Form states for active order
  const [progressStatus, setProgressStatus] = useState<string>('in_progress');
  const [updateNotes, setUpdateNotes] = useState('');
  const [inProgressFiles, setInProgressFiles] = useState<string[]>([]);
  const [simulateUrlInput, setSimulateUrlInput] = useState('');
  const [customLabourRate, setCustomLabourRate] = useState<number | ''>('');
  const [customDeliveryDate, setCustomDeliveryDate] = useState('');

  // Wood Schedule form fields
  const [catalogueName, setCatalogueName] = useState('');
  const [modelName, setModelName] = useState('');
  const [sizeOfProduct, setSizeOfProduct] = useState('');
  const [sqft, setSqft] = useState<number>(0);
  const [imageLink, setImageLink] = useState('');
  const [parts, setParts] = useState<WoodPart[]>([]);

  // Simple Wood Piece Adder states
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [newPartWidth, setNewPartWidth] = useState<number | ''>(3);
  const [newPartBreadth, setNewPartBreadth] = useState<number | ''>(3);
  const [newPartLength, setNewPartLength] = useState<number | ''>(4.5);
  const [newPartQuantity, setNewPartQuantity] = useState<number | ''>(2);

  // QC Check 1 verification checkboxes
  const [qcMeasurement, setQcMeasurement] = useState(false);
  const [qcFinishing, setQcFinishing] = useState(false);
  const [qcBuffer, setQcBuffer] = useState(false);

  // Modals and Alerts
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [showQcFailPopup, setShowQcFailPopup] = useState(false);
  const [seenQcFailures, setSeenQcFailures] = useState<Record<string, boolean>>({});
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  // Webcam & Image upload states
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Calculate base assigned orders
  const baseAssignedOrders = useMemo(() => {
    return orders.filter(matchesWorker);
  }, [orders, selectedWorkerId, activeWorkerUser, isCarpenter]);

  // Apply search, filters and sorting
  const filteredOrders = useMemo(() => {
    let list = [...baseAssignedOrders];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((ord) => {
        const cust = customers.find((c) => c.id === ord.customer_id);
        const art = (ord.article_no || '').toLowerCase();
        const custName = (cust?.name || '').toLowerCase();
        const cat = (ord.category || '').toLowerCase();
        const sub = (ord.sub_category || '').toLowerCase();
        const mat = (ord.material || '').toLowerCase();
        const fin = (ord.finish || '').toLowerCase();
        const notes = (ord.special_notes || '').toLowerCase();
        return (
          art.includes(q) ||
          custName.includes(q) ||
          cat.includes(q) ||
          sub.includes(q) ||
          mat.includes(q) ||
          fin.includes(q) ||
          notes.includes(q)
        );
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((ord) => {
        const isDone =
          ord.carpenter_sub_status === 'completed' ||
          ord.qc_1_status === 'passed' ||
          ord.current_status === 'Making Completed' ||
          ['Polish', 'QC 2', 'Ready to Dispatch', 'Dispatched'].includes(ord.current_status);

        if (statusFilter === 'completed') return isDone;
        if (statusFilter === 'needs_update') return !isDone && isOrderInMyStage(ord.current_status);
        if (statusFilter === 'wood_procurement') {
          return !isDone && (ord.carpenter_sub_status === 'wood_procurement' || ord.current_status === 'Wood Procurement');
        }
        if (statusFilter === 'under_carpentry') {
          return !isDone && (ord.carpenter_sub_status === 'under_carpentry' || ord.current_status === 'Making Started');
        }
        if (statusFilter === 'qc_1') {
          return !isDone && (ord.carpenter_sub_status === 'qc_check_1' || ord.current_status === 'QC 1' || ord.qc_1_status === 'pending_admin_approval');
        }
        return true;
      });
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      list = list.filter((ord) => (ord.priority || 'Normal').toLowerCase() === priorityFilter.toLowerCase());
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'newest') return compareOrdersByArticleSerialDesc(a, b);
      if (sortBy === 'oldest') return compareOrdersByArticleSerialDesc(b, a);
      if (sortBy === 'deadline') {
        const dateA = a.carpenter_delivery_date || a.delivery_date || '9999-99-99';
        const dateB = b.carpenter_delivery_date || b.delivery_date || '9999-99-99';
        return dateA.localeCompare(dateB);
      }
      if (sortBy === 'priority') {
        const weight: Record<string, number> = { Urgent: 3, High: 2, Medium: 1, Normal: 1, Low: 0 };
        return (weight[b.priority || 'Normal'] || 0) - (weight[a.priority || 'Normal'] || 0);
      }
      if (sortBy === 'article') {
        return (a.article_no || '').localeCompare(b.article_no || '');
      }
      return 0;
    });

    return list;
  }, [baseAssignedOrders, searchTerm, statusFilter, priorityFilter, sortBy, customers]);

  // Workbench KPI Counts
  const metrics = useMemo(() => {
    const total = baseAssignedOrders.length;
    let woodPending = 0;
    let underCarpentry = 0;
    let qc1Pending = 0;
    let completed = 0;

    baseAssignedOrders.forEach((o) => {
      const isDone =
        o.carpenter_sub_status === 'completed' ||
        o.qc_1_status === 'passed' ||
        o.current_status === 'Making Completed' ||
        ['Polish', 'QC 2', 'Ready to Dispatch', 'Dispatched'].includes(o.current_status);

      if (isDone) {
        completed++;
      } else if (o.carpenter_sub_status === 'wood_procurement' || o.current_status === 'Wood Procurement') {
        woodPending++;
      } else if (o.carpenter_sub_status === 'under_carpentry' || o.current_status === 'Making Started') {
        underCarpentry++;
      } else if (o.carpenter_sub_status === 'qc_check_1' || o.current_status === 'QC 1') {
        qc1Pending++;
      }
    });

    return { total, woodPending, underCarpentry, qc1Pending, completed };
  }, [baseAssignedOrders]);

  // Webcam stream handlers
  const startWebcam = async () => {
    setWebcamError(null);
    setIsWebcamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setWebcamStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error('Webcam access failed:', err);
      setWebcamError('Could not launch camera stream. Please use the mobile native camera button or upload standard files.');
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setIsWebcamActive(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setInProgressFiles((prev) => [...prev, dataUrl]);
        stopWebcam();
      }
    }
  };

  // Open active order for staging & specifications update
  const handleOpenUpdate = (ord: Order) => {
    setActiveOrder(ord);
    setIsMobileSpecsExpanded(false);

    // Populate images
    const existingInProgress = ord.images?.filter((img) => img.type === 'In-Progress').map((img) => img.url) || [];
    setInProgressFiles(existingInProgress);
    setUpdateNotes('');
    setCustomLabourRate(ord.carpenter_labour_rate ?? '');
    setCustomDeliveryDate(ord.carpenter_delivery_date || ord.delivery_date || '');

    // Initialize Wood Schedule state
    const ws = ord.wood_schedule || getDefaultWoodSchedule(ord);
    setCatalogueName(ws.catalogue_name || (ord.category ? `${ord.category} Catalogue` : 'Beds Catalogue'));
    setModelName(ws.model_name || (ord.article_no ? ord.article_no.split('/').pop() || 'BED-01' : 'BED-01'));
    setSizeOfProduct(ws.size_of_product || (ord.size === 'Custom' ? ord.custom_size || '5FT X 6.5FT' : ord.size || '5FT X 6.5FT'));
    setSqft(ws.sqft || 32.5);
    setImageLink(ws.image_link || 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=650&auto=format&fit=crop');
    setParts(ws.parts ? [...ws.parts] : []);

    // Set QC 1 checkboxes
    setQcMeasurement(!!ord.qc_1_measurements_verified || !!ws.qc_check_1_details?.measurement);
    setQcFinishing(!!ord.qc_1_finish_verified || !!ws.qc_check_1_details?.finishing);
    setQcBuffer(!!ord.qc_1_buffer_verified || !!ws.qc_check_1_details?.buffer);

    // Determine initial Progress Status
    const isCarpentryDone =
      ord.carpenter_sub_status === 'completed' ||
      ord.qc_1_status === 'passed' ||
      ord.current_status === 'Making Completed' ||
      ['Polish', 'QC 2', 'Ready to Dispatch', 'Dispatched'].includes(ord.current_status);

    if (isCarpenter) {
      if (isCarpentryDone) {
        setProgressStatus('qc_check_1');
      } else if (ord.carpenter_sub_status) {
        setProgressStatus(ord.carpenter_sub_status);
      } else {
        const stage = normalizeStage(ord.current_status);
        if (stage === 'Wood Procurement') setProgressStatus('wood_procurement');
        else if (stage === 'Making Started' || stage === 'Carpentry') setProgressStatus('under_carpentry');
        else if (stage === 'QC 1' || stage === 'QC Check 1') setProgressStatus('qc_check_1');
        else setProgressStatus('wood_procurement');
      }
    } else {
      setProgressStatus('in_progress');
    }

    // Check for QC failure popups
    const failureInfo = getQCFailureInfo(ord);
    if (failureInfo && !failureInfo.resolved && !seenQcFailures[ord.id]) {
      setShowQcFailPopup(true);
    }
  };

  const isWoodScheduleApproved = activeOrder
    ? activeOrder.wood_schedule_status === 'Approved' || activeOrder.wood_schedule?.status === 'Approved'
    : false;

  // Wood Parts helpers
  const handleAddWoodPiece = () => {
    if (isWoodScheduleApproved) return;
    const w = Number(newPartWidth) || 0;
    const b = Number(newPartBreadth) || 0;
    const l = Number(newPartLength) || 0;
    const q = Number(newPartQuantity) || 1;
    const name = (newPartName.trim() || 'WOOD PIECE').toUpperCase();

    const newPart: WoodPart = {
      id: 'part_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      part_name: name,
      width: w,
      breadth: b,
      length: l,
      quantity: q,
    };

    setParts((prev) => [...prev, newPart]);
    setIsAddingPart(false);
    setNewPartName('');
  };

  const handleTriggerCamera = () => {
    // If desktop and webcam supported, open webcam stream, otherwise trigger native camera input
    if (typeof window !== 'undefined' && window.innerWidth >= 1024 && navigator.mediaDevices?.getUserMedia) {
      startWebcam();
    } else if (mobileCameraInputRef.current) {
      mobileCameraInputRef.current.click();
    }
  };

  const updatePartField = (id: string, field: keyof WoodPart, value: any) => {
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const loadWoodPreset = (preset: 'bed' | 'cabinet' | 'table' | 'sofa') => {
    if (isWoodScheduleApproved) return;
    if (preset === 'bed') {
      setCatalogueName('Beds Catalogue');
      setModelName('BED-KING-01');
      setSizeOfProduct('6FT X 6.5FT');
      setSqft(39);
      setParts([
        { id: 'part_' + Date.now() + '_1', part_name: 'HEADBOARD LEGS', width: 3, breadth: 3, length: 4.5, quantity: 2 },
        { id: 'part_' + Date.now() + '_2', part_name: 'FOOTBOARD LEGS', width: 3, breadth: 3, length: 1.8, quantity: 2 },
        { id: 'part_' + Date.now() + '_3', part_name: 'SIDE RAILS', width: 1.5, breadth: 6, length: 6.5, quantity: 2 },
        { id: 'part_' + Date.now() + '_4', part_name: 'CENTRAL PLANK BEAM', width: 2, breadth: 4, length: 6.2, quantity: 3 },
      ]);
    } else if (preset === 'cabinet') {
      setCatalogueName('Wardrobes & Cabinets');
      setModelName('CAB-4DOOR');
      setSizeOfProduct('4FT X 7FT');
      setSqft(28);
      setParts([
        { id: 'part_' + Date.now() + '_1', part_name: 'OUTER SIDE PANELS', width: 0.75, breadth: 24, length: 7, quantity: 2 },
        { id: 'part_' + Date.now() + '_2', part_name: 'TOP & BOTTOM FRAME', width: 1.5, breadth: 3, length: 4, quantity: 4 },
        { id: 'part_' + Date.now() + '_3', part_name: 'DOOR VERTICAL STYLES', width: 1, breadth: 3.5, length: 6.8, quantity: 4 },
      ]);
    } else if (preset === 'table') {
      setCatalogueName('Tables Catalogue');
      setModelName('DINING-6S');
      setSizeOfProduct('5.5FT X 3FT');
      setSqft(16.5);
      setParts([
        { id: 'part_' + Date.now() + '_1', part_name: 'CORNER LEGS', width: 3.5, breadth: 3.5, length: 2.5, quantity: 4 },
        { id: 'part_' + Date.now() + '_2', part_name: 'SUPPORT APRONS', width: 1, breadth: 4, length: 5.2, quantity: 2 },
        { id: 'part_' + Date.now() + '_3', part_name: 'CROSS STRETCHERS', width: 1, breadth: 4, length: 2.8, quantity: 2 },
      ]);
    } else if (preset === 'sofa') {
      setCatalogueName('Sofa Collections');
      setModelName('SOF-3SEAT');
      setSizeOfProduct('6.5FT X 3FT');
      setSqft(19.5);
      setParts([
        { id: 'part_' + Date.now() + '_1', part_name: 'BOTTOM BASE RAILS', width: 2, breadth: 3, length: 6.5, quantity: 2 },
        { id: 'part_' + Date.now() + '_2', part_name: 'ARMREST UPRIGHTS', width: 2, breadth: 3, length: 2.2, quantity: 4 },
        { id: 'part_' + Date.now() + '_3', part_name: 'BACKREST FRAME', width: 1.5, breadth: 3, length: 6.5, quantity: 3 },
      ]);
    }
  };

  // Upload Reference Photo for active order
  const handleUploadRefImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeOrder || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const dataUrl = await compressImage(file);
      const newImg = {
        id: 'img_' + generateUUID().split('-')[0],
        url: dataUrl,
        type: 'Design Reference' as const,
        uploaded_at: new Date().toISOString(),
        uploaded_by: currentUser.name,
      };
      const updatedImages = [...(activeOrder.images || []), newImg];
      const updatedOrder = {
        ...activeOrder,
        images: updatedImages,
        updated_at: new Date().toISOString(),
      };
      onUpdateOrder(updatedOrder);
      setActiveOrder(updatedOrder);
      alert('Reference drawing/photo attached successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    }
  };

  // Upload Progress Photos
  const handleUploadProgressFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files: File[] = Array.from(e.target.files);
    try {
      const compressedUrls = await Promise.all(files.map((f: File) => compressImage(f)));
      setInProgressFiles((prev) => [...prev, ...compressedUrls]);
    } catch (err) {
      console.error(err);
      alert('Error compressing images. Some images may be added in standard resolution.');
    }
  };

  const handleAppendUrl = () => {
    if (!simulateUrlInput.trim()) return;
    setInProgressFiles((prev) => [...prev, simulateUrlInput.trim()]);
    setSimulateUrlInput('');
  };

  // QC Failure Restart Handler
  const handleRestartOrderFromQcFail = () => {
    if (!activeOrder) return;
    const log: StatusLog = {
      id: 'log_' + generateUUID().split('-')[0],
      order_id: activeOrder.id,
      stage: 'Making Started',
      changed_by: currentUser.id,
      changed_by_name: currentUser.name,
      changed_by_role: currentUser.role,
      timestamp: new Date().toISOString(),
      note: `${currentUser.name} (Carpenter) acknowledged QC failure notes and restarted carpentry adjustments.`,
    };

    const updatedOrder: Order = {
      ...activeOrder,
      current_status: 'Making Started',
      carpenter_sub_status: 'under_carpentry',
      qc_1_status: 'failed',
      last_qc_failure: {
        ...(getQCFailureInfo(activeOrder) || {
          stage: 'QC 1',
          failed_by: 'Inspector',
          failed_at: new Date().toISOString(),
          notes: 'Re-working carpentry components.',
          acknowledged: true,
          resolved: true,
        }),
        acknowledged: true,
        resolved: true,
      },
      updated_at: new Date().toISOString(),
    };

    onUpdateOrder(updatedOrder, log);
    setActiveOrder(updatedOrder);
    setProgressStatus('under_carpentry');
    setQcMeasurement(false);
    setQcFinishing(false);
    setQcBuffer(false);
    setShowQcFailPopup(false);
    setSeenQcFailures((prev) => ({ ...prev, [activeOrder.id]: true }));
    alert('Order restarted at "Under Carpentry". Please correct the carpentry issues noted and re-verify QC 1 when ready.');
  };

  // Staging save handler
  const handleSaveStagingUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    if (!isOrderInMyStage(activeOrder.current_status)) {
      alert('Access restriction: You can update stage specifications exclusively during assigned active workshop stages.');
      return;
    }

    let nextStage: OrderStage = activeOrder.current_status;
    let nextSubStatus: 'wood_procurement' | 'under_carpentry' | 'qc_check_1' | 'completed' | undefined = activeOrder.carpenter_sub_status;

    if (isCarpenter) {
      if (progressStatus === 'wood_procurement') {
        if (!isWoodScheduleApproved) {
          nextSubStatus = 'wood_procurement';
          nextStage = 'Wood Procurement';
        } else {
          nextSubStatus = 'under_carpentry';
          nextStage = 'Making Started';
        }
      } else if (progressStatus === 'under_carpentry') {
        if (!isWoodScheduleApproved) {
          alert('Making Started is locked. Admin must approve the Wood Schedule in Wood Management before carpentry work can begin.');
          return;
        }
        nextSubStatus = 'qc_check_1';
        nextStage = 'Making Started';
      } else if (progressStatus === 'qc_check_1') {
        if (!isWoodScheduleApproved) {
          alert('Making Started is locked. Admin must approve the Wood Schedule in Wood Management before carpentry work can begin.');
          return;
        }
        if (!qcMeasurement || !qcFinishing || !qcBuffer) {
          alert('Please verify and check all 3 QC Check 1 requirements (1. Measurement, 2. Finishing, 3. Buffer) before saving QC 1.');
          return;
        }
        nextSubStatus = 'qc_check_1';
        nextStage = 'QC 1';
      }
    } else {
      if (progressStatus === 'completed') {
        nextStage = 'QC 2';
      } else {
        nextStage = 'Polish';
      }
    }

    const statusLabel =
      progressStatus === 'wood_procurement'
        ? 'Wood Procurement'
        : progressStatus === 'under_carpentry'
        ? 'Under Carpentry'
        : progressStatus === 'qc_check_1'
        ? 'QC Check 1 (Pending Admin Approval)'
        : progressStatus === 'completed'
        ? 'Completed'
        : 'In Progress';

    const log: StatusLog = {
      id: 'log_' + generateUUID().split('-')[0],
      order_id: activeOrder.id,
      stage: nextStage,
      changed_by: currentUser.id,
      changed_by_name: currentUser.name,
      changed_by_role: currentUser.role,
      timestamp: new Date().toISOString(),
      note: updateNotes || `${currentUser.name} updated workbench progress: status set to "${statusLabel}".`,
    };

    const existingOtherImages = (activeOrder.images || []).filter((img) => img.type !== 'In-Progress');
    const newInProgressImages = inProgressFiles.map((url) => ({
      id: 'img_' + generateUUID().split('-')[0],
      url,
      type: 'In-Progress' as const,
      uploaded_at: new Date().toISOString(),
      uploaded_by: currentUser.name,
    }));

    const verifiedWoodStatus =
      activeOrder.wood_schedule_status === 'Approved' || activeOrder.wood_schedule?.status === 'Approved'
        ? 'Approved'
        : activeOrder.wood_schedule_status === 'Rejected'
        ? 'Pending'
        : activeOrder.wood_schedule_status || 'Pending';

    const woodScheduleData: WoodSchedule = {
      catalogue_name: catalogueName,
      model_name: modelName,
      size_of_product: sizeOfProduct,
      sqft: Number(sqft) || 0,
      image_link: imageLink,
      parts: parts,
      status: verifiedWoodStatus,
      qc_check_1_details: {
        measurement: qcMeasurement,
        finishing: qcFinishing,
        buffer: qcBuffer,
      },
    };

    const updatedOrder: Order = {
      ...activeOrder,
      current_status: nextStage,
      wood_schedule_status: verifiedWoodStatus,
      carpenter_sub_status: isCarpenter ? nextSubStatus : activeOrder.carpenter_sub_status,
      carpenter_labour_rate: customLabourRate !== '' ? Number(customLabourRate) : activeOrder.carpenter_labour_rate,
      carpenter_delivery_date: customDeliveryDate || activeOrder.carpenter_delivery_date,
      images: [...existingOtherImages, ...newInProgressImages],
      updated_at: new Date().toISOString(),
      wood_schedule: isCarpenter ? woodScheduleData : activeOrder.wood_schedule,
      ...(isCarpenter && progressStatus === 'qc_check_1'
        ? {
            qc_1_measurements_verified: true,
            qc_1_finish_verified: true,
            qc_1_buffer_verified: true,
            qc_1_status: 'pending_admin_approval' as const,
          }
        : {}),
    };

    onUpdateOrder(updatedOrder, log);

    if (isCarpenter && ['Making Started', 'Wood Procurement', 'Carpentry', 'QC 1', 'QC Check 1'].includes(nextStage)) {
      setActiveOrder(updatedOrder);
      setProgressStatus(nextSubStatus || 'wood_procurement');
      setUpdateNotes('');
      if (progressStatus === 'wood_procurement') {
        if (!isWoodScheduleApproved) {
          alert('Success: Wood schedule parts saved & submitted for Admin review in Wood Management.');
        } else {
          alert('Success: Wood procurement verified! Sub-status updated to "Under Carpentry".');
        }
      } else if (progressStatus === 'under_carpentry') {
        alert('Success: Under Carpentry progress saved! Ready for QC Check 1.');
      } else if (progressStatus === 'qc_check_1') {
        alert('Success: QC 1 checklist (3/3 items) verified and submitted to Admin for final QC 1 inspection.');
      }
    } else {
      setActiveOrder(null);
      alert(`Success: Workbench update saved. Order stage advanced to "${nextStage}".`);
    }
  };

  // Quick Task Creation Form State
  const [newTaskCustName, setNewTaskCustName] = useState('');
  const [newTaskCustPhone, setNewTaskCustPhone] = useState('');
  const [newTaskSelectedCustId, setNewTaskSelectedCustId] = useState('');
  const [newTaskArticleNo, setNewTaskArticleNo] = useState(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `${dd}/${mm}/${yy}/${rand}`;
  });
  const [newTaskCategory, setNewTaskCategory] = useState('Bedroom');
  const [newTaskSubCategory, setNewTaskSubCategory] = useState('Bed');
  const [newTaskSize, setNewTaskSize] = useState('5FT X 6.5FT');
  const [newTaskMaterial, setNewTaskMaterial] = useState('Teak Wood');
  const [newTaskFinish, setNewTaskFinish] = useState('Matte PU Polish');
  const [newTaskColorShade, setNewTaskColorShade] = useState('Natural Teak');
  const [newTaskUnits, setNewTaskUnits] = useState<number>(1);
  const [newTaskLabourRate, setNewTaskLabourRate] = useState<number>(2500);
  const [newTaskDeliveryDate, setNewTaskDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [newTaskPriority, setNewTaskPriority] = useState<OrderPriority>('Normal');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskParts, setNewTaskParts] = useState<WoodPart[]>([
    { id: 'part_' + Date.now() + '_1', part_name: 'MAIN FRAME STRUCTURE', width: 2, breadth: 4, length: 6.5, quantity: 2 },
    { id: 'part_' + Date.now() + '_2', part_name: 'SUPPORT BATTENS', width: 1.5, breadth: 3, length: 5, quantity: 4 },
  ]);

  const handleCreateNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddOrder) {
      alert('Order creation capability not connected.');
      return;
    }

    let customerId = newTaskSelectedCustId;
    let newCustomerObj: Customer | undefined;

    if (!customerId) {
      if (!newTaskCustName.trim()) {
        alert('Please enter or select a customer name.');
        return;
      }
      customerId = 'cust_' + generateUUID().split('-')[0];
      newCustomerObj = {
        id: customerId,
        name: newTaskCustName.trim(),
        phone: newTaskCustPhone.trim() || '9876543210',
        address: 'Workshop Local Client',
        whatsapp_opt_in: true,
        created_at: new Date().toISOString(),
        created_by: currentUser.name,
      };
    }

    const assignedCarpenterId =
      isCarpenter && !isAdminOrManager
        ? currentUser.id
        : selectedWorkerId !== 'all'
        ? selectedWorkerId
        : currentUser.id;

    const newOrder: Order = {
      id: 'ord_' + generateUUID(),
      article_no: newTaskArticleNo.trim(),
      customer_id: customerId,
      category: newTaskCategory,
      sub_category: newTaskSubCategory,
      size: newTaskSize,
      finish: newTaskFinish,
      design_type: 'Custom',
      material: newTaskMaterial,
      color_shade: newTaskColorShade,
      no_of_units: Number(newTaskUnits) || 1,
      carpenter_id: assignedCarpenterId,
      carpenter_labour_rate: Number(newTaskLabourRate) || 0,
      carpenter_delivery_date: newTaskDeliveryDate,
      current_status: 'Wood Procurement',
      carpenter_sub_status: 'wood_procurement',
      is_delayed: false,
      priority: newTaskPriority,
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: newTaskDeliveryDate,
      special_notes: newTaskNotes,
      portal_token: generateUUID().split('-')[0],
      portal_token_expires: new Date(Date.now() + 30 * 86400000).toISOString(),
      qr_token: generateUUID().split('-')[0],
      created_at: new Date().toISOString(),
      created_by: currentUser.name,
      images: [
        {
          id: 'img_init',
          url: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=650&auto=format&fit=crop',
          type: 'Design Reference',
          uploaded_at: new Date().toISOString(),
          uploaded_by: currentUser.name,
        },
      ],
      wood_schedule: {
        catalogue_name: `${newTaskCategory} Catalogue`,
        model_name: newTaskSubCategory.toUpperCase(),
        size_of_product: newTaskSize,
        sqft: 32.5,
        image_link: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=650&auto=format&fit=crop',
        parts: newTaskParts,
        status: 'Pending',
      },
      wood_schedule_status: 'Pending',
    };

    onAddOrder(newOrder, newCustomerObj);
    setShowAddTaskModal(false);
    alert(`Success: Carpentry task registered with Article #${newOrder.article_no}!`);
  };

  // --- MODE B: STAGING & SPECIFICATION UPDATE VIEW ---
  if (activeOrder) {
    const activeCust = customers.find((c) => c.id === activeOrder.customer_id);
    const isCarpentryDone =
      isCarpenter &&
      (activeOrder.carpenter_sub_status === 'completed' ||
        activeOrder.qc_1_status === 'passed' ||
        activeOrder.current_status === 'Making Completed' ||
        ['Polish', 'QC 2', 'Ready to Dispatch', 'Dispatched'].includes(activeOrder.current_status));

    const savedSub = isCarpentryDone ? 'qc_check_1' : activeOrder.carpenter_sub_status || 'wood_procurement';
    const orderRefImages = activeOrder.images?.filter((img) => img.type === 'Design Reference') || [];
    const allOrderImages = activeOrder.images || [];
    const fallbackImage = activeOrder.wood_schedule?.image_link || getDefaultWoodSchedule(activeOrder).image_link;
    const galleryImages =
      orderRefImages.length > 0
        ? orderRefImages
        : allOrderImages.length > 0
        ? allOrderImages
        : [{ id: 'default_ref_img', url: fallbackImage, type: 'Design Reference' as const }];

    const totalCft = parts.reduce((acc, p) => acc + ((p.width * p.breadth * p.length) / 144) * (p.quantity || 1), 0);

    return (
      <div className="space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveOrder(null)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft size={15} /> Back to Workbench
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-bold">Article:</span>
            <span className="text-xs font-mono font-black bg-stone-900 text-white px-2.5 py-1 rounded-lg">
              #{activeOrder.article_no}
            </span>
          </div>
        </div>

        {/* QC Failure Alert Banner */}
        {(() => {
          const failureInfo = getQCFailureInfo(activeOrder);
          if (!failureInfo || failureInfo.resolved) return null;
          const formattedDate = failureInfo.failed_at ? new Date(failureInfo.failed_at).toLocaleString() : 'Recently';

          return (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                  <AlertCircle size={18} className="text-rose-600 animate-pulse" />
                  <span>QC Failure Audit – Corrective Action Required</span>
                </div>
                <span className="text-[10px] font-mono text-rose-800 font-bold bg-rose-100 px-2.5 py-0.5 rounded-md border border-rose-200 uppercase">
                  {failureInfo.stage} Reverted
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-rose-900">
                <div>
                  <span className="text-stone-500 uppercase tracking-wider font-bold text-[10px] block">Failed QC:</span>
                  <strong className="text-rose-900 font-extrabold">{failureInfo.stage}</strong>
                </div>
                <div>
                  <span className="text-stone-500 uppercase tracking-wider font-bold text-[10px] block">Inspector:</span>
                  <strong className="text-stone-900 font-bold">{failureInfo.failed_by || 'Admin / Inspector'}</strong>
                </div>
                <div>
                  <span className="text-stone-500 uppercase tracking-wider font-bold text-[10px] block">Failure Date:</span>
                  <strong className="text-stone-850 font-semibold">{formattedDate}</strong>
                </div>
              </div>
              <div className="bg-white border border-rose-200 rounded-xl p-3 text-xs space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">Failure Notes:</span>
                <p className="font-bold text-stone-900 whitespace-pre-wrap leading-relaxed text-xs">{failureInfo.notes}</p>
              </div>
              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={handleRestartOrderFromQcFail}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <RotateCcw size={14} /> Restart Carpentry & Fix Issues
                </button>
              </div>
            </div>
          );
        })()}

        {/* Staging Layout Grid */}
        {(() => {
          const renderJobDetailsContent = () => (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-stone-150 pb-2.5">
                <h3 className="font-display font-black text-stone-900 text-sm">
                  Job Details
                </h3>
                <span className="text-[10px] font-mono font-bold bg-stone-100 px-2 py-0.5 rounded text-stone-600">
                  {activeOrder.design_type || 'Standard'}
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-stone-700">
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider">CUSTOMER:</span>
                  <strong className="text-stone-900 font-bold">{activeCust?.name || 'MJ'}</strong>
                </div>
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider">PRODUCT:</span>
                  <strong className="text-stone-900 font-semibold">
                    {activeOrder.category} &rsaquo; {activeOrder.sub_category}
                  </strong>
                </div>
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider">SIZE:</span>
                  <strong className="text-stone-900 font-mono font-bold">
                    {activeOrder.size === 'Custom' ? activeOrder.custom_size || 'Custom' : activeOrder.size}
                  </strong>
                </div>
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider">WOOD:</span>
                  <strong className="text-stone-900 font-semibold">{activeOrder.material || 'Solid Teak Wood'}</strong>
                </div>
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider">FINISH:</span>
                  <strong className="text-stone-900 font-semibold">{activeOrder.finish || 'Hand Polish'}</strong>
                </div>
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider">COLOUR:</span>
                  <strong className="text-stone-900 font-semibold">{activeOrder.color_shade || 'Walnut'}</strong>
                </div>
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider">QUANTITY:</span>
                  <strong className="text-stone-900 font-bold">{activeOrder.no_of_units || 1} Unit</strong>
                </div>
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                  <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider">LABOUR:</span>
                  <strong className="text-amber-900 font-mono font-bold">
                    ₹{activeOrder.carpenter_labour_rate ?? 1000}
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider">DEADLINE:</span>
                  <strong className="text-rose-600 font-mono font-bold">
                    {activeOrder.carpenter_delivery_date || activeOrder.delivery_date}
                  </strong>
                </div>
              </div>

              {/* Reference Images Gallery */}
              <div className="pt-3 border-t border-stone-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-stone-500 font-extrabold uppercase tracking-wider">
                    DESIGN PHOTO
                  </span>
                  <span className="text-[9px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                    {galleryImages.length} Image{galleryImages.length === 1 ? '' : 's'}
                  </span>
                </div>

                {galleryImages[0] && (
                  <div
                    onClick={() => setLightboxImg(galleryImages[0].url)}
                    className="relative group rounded-xl overflow-hidden border border-stone-200 bg-stone-100 aspect-video cursor-pointer hover:border-[#593622] transition shadow-2xs"
                  >
                    <img
                      referrerPolicy="no-referrer"
                      src={galleryImages[0].url}
                      alt="Design Reference"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1">
                      <Eye size={16} /> Expand
                    </div>
                  </div>
                )}

                <label className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-stone-50 hover:bg-stone-100 border border-dashed border-stone-300 rounded-xl text-stone-700 text-xs font-bold cursor-pointer transition">
                  <Upload size={13} className="text-[#593622]" />
                  <span>+ Upload Blueprint Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadRefImage} />
                </label>
              </div>
            </div>
          );

          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Job Details (Desktop/Laptop) */}
              <div className="hidden lg:block lg:col-span-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
                {renderJobDetailsContent()}
              </div>

              {/* Right Column / Mobile Container: Workbench */}
              <div className="lg:col-span-8">
                <form onSubmit={handleSaveStagingUpdate} className="space-y-5 text-xs text-stone-600">
                  {/* Hidden camera input for mobile and file upload */}
                  <input
                    ref={mobileCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleUploadProgressFiles}
                  />

                  {/* MOBILE ONLY: Collapsible Job Details Button & Panel */}
                  <div className="lg:hidden">
                    <button
                      type="button"
                      onClick={() => setIsMobileSpecsExpanded((prev) => !prev)}
                      className="w-full p-3.5 bg-white hover:bg-stone-50 border border-stone-300/80 rounded-2xl flex items-center justify-between transition cursor-pointer shadow-xs text-left"
                      aria-expanded={isMobileSpecsExpanded}
                    >
                      <span className="font-bold text-stone-900 text-xs sm:text-sm">
                        Job Details ({activeOrder.category} &gt; {activeOrder.sub_category})
                      </span>
                      <ChevronDown
                        size={18}
                        className={`text-stone-500 transition-transform duration-200 ${
                          isMobileSpecsExpanded ? 'rotate-180 text-amber-900' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isMobileSpecsExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2.5 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
                            {renderJobDetailsContent()}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* SECTION: WHAT ARE YOU DOING NOW? */}
                  <div className="space-y-2.5">
                    <h3 className="text-xs sm:text-sm font-bold text-stone-900 tracking-wide uppercase lg:normal-case lg:font-black lg:text-base lg:text-stone-900 lg:tracking-wider">
                      <span className="lg:hidden">What are you doing now?</span>
                      <span className="hidden lg:inline">WHAT ARE YOU DOING NOW?</span>
                    </h3>

                    {/* MOBILE VIEW: 3 Workshop Stage Cards in One Horizontal Row */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:hidden">
                      {/* Step 1: Get Wood */}
                      {(() => {
                        const isSelected = progressStatus === 'wood_procurement';
                        const isCompleted =
                          progressStatus === 'under_carpentry' ||
                          progressStatus === 'qc_check_1' ||
                          isWoodScheduleApproved ||
                          isCarpentryDone;

                        return (
                          <button
                            type="button"
                            onClick={() => setProgressStatus('wood_procurement')}
                            className={`flex-1 min-w-[105px] p-3 rounded-2xl border flex flex-col items-center justify-between text-center transition cursor-pointer active:scale-[0.98] ${
                              isSelected
                                ? 'bg-white border-2 border-[#593622] ring-2 ring-[#593622]/10 shadow-xs'
                                : 'bg-[#F0EEF7]/50 border-stone-200/80 hover:bg-stone-100/70'
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                                isSelected
                                  ? 'bg-[#FEEAD9] text-[#593622]'
                                  : isCompleted
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-stone-200/70 text-stone-600'
                              }`}
                            >
                              {isCompleted && !isSelected ? <Check size={18} strokeWidth={2.5} /> : <TreePine size={18} />}
                            </div>
                            <div className="min-w-0 w-full">
                              <strong className="text-xs font-bold text-stone-900 block leading-tight mb-1">
                                Get Wood
                              </strong>
                              <span className="text-[10px] text-stone-500 font-medium block leading-tight">
                                Add wood measurements
                              </span>
                            </div>
                          </button>
                        );
                      })()}

                      {/* Step 2: Cutting & Making */}
                      {(() => {
                        const isSelected = progressStatus === 'under_carpentry';
                        const isCompleted =
                          progressStatus === 'qc_check_1' ||
                          isCarpentryDone ||
                          activeOrder.current_status === 'Making Completed';

                        return (
                          <button
                            type="button"
                            onClick={() => setProgressStatus('under_carpentry')}
                            className={`flex-1 min-w-[105px] p-3 rounded-2xl border flex flex-col items-center justify-between text-center transition cursor-pointer active:scale-[0.98] ${
                              isSelected
                                ? 'bg-white border-2 border-[#593622] ring-2 ring-[#593622]/10 shadow-xs'
                                : 'bg-[#F0EEF7]/50 border-stone-200/80 hover:bg-stone-100/70'
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                                isSelected
                                  ? 'bg-[#FEEAD9] text-[#593622]'
                                  : isCompleted
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-stone-200/70 text-stone-600'
                              }`}
                            >
                              {isCompleted && !isSelected ? <Check size={18} strokeWidth={2.5} /> : <Hammer size={18} />}
                            </div>
                            <div className="min-w-0 w-full">
                              <strong className="text-xs font-bold text-stone-900 block leading-tight mb-1">
                                Cutting & Making
                              </strong>
                              <span className="text-[10px] text-stone-500 font-medium block leading-tight">
                                Cut and assemble parts
                              </span>
                            </div>
                          </button>
                        );
                      })()}

                      {/* Step 3: Quality Check */}
                      {(() => {
                        const isSelected = progressStatus === 'qc_check_1';
                        const isCompleted = isCarpentryDone || activeOrder.qc_1_status === 'passed';

                        return (
                          <button
                            type="button"
                            onClick={() => setProgressStatus('qc_check_1')}
                            className={`flex-1 min-w-[105px] p-3 rounded-2xl border flex flex-col items-center justify-between text-center transition cursor-pointer active:scale-[0.98] ${
                              isSelected
                                ? 'bg-white border-2 border-[#593622] ring-2 ring-[#593622]/10 shadow-xs'
                                : 'bg-[#F0EEF7]/50 border-stone-200/80 hover:bg-stone-100/70'
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                                isSelected
                                  ? 'bg-[#FEEAD9] text-[#593622]'
                                  : isCompleted
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-stone-200/70 text-stone-600'
                              }`}
                            >
                              {isCompleted && !isSelected ? <Check size={18} strokeWidth={2.5} /> : <ShieldCheck size={18} />}
                            </div>
                            <div className="min-w-0 w-full">
                              <strong className="text-xs font-bold text-stone-900 block leading-tight mb-1">
                                Quality Check
                              </strong>
                              <span className="text-[10px] text-stone-500 font-medium block leading-tight">
                                Check the finished work
                              </span>
                            </div>
                          </button>
                        );
                      })()}
                    </div>

                    {/* DESKTOP / TABLET VIEW: 3 Stages Grid */}
                    <div className="hidden sm:grid sm:grid-cols-3 gap-3">
                      {/* Step 1: Get Wood */}
                      <button
                        type="button"
                        onClick={() => setProgressStatus('wood_procurement')}
                        className={`p-3.5 rounded-2xl border flex items-center gap-3 transition text-left cursor-pointer ${
                          progressStatus === 'wood_procurement'
                            ? 'bg-white border-2 border-[#593622] ring-2 ring-[#593622]/10 shadow-sm relative'
                            : 'bg-stone-50/80 hover:bg-stone-100/70 border-stone-200'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            progressStatus === 'wood_procurement'
                              ? 'bg-amber-100 text-[#593622]'
                              : 'bg-stone-200/80 text-stone-600'
                          }`}
                        >
                          <TreePine size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <strong className="text-xs font-bold text-stone-900 block leading-tight">Get Wood</strong>
                          <span className="text-[10px] text-stone-500 block mt-0.5 truncate">
                            Procurement & CFT
                          </span>
                        </div>
                      </button>

                      {/* Step 2: Cutting & Making */}
                      <button
                        type="button"
                        onClick={() => setProgressStatus('under_carpentry')}
                        className={`p-3.5 rounded-2xl border flex items-center gap-3 transition text-left cursor-pointer ${
                          progressStatus === 'under_carpentry'
                            ? 'bg-white border-2 border-[#593622] ring-2 ring-[#593622]/10 shadow-sm relative'
                            : 'bg-stone-50/80 hover:bg-stone-100/70 border-stone-200'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            progressStatus === 'under_carpentry'
                              ? 'bg-amber-100 text-[#593622]'
                              : 'bg-stone-200/80 text-stone-600'
                          }`}
                        >
                          <Hammer size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <strong className="text-xs font-bold text-stone-900 block leading-tight">Cutting & Making</strong>
                          <span className="text-[10px] text-stone-500 block mt-0.5 truncate">
                            Active Timber Assembly
                          </span>
                        </div>
                      </button>

                      {/* Step 3: Quality Check */}
                      <button
                        type="button"
                        onClick={() => setProgressStatus('qc_check_1')}
                        className={`p-3.5 rounded-2xl border flex items-center gap-3 transition text-left cursor-pointer ${
                          progressStatus === 'qc_check_1'
                            ? 'bg-white border-2 border-[#593622] ring-2 ring-[#593622]/10 shadow-sm relative'
                            : 'bg-stone-50/80 hover:bg-stone-100/70 border-stone-200'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            progressStatus === 'qc_check_1'
                              ? 'bg-amber-100 text-[#593622]'
                              : 'bg-stone-200/80 text-stone-600'
                          }`}
                        >
                          <ShieldCheck size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <strong className="text-xs font-bold text-stone-900 block leading-tight">Quality Check</strong>
                          <span className="text-[10px] text-stone-500 block mt-0.5 truncate">
                            {isCarpentryDone ? 'Passed ✔' : 'QC Verification'}
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Quality Check Verification Checklist */}
                    {progressStatus === 'qc_check_1' && (
                      <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                          <div className="flex items-center gap-1.5">
                            <CheckSquare className="text-[#593622]" size={15} />
                            <span className="font-bold text-xs text-amber-950">
                              Quality Verification Checklist
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                            {[qcMeasurement, qcFinishing, qcBuffer].filter(Boolean).length} of 3 Checked
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <label
                            className={`flex items-center gap-2 p-2 rounded-lg border transition cursor-pointer ${
                              qcMeasurement
                                ? 'bg-white border-amber-400 text-amber-950 font-bold shadow-2xs'
                                : 'bg-white/70 border-stone-200 text-stone-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={qcMeasurement}
                              onChange={(e) => setQcMeasurement(e.target.checked)}
                              className="h-4 w-4 rounded text-[#593622] focus:ring-amber-500 cursor-pointer shrink-0"
                            />
                            <div className="leading-tight">
                              <span className="text-xs font-bold block">1. Measurement</span>
                              <span className="text-[9px] text-stone-500">Dimensions verified</span>
                            </div>
                          </label>

                          <label
                            className={`flex items-center gap-2 p-2 rounded-lg border transition cursor-pointer ${
                              qcFinishing
                                ? 'bg-white border-amber-400 text-amber-950 font-bold shadow-2xs'
                                : 'bg-white/70 border-stone-200 text-stone-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={qcFinishing}
                              onChange={(e) => setQcFinishing(e.target.checked)}
                              className="h-4 w-4 rounded text-[#593622] focus:ring-amber-500 cursor-pointer shrink-0"
                            />
                            <div className="leading-tight">
                              <span className="text-xs font-bold block">2. Finishing</span>
                              <span className="text-[9px] text-stone-500">Smoothness & edges</span>
                            </div>
                          </label>

                          <label
                            className={`flex items-center gap-2 p-2 rounded-lg border transition cursor-pointer ${
                              qcBuffer
                                ? 'bg-white border-amber-400 text-amber-950 font-bold shadow-2xs'
                                : 'bg-white/70 border-stone-200 text-stone-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={qcBuffer}
                              onChange={(e) => setQcBuffer(e.target.checked)}
                              className="h-4 w-4 rounded text-[#593622] focus:ring-amber-500 cursor-pointer shrink-0"
                            />
                            <div className="leading-tight">
                              <span className="text-xs font-bold block">3. Buffer & Fit</span>
                              <span className="text-[9px] text-stone-500">Joint tolerances</span>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION: Wood Used / Wood Cut Schedule */}
                  <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-[#593622] hidden sm:inline" />
                        <div>
                          <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                            <span className="sm:hidden">Wood Used</span>
                            <span className="hidden sm:inline">Wood Cut Schedule (CFT)</span>
                          </h3>
                          <p className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 sm:hidden">
                            Add the wood pieces you cut
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-black text-[#593622] font-mono">
                          <span className="sm:hidden">Total Wood: </span>
                          <span className="hidden sm:inline">Total: </span>
                          {totalCft.toFixed(2)} CFT
                        </span>
                      </div>
                    </div>

                    {/* Approved Wood Schedule Banner */}
                    {isWoodScheduleApproved && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-950">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span className="font-bold text-xs">Wood Schedule Approved by Admin</span>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                          <Lock size={11} /> Locked
                        </span>
                      </div>
                    )}

                    {/* Wood Pieces Cards List */}
                    <div className="space-y-2">
                      {parts.length > 0 ? (
                        parts.map((p) => {
                          const partCft = ((p.width * p.breadth * p.length) / 144) * (p.quantity || 1);
                          return (
                            <div
                              key={p.id}
                              className="p-3 bg-stone-50/90 border border-stone-200/90 rounded-xl flex items-center justify-between hover:bg-stone-100/70 transition shadow-2xs"
                            >
                              <div className="min-w-0 pr-2">
                                <h4 className="font-bold text-stone-900 text-xs truncate">
                                  {p.part_name || 'Wood Piece'}
                                </h4>
                                <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                                  {p.width}x{p.breadth}x{p.length} ft
                                </p>
                              </div>

                              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                <span className="bg-stone-200/70 text-stone-800 px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono">
                                  {p.quantity || 1} {window?.innerWidth < 640 ? 'qty' : 'pcs'}
                                </span>
                                <span className="font-mono font-bold text-stone-900 text-xs">
                                  {partCft.toFixed(2)} CFT
                                </span>
                                {!isWoodScheduleApproved ? (
                                  <button
                                    type="button"
                                    onClick={() => setParts(parts.filter((pt) => pt.id !== p.id))}
                                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                    title="Delete piece"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                ) : (
                                  <Lock size={14} className="text-emerald-600" />
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-4 text-center text-stone-400 text-xs italic bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                          No wood pieces added yet. Click &ldquo;+ Add Wood Piece&rdquo; below.
                        </div>
                      )}

                      {/* Add Wood Piece Section */}
                      {!isWoodScheduleApproved && (
                        <>
                          {isAddingPart ? (
                            <div className="p-3.5 bg-amber-50/60 border-2 border-amber-300 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#593622] uppercase tracking-wider">
                                  Add Wood Piece
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setIsAddingPart(false)}
                                  className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                                >
                                  <X size={16} />
                                </button>
                              </div>

                              {/* Quick Presets / Chips */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['Headboard Legs', 'Side Rails', 'Plank Beam', 'Corner Legs', 'Panel', 'Frame'].map(
                                  (chip) => (
                                    <button
                                      key={chip}
                                      type="button"
                                      onClick={() => setNewPartName(chip)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                                        newPartName.toLowerCase() === chip.toLowerCase()
                                          ? 'bg-[#593622] text-white'
                                          : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                                      }`}
                                    >
                                      {chip}
                                    </button>
                                  )
                                )}
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                                  Piece Name
                                </label>
                                <input
                                  type="text"
                                  value={newPartName}
                                  onChange={(e) => setNewPartName(e.target.value)}
                                  placeholder="e.g. Headboard Legs"
                                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-900 focus:ring-1 focus:ring-[#593622]"
                                />
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                                    Width (in)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    value={newPartWidth}
                                    onChange={(e) =>
                                      setNewPartWidth(e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    placeholder="3"
                                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 text-center focus:ring-1 focus:ring-[#593622]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                                    Breadth (in)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    value={newPartBreadth}
                                    onChange={(e) =>
                                      setNewPartBreadth(e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    placeholder="3"
                                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 text-center focus:ring-1 focus:ring-[#593622]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                                    Length (ft)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    value={newPartLength}
                                    onChange={(e) =>
                                      setNewPartLength(e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    placeholder="4.5"
                                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 text-center focus:ring-1 focus:ring-[#593622]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                                    Quantity
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={newPartQuantity}
                                    onChange={(e) =>
                                      setNewPartQuantity(e.target.value === '' ? '' : Number(e.target.value))
                                    }
                                    placeholder="2"
                                    className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 text-center focus:ring-1 focus:ring-[#593622]"
                                  />
                                </div>
                              </div>

                              {/* Calculated CFT Preview & Action Buttons */}
                              {(() => {
                                const w = Number(newPartWidth) || 0;
                                const b = Number(newPartBreadth) || 0;
                                const l = Number(newPartLength) || 0;
                                const q = Number(newPartQuantity) || 1;
                                const calculated = ((w * b * l) / 144) * q;
                                return (
                                  <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                                    <span className="text-[11px] font-bold text-stone-700">
                                      Piece Volume:{' '}
                                      <strong className="text-amber-900 font-mono font-black">
                                        {calculated.toFixed(2)} CFT
                                      </strong>
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setIsAddingPart(false)}
                                        className="px-3 py-1.5 text-stone-600 hover:bg-stone-100 rounded-lg text-xs font-bold cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleAddWoodPiece}
                                        className="px-4 py-1.5 bg-[#593622] hover:bg-[#402414] text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                                      >
                                        <Plus size={14} /> Add Piece
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingPart(true);
                                setNewPartName('');
                                setNewPartWidth(3);
                                setNewPartBreadth(3);
                                setNewPartLength(4.5);
                                setNewPartQuantity(2);
                              }}
                              className="w-full p-3 border-2 border-dashed border-stone-300 hover:border-[#593622] hover:bg-amber-50/20 rounded-xl text-stone-700 hover:text-[#593622] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                              <Plus size={16} /> + Add Wood Piece
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* SECTION: Work Photos & Note (Side-by-side on desktop, stacked on mobile) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Work Photos Card */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Camera size={16} className="text-[#593622] hidden sm:inline" />
                            <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                              <span className="sm:hidden">Work Photos</span>
                              <span className="hidden sm:inline">Work Photos ({inProgressFiles.length})</span>
                            </h3>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-stone-500 mt-0.5 sm:hidden">
                            Take photos of your work
                          </p>
                        </div>
                        <span className="text-[10px] font-bold bg-[#f6eee3] text-[#593622] px-2.5 py-0.5 rounded-full border border-amber-200/60">
                          {inProgressFiles.length} Photo{inProgressFiles.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      {/* Live Webcam Stream Window if active on desktop */}
                      {isWebcamActive && (
                        <div className="p-2.5 bg-black rounded-xl space-y-2">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full max-h-52 object-contain rounded-lg mx-auto"
                          />
                          {webcamError && <p className="text-xs text-rose-400">{webcamError}</p>}
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={captureSnapshot}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Camera size={14} /> Snap Photo
                            </button>
                            <button
                              type="button"
                              onClick={stopWebcam}
                              className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-lg text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Attached Photos Grid or Placeholder */}
                      {inProgressFiles.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {inProgressFiles.map((url, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 group bg-stone-100"
                            >
                              <img
                                referrerPolicy="no-referrer"
                                src={url}
                                alt="Progress"
                                className="object-cover w-full h-full"
                              />
                              <button
                                type="button"
                                onClick={() => setInProgressFiles(inProgressFiles.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white h-5 w-5 rounded-full font-bold text-[10px] flex items-center justify-center shadow cursor-pointer"
                                title="Delete photo"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 border-2 border-dashed border-stone-200 rounded-xl text-center text-stone-400">
                          <ImageIcon size={22} className="mx-auto text-stone-400 mb-1" />
                          <p className="font-semibold text-stone-500 text-xs">No progress photos yet</p>
                        </div>
                      )}

                      {/* Photo Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleTriggerCamera}
                          className="p-3 bg-stone-50 hover:bg-stone-100 border border-stone-300/80 rounded-xl text-stone-800 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.98]"
                        >
                          <Camera size={18} className="text-[#593622]" />
                          <span>Take Photo</span>
                        </button>
                        <label className="p-3 bg-stone-50 hover:bg-stone-100 border border-stone-300/80 rounded-xl text-stone-800 font-bold text-xs flex flex-col sm:flex-row items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.98]">
                          <Upload size={18} className="text-[#593622]" />
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleUploadProgressFiles}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Note / Audit Notes Card */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <FileText size={16} className="text-[#593622] hidden sm:inline" />
                        <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                          <span className="sm:hidden">Note</span>
                          <span className="hidden sm:inline">Audit Notes</span>
                        </h3>
                      </div>
                      <textarea
                        rows={4}
                        value={updateNotes}
                        onChange={(e) => setUpdateNotes(e.target.value)}
                        placeholder="Write anything important..."
                        className="w-full flex-1 p-3 bg-stone-50/80 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-1 focus:ring-[#593622] resize-none"
                      />
                    </div>
                  </div>

                  {/* Actions & Save Bar */}
                  {/* Desktop / Tablet Save Row */}
                  <div className="hidden sm:flex items-center justify-between pt-2">
                    {onDeleteOrder && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete Task #${activeOrder.article_no}?`)) {
                            onDeleteOrder(activeOrder.id);
                            setActiveOrder(null);
                          }
                        }}
                        className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} /> Delete Task
                      </button>
                    )}
                    <div className="flex items-center gap-3 ml-auto">
                      <button
                        type="button"
                        onClick={() => setActiveOrder(null)}
                        className="px-5 py-2.5 border border-stone-300 rounded-xl text-stone-700 font-bold hover:bg-stone-50 text-xs cursor-pointer transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-[#3d2314] hover:bg-[#2c1810] text-white font-bold px-7 py-2.5 rounded-xl shadow-sm transition text-xs cursor-pointer flex items-center gap-2"
                      >
                        <Check size={16} /> Save Progress
                      </button>
                    </div>
                  </div>

                  {/* MOBILE ONLY: Sticky Bottom Save Bar */}
                  <div className="sm:hidden sticky bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md pt-2 pb-3 px-1 border-t border-stone-200">
                    <button
                      type="submit"
                      className="w-full bg-[#3d2314] hover:bg-[#2c1810] text-white font-bold py-3.5 px-6 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition cursor-pointer"
                    >
                      <Check size={18} />
                      <span>Save</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* Lightbox Modal */}
        {lightboxImg && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="relative max-w-4xl max-h-[90vh] w-full bg-stone-900 rounded-2xl overflow-hidden border border-stone-700 shadow-2xl flex flex-col">
              <div className="p-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between text-white">
                <span className="font-bold text-xs uppercase tracking-wider">Drawing Full View</span>
                <button
                  type="button"
                  onClick={() => setLightboxImg(null)}
                  className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-3 flex-1 flex items-center justify-center overflow-auto bg-black/50 min-h-[300px]">
                <img
                  referrerPolicy="no-referrer"
                  src={lightboxImg}
                  alt="Full view"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- MODE A: WORKBENCH LISTING VIEW ---
  return (
    <div className="space-y-6">
      {/* Workbench Header & Worker Selector for Admins */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#593622] text-amber-200">
              <Hammer size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black font-display text-stone-900 tracking-tight">
                Carpenter Workbench
              </h1>
              <p className="text-stone-500 text-xs">
                Active worker:{' '}
                <strong className="text-stone-850 font-bold">
                  {activeWorkerUser ? activeWorkerUser.name : 'All Workshop Tasks'}
                </strong>{' '}
                ({baseAssignedOrders.length} assigned work orders)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Worker Switcher for Admin/Supervisors */}
          {isAdminOrManager && carpentersList.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1 shadow-2xs">
              <UserIcon size={14} className="text-stone-400 ml-2" />
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="bg-transparent text-xs font-bold text-stone-800 focus:outline-none pr-3 cursor-pointer"
              >
                <option value="all">All Carpenters</option>
                {carpentersList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Add Task Button */}
          {onAddOrder && (
            <button
              type="button"
              onClick={() => setShowAddTaskModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#593622] hover:bg-[#402414] text-white rounded-xl text-xs font-black shadow-xs transition cursor-pointer"
            >
              <Plus size={14} /> + Add Carpentry Task
            </button>
          )}
        </div>
      </div>

      {/* Orders Table Listing */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-600 border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-150 font-mono text-[10px] uppercase text-stone-400 font-black">
                <th className="py-3 px-4">Article No.</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product Specs</th>
                <th className="py-3 px-4">Stage Status</th>
                <th className="py-3 px-4">Delivery Deadline</th>
                <th className="py-3 px-4">Labour Rate</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-sans">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord) => {
                  const matchingCust = customers.find((c) => c.id === ord.customer_id);
                  const isDone =
                    ord.carpenter_sub_status === 'completed' ||
                    ord.qc_1_status === 'passed' ||
                    ord.current_status === 'Making Completed' ||
                    ['Polish', 'QC 2', 'Ready to Dispatch', 'Dispatched'].includes(ord.current_status);
                  const isStagedMine = isOrderInMyStage(ord.current_status);
                  const isOverdue =
                    !isDone &&
                    ord.carpenter_delivery_date &&
                    new Date(ord.carpenter_delivery_date) < new Date(new Date().toISOString().split('T')[0]);

                  return (
                    <tr key={ord.id} className="hover:bg-amber-50/20 transition">
                      {/* Article No & Priority Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-stone-900 text-xs">
                            #{ord.article_no}
                          </span>
                          {ord.priority === 'Urgent' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-100 text-red-800 border border-red-200">
                              URGENT
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 block font-mono mt-0.5">
                          ID: {ord.id.slice(0, 8)}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <strong className="font-bold text-stone-850 block">{matchingCust?.name || 'Walk-In Customer'}</strong>
                        <span className="text-[10px] text-stone-400 block font-mono">{matchingCust?.phone || 'No phone'}</span>
                      </td>

                      {/* Product Specs */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-stone-900 block">
                          {ord.category} &rsaquo; {ord.sub_category}
                        </span>
                        <span className="text-[10px] text-stone-400 block">
                          {ord.size === 'Custom' ? ord.custom_size || 'Custom' : ord.size} | {ord.material || 'Teak Wood'}
                        </span>
                      </td>

                      {/* Stage Status */}
                      <td className="py-3.5 px-4">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 font-bold text-[10px]">
                            <CheckCircle2 size={11} /> Completed
                          </span>
                        ) : ord.carpenter_sub_status === 'wood_procurement' || ord.current_status === 'Wood Procurement' ? (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 font-bold text-[10px]">
                            Wood Procurement
                          </span>
                        ) : ord.carpenter_sub_status === 'under_carpentry' || ord.current_status === 'Making Started' ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 font-bold text-[10px] animate-pulse">
                            Under Carpentry
                          </span>
                        ) : ord.carpenter_sub_status === 'qc_check_1' || ord.current_status === 'QC 1' ? (
                          <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5 font-bold text-[10px]">
                            QC 1 Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-stone-600 bg-stone-100 border border-stone-200 rounded-full px-2.5 py-0.5 font-bold text-[10px]">
                            {ord.current_status}
                          </span>
                        )}
                      </td>

                      {/* Delivery Deadline */}
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <div className={`${isOverdue ? 'text-rose-600 font-bold' : 'text-stone-800'}`}>
                          {ord.carpenter_delivery_date || ord.delivery_date || 'No Date'}
                        </div>
                        {isOverdue && (
                          <span className="text-[9px] text-rose-600 font-bold flex items-center gap-0.5 mt-0.5">
                            <AlertTriangle size={10} /> Overdue
                          </span>
                        )}
                      </td>

                      {/* Labour Rate */}
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-850">
                        ₹{ord.carpenter_labour_rate ?? 0}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenUpdate(ord)}
                            className="p-1.5 px-3 rounded-lg text-xs font-bold shadow-2xs transition flex items-center gap-1 bg-[#593622] hover:bg-[#402414] text-white cursor-pointer"
                          >
                            <Eye size={13} /> {isStagedMine ? 'Update Status' : 'View Specs'}
                          </button>

                          {onDeleteOrder && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete Task #${ord.article_no}?`)) {
                                  onDeleteOrder(ord.id);
                                }
                              }}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete task"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400 italic">
                    <Clock size={24} className="mx-auto text-stone-300 mb-2" />
                    No carpentry tasks matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD NEW CARPENTRY TASK MODAL */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-stone-150 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#593622] text-amber-200">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-display font-black text-stone-900 text-base">Add New Carpentry Task</h3>
                  <p className="text-stone-500 text-xs">Log a bespoke furniture task piece into the workshop database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTaskModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewTask} className="space-y-4 text-xs text-stone-700">
              {/* Customer Selector / Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                    Select Customer
                  </label>
                  <select
                    value={newTaskSelectedCustId}
                    onChange={(e) => {
                      setNewTaskSelectedCustId(e.target.value);
                      if (e.target.value) {
                        const found = customers.find((c) => c.id === e.target.value);
                        if (found) {
                          setNewTaskCustName(found.name);
                          setNewTaskCustPhone(found.phone || '');
                        }
                      }
                    }}
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-[#593622]"
                  >
                    <option value="">-- Create New Client Below --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone || 'No phone'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskCustName}
                    onChange={(e) => setNewTaskCustName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-[#593622]"
                  />
                </div>
              </div>

              {/* Product Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Article Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskArticleNo}
                    onChange={(e) => setNewTaskArticleNo(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold"
                  >
                    <option value="Bedroom">Bedroom</option>
                    <option value="Living Room">Living Room</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Dining">Dining</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Sub-Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskSubCategory}
                    onChange={(e) => setNewTaskSubCategory(e.target.value)}
                    placeholder="e.g. King Size Bed"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Size / Dimensions
                  </label>
                  <input
                    type="text"
                    value={newTaskSize}
                    onChange={(e) => setNewTaskSize(e.target.value)}
                    placeholder="e.g. 6FT X 6.5FT"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Material
                  </label>
                  <input
                    type="text"
                    value={newTaskMaterial}
                    onChange={(e) => setNewTaskMaterial(e.target.value)}
                    placeholder="e.g. Teak Wood"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Finish
                  </label>
                  <input
                    type="text"
                    value={newTaskFinish}
                    onChange={(e) => setNewTaskFinish(e.target.value)}
                    placeholder="e.g. Matte PU Polish"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Labour Rate (INR ₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newTaskLabourRate}
                    onChange={(e) => setNewTaskLabourRate(Number(e.target.value))}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Target Delivery Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newTaskDeliveryDate}
                    onChange={(e) => setNewTaskDeliveryDate(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as OrderPriority)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 border border-stone-200 rounded-xl text-stone-600 font-bold hover:bg-stone-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#593622] hover:bg-[#402414] text-white font-black px-5 py-2 rounded-xl shadow-xs transition text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} /> Register & Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
